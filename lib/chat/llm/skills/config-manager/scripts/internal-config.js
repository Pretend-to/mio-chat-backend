import { 
  getFullConfig, 
  updateConfig, 
  addLLMInstance, 
  updateLLMInstance, 
  deleteLLMInstance 
} from '../services/configService.js'
import logger from '../../../../utils/logger.js'

// 简单的命令行接口封装
const action = process.argv[2]
const payload = process.argv[3] ? JSON.parse(process.argv[3]) : null

async function run() {
  try {
    switch (action) {
      case 'get':
        const config = await getFullConfig()
        console.log(JSON.stringify(config, null, 2))
        break
      case 'update':
        const result = await updateConfig(payload)
        console.log(JSON.stringify(result, null, 2))
        break
      case 'add-llm':
        const { adapterType, instanceConfig } = payload
        const addResult = await addLLMInstance(adapterType, instanceConfig)
        console.log(JSON.stringify(addResult, null, 2))
        break
      default:
        console.error('Unknown action:', action)
        process.exit(1)
    }
  } catch (error) {
    console.error('Operation failed:', error.message)
    process.exit(1)
  }
}

run()
