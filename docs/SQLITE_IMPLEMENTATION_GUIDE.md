# SQLite 实现指南

## 快速开始

### 1. 安装依赖
```bash
pnpm add better-sqlite3
pnpm add -D @types/better-sqlite3  # 为未来 TS 迁移准备
```

### 2. 创建目录结构
```
lib/
├── database/
│   ├── DatabaseManager.js      # 数据库管理器
│   ├── migrations/             # 数据库迁移脚本
│   │   ├── 001_initial.sql
│   │   └── 002_add_indexes.sql
│   └── dao/                    # 数据访问对象
│       ├── BaseDAO.js          # 基础 DAO 类
│       ├── PresetDAO.js        # 预设数据访问
│       ├── PluginConfigDAO.js  # 插件配置数据访问
│       ├── SystemSettingsDAO.js # 系统配置数据访问
│       └── LogConfigDAO.js     # 日志配置数据访问
scripts/
├── migrate-to-sqlite.js        # 数据迁移脚本
├── backup-database.js          # 数据库备份脚本
└── restore-database.js         # 数据库恢复脚本
```

## 核心实现

### 数据库管理器
```javascript
// lib/database/DatabaseManager.js
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import logger from '../../utils/logger.js'

class DatabaseManager {
  constructor() {
    this.dbPath = path.resolve('./data/app.db')
    this.db = null
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return

    try {
      // 确保数据目录存在
      const dataDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      // 连接数据库
      this.db = new Database(this.dbPath)
      
      // 配置数据库
      this.db.pragma('journal_mode = WAL')  // 启用 WAL 模式提升并发性能
      this.db.pragma('foreign_keys = ON')   // 启用外键约束
      this.db.pragma('synchronous = NORMAL') // 平衡性能和安全性
      
      // 运行迁移
      await this.runMigrations()
      
      this.isInitialized = true
      logger.info(`数据库初始化完成: ${this.dbPath}`)
    } catch (error) {
      logger.error('数据库初始化失败:', error)
      throw error
    }
  }

  async runMigrations() {
    // 创建迁移记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 获取已执行的迁移
    const executedMigrations = this.db
      .prepare('SELECT filename FROM migrations')
      .all()
      .map(row => row.filename)

    // 执行新的迁移文件
    const migrationsDir = path.join(path.dirname(import.meta.url.replace('file://', '')), 'migrations')
    
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort()

      for (const file of migrationFiles) {
        if (!executedMigrations.includes(file)) {
          const migrationPath = path.join(migrationsDir, file)
          const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
          
          logger.info(`执行数据库迁移: ${file}`)
          this.db.exec(migrationSQL)
          
          // 记录迁移执行
          this.db.prepare('INSERT INTO migrations (filename) VALUES (?)').run(file)
        }
      }
    }
  }

  getDatabase() {
    if (!this.isInitialized) {
      throw new Error('数据库未初始化，请先调用 initialize()')
    }
    return this.db
  }

  // 事务支持
  transaction(fn) {
    return this.db.transaction(fn)
  }

  // 备份数据库
  async backup(backupPath) {
    return new Promise((resolve, reject) => {
      this.db.backup(backupPath)
        .then(() => {
          logger.info(`数据库备份完成: ${backupPath}`)
          resolve()
        })
        .catch(reject)
    })
  }

  close() {
    if (this.db) {
      this.db.close()
      this.isInitialized = false
      logger.info('数据库连接已关闭')
    }
  }
}

export default new DatabaseManager()
```

