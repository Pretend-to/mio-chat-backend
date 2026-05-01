import { MioFunction } from '../../../function.js'
import skillService from '../../../chat/llm/services/SkillService.js'

export default class SkillTool extends MioFunction {
  constructor() {
    super({
      name: 'Skill',
      description: 'Load a skill\'s full instructions when relevant to the task. Use this when you need detailed step-by-step guidance for a specific complex task that matches an available skill.',
      parameters: {
        type: 'object',
        properties: {
          skill_name: {
            type: 'string',
            description: 'The name of the skill to load (e.g., "git-workflow", "deploy-app")',
          },
        },
        required: ['skill_name'],
      },
      adminOnly: false,
    })
    this.func = this.loadSkill
  }

  async loadSkill(e) {
    const { skill_name } = e.params
    const info = skillService.getSkillInfo(skill_name)

    if (!info) {
      return {
        error: `Skill "${skill_name}" not found. Please check the available skills in the system prompt.`,
      }
    }

    return {
      message: `Skill "${skill_name}" loaded successfully.`,
      path: info.dirPath,
      instructions: info.content,
      files: info.files,
      usage_note: `You can run scripts or read additional files from the "path" above using terminal or file tools.`,
    }
  }
}
