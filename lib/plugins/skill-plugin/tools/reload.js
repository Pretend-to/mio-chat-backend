import { MioFunction } from '../../../function.js'
import skillService from '../../../chat/llm/services/SkillService.js'

export default class ReloadSkillTool extends MioFunction {
  constructor() {
    super({
      name: 'reload_skills',
      description: [
        'Reload all agent skills from disk.',
        'Call this tool immediately after creating a new skill directory, updating a SKILL.md file, or manually adding skills to the filesystem.',
        'This will refresh the skill registry, making new or updated skills available for use in the next turn of the conversation.',
      ].join('\n'),
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      adminOnly: false,
    })
    this.func = this.reloadSkills
  }

  async reloadSkills() {
    try {
      await skillService.initialize()
      const catalog = skillService.getSkillCatalog()
      
      return {
        success: true,
        message: 'All skills have been reloaded from disk.',
        total_skills: catalog.length,
        available_skills: catalog.map(s => s.name),
        instruction: 'The updated skills are now registered. You can call them in the next turn if they match the user request.',
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to reload skills: ${error.message}`,
      }
    }
  }
}
