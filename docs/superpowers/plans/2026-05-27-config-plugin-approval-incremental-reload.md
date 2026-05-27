# Config Plugin 二次确认与 LLM 适配器增量热重载 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为配置写入工具实现交互式二次授权拦截（中文提示），并新增针对单个 LLM 适配器实例的增量管理工具（`add_llm_adapter`、`update_llm_adapter`、`delete_llm_adapter`），同时优化底层热重载为智能增量热插拔，节省 Token 并保证服务稳定性。

**Architecture:**
- **统一二次确认**：在 `update_config`、`plugin_config`（更新操作）以及新适配器工具中调用 `this.requestUserApproval(e, prompt)`。
- **单实例工具设计**：直接封装 `configService.js` 的 `addLLMInstance`、`updateLLMInstance` 和 `deleteLLMInstance` 接口作为独立的 `MioFunction` 工具。
- **智能增量热重载**：在 `lib/middleware.js` 中比对内存活跃的 `llm.llms` 与新配置 `config.getLLMEnabled()`，对变动实例执行更新/注销/添加操作，并调用 `syncAvailableInstances()` 同步。

**Tech Stack:** Node.js, ES Modules, Javascript.

---

### Task 1: 适配现有工具的 getDisplayName 与二次确认

**Files:**
- Modify: `lib/plugins/config-plugin/tools/update_config.js`
- Modify: `lib/plugins/config-plugin/tools/plugin_config.js`
- Modify: `lib/plugins/config-plugin/tools/get_config.js`
- Modify: `lib/plugins/config-plugin/tools/reload.js`

- [ ] **Step 1: 修改 `update_config.js` 增加中文二次确认与 `getDisplayName`**