### 基础 DAO 类
```javascript
// lib/database/dao/BaseDAO.js
import DatabaseManager from '../DatabaseManager.js'
import logger from '../../../utils/logger.js'

class BaseDAO {
  constructor(tableName) {
    this.tableName = tableName
  }

  get db() {
    return DatabaseManager.getDatabase()
  }

  // 通用查询方法
  findAll(orderBy = 'id') {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} ORDER BY ${orderBy}`)
      return stmt.all()
    } catch (error) {
      logger.error(`查询 ${this.tableName} 失败:`, error)
      throw error
    }
  }

  findById(id) {
    try {
      const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
      return stmt.get(id)
    } catch (error) {
      logger.error(`根据 ID 查询 ${this.tableName} 失败:`, error)
      throw error
    }
  }

  // 通用删除方法
  deleteById(id) {
    try {
      const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`)
      const result = stmt.run(id)
      return result.changes > 0
    } catch (error) {
      logger.error(`删除 ${this.tableName} 记录失败:`, error)
      throw error
    }
  }

  // 获取记录总数
  count(whereClause = '', params = []) {
    try {
      const sql = `SELECT COUNT(*) as count FROM ${this.tableName}${whereClause ? ' WHERE ' + whereClause : ''}`
      const stmt = this.db.prepare(sql)
      const result = stmt.get(...params)
      return result.count
    } catch (error) {
      logger.error(`统计 ${this.tableName} 记录数失败:`, error)
      throw error
    }
  }

  // 分页查询
  findWithPagination(page = 1, pageSize = 20, orderBy = 'id', whereClause = '', params = []) {
    try {
      const offset = (page - 1) * pageSize
      const sql = `
        SELECT * FROM ${this.tableName}
        ${whereClause ? 'WHERE ' + whereClause : ''}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `
      const stmt = this.db.prepare(sql)
      const items = stmt.all(...params, pageSize, offset)
      const total = this.count(whereClause, params)
      
      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    } catch (error) {
      logger.error(`分页查询 ${this.tableName} 失败:`, error)
      throw error
    }
  }
}

export default BaseDAO
```

### 预设 DAO 实现
```javascript
// lib/database/dao/PresetDAO.js
import BaseDAO from './BaseDAO.js'
import logger from '../../../utils/logger.js'

class PresetDAO extends BaseDAO {
  constructor() {
    super('presets')
  }

  // 根据名称查找预设
  findByName(name) {
    try {
      const stmt = this.db.prepare('SELECT * FROM presets WHERE name = ?')
      const result = stmt.get(name)
      
      if (result) {
        // 解析 JSON 字段
        result.history = JSON.parse(result.history)
        result.tools = JSON.parse(result.tools)
      }
      
      return result
    } catch (error) {
      logger.error('根据名称查询预设失败:', error)
      throw error
    }
  }

  // 根据类型查找预设
  findByType(type) {
    try {
      const stmt = this.db.prepare('SELECT * FROM presets WHERE type = ? ORDER BY name')
      const results = stmt.all(type)
      
      return results.map(result => ({
        ...result,
        history: JSON.parse(result.history),
        tools: JSON.parse(result.tools)
      }))
    } catch (error) {
      logger.error('根据类型查询预设失败:', error)
      throw error
    }
  }

  // 根据分类查找预设
  findByCategory(category) {
    try {
      const stmt = this.db.prepare('SELECT * FROM presets WHERE category = ? ORDER BY name')
      const results = stmt.all(category)
      
      return results.map(result => ({
        ...result,
        history: JSON.parse(result.history),
        tools: JSON.parse(result.tools)
      }))
    } catch (error) {
      logger.error('根据分类查询预设失败:', error)
      throw error
    }
  }

  // 创建预设
  create(preset) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO presets (
          name, type, category, history, opening, textwrapper, 
          tools, recommended, hidden
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      const result = stmt.run(
        preset.name,
        preset.type || 'custom',
        preset.category || 'common',
        JSON.stringify(preset.history || []),
        preset.opening || '',
        preset.textwrapper || '',
        JSON.stringify(preset.tools || []),
        preset.recommended ? 1 : 0,
        preset.hidden ? 1 : 0
      )
      
      logger.info(`创建预设成功: ${preset.name}`)
      return result.lastInsertRowid
    } catch (error) {
      logger.error('创建预设失败:', error)
      throw error
    }
  }

  // 更新预设
  update(name, preset) {
    try {
      const stmt = this.db.prepare(`
        UPDATE presets 
        SET history = ?, opening = ?, textwrapper = ?, tools = ?, 
            recommended = ?, hidden = ?, updated_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `)
      
      const result = stmt.run(
        JSON.stringify(preset.history || []),
        preset.opening || '',
        preset.textwrapper || '',
        JSON.stringify(preset.tools || []),
        preset.recommended ? 1 : 0,
        preset.hidden ? 1 : 0,
        name
      )
      
      if (result.changes > 0) {
        logger.info(`更新预设成功: ${name}`)
        return true
      } else {
        logger.warn(`预设不存在: ${name}`)
        return false
      }
    } catch (error) {
      logger.error('更新预设失败:', error)
      throw error
    }
  }

  // 删除预设
  deleteByName(name) {
    try {
      const stmt = this.db.prepare('DELETE FROM presets WHERE name = ?')
      const result = stmt.run(name)
      
      if (result.changes > 0) {
        logger.info(`删除预设成功: ${name}`)
        return true
      } else {
        logger.warn(`预设不存在: ${name}`)
        return false
      }
    } catch (error) {
      logger.error('删除预设失败:', error)
      throw error
    }
  }

  // 检查预设是否存在
  exists(name) {
    try {
      const stmt = this.db.prepare('SELECT 1 FROM presets WHERE name = ?')
      return !!stmt.get(name)
    } catch (error) {
      logger.error('检查预设存在性失败:', error)
      throw error
    }
  }

  // 获取预设统计信息
  getStats() {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          type,
          category,
          COUNT(*) as count
        FROM presets 
        GROUP BY type, category
        ORDER BY type, category
      `)
      
      return stmt.all()
    } catch (error) {
      logger.error('获取预设统计信息失败:', error)
      throw error
    }
  }

  // 搜索预设
  search(keyword, limit = 50) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM presets 
        WHERE name LIKE ? OR textwrapper LIKE ?
        ORDER BY name
        LIMIT ?
      `)
      
      const searchTerm = `%${keyword}%`
      const results = stmt.all(searchTerm, searchTerm, limit)
      
      return results.map(result => ({
        ...result,
        history: JSON.parse(result.history),
        tools: JSON.parse(result.tools)
      }))
    } catch (error) {
      logger.error('搜索预设失败:', error)
      throw error
    }
  }
}

export default new PresetDAO()
```

