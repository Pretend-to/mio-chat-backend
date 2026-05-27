# Config Plugin 二次确认与 LLM 适配器增量热重载设计

## 1. 目标与背景

为了提升系统的安全性和可用性，并减少大模型在配置更新时的 Token 消耗，我们需要：
1. **配置写入操作二次确认**：对所有配置项的写入、修改操作（如系统配置更新、插件配置更新、以及适配器增量管理）均接入 `requestUserApproval` 进行交互式确认拦截。二次确认提示文本使用**中文**，方便国内用户阅读。
2. **新增细粒度适配器管理工具**：在 `config-plugin` 中提供针对单个 LLM 适配器实例的增删改工具：`add_llm_adapter`、`update_llm_adapter`、`delete_llm_adapter`。使大模型无需全量输出适配器数组，仅输出变更的单个实例局部数据，极大节省 Token 开销。
3. **适配器智能增量热重载**：优化底层 `reloadLLMAdapters()` 热更新算法。在检测到配置变化时，只对受到影响（新增、修改、禁用或删除）的特定适配器实例进行增量操作，运行中的未修改适配器不受任何影响，保持长连接可用。
4. **统一英文自定义显示名称 (getDisplayName)**：为 `config-plugin` 下的所有工具设计一致的英文动作描述，提供优秀的用户界面体验。

---

## 2. 工具设计与二次确认

### 2.1 新增 LLM 适配器实例工具 (`add_llm_adapter.js`)
* **作用**：向指定类型的适配器列表末尾添加一个新实例。
* **参数**：
  * `adapterType` (string): 适配器类型（如 `openai`, `gemini`）。
  * `instanceConfig` (object): 该实例的具体配置。
* **二次确认文本**：
  `是否授权 LLM 添加新的 ${adapterType} 适配器实例？\n\`\`\`json\n${JSON.stringify(instanceConfig, null, 2)}\n\`\`\``
* **getDisplayName**：`Adding LLM adapter: ${adapterType}`

### 2.2 更新单个 LLM 适配器实例工具 (`update_llm_adapter.js`)
* **作用**：仅对某个适配器类型下指定索引的实例执行增量合并修改。
* **参数**：
  * `adapterType` (string): 适配器类型。
  * `index` (integer): 目标实例的 0-based 索引。
  * `instanceConfig` (object): 增量合并的更新字段（如 `{"api_key": "new_key"}`）。
* **二次确认文本**：
  `是否授权 LLM 更新 ${adapterType} 适配器实例 #${index} 的配置？\n\`\`\`json\n${JSON.stringify(instanceConfig, null, 2)}\n\`\`\``
* **getDisplayName**：`Updating LLM adapter: ${adapterType}#${index}`

### 2.3 删除单个 LLM 适配器实例工具 (`delete_llm_adapter.js`)
* **作用**：从配置列表中彻底删除指定类型与索引的适配器实例。
* **参数**：
  * `adapterType` (string)。
  * `index` (integer)。
* **二次确认文本**：
  `是否授权 LLM 删除 ${adapterType} 适配器实例 #${index}？`
* **getDisplayName**：`Deleting LLM adapter: ${adapterType}#${index}`

### 2.4 系统配置与插件配置更新二次确认
* **`update_config.js`**：
  * **二次确认文本**：`是否授权 LLM 更新系统配置？\n\`\`\`json\n${JSON.stringify(updates, null, 2)}\n\`\`\``
  * **getDisplayName**：`Updating system config: ${Object.keys(updates).join(', ')}`
* **`plugin_config.js`**：
  * **二次确认文本 (仅在 action === 'update_config' 时拦截)**：`是否授权 LLM 更新插件 "${pluginName}" 的配置？\n\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\``
  * **getDisplayName**：
    * `action === 'update_config'`: `Updating plugin config: ${pluginName}`
    * `action === 'get_config'`: `Reading plugin config: ${pluginName}`
    * `action === 'list_plugins'`: `Listing plugin configs`
