# SQLite 迁移开发计划

## 项目概述

将 Mio-Chat 项目从基于 JSON 文件的配置管理迁移到 SQLite 数据库，提升数据管理效率和系统性能。

## 迁移目标

### 主要收益
- 消除 170+ 个 JSON 预设文件的维护负担
- 提供统一的数据查询和管理接口
- 支持事务操作，确保数据一致性
- 为实时日志查看器等新功能提供数据基础
- 提升配置加载和查询性能

### 迁移范围
- ✅ 预设系统 (170+ JSON 文件)
- ✅ 插件配置管理 (JSON + YAML)
- ✅ 主配置文件 (YAML → SQLite)
- ✅ 模型所有者配置 (owners.yaml)
- ✅ OneBot配置 (onebotConfig.yaml)
- ✅ 系统运行时配置
- ✅ 日志配置和统计
- ❌ PM2配置 (保留 JSON，部署相关)
- ❌ Nginx配置 (保留，基础设施相关)

## 技术架构

### 数据库选择
- **SQLite** - 轻量级、无服务器、事务支持
- **存储位置**: `./data/app.db`
- **备份策略**: 定期导出 + 文件备份

### 依赖包
```json
{
  "prisma": "^5.22.0",
  "@prisma/client": "^5.22.0"
}
```

## 数据库设计

### 1. 预设表 (presets)
```sql
CREATE TABLE presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'custom', -- 'built-in' | 'custom'
  category TEXT DEFAULT 'common', -- 'common' | 'recommended' | 'hidden'
  history TEXT NOT NULL, -- JSON 格式存储对话历史
  opening TEXT DEFAULT '',
  textwrapper TEXT DEFAULT '',
  tools TEXT DEFAULT '[]', -- JSON 格式存储工具列表
  recommended BOOLEAN DEFAULT FALSE,
  hidden BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_presets_name ON presets(name);
CREATE INDEX idx_presets_type ON presets(type);
CREATE INDEX idx_presets_category ON presets(category);
```

### 2. 插件配置表 (plugin_configs)
```sql
CREATE TABLE plugin_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plugin_name TEXT NOT NULL UNIQUE,
  config_data TEXT NOT NULL, -- JSON 格式存储配置
  enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plugin_configs_name ON plugin_configs(plugin_name);
CREATE INDEX idx_plugin_configs_enabled ON plugin_configs(enabled);
```

### 3. 系统配置表 (system_settings)
```sql
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL, -- JSON 格式存储复杂配置
  category TEXT DEFAULT 'general', -- 'general' | 'server' | 'web' | 'onebot' | 'llm'
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);
```

### 4. LLM适配器配置表 (llm_adapters)
```sql
CREATE TABLE llm_adapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adapter_type TEXT NOT NULL, -- 'openai' | 'gemini' | 'vertex' | 'deepseek'
  instance_name TEXT NOT NULL, -- 实例名称，同类型可有多个实例
  config_data TEXT NOT NULL, -- JSON 格式存储适配器配置
  enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(adapter_type, instance_name)
);

CREATE INDEX idx_llm_adapters_type ON llm_adapters(adapter_type);
CREATE INDEX idx_llm_adapters_enabled ON llm_adapters(enabled);
```

### 5. 模型所有者配置表 (model_owners)
```sql
CREATE TABLE model_owners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner TEXT NOT NULL,
  keywords TEXT NOT NULL, -- JSON 数组格式存储关键词
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_model_owners_owner ON model_owners(owner);
```

### 6. 日志配置表 (log_configs)
```sql
CREATE TABLE log_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  buffer_size INTEGER DEFAULT 1000,
  flush_interval INTEGER DEFAULT 1000,
  sources TEXT DEFAULT '[]', -- JSON 格式存储日志源
  filters TEXT DEFAULT '{}', -- JSON 格式存储过滤器
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_log_configs_name ON log_configs(name);
```

### 7. 日志统计表 (log_stats)
```sql
CREATE TABLE log_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  level TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (date, level)
);

CREATE INDEX idx_log_stats_date ON log_stats(date);
CREATE INDEX idx_log_stats_level ON log_stats(level);
```

