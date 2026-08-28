import { MioFunction } from '../../../function.js'
import PresetService from '../../../database/services/PresetService.js'

export default class ToolsManager extends MioFunction {
  constructor() {
    super({
      description: 'Manage LLM tools. You can view all available tools (with their enabled/disabled state, grouped by plugin) and enable or disable specific tools or entire plugin groups of tools.',
      name: 'toolsmanager',
      parameters: {
        properties: {
          action: {
            description: 'The action to perform. "list" lists all tools with their status; "toggle" turns tools/groups on or off.',
            enum: ['list', 'toggle'],
            type: 'string'
          },
          enabled: {
            description: 'Whether to enable (true) or disable (false) the specified tools or groups (required for "toggle" action).',
            type: 'boolean'
          },
          groups: {
            description: 'The list of plugin/group names to toggle all tools within those groups (required for "toggle" action if not toggling tools).',
            items: { type: 'string' },
            type: 'array'
          },
          tools: {
            description: 'The list of specific tool names to toggle (required for "toggle" action if not toggling groups).',
            items: { type: 'string' },
            type: 'array'
          }
        },
        required: ['action'],
        type: 'object'
      }
    })
    this.func = this.execute.bind(this)
  }

  getDynamicDescription() {
    const baseDesc = 'Manage the LLM tools available in the current chat session. Call this tool to view all tools (with enabled/disabled state) or to enable/disable specific tools or entire plugin groups of tools. CRITICAL: If the user requests a capability that you do not currently have or a tool that is not active, you must check toolsmanager to see if a suitable tool is available in the system but currently disabled, and if so, enable it to fulfill their request.'

    try {
      const plugins = global.middleware?.plugins || []
      const groupsText = []

      for (const plugin of plugins) {
        const toolsMap = plugin.getTools()
        for (const [groupName, toolsArray] of toolsMap.entries()) {
          if (toolsArray.length === 0) {continue}

          const displayedTools = toolsArray.slice(0, 10).map(t => t.name.split('_mid_')[0])
          let toolListStr = displayedTools.join(', ')
          if (toolsArray.length > 10) {
            toolListStr += `, ... (and ${toolsArray.length - 10} more, call action='list' to view all)`
          }
          groupsText.push(`- Group "${groupName}": [${toolListStr}]`)
        }
      }

      if (groupsText.length > 0) {
        return `${baseDesc}\n\nAvailable groups and sample tools:\n${groupsText.join('\n')}`
      }
    } catch {
      // Fallback
    }

    return baseDesc
  }

  json(type) {
    this.description = this.getDynamicDescription()
    return super.json(type)
  }

  async execute(e) {
    const { action, tools, groups, enabled } = e.params || {}

    // Ensure database service is initialized
    await PresetService.initialize()

    // 1. Get all plugins/tools in the system
    const plugins = global.middleware?.plugins || []
    const allToolsMap = new Map() // ToolName -> groupName
    const groupToolsMap = new Map() // GroupName -> array of tools

    for (const plugin of plugins) {
      const toolsMap = plugin.getTools()
      for (const [groupName, toolsArray] of toolsMap.entries()) {
        const groupTools = []
        for (const tool of toolsArray) {
          const rawName = tool.name
          const baseName = tool.name.split('_mid_')[0]
          allToolsMap.set(rawName, groupName)
          allToolsMap.set(baseName, groupName)
          groupTools.push({
            description: tool.description,
            fullName: rawName,
            name: baseName,
          })
        }
        if (groupTools.length > 0) {
          groupToolsMap.set(groupName, groupTools)
        }
      }
    }

    // 2. Get current enabled tools from settings
    const currentTools = e.body?.settings?.toolCallSettings?.tools || []
    const enabledSet = new Set(currentTools)

    const rawAction = String(action || '').toLowerCase().trim()
    const isList = rawAction === 'list' || rawAction === 'ls'
    const isToggle = rawAction === 'toggle' || rawAction === 'enable' || rawAction === 'disable' || rawAction === 'on' || rawAction === 'off'

    if (isList) {
      const resultGroups = {}
      for (const [groupName, toolsList] of groupToolsMap.entries()) {
        resultGroups[groupName] = toolsList.map(t => ({
          description: t.description,
          enabled: enabledSet.has(t.name) || enabledSet.has(t.fullName),
          name: t.name
        }))
      }
      return {
        groups: resultGroups,
        success: true
      }
    }

    if (isToggle) {
      let isEnabled = enabled
      if (rawAction === 'enable' || rawAction === 'on') isEnabled = true
      if (rawAction === 'disable' || rawAction === 'off') isEnabled = false
      if (typeof isEnabled === 'string') {
        isEnabled = isEnabled === 'true' || isEnabled === '1' || isEnabled === 'on' || isEnabled === 'enable'
      }

      if (isEnabled === undefined) {
        throw new Error('Parameter "enabled" is required for "toggle" action')
      }

      const targetTools = new Set()

      // Normalize groups input (support array, comma-separated string, singular group/plugin)
      const rawGroups = groups || e.params?.group || e.params?.plugin || e.params?.plugins
      const groupList = Array.isArray(rawGroups)
        ? rawGroups
        : (typeof rawGroups === 'string' ? rawGroups.split(/[,，\s]+/).filter(Boolean) : [])

      for (const g of groupList) {
        const groupToolsList = groupToolsMap.get(g)
        if (groupToolsList) {
          for (const t of groupToolsList) {
            targetTools.add(t.name)
          }
        }
      }

      // Normalize tools input (support array, comma-separated string, singular tool/toolName/tool_name)
      const rawTools = tools || e.params?.tool || e.params?.toolName || e.params?.tool_name
      const toolList = Array.isArray(rawTools)
        ? rawTools
        : (typeof rawTools === 'string' ? rawTools.split(/[,，\s]+/).filter(Boolean) : [])

      for (const t of toolList) {
        const base = String(t).split('_mid_')[0].trim()
        if (base) {
          targetTools.add(base)
        }
      }

      if (targetTools.size === 0) {
        return {
          message: 'No valid tools or groups specified to toggle.',
          success: false
        }
      }

      // Apply changes to the set
      if (isEnabled) {
        for (const t of targetTools) {
          enabledSet.add(t)
        }
      } else {
        for (const t of targetTools) {
          enabledSet.delete(t)
          // also delete any matching full names
          for (const item of Array.from(enabledSet)) {
            if (item.split('_mid_')[0] === t) {
              enabledSet.delete(item)
            }
          }
        }
      }

      const newToolsList = [...enabledSet]

      // 3. Update memory settings for current request
      if (e.body && e.body.settings && e.body.settings.toolCallSettings) {
        e.body.settings.toolCallSettings.tools = newToolsList
      }

      if (e.client && typeof e.client.sendSystemMessage === 'function') {
        e.client.sendSystemMessage('contactor_tools_updated', {
          contactorId: e.body?.contactorId,
          tools: newToolsList,
        })
      }

      // 4. Update MemoryStore meta.json for non-web channel environments
      const memoryStore = e.channel?.memory || e.memory
      if (memoryStore && typeof memoryStore.setAgentMeta === 'function') {
        try {
          await memoryStore.setAgentMeta('tools', newToolsList)
          logger.info(`[ToolsManager] ✅ 已成功将更新后的工具列表持久化到渠道记忆存储 (共 ${newToolsList.length} 个工具: ${newToolsList.join(', ')})`)
        } catch (err) {
          logger.error(`[ToolsManager] Failed to persist tools to MemoryStore meta.json:`, err)
        }
      }

      // 5. Update SQLite database preset if applicable
      const presetName = e.body?.settings?.presetSettings?.name
      let dbUpdated = false
      if (presetName) {
        try {
          const dbPreset = await PresetService.findByName(presetName)
          if (dbPreset) {
            if (dbPreset.type !== 'built-in') {
              await PresetService.update(presetName, {
                ...dbPreset,
                tools: newToolsList
              })
              dbUpdated = true
            } else {
              logger.info(`[ToolsManager] Preset "${presetName}" is built-in and read-only. Updated in memory only.`)
            }
          }
        } catch (error) {
          logger.error(`[ToolsManager] Failed to update preset "${presetName}" in database:`, error)
        }
      }

      const noticeText = `🛠️ [工具状态已更新]\n${isEnabled ? '✅ 已启用' : '🚫 已禁用'}: ${Array.from(targetTools).join(', ')}`
      this.setOuterRender(e, [{
        content: noticeText,
        placement: 'outer',
        text: noticeText,
        type: 'text',
      }])

      return {
        activeToolsList: newToolsList,
        dbUpdated,
        enabled: isEnabled,
        extraRender: [{ content: noticeText, placement: 'outer', text: noticeText, type: 'text' }],
        message: `Successfully ${isEnabled ? 'enabled' : 'disabled'} ${targetTools.size} tool(s).`,
        success: true,
        toggledTools: Array.from(targetTools)
      }
    }

    throw new Error(`Unknown action: ${action}`)
  }
}