## 数据迁移脚本

### 主迁移脚本
```javascript
// scripts/migrate-to-sqlite.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import DatabaseManager from '../lib/database/DatabaseManager.js'
import PresetDAO from '../lib/database/dao/PresetDAO.js'
import PluginConfigDAO from '../lib/database/dao/PluginConfigDAO.js'
import logger from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class DataMigrator {
  constructor() {
    this.stats = {
      presets: { success: 0, failed: 0 },
      plugins: { success: 0, failed: 0 }
    }
  }

  async migrate() {
    try {
      logger.info('开始数据迁移到 SQLite...')
      
      // 初始化数据库
      await DatabaseManager.initialize()
      
      // 备份现有数据
      await this.backupExistingData()
      
      // 迁移预设数据
      await this.migratePresets()
      
      // 迁移插件配置
      await this.migratePluginConfigs()
      
      // 输出迁移统计
      this.printStats()
      
      logger.info('数据迁移完成!')
    } catch (error) {
      logger.error('数据迁移失败:', error)
      throw error
    }
  }

  async backupExistingData() {
    const backupDir = path.resolve(__dirname, '../backup', new Date().toISOString().split('T')[0])
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    // 备份预设目录
    const presetsDir = path.resolve(__dirname, '../presets')
    if (fs.existsSync(presetsDir)) {
      await this.copyDirectory(presetsDir, path.join(backupDir, 'presets'))
    }

    // 备份插件配置
    const pluginsConfigDir = path.resolve(__dirname, '../config/plugins')
    if (fs.existsSync(pluginsConfigDir)) {
      await this.copyDirectory(pluginsConfigDir, path.join(backupDir, 'plugins'))
    }

    logger.info(`数据备份完成: ${backupDir}`)
  }

  async migratePresets() {
    logger.info('开始迁移预设数据...')
    
    const presetsDir = path.resolve(__dirname, '../presets')
    const builtInDir = path.join(presetsDir, 'built-in')
    const customDir = path.join(presetsDir, 'custom')

    // 迁移内置预设
    if (fs.existsSync(builtInDir)) {
      await this.migratePresetsFromDir(builtInDir, 'built-in')
    }

    // 迁移自定义预设
    if (fs.existsSync(customDir)) {
      await this.migratePresetsFromDir(customDir, 'custom')
    }
  }

  async migratePresetsFromDir(dir, type) {
    const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'))
    
    for (const file of files) {
      try {
        const filePath = path.join(dir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const preset = JSON.parse(content)
        
        // 设置预设类型
        preset.type = type
        
        // 确定分类
        if (preset.hidden) {
          preset.category = 'hidden'
        } else if (preset.recommended) {
          preset.category = 'recommended'
        } else {
          preset.category = 'common'
        }
        
        // 保存到数据库
        await PresetDAO.create(preset)
        this.stats.presets.success++
        
        logger.debug(`迁移预设成功: ${preset.name}`)
      } catch (error) {
        this.stats.presets.failed++
        logger.error(`迁移预设失败 ${file}:`, error.message)
      }
    }
  }

  async migratePluginConfigs() {
    logger.info('开始迁移插件配置...')
    
    const pluginsDir = path.resolve(__dirname, '../config/plugins')
    if (!fs.existsSync(pluginsDir)) return

    const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.json'))
    
    for (const file of files) {
      try {
        const filePath = path.join(pluginsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const config = JSON.parse(content)
        
        const pluginName = path.basename(file, '.json')
        
        await PluginConfigDAO.create({
          plugin_name: pluginName,
          config_data: config,
          enabled: true
        })
        
        this.stats.plugins.success++
        logger.debug(`迁移插件配置成功: ${pluginName}`)
      } catch (error) {
        this.stats.plugins.failed++
        logger.error(`迁移插件配置失败 ${file}:`, error.message)
      }
    }
  }

  async copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }

    const entries = fs.readdirSync(src, { withFileTypes: true })
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }

  printStats() {
    logger.info('=== 迁移统计 ===')
    logger.info(`预设: 成功 ${this.stats.presets.success}, 失败 ${this.stats.presets.failed}`)
    logger.info(`插件配置: 成功 ${this.stats.plugins.success}, 失败 ${this.stats.plugins.failed}`)
    
    const totalSuccess = this.stats.presets.success + this.stats.plugins.success
    const totalFailed = this.stats.presets.failed + this.stats.plugins.failed
    
    logger.info(`总计: 成功 ${totalSuccess}, 失败 ${totalFailed}`)
  }
}

// 执行迁移
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new DataMigrator()
  migrator.migrate().catch(error => {
    logger.error('迁移过程中发生错误:', error)
    process.exit(1)
  })
}

export default DataMigrator
```