## 开发计划

### 阶段 1: 基础设施搭建 (3-4天)

#### 1.1 数据库管理器 (1天)
- [ ] 创建 `lib/database/DatabaseManager.js`
- [ ] 实现数据库连接和初始化
- [ ] 创建表结构和索引
- [ ] 添加数据库迁移机制

#### 1.2 Prisma ORM 设置 (1天)
- [ ] 创建 `prisma/schema.prisma` 数据模型
- [ ] 配置 Prisma Client
- [ ] 生成数据库和客户端代码
- [ ] 创建数据库连接管理器

#### 1.3 服务层实现 (1天)
- [ ] 创建 `lib/database/services/` 目录
- [ ] 实现 `PresetService.js` - 预设业务逻辑
- [ ] 实现 `SystemSettingsService.js` - 系统配置业务逻辑
- [ ] 实现 `LLMAdapterService.js` - LLM适配器业务逻辑

#### 1.4 数据迁移工具 (1天)
- [ ] 创建 `scripts/migrate-to-sqlite.js`
- [ ] 实现 JSON 到 SQLite 的数据迁移
- [ ] 添加数据验证和回滚机制

### 阶段 2: 预设系统迁移 (4-5天)

#### 2.1 数据迁移 (2天)
- [ ] 迁移 `presets/built-in/*.json` (170+ 文件)
- [ ] 迁移 `presets/custom/*.json`
- [ ] 验证数据完整性

#### 2.2 服务层重构 (2天)
- [ ] 重构 `lib/server/http/services/presetService.js`
- [ ] 更新预设加载逻辑使用数据库
- [ ] 保持 API 接口兼容性

#### 2.3 配置加载重构 (1天)
- [ ] 更新 `lib/config.js` 中的预设加载逻辑
- [ ] 移除文件系统依赖
- [ ] 添加缓存机制

### 阶段 3: 插件配置迁移 (3天)

#### 3.1 数据迁移 (1天)
- [ ] 迁移 `config/plugins/*.json`
- [ ] 验证插件配置完整性

#### 3.2 插件系统重构 (2天)
- [ ] 重构 `lib/plugin.js` 配置加载
- [ ] 更新插件配置 API
- [ ] 测试插件功能完整性

### 阶段 4: 主配置文件迁移 (4天)

#### 4.1 系统配置迁移 (2天)
- [ ] 迁移 `config/config/config.yaml` 主配置
- [ ] 迁移 `config/config/owners.yaml` 模型所有者配置
- [ ] 迁移 `config/plugins/onebotConfig.yaml` OneBot配置
- [ ] 实现配置分类存储 (server/web/onebot/llm)

#### 4.2 LLM适配器配置重构 (2天)
- [ ] 重构多实例LLM适配器配置存储
- [ ] 更新配置加载逻辑
- [ ] 实现配置热更新机制

### 阶段 5: 日志配置集成 (2天)

#### 5.1 日志配置数据库化 (1天)
- [ ] 集成日志配置到数据库
- [ ] 为实时日志查看器准备数据基础

#### 5.2 配置管理API (1天)
- [ ] 实现统一的配置管理API
- [ ] 支持配置的增删改查和热更新

### 阶段 6: 测试和优化 (3天)

#### 5.1 功能测试 (2天)
- [ ] 预设 CRUD 功能测试
- [ ] 插件配置功能测试
- [ ] 系统配置功能测试
- [ ] 性能对比测试

#### 6.2 清理和文档 (1天)
- [ ] 清理整个 config 文件夹 (除PM2和Nginx)
- [ ] 清理不再需要的 JSON 预设文件
- [ ] 更新 API 文档
- [ ] 添加数据库操作文档
- [ ] 创建配置迁移向导

## 实现细节

