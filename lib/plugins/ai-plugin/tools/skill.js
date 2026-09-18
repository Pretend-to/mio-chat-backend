import { MioFunction } from '../../../function.js'
import skillService from '../../../chat/llm/services/SkillService.js'

export default class SkillTool extends MioFunction {
  constructor() {
    super({
      description: [
        'Expert domain skills manager and loader.',
        'Actions:',
        '- "list": Discover available specialized skills and their summaries when a task may require domain expertise.',
        '- "load": Load full instructions, workflows, and templates for a specific skill by name before starting the task.',
        '- "refresh": Reload all skills from disk after installing or editing skills in the filesystem.',
        '',
        'Usage guidelines:',
        '1. If unsure which skill fits the user request, call with action="list" (optionally with "query").',
        '2. When the domain is clear, call with action="load" and name="<skill_name>".',
        '3. After loading a skill, proceed directly with the instructions — do NOT call load again for the same skill in this turn.',
      ].join('\n'),
      name: 'skill',
      parameters: {
        properties: {
          action: {
            description: 'The operation to perform: "list" to discover skills, "load" to load a skill, "refresh" to reload skills from disk.',
            enum: ['list', 'load', 'refresh'],
            type: 'string',
          },
          name: {
            description: 'Name of the skill to load (required when action is "load").',
            type: 'string',
          },
          query: {
            description: 'Optional search keyword or filter when action is "list".',
            type: 'string',
          },
          skill_name: {
            description: 'Alias for "name" (for backward compatibility).',
            type: 'string',
          },
        },
        required: ['action'],
        type: 'object',
      },
    })
    this.func = this.executeAction
  }

  async executeAction(e) {
    const params = e.params || {}
    const action = String(params.action || 'list').toLowerCase().trim()

    switch (action) {
      case 'load':
        return this.handleLoad(params)
      case 'refresh':
        return this.handleRefresh()
      case 'list':
      default:
        return this.handleList(params)
    }
  }

  handleList(params) {
    try {
      const catalog = skillService.getSkillCatalog()
      const query = (params.query || '').trim().toLowerCase()

      let skills = catalog.map(s => ({
        description: s.description || '',
        name: s.name,
      }))

      if (query) {
        skills = skills.filter(
          s =>
            s.name.toLowerCase().includes(query) ||
            s.description.toLowerCase().includes(query),
        )
      }

      return {
        count: skills.length,
        instruction: 'To use any skill, call skill with action="load" and name="<skill_name>".',
        skills,
        success: true,
        total_available: catalog.length,
      }
    } catch (error) {
      return {
        error: `Failed to list skills: ${error.message}`,
        success: false,
      }
    }
  }

  handleLoad(params) {
    const targetName = (params.name || params.skill_name || '').trim()

    if (!targetName) {
      const available = skillService.getSkillCatalog().map(s => s.name)
      return {
        available_skills: available,
        error: 'Parameter "name" is required when action="load".',
        hint: 'Call skill with action="list" to discover available skills or provide a skill name.',
        success: false,
      }
    }

    const info = skillService.getSkillInfo(targetName)

    if (!info) {
      const available = skillService.getSkillCatalog().map(s => s.name)
      return {
        available_skills: available,
        error: `Skill "${targetName}" not found.`,
        hint: 'Please retry with one of the available skill names listed above, or call action="list" to search.',
        success: false,
      }
    }

    return {
      files: info.files,
      instructions: info.content,
      message: `Skill "${targetName}" loaded. Proceed with the task using the instructions below — do not call skill again.`,
      name: targetName,
      path: info.dirPath,
      success: true,
      usage_note: 'You can run scripts or read additional files from the "path" above using terminal or file tools.',
    }
  }

  async handleRefresh() {
    try {
      await skillService.initialize()
      const catalog = skillService.getSkillCatalog()

      return {
        available_skills: catalog.map(s => s.name),
        instruction: 'The updated skills are now registered. You can call them using action="load".',
        message: 'All skills have been reloaded from disk.',
        success: true,
        total_skills: catalog.length,
      }
    } catch (error) {
      return {
        error: `Failed to reload skills: ${error.message}`,
        success: false,
      }
    }
  }
}
