import {
  getFullConfig,
  updateConfig,
  addLLMInstance,
  updateLLMInstance,
  deleteLLMInstance,
} from '../../../../../server/http/services/configService.js'
import PluginConfigService from '../../../../../database/services/PluginConfigService.js'

// Fields that must NEVER appear in plain text output
const SENSITIVE_KEYS = [
  'admin_code',
  'user_code',
  'api_key',
  'secret',
  'token',
  'password',
  'access_key',
  'private_key',
]

function maskSensitiveData(obj, depth = 0) {
  if (depth > 10 || obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj))
    return obj.map((item) => maskSensitiveData(item, depth + 1))

  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))
    if (isSensitive && typeof value === 'string' && value.length > 0) {
      // Show only first 2 and last 2 chars
      result[key] =
        value.length > 6
          ? `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`
          : '****'
    } else if (typeof value === 'object') {
      result[key] = maskSensitiveData(value, depth + 1)
    } else {
      result[key] = value
    }
  }
  return result
}

const action = process.argv[2]
const payload = process.argv[3] ? JSON.parse(process.argv[3]) : null

async function run() {
  try {
    switch (action) {
      case 'get': {
        const config = await getFullConfig()
        // Always mask sensitive fields before printing
        const safe = maskSensitiveData(config)
        console.log(JSON.stringify(safe, null, 2))
        break
      }
      case 'update': {
        const result = await updateConfig(payload)
        console.log(JSON.stringify(result, null, 2))
        break
      }
      case 'add-llm': {
        const { adapterType, instanceConfig } = payload
        const addResult = await addLLMInstance(adapterType, instanceConfig)
        console.log(JSON.stringify(addResult, null, 2))
        break
      }
      case 'update-llm': {
        const { adapterType, index, instanceConfig } = payload
        const updateResult = await updateLLMInstance(
          adapterType,
          index,
          instanceConfig,
        )
        console.log(JSON.stringify(updateResult, null, 2))
        break
      }
      case 'delete-llm': {
        const { adapterType, index } = payload
        const deleteResult = await deleteLLMInstance(adapterType, index)
        console.log(JSON.stringify(deleteResult, null, 2))
        break
      }
      case 'reload-plugin': {
        const pluginName = payload?.pluginName || 'mcp-plugin'
        // Get port and admin_code from config to build the API call
        const cfg = await getFullConfig()
        const port = cfg?.server?.port || 3000
        const adminCode = cfg?.web?.admin_code || ''
        const url = `http://localhost:${port}/api/plugins/${pluginName}/reload`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'x-admin-code': adminCode, 'Content-Type': 'application/json' },
        })
        const data = await res.json()
        if (!res.ok || data.code !== 0) {
          console.error('Reload failed:', JSON.stringify(data))
          process.exit(1)
        }
        console.log(JSON.stringify({ success: true, plugin: pluginName, toolCount: data.data?.toolCount }))
        break
      }
      default:
        console.error('Unknown action:', action)
        console.error(
          'Available actions: get, update, add-llm, update-llm, delete-llm, reload-plugin',
        )
        process.exit(1)
    }
  } catch (error) {
    console.error('Operation failed:', error.message)
    process.exit(1)
  }
}

run()
