import { MioFunction } from '../../../function.js'
import skillService from '../../../chat/llm/services/SkillService.js'
import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'
import { promisify } from 'util'

const execPromise = promisify(exec)

export default class InstallSkill extends MioFunction {
  constructor() {
    super({
      name: 'InstallSkill',
      description: 'Install a new skill from a GitHub repository. Use this when the user provides a repository link or when you identify a useful skill online.',
      parameters: {
        type: 'object',
        properties: {
          repo_url: {
            type: 'string',
            description: 'The GitHub repository URL (e.g., "https://github.com/user/skill-repo") or short format "user/repo".',
          },
          skill_folder_name: {
            type: 'string',
            description: 'Optional: Custom name for the folder in .miochat/skills/. If omitted, the repo name will be used.',
          }
        },
        required: ['repo_url'],
      },
      adminOnly: true,
      func: this._execute.bind(this)
    })
  }

  async _execute(e) {
    let { repo_url, skill_folder_name } = e.params
    
    // Convert short format "user/repo" to full URL
    if (!repo_url.startsWith('http') && repo_url.includes('/')) {
      repo_url = `https://github.com/${repo_url}.git`
    }

    const skillsDir = path.join(process.cwd(), '.miochat/skills')
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true })
    }

    // Determine target folder
    if (!skill_folder_name) {
      skill_folder_name = repo_url.split('/').pop().replace('.git', '')
    }
    const targetPath = path.join(skillsDir, skill_folder_name)

    if (fs.existsSync(targetPath)) {
      return { error: `技能目录 "${skill_folder_name}" 已存在。请选择其他名称或删除旧目录。` }
    }

    try {
      // Execute git clone
      await execPromise(`git clone --depth 1 ${repo_url} "${targetPath}"`)
      
      // Refresh skill catalog
      await skillService.initialize()
      
      return {
        success: true,
        message: `技能成功安装至 ${targetPath}。`,
        installed_name: skill_folder_name,
        catalog: skillService.getSkillCatalog()
      }
    } catch (err) {
      return {
        success: false,
        error: `克隆仓库失败: ${err.message}`
      }
    }
  }
}