* **`get_config.js`** & **`reload.js`**：
  * 只读或重载操作无需进行二次确认拦截。
  * `get_config` 的 `getDisplayName`：`Reading system config`
  * `reload` 的 `getDisplayName`：`Reloading: ${target === 'plugin' ? pluginName : 'LLM adapters'}`

---

## 3. 适配器智能增量热重载设计 (`lib/middleware.js`)

重写 `reloadLLMAdapters` 方法，实现不影响其他实例的智能热更新：

```javascript
async reloadLLMAdapters() {
  logger.info('开始智能增量热重载LLM适配器...')
  
  // 1. 重新拉取最新的数据库配置到内存
  await config.reload()
  
  // 清除适配器列表缓存，重新初始化 Skill
  const { clearCache } = await import('./chat/llm/adapters/registry.js')
  clearCache()
  await skillService.initialize()
  
  if (!this.llm) {
    this.llm = (await import('./chat/llm/index.js')).default
  }
  
  // 获取当前配置下所有应该启用的适配器实例列表
  const availableInstanceList = await config.getLLMEnabled()
  const loadResults = []

  // 2. 比对内存与新配置，找出需要注销的实例 (已被禁用或被删除)
  const newActiveInstanceIds = new Set(availableInstanceList.map(inst => inst.instanceId))
  const currentInstanceIds = Object.keys(this.llm.llms)
  
  for (const instanceId of currentInstanceIds) {
    if (!newActiveInstanceIds.has(instanceId)) {
      logger.info(`[增量热重载] 卸载失效或被禁用的实例: ${instanceId}`)
      this.llm.removeInstance(instanceId)
    }
  }

  // 3. 遍历目标实例列表，选择性进行更新或新增
  for (const instance of availableInstanceList) {
    const { instanceId, adapterType, displayName, config: instanceConfig } = instance
    const runningInstance = this.llm.llms[instanceId]
    
    if (runningInstance) {
      // 若实例已在运行中，深比较配置（排除函数类型参数）
      const hasConfigChanged = !isDeepEqual(runningInstance.config, instanceConfig)
      if (hasConfigChanged) {
        logger.info(`[增量热重载] 检测到实例配置改变，重新加载: ${instanceId}`)
        const res = await this.llm.updateInstance(instanceId, adapterType, displayName, instanceConfig)
        loadResults.push({ success: res?.success !== false, displayName })
      } else {
        logger.debug(`[增量热重载] 实例配置未改变，保持状态: ${instanceId}`)
        loadResults.push({ success: true, displayName, skipped: true })
      }
    } else {
      // 全新实例，执行加载挂载
      logger.info(`[增量热重载] 加载新增的适配器实例: ${instanceId}`)
      const loadPromise = new Promise((resolve) => {
        this.llm.initServer(instanceId, adapterType, displayName, instanceConfig, (error) => {
          if (error) {
            resolve({ success: false, displayName, error: error.message })
          } else {
            resolve({ success: true, displayName })
          }
        })
      })
      loadResults.push(await loadPromise)
    }
  }

  // 4. 同步可用实例列表状态并向所有客户端推送更新
  const { syncAvailableInstances } = await import('./server/http/services/configService.js')
  syncAvailableInstances()
  
  // 广播模型列表给客户端...
}
```

---

## 4. 验证方案

1. **测试驱动开发 (TDD) / 单元测试**：
   * 编写针对 `add_llm_adapter`、`update_llm_adapter`、`delete_llm_adapter` 工具功能的单元测试。
   * 编写针对 `reloadLLMAdapters` 智能重载的测试，验证在其中一个配置修改时，其他适配器实例的构造函数未被重复调用、内存引用依然完整且不丢失。
2. **人工联调确认**：
   * 启动 Web 后台，由前端界面模拟 LLM 调用这几个写入工具，观察是否弹出带有美观 JSON 描述的中文二次确认对话框。
   * 检查执行完更新后，受控的 LLM 实例正常在线并热加载了模型，未更新的 LLM 实例不受任何干扰。