### 数据库管理器示例
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
  }

  async initialize() {
    // 确保数据目录存在
    const dataDir = path.dirname(this.dbPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // 连接数据库
    this.db = new Database(this.dbPath)
    
    // 启用外键约束
    this.db.pragma('foreign_keys = ON')
    
    // 创建表结构
    await this.createTables()
    
    logger.info('数据库初始化完成')
  }

  async createTables() {
    // 创建所有表结构
    const schemas = [
      // 预设表
      `CREATE TABLE IF NOT EXISTS presets (...)`,
      // 插件配置表
      `CREATE TABLE IF NOT EXISTS plugin_configs (...)`,
      // 系统配置表
      `CREATE TABLE IF NOT EXISTS system_settings (...)`,
      // 日志配置表
      `CREATE TABLE IF NOT EXISTS log_configs (...)`
    ]

    for (const schema of schemas) {
      this.db.exec(schema)
    }
  }

  getDatabase() {
    return this.db
  }

  close() {
    if (this.db) {
      this.db.close()
    }
  }
}

export default new DatabaseManager()
```

### 数据访问层示例
```javascript
// lib/database/dao/PresetDAO.js
import DatabaseManager from '../DatabaseManager.js'

class PresetDAO {
  constructor() {
    this.db = DatabaseManager.getDatabase()
  }

  async findAll() {
    const stmt = this.db.prepare('SELECT * FROM presets ORDER BY name')
    return stmt.all()
  }

  async findByName(name) {
    const stmt = this.db.prepare('SELECT * FROM presets WHERE name = ?')
    return stmt.get(name)
  }

  async create(preset) {
    const stmt = this.db.prepare(`
      INSERT INTO presets (name, type, category, history, opening, textwrapper, tools, recommended, hidden)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      preset.name,
      preset.type || 'custom',
      preset.category || 'common',
      JSON.stringify(preset.history),
      preset.opening || '',
      preset.textwrapper || '',
      JSON.stringify(preset.tools || []),
      preset.recommended || false,
      preset.hidden || false
    )
  }

  async update(name, preset) {
    const stmt = this.db.prepare(`
      UPDATE presets 
      SET history = ?, opening = ?, textwrapper = ?, tools = ?, 
          recommended = ?, hidden = ?, updated_at = CURRENT_TIMESTAMP
      WHERE name = ?
    `)
    return stmt.run(
      JSON.stringify(preset.history),
      preset.opening || '',
      preset.textwrapper || '',
      JSON.stringify(preset.tools || []),
      preset.recommended || false,
      preset.hidden || false,
      name
    )
  }

  async delete(name) {
    const stmt = this.db.prepare('DELETE FROM presets WHERE name = ?')
    return stmt.run(name)
  }
}

export default new PresetDAO()
```

## 风险控制

### 数据安全
1. **迁移前备份** - 备份所有 JSON 文件
2. **双写模式** - 迁移期间同时写入 JSON 和数据库
3. **数据验证** - 迁移后验证数据完整性
4. **回滚机制** - 提供从数据库导出 JSON 的功能

### 兼容性保证
1. **API 兼容** - 保持现有 API 接口不变
2. **渐进迁移** - 分模块逐步迁移
3. **功能测试** - 每个模块迁移后充分测试

### 性能优化
1. **索引优化** - 为常用查询添加索引
2. **连接池** - 合理管理数据库连接
3. **缓存机制** - 为频繁访问的数据添加缓存

## 验收标准

### 功能完整性
- [ ] 所有预设功能正常工作
- [ ] 插件配置加载正常
- [ ] 系统配置热更新正常
- [ ] API 接口保持兼容

### 性能指标
- [ ] 预设加载时间 < 100ms
- [ ] 配置查询响应时间 < 50ms
- [ ] 数据库文件大小合理

### 数据完整性
- [ ] 所有 JSON 数据成功迁移
- [ ] 数据格式验证通过
- [ ] 备份和恢复功能正常

## 后续规划

### 短期优化 (1-2周)
- 添加数据库性能监控
- 实现自动备份机制
- 优化查询性能

### 中期扩展 (1个月)
- 支持配置版本管理
- 添加配置导入导出功能
- 实现配置模板系统

### 长期规划 (3个月)
- 考虑分布式部署支持
- 添加配置审计日志
- 实现配置权限管理

---

**开发负责人**: [开发者姓名]  
**预计完成时间**: 2-3周  
**风险等级**: 中等  
**优先级**: 高