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
    const { action, tools, groups, enabled } = e.params

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
          allToolsMap.set(tool.name, groupName)
          groupTools.push({
            description: tool.description,
            name: tool.name
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

    if (action === 'list') {
      const resultGroups = {}
      for (const [groupName, toolsList] of groupToolsMap.entries()) {
        resultGroups[groupName] = toolsList.map(t => ({
          description: t.description,
          enabled: enabledSet.has(t.name),
          name: t.name
        }))
      }
      return {
        groups: resultGroups,
        success: true
      }
    }

    if (action === 'toggle') {
      if (enabled === undefined) {
        throw new Error('Parameter "enabled" is required for "toggle" action')
      }

      const targetTools = new Set()

      // Gather tools from groups parameter
      if (groups && Array.isArray(groups)) {
        for (const g of groups) {
          const groupToolsList = groupToolsMap.get(g)
          if (groupToolsList) {
            for (const t of groupToolsList) {
              targetTools.add(t.name)
            }
          }
        }
      }

      // Gather tools from individual tools parameter
      if (tools && Array.isArray(tools)) {
        for (const t of tools) {
          if (allToolsMap.has(t)) {
            targetTools.add(t)
          } else {
            logger.warn(`[ToolsManager] Tool "${t}" not found in system.`)
          }
        }
      }

      if (targetTools.size === 0) {
        return {
          message: 'No valid tools or groups specified to toggle.',
          success: false
        }
      }

      // Apply changes to the set
      if (enabled) {
        for (const t of targetTools) {
          enabledSet.add(t)
        }
      } else {
        for (const t of targetTools) {
          enabledSet.delete(t)
        }
      }

      const newToolsList = [...enabledSet]

      // 3. Update memory settings for current request
      if (e.body && e.body.settings && e.body.settings.toolCallSettings) {
        e.body.settings.toolCallSettings.tools = newToolsList
      }

      // 4. Update SQLite database preset if applicable
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



      return {
        activeToolsList: newToolsList,
        dbUpdated,
        enabled: enabled,
        message: `Successfully ${enabled ? 'enabled' : 'disabled'} ${targetTools.size} tool(s).`,
        success: true,
        toggledTools: Array.from(targetTools)
      }
    }

    throw new Error(`Unknown action: ${action}`)
  }
}