## 使用示例

### 在应用中集成
```javascript
// app.js 中添加数据库初始化
import DatabaseManager from './lib/database/DatabaseManager.js'

async function startApp() {
  try {
    // 初始化数据库
    await DatabaseManager.initialize()
    
    // 其他初始化代码...
    
  } catch (error) {
    logger.error('应用启动失败:', error)
    process.exit(1)
  }
}

// 优雅关闭
process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号，正在关闭应用...')
  DatabaseManager.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，正在关闭应用...')
  DatabaseManager.close()
  process.exit(0)
})
```

### 在服务中使用
```javascript
// lib/server/http/services/presetService.js 重构示例
import PresetDAO from '../../../database/dao/PresetDAO.js'

class PresetService {
  // 获取所有预设
  async getAllPresets() {
    const presets = await PresetDAO.findAll('name')
    
    // 按分类组织
    const categorized = {
      common: [],
      recommended: [],
      hidden: []
    }
    
    presets.forEach(preset => {
      categorized[preset.category].push(preset)
    })
    
    return categorized
  }

  // 根据名称获取预设
  async getPresetByName(name) {
    return await PresetDAO.findByName(name)
  }

  // 创建预设
  async createPreset(presetData) {
    // 验证预设名称唯一性
    if (await PresetDAO.exists(presetData.name)) {
      throw new Error(`预设名称已存在: ${presetData.name}`)
    }
    
    return await PresetDAO.create(presetData)
  }

  // 更新预设
  async updatePreset(name, presetData) {
    const success = await PresetDAO.update(name, presetData)
    if (!success) {
      throw new Error(`预设不存在: ${name}`)
    }
    return success
  }

  // 删除预设
  async deletePreset(name) {
    const success = await PresetDAO.deleteByName(name)
    if (!success) {
      throw new Error(`预设不存在: ${name}`)
    }
    return success
  }
}

export default new PresetService()
```

## 测试建议

### 单元测试
```javascript
// tests/database/dao/PresetDAO.test.js
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import DatabaseManager from '../../../lib/database/DatabaseManager.js'
import PresetDAO from '../../../lib/database/dao/PresetDAO.js'

describe('PresetDAO', () => {
  beforeEach(async () => {
    await DatabaseManager.initialize()
  })

  afterEach(() => {
    DatabaseManager.close()
  })

  it('应该能够创建预设', async () => {
    const preset = {
      name: '测试预设',
      history: [{ role: 'system', content: '测试' }],
      type: 'custom'
    }

    const id = await PresetDAO.create(preset)
    expect(id).to.be.a('number')

    const saved = await PresetDAO.findByName('测试预设')
    expect(saved).to.not.be.null
    expect(saved.name).to.equal('测试预设')
  })

  it('应该能够更新预设', async () => {
    // 先创建预设
    await PresetDAO.create({
      name: '测试预设2',
      history: [{ role: 'system', content: '原始内容' }]
    })

    // 更新预设
    const success = await PresetDAO.update('测试预设2', {
      history: [{ role: 'system', content: '更新内容' }]
    })

    expect(success).to.be.true

    const updated = await PresetDAO.findByName('测试预设2')
    expect(updated.history[0].content).to.equal('更新内容')
  })
})
```

## 性能优化建议

1. **索引优化** - 为常用查询字段添加索引
2. **连接池** - 使用连接池管理数据库连接
3. **缓存机制** - 为频繁访问的数据添加内存缓存
4. **批量操作** - 使用事务进行批量插入/更新
5. **查询优化** - 避免 N+1 查询问题

这个实现指南提供了完整的 SQLite 迁移实现方案，可以直接开始开发。