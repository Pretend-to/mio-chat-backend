import fs from 'fs'
import path from 'path'
import os from 'os'
import yaml from 'js-yaml'

class SkillService {
  constructor() {
    this.skillCatalog = new Map()
    // 插件注册式技能目录：pluginName -> skills 目录绝对路径
    this.pluginSkillDirs = new Map()
    this.skillDirs = [
      // ── 系统内置 ──────────────────────────────────────────────────────────
      path.join(process.cwd(), 'lib/chat/llm/skills'),

      // ── 项目级（当前工作目录）────────────────────────────────────────────
      path.join(process.cwd(), '.agents/skills'),   // Open-standard （npx skills add ...）
      path.join(process.cwd(), '.miochat/skills'),  // 旧版兼容，保留

      // ── 全局（用户家目录）────────────────────────────────────────────────
      path.join(os.homedir(), '.config/agents/skills'), // Open-standard -g 全局安装
      path.join(os.homedir(), '.miochat/skills'),
      path.join(os.homedir(), '.claude/skills'),
      path.join(os.homedir(), '.cursor/skills'),
      path.join(os.homedir(), '.anthropic/skills'),
      path.join(os.homedir(), '.gemini/skills'),
    ]
  }

  /**
   * Initialize and scan all available skills
   */
  async initialize() {
    logger.debug('正在初始化 SkillService 并扫描技能...')
    this._rescanAll()
    logger.info(`[SkillService] 技能扫描完成。当前可用技能总数: ${this.skillCatalog.size}`)
  }

  /**
   * 全量重扫：清空 catalog 后先扫固定目录，再扫插件注册目录。
   * 任何「卸载/重载」都走这里，确保被同名覆盖的固定目录技能能被恢复，
   * 也能让 reload_skills 不会冲刷掉插件注册的 skill。
   */
  _rescanAll() {
    this.skillCatalog.clear()
    for (const dir of this.skillDirs) {
      this._scanSkillDir(dir)
    }
    for (const dir of this.pluginSkillDirs.values()) {
      this._scanSkillDir(dir)
    }
  }

  /**
   * 扫描单个技能目录：其下每个含 SKILL.md 的子目录视为一个 skill（last-wins）
   * @private
   */
  _scanSkillDir(dir) {
    if (!fs.existsSync(dir)) {return}

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) {continue}

        const skillPath = path.join(dir, entry.name)
        const skillMdPath = path.join(skillPath, 'SKILL.md')

        if (fs.existsSync(skillMdPath)) {
          const skillMeta = this._parseSkillFile(skillMdPath, skillPath)
          if (skillMeta) {
            if (this.skillCatalog.has(skillMeta.name)) {
              const existing = this.skillCatalog.get(skillMeta.name)
              logger.warn(`[SkillService] 发现技能冲突: "${skillMeta.name}" (${existing.fullPath} -> ${skillMeta.fullPath})`)
            }
            this.skillCatalog.set(skillMeta.name, skillMeta)
          }
        }
      }
    } catch (error) {
      logger.error(`[SkillService] 扫描技能目录出错 ${dir}:`, error)
    }
  }

  /**
   * 注册某个插件自带的技能目录（注册式）。
   * 一个插件可含多个 skill，重复注册会以最后一次为准。
   * @param {string} pluginName 插件名（作为 registry key 去重/卸载用）
   * @param {string} skillsDir 插件 skills 目录的绝对路径
   */
  registerPluginSkills(pluginName, skillsDir) {
    this.pluginSkillDirs.set(pluginName, skillsDir)
    this._rescanAll()
  }

  /**
   * 卸载某个插件注册的所有技能（禁用/销毁插件时调用）。
   * 全量重扫以恢复可能被该插件同名覆盖的固定目录技能。
   * @param {string} pluginName
   */
  unregisterPluginSkills(pluginName) {
    if (!this.pluginSkillDirs.has(pluginName)) {return}
    this.pluginSkillDirs.delete(pluginName)
    this._rescanAll()
  }

  /**
   * Parse SKILL.md file and extract frontmatter
   * @private
   */
  _parseSkillFile(filePath, dirPath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/
      const match = content.match(frontmatterRegex)

      if (match) {
        const yamlContent = match[1]
        const meta = yaml.load(yamlContent)

        if (meta && meta.name && meta.description) {
          return {
            description: meta.description.trim(),
            dirPath: dirPath,
            fullPath: filePath,
            name: meta.name.toLowerCase(),
            version: meta.version || '1.0.0'
          }
        }
      }
      return null
    } catch (error) {
      logger.error(`Failed to parse skill file ${filePath}:`, error.message)
      return null
    }
  }

  /**
   * Get all loaded skills metadata for system prompt
   */
  getSkillCatalog() {
    return [...this.skillCatalog.values()].map(s => ({
      description: s.description,
      name: s.name
    }))
  }

  /**
   * Get full info of a skill for execution
   * @param {string} name 
   */
  getSkillInfo(name) {
    const skill = this.skillCatalog.get(name.toLowerCase())
    if (!skill) {return null}

    try {
      const content = fs.readFileSync(skill.fullPath, 'utf8')
      const files = this._listAllFiles(skill.dirPath)
      
      return {
        ...skill,
        content,
        files
      }
    } catch (error) {
      logger.error(`Error reading skill info for ${name}:`, error)
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
    if (skills.length === 0) {return ''}
    
    logger.debug(`[SkillService] 正在注入 ${skills.length} 个技能到 System Prompt...`)

    let block = '\n\n<skill_registry>\n'
    block += '  <instruction>\n'
    block += '    The following specialized skills provide expert instructions, file templates, and specific workflows for complex domains. \n'
    block += '    If a user request matches any of these domains, you MUST call the "Skill" tool with the skill name to load the full expertise BEFORE starting the task.\n'
    block += '    The descriptions below are ONLY summaries; the full skill content contains the detailed "how-to" and required patterns.\n'
    block += '  </instruction>\n'
    
    for (const skill of skills) {
      block += `  <skill>\n    <name>${skill.name}</name>\n    <description>${skill.description}</description>\n  </skill>\n`
    }
    
    block += '</skill_registry>\n'
    
    return block
  }
}

export default new SkillService()
