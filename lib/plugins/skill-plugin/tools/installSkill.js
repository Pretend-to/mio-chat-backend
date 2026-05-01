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
    })
    this.func = this._execute
  }

  async _execute(e) {
    let { repo_url, skill_folder_name } = e.params
    
    const skillsDir = path.join(process.cwd(), '.miochat/skills')
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true })
    }

    // Check if repo_url is a local directory
    const isLocalDir = fs.existsSync(repo_url) && fs.lstatSync(repo_url).isDirectory()

    // Determine target folder name
    let targetFolderName = skill_folder_name
    if (!targetFolderName) {
      targetFolderName = isLocalDir 
        ? path.basename(repo_url)
        : repo_url.split('/').pop().replace('.git', '')
    }
    
    const targetPath = path.join(skillsDir, targetFolderName)

    if (fs.existsSync(targetPath)) {
      return { error: `安装失败: 目标目录 "${targetFolderName}" 已存在。` }
    }

    try {
      if (isLocalDir) {
        // Local installation: Copy directory
        logger.info(`[InstallSkill] 检测到本地目录，正在安装: ${repo_url} -> ${targetPath}`)
        await execPromise(`cp -r "${repo_url}" "${targetPath}"`)
      } else {
        // Git installation: Clone repository
        // Convert short format "user/repo" to full URL
        if (!repo_url.startsWith('http') && repo_url.includes('/')) {
          repo_url = `https://github.com/${repo_url}.git`
        }
        logger.info(`[InstallSkill] 正在从 Git 克隆技能: ${repo_url} -> ${targetPath}`)
        await execPromise(`git clone --depth 1 ${repo_url} "${targetPath}"`)
      }
      
      // Refresh skill catalog
      await skillService.initialize()
      
      return {
        success: true,
        message: `技能 "${targetFolderName}" 安装成功。`,
        path: targetPath,
        catalog: skillService.getSkillCatalog().map(s => s.name)
      }
    } catch (err) {
      return {
        success: false,
        error: `安装失败: ${err.message}`
      }
    }
  }
}