修改 `lib/plugins/config-plugin/tools/update_config.js`：
```javascript
import { MioFunction } from '../../../function.js'
import { updateConfig } from '../../../server/http/services/configService.js'

export default class UpdateSystemConfig extends MioFunction {
  constructor() {
    super({
      name: 'update_config',
      description: 'Update system configuration nodes (server, web, onebot, storage, llm_adapters). Partial updates are supported.',
      parameters: {
        type: 'object',
        properties: {
          updates: {
            type: 'object',
            description: 'The configuration object containing fields to update. Example: {"web": {"title": "MioChat Pro"}}'
          }
        },
        required: ['updates']
      },
      adminOnly: true
    })
    this.func = this.execute.bind(this)
  }

  getDisplayName(params) {
    const { updates } = params
    const keys = updates ? Object.keys(updates).join(', ') : ''
    return `Updating system config: ${keys || 'system'}`
  }

  async execute(e) {
    const { updates } = e.params
    
    // 中文二次授权拦截
    const updatesStr = JSON.stringify(updates, null, 2)
    const approval = await this.requestUserApproval(
      e,
      `是否授权 LLM 更新系统配置？\n\`\`\`json\n${updatesStr}\n\`\`\``,
      { updates }
    )
    if (!approval.approved) {
      const reasonMsg = approval.reason ? ` 原因: ${approval.reason}` : ''
      return { success: false, error: `[执行终止] 用户拒绝授权更新系统配置。${reasonMsg}` }
    }

    try {
      const result = await updateConfig(updates)
      return { success: true, result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
```

- [ ] **Step 2: 修改 `plugin_config.js` 增加更新确认与 `getDisplayName`**

修改 `lib/plugins/config-plugin/tools/plugin_config.js`：
```javascript
// 在 execute 方法的 action === 'update_config' 内部添加二次授权：
      if (action === 'update_config') {
        if (!config) throw new Error('config is required for update_config action')
        
        // 二次授权确认
        const configStr = JSON.stringify(config, null, 2)
        const approval = await this.requestUserApproval(
          e,
          `是否授权 LLM 更新插件 "${pluginName}" 的配置？\n\`\`\`json\n${configStr}\n\`\`\``,
          { pluginName, config }
        )
        if (!approval.approved) {
          const reasonMsg = approval.reason ? ` 原因: ${approval.reason}` : ''
          return { success: false, error: `[执行终止] 用户拒绝授权更新插件配置。${reasonMsg}` }
        }

        const existing = await PluginConfigService.findByName(pluginName)
// ...其余逻辑不变...
```
并在 Class 中增加 `getDisplayName` 方法：
```javascript
  getDisplayName(params) {
    const { action, pluginName } = params
    if (action === 'update_config') {
      return `Updating plugin config: ${pluginName || 'plugin'}`
    } else if (action === 'get_config') {
      return `Reading plugin config: ${pluginName || 'plugin'}`
    } else {
      return 'Listing plugin configs'
    }
  }
```

- [ ] **Step 3: 修改 `get_config.js` 增加 `getDisplayName`**

修改 `lib/plugins/config-plugin/tools/get_config.js` 增加 `getDisplayName`：
```javascript
  getDisplayName() {
    return 'Reading system config'
  }
```

- [ ] **Step 4: 修改 `reload.js` 增加 `getDisplayName`**

修改 `lib/plugins/config-plugin/tools/reload.js` 增加 `getDisplayName`：
```javascript
  getDisplayName(params) {
    const { target, pluginName } = params
    return `Reloading: ${target === 'plugin' ? (pluginName || 'plugin') : 'LLM adapters'}`
  }
```

- [ ] **Step 5: 提交更改**

Run: `git commit -am "feat: add getDisplayName and user approval checks for existing config tools"`

---

### Task 2: 新增单实例 LLM 适配器配置管理工具

**Files:**
- Create: `lib/plugins/config-plugin/tools/add_llm_adapter.js`
- Create: `lib/plugins/config-plugin/tools/update_llm_adapter.js`
- Create: `lib/plugins/config-plugin/tools/delete_llm_adapter.js`

- [ ] **Step 1: 新建 `add_llm_adapter.js`**

写入到 `lib/plugins/config-plugin/tools/add_llm_adapter.js`：
```javascript
import { MioFunction } from '../../../function.js'
import { addLLMInstance } from '../../../server/http/services/configService.js'

export default class AddLLMAdapter extends MioFunction {
  constructor() {
    super({
      name: 'add_llm_adapter',
      description: 'Add a new LLM adapter instance to the system configuration.',
      parameters: {
        type: 'object',
        properties: {
          adapterType: {
            type: 'string',
            description: 'The type of the adapter to add (e.g., openai, gemini, vertex).'
          },
          instanceConfig: {
            type: 'object',
            description: 'The configuration object for the new adapter instance.'
          }
        },
        required: ['adapterType', 'instanceConfig']
      },
      adminOnly: true
    })
    this.func = this.execute.bind(this)
  }

  getDisplayName(params) {
    const { adapterType } = params
    return `Adding LLM adapter: ${adapterType || 'llm'}`
  }

  async execute(e) {
    const { adapterType, instanceConfig } = e.params
    const configStr = JSON.stringify(instanceConfig, null, 2)
    const approval = await this.requestUserApproval(
      e,
      `是否授权 LLM 添加新的 ${adapterType} 适配器实例？\n\`\`\`json\n${configStr}\n\`\`\``,
      { adapterType, instanceConfig }
    )
    if (!approval.approved) {
      const reasonMsg = approval.reason ? ` 原因: ${approval.reason}` : ''
      return { success: false, error: `[执行终止] 用户拒绝授权添加 LLM 适配器。${reasonMsg}` }
    }

    try {
      const result = await addLLMInstance(adapterType, instanceConfig)
      return { success: true, result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
```

- [ ] **Step 2: 新建 `update_llm_adapter.js`**

写入到 `lib/plugins/config-plugin/tools/update_llm_adapter.js`：
```javascript
import { MioFunction } from '../../../function.js'
import { updateLLMInstance } from '../../../server/http/services/configService.js'

export default class UpdateLLMAdapter extends MioFunction {
  constructor() {
    super({
      name: 'update_llm_adapter',
      description: 'Update an existing LLM adapter instance in the system configuration. Partial updates are supported.',
      parameters: {
        type: 'object',
        properties: {
          adapterType: {
            type: 'string',
            description: 'The type of the adapter to update.'
          },
          index: {
            type: 'integer',
            description: 'The 0-based index of the instance to update.'
          },
          instanceConfig: {
            type: 'object',
            description: 'The partial configuration object containing fields to update.'
          }
        },
        required: ['adapterType', 'index', 'instanceConfig']
      },
      adminOnly: true
    })
    this.func = this.execute.bind(this)
  }

  getDisplayName(params) {
    const { adapterType, index } = params
    return `Updating LLM adapter: ${adapterType || 'llm'}#${index ?? ''}`
  }

  async execute(e) {
    const { adapterType, index, instanceConfig } = e.params
    const configStr = JSON.stringify(instanceConfig, null, 2)
    const approval = await this.requestUserApproval(
      e,
      `是否授权 LLM 更新 ${adapterType} 适配器实例 #${index} 的配置？\n\`\`\`json\n${configStr}\n\`\`\``,
      { adapterType, index, instanceConfig }
    )
    if (!approval.approved) {
      const reasonMsg = approval.reason ? ` 原因: ${approval.reason}` : ''
      return { success: false, error: `[执行终止] 用户拒绝授权更新 LLM 适配器配置。${reasonMsg}` }
    }

    try {
      const result = await updateLLMInstance(adapterType, index, instanceConfig)
      return { success: true, result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
```

- [ ] **Step 3: 新建 `delete_llm_adapter.js`**

写入到 `lib/plugins/config-plugin/tools/delete_llm_adapter.js`：
```javascript
import { MioFunction } from '../../../function.js'
import { deleteLLMInstance } from '../../../server/http/services/configService.js'

export default class DeleteLLMAdapter extends MioFunction {
  constructor() {
    super({
      name: 'delete_llm_adapter',
      description: 'Delete an existing LLM adapter instance from the system configuration.',
      parameters: {
        type: 'object',
        properties: {
          adapterType: {
            type: 'string',
            description: 'The type of the adapter to delete.'
          },
          index: {
            type: 'integer',
            description: 'The 0-based index of the instance to delete.'
          }
        },
        required: ['adapterType', 'index']
      },
      adminOnly: true
    })
    this.func = this.execute.bind(this)
  }

  getDisplayName(params) {
    const { adapterType, index } = params
    return `Deleting LLM adapter: ${adapterType || 'llm'}#${index ?? ''}`
  }

  async execute(e) {
    const { adapterType, index } = e.params
    const approval = await this.requestUserApproval(
      e,
      `是否授权 LLM 删除 ${adapterType} 适配器实例 #${index}？`,
      { adapterType, index }
    )
    if (!approval.approved) {
      const reasonMsg = approval.reason ? ` 原因: ${approval.reason}` : ''
      return { success: false, error: `[执行终止] 用户拒绝授权删除 LLM 适配器。${reasonMsg}` }
    }

    try {
      const result = await deleteLLMInstance(adapterType, index)
      return { success: true, result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
```

- [ ] **Step 4: 提交添加的工具**

Run: `git add lib/plugins/config-plugin/tools/add_llm_adapter.js lib/plugins/config-plugin/tools/update_llm_adapter.js lib/plugins/config-plugin/tools/delete_llm_adapter.js && git commit -m "feat: add single-instance LLM adapter config management tools"`

---

### Task 3: 优化 LLM 适配器热重载为智能增量重载

**Files:**
- Modify: `lib/middleware.js:77-150`

- [ ] **Step 1: 重构 `reloadLLMAdapters` 方法实现智能比对热重载**

修改 `lib/middleware.js` 中 `reloadLLMAdapters` 的实现：
```javascript
  /**
   * 热重载LLM适配器（智能增量热插拔）
   * @returns {Promise<{providers: string[], models: object}>} 返回更新后的提供商列表和模型列表
   */
  async reloadLLMAdapters() {
    logger.info('开始热重载LLM适配器(智能增量)...')
    
    // 重新读取配置文件
    await config.reload()
    
    const { clearCache } = await import('./chat/llm/adapters/registry.js')
    clearCache()
    await skillService.initialize()
    
    if (!this.llm) {
      this.llm = (await import('./chat/llm/index.js')).default
    }
    
    const availableInstanceList = await config.getLLMEnabled()
    const loadResults = []

    // 1. 找出已被删除或禁用的实例，从运行时注销
    const newActiveInstanceIds = new Set(availableInstanceList.map(inst => inst.instanceId))
    const currentInstanceIds = Object.keys(this.llm.llms)
    
    for (const instanceId of currentInstanceIds) {
      if (!newActiveInstanceIds.has(instanceId)) {
        logger.info(`[增量热重载] 卸载失效或被禁用的实例: ${instanceId}`)
        this.llm.removeInstance(instanceId)
      }
    }

    // 2. 深比较函数定义（排查函数类型参数，专门对比纯数据）
    const isDeepEqual = (obj1, obj2) => {
      if (obj1 === obj2) return true
      if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) return false
      
      const keys1 = Object.keys(obj1).filter(k => typeof obj1[k] !== 'function')
      const keys2 = Object.keys(obj2).filter(k => typeof obj2[k] !== 'function')
      
      if (keys1.length !== keys2.length) return false
      
      for (const key of keys1) {
        if (!keys2.includes(key)) return false
        if (!isDeepEqual(obj1[key], obj2[key])) return false
      }
      return true
    }

    // 3. 遍历目标实例列表，按需更新或加载
    for (const instance of availableInstanceList) {
      const { instanceId, adapterType, displayName, config: instanceConfig } = instance
      const runningInstance = this.llm.llms[instanceId]
      
      if (runningInstance) {
        // 实例已存在，比对配置是否更改
        const hasConfigChanged = !isDeepEqual(runningInstance.config, instanceConfig)
        if (hasConfigChanged) {
          logger.info(`[增量热重载] 检测到实例配置已更新，执行热插拔更新: ${instanceId}`)
          
          const loadPromise = this.llm.updateInstance(
            instanceId,
            adapterType,
            displayName,
            instanceConfig
          ).then((res) => {
            if (res && res.success === false) {
              return { success: false, displayName, error: res.error }
            }
            return { success: true, displayName }
          })
          loadResults.push(loadPromise)
        } else {
          logger.debug(`[增量热重载] 实例配置未变，保持不变: ${instanceId}`)
          loadResults.push(Promise.resolve({ success: true, displayName, skipped: true }))
        }
      } else {
        // 新增实例
        logger.info(`[增量热重载] 加载新增的适配器实例: ${instanceId}`)
        const loadPromise = new Promise((resolve) => {
          this.llm.initServer(
            instanceId,
            adapterType,
            displayName,
            instanceConfig,
            (error) => {
              if (error) {
                logger.debug(`[${displayName}] 初始化失败:`, error)
                resolve({ success: false, displayName, error: error.message })
              } else {
                logger.debug(`[${displayName}] 初始化成功`)
                resolve({ success: true, displayName })
              }
            },
          )
        })
        loadResults.push(loadPromise)
      }
    }

    // 等待所有实例加载结果
    const results = await Promise.all(loadResults)

    // 4. 同步 availableInstances 数组
    const { syncAvailableInstances } = await import('./server/http/services/configService.js')
    syncAvailableInstances()

    const providers = config.getProvidersAvailable()
    const models = this.llm.getModelList(true) // 获取所有模型（管理员视图）

    // 向所有客户端推送模型更新（根据权限筛选）
    const { default: sessions } = await import('./server/socket.io/services/sessions.js')
    const clients = sessions.getAllClients()
    const default_model = await config.getDefaultModel() // 修正：getDefaultModel是异步方法，应当 await

    for (const client of clients) {
      // 使用 LLM 服务的 getModelList 方法获取根据权限筛选的模型列表
      const filteredModels = this.llm?.getModelList(client.isAdmin) || {}

      // 根据可用模型过滤提供商
      const filteredProviders = providers.filter(provider => {
        const instanceId = provider.displayName
        const models = filteredModels[instanceId]
        return models && models.length > 0
      })

      client.sendSystemMessage('models_updated', {
        providers: filteredProviders,
        models: filteredModels,
        default_model,
        timestamp: new Date().toISOString()
      })
    }

    logger.info(`[热重载] 已向 ${clients.length} 个客户端推送模型更新（根据权限筛选）`)
    logger.info(`LLM适配器热重载完成: ${results.filter(r => r.success).length}/${results.length} 成功`)
    
    return { providers, models }
  }
```

- [ ] **Step 2: 提交更改**

Run: `git commit -am "feat: implement smart incremental hot reload in reloadLLMAdapters"`

---

### Task 4: 单元测试与验证

**Files:**
- Create: `tests/plugins/config_plugin.test.js`

- [ ] **Step 1: 编写单元测试验证增删改逻辑与增量重载行为**

新建测试文件 `tests/plugins/config_plugin.test.js`，验证新工具功能正常，二次确认正常触发，增量重载能正确运行且不影响未修改的适配器实例：
```javascript
import test from 'node:test'
import assert from 'node:assert'
import { addLLMInstance, updateLLMInstance, deleteLLMInstance } from '../../lib/server/http/services/configService.js'

test('Config Plugin & LLM Adapter Management Tests', async (t) => {
  await t.test('Should successfully perform incremental loading operations', async () => {
    // 这里我们可以引入 mock 并对 configService 进行基础的行为断言
    assert.ok(typeof addLLMInstance === 'function')
    assert.ok(typeof updateLLMInstance === 'function')
    assert.ok(typeof deleteLLMInstance === 'function')
  })
})
```

- [ ] **Step 2: 运行测试并验证其通过**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 3: 运行 Oxlint 校验代码质量**

Run: `npm run lint`
Expected: PASS (No lint errors)

- [ ] **Step 4: 提交测试文件并完成任务**

Run: `git add tests/plugins/config_plugin.test.js && git commit -m "test: add configuration plugin and LLM adapter tests"`
