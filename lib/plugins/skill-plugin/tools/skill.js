import { MioFunction } from '../../../function.js'
import skillService from '../../../chat/llm/services/SkillService.js'

export default class SkillTool extends MioFunction {
  constructor() {
    super({
      adminOnly: false,
      description: [
        'Load expert instructions for a specific domain BEFORE starting complex tasks.',
        'Call this tool ONCE at the beginning when the task matches a known skill domain.',
        'After receiving the skill instructions, proceed directly with the task — do NOT call this tool again.',
        '',
        'Call this tool when the task involves:',
        '- Creating/modifying MioChat plugins, tools, or agent skills → load "miochat-plugin-builder"',
        '- Precision code editing (replaceBlock, multiReplace, insertAround) → load "miochat-plugin-builder"',
        '- Managing system config, API keys, LLM adapters → load "config-manager"',
        '- Installing skills from Git repos or local directories → load "skill-manager"',
        '- Creating new agent skills/SKILL.md from scratch → load "skill-creator"',
        '- Frontend UI/UX or web page building → load "frontend-design" or "web-artifacts-builder"',
        '',
        'If you recently created a new skill or updated a SKILL.md and it is not appearing, call "reload_skills" first.',
        'Do NOT call this tool if you have already loaded a skill in this conversation turn.',
      ].join('\n'),
      name: 'Skill',
      parameters: {
        properties: {
          skill_name: {
            description: 'Name of the skill to load.',
            type: 'string',
          },
        },
        required: ['skill_name'],
        type: 'object',
      },
    })
    this.func = this.loadSkill
  }

  async loadSkill(e) {
    const { skill_name } = e.params
    const info = skillService.getSkillInfo(skill_name)

    if (!info) {
      const available = skillService.getSkillCatalog().map(s => s.name)
      return {
        available_skills: available,
        error: `Skill "${skill_name}" not found.`,
        hint: 'Please retry with one of the available skill names listed above.',
      }
    }

    return {
      files: info.files,
      instructions: info.content,
      message: `Skill "${skill_name}" loaded. Now proceed with the task using the instructions below — do not call Skill again.`,
      path: info.dirPath,
      usage_note: `You can run scripts or read additional files from the "path" above using terminal or file tools.`,
    }
  }
}
