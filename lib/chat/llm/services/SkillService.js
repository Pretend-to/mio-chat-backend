import fs from 'fs'
import path from 'path'
import os from 'os'
import yaml from 'js-yaml'
import logger from '../../../../utils/logger.js'

class SkillService {
  constructor() {
    this.skillCatalog = new Map()
    this.skillDirs = [
      // ── 系统内置 ──────────────────────────────────────────────────────────
      path.join(process.cwd(), 'lib/chat/llm/skills'),

      // ── 项目级（当前工作目录）────────────────────────────────────────────
      path.join(process.cwd(), '.agents/skills'),   // open-standard （npx skills add ...）
      path.join(process.cwd(), '.miochat/skills'),  // 旧版兼容，保留

      // ── 全局（用户家目录）────────────────────────────────────────────────
      path.join(os.homedir(), '.config/agents/skills'), // open-standard -g 全局安装
      path.join(os.homedir(), '.miochat/skills'),
      path.join(os.homedir(), '.claude/skills'),
      path.join(os.homedir(), '.cursor/skills'),
      path.join(os.homedir(), '.anthropic/skills'),
    ]
  }

  /**
   * Initialize and scan all available skills
   */
  async initialize() {
    logger.info('正在初始化 SkillService 并扫描技能...')
    this.skillCatalog.clear()

    for (const dir of this.skillDirs) {
      if (!fs.existsSync(dir)) continue

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        let count = 0
        for (const entry of entries) {
          if (!entry.isDirectory()) continue

          const skillPath = path.join(dir, entry.name)
          const skillMdPath = path.join(skillPath, 'SKILL.md')

          if (fs.existsSync(skillMdPath)) {
            const skillMeta = this._parseSkillFile(skillMdPath, skillPath)
            if (skillMeta) {
              this.skillCatalog.set(skillMeta.name, skillMeta)
              count++
              logger.debug(`[SkillService] 已加载技能: ${skillMeta.name}，来自 ${dir}`)
            }
          }
        }
        if (count > 0) {
          logger.info(`[SkillService] 从目录加载了 ${count} 个技能: ${dir}`)
        }
      } catch (err) {
        logger.error(`[SkillService] 扫描技能目录出错 ${dir}:`, err)
      }
    }

    logger.info(`[SkillService] 初始化完成。当前可用技能总数: ${this.skillCatalog.size}`)
  }

  /**
   * Parse SKILL.md file and extract frontmatter
   * @private
   */
  _parseSkillFile(filePath, dirPath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/
      const match = content.match(frontmatterRegex)

      if (match) {
        const yamlContent = match[1]
        const meta = yaml.load(yamlContent)

        if (meta && meta.name && meta.description) {
          return {
            name: meta.name.toLowerCase(),
            description: meta.description.trim(),
            fullPath: filePath,
            dirPath: dirPath,
            version: meta.version || '1.0.0'
          }
        }
      }
      return null
    } catch (err) {
      logger.error(`Failed to parse skill file ${filePath}:`, err.message)
      return null
    }
  }

  /**
   * Get all loaded skills metadata for system prompt
   */
  getSkillCatalog() {
    return Array.from(this.skillCatalog.values()).map(s => ({
      name: s.name,
      description: s.description
    }))
  }

  /**
   * Get full info of a skill for execution
   * @param {string} name 
   */
  getSkillInfo(name) {
    const skill = this.skillCatalog.get(name.toLowerCase())
    if (!skill) return null

    try {
      const content = fs.readFileSync(skill.fullPath, 'utf-8')
      const files = this._listAllFiles(skill.dirPath)
      
      return {
        ...skill,
        content,
        files
      }
    } catch (err) {
      logger.error(`Error reading skill info for ${name}:`, err)
      return null
    }
  }

  /**
   * Recursively list all files in a directory
   * @private
   */
  _listAllFiles(dir, relativeTo = dir) {
    const results = []
    const list = fs.readdirSync(dir)
    
    for (const file of list) {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)
      const relativePath = path.relative(relativeTo, fullPath)
      
      if (stat && stat.isDirectory()) {
        results.push(...this._listAllFiles(fullPath, relativeTo))
      } else {
        results.push(relativePath)
      }
    }
    return results
  }

  /**
   * Build the XML-style catalog block for system prompt
   */
  buildSystemPromptBlock() {
    const skills = this.getSkillCatalog()
    if (skills.length === 0) return ''

    let block = '\n\n## Available Skills\n'
    block += 'You can use the following specialized skills by calling the "Skill" tool with the skill name.\n'
    
    for (const skill of skills) {
      block += `<skill>\n<name>${skill.name}</name>\n<description>${skill.description}</description>\n</skill>\n`
    }
    
    return block
  }
}

export default new SkillService()
