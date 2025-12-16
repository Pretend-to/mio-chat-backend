# SQLite 迁移向导

## 迁移前准备

### 1. 备份数据
```bash
# 创建备份目录
mkdir -p backup/$(date +%Y-%m-%d)

# 备份整个config目录
cp -r config backup/$(date +%Y-%m-%d)/

# 备份预设目录
cp -r presets backup/$(date +%Y-%m-%d)/
```

### 2. 安装依赖
```bash
pnpm install
```

## 迁移步骤

### 阶段1: 配置文件迁移
```bash
# 迁移所有配置文件到SQLite
npm run migrate-config
```

这将迁移：
- `config/config/config.yaml` → `system_settings` 表
- `config/config/owners.yaml` → `model_owners` 表  
- `config/plugins/*.json` → `plugin_configs` 表
- `config/plugins/*.yaml` → `plugin_configs` 表
- LLM适配器配置 → `llm_adapters` 表

### 阶段2: 预设文件迁移
```bash
# 迁移所有预设文件到SQLite
npm run migrate
```

这将迁移：
- `presets/built-in/*.json` → `presets` 表
- `presets/custom/*.json` → `presets` 表

### 阶段3: 一键完整迁移
```bash
# 执行完整迁移（配置+预设）
npm run migrate-all
```

## 迁移后验证

### 1. 检查数据库文件
```bash
ls -la data/app.db
```

### 2. 验证数据完整性
```bash
# 启动应用进行功能测试
npm start
```

### 3. 检查迁移日志
查看控制台输出的迁移统计信息，确保所有数据都成功迁移。

## 配置文件映射

### 系统配置映射
| 原配置文件 | 数据库表 | 分类 | 说明 |
|-----------|---------|------|------|
| `config.yaml` → `server` | `system_settings` | `server` | 服务器配置 |
| `config.yaml` → `web` | `system_settings` | `web` | Web界面配置 |
| `config.yaml` → `onebot` | `system_settings` | `onebot` | OneBot协议配置 |
| `config.yaml` → `debug` | `system_settings` | `general` | 调试模式 |

### LLM适配器映射
| 原配置 | 数据库表 | 说明 |
|-------|---------|------|
| `llm_adapters.openai[]` | `llm_adapters` | OpenAI适配器实例 |
| `llm_adapters.gemini[]` | `llm_adapters` | Gemini适配器实例 |
| `llm_adapters.vertex[]` | `llm_adapters` | Vertex适配器实例 |
| `llm_adapters.deepseek[]` | `llm_adapters` | DeepSeek适配器实例 |

### 其他配置映射
| 原配置文件 | 数据库表 | 说明 |
|-----------|---------|------|
| `owners.yaml` | `model_owners` | 模型所有者配置 |
| `plugins/*.json` | `plugin_configs` | 插件配置 |
| `plugins/*.yaml` | `plugin_configs` | 插件配置 |

## 迁移后的配置管理

### 1. 通过API管理配置
```javascript
// 获取系统配置
GET /api/config/system/:category

// 更新系统配置  
PUT /api/config/system/:category

// 获取LLM适配器配置
GET /api/config/llm-adapters/:type

// 更新LLM适配器配置
PUT /api/config/llm-adapters/:type/:instance
```

### 2. 通过数据库直接管理
```javascript
import SystemSettingsDAO from './lib/database/dao/SystemSettingsDAO.js'
import LLMAdapterDAO from './lib/database/dao/LLMAdapterDAO.js'

// 获取服务器配置
const serverConfig = await SystemSettingsDAO.getByKey('server')

// 更新Web配置
await SystemSettingsDAO.set('web', {
  admin_code: 'new_code',
  title: 'New Title'
}, 'web')

// 获取所有Gemini实例
const geminiInstances = await LLMAdapterDAO.getByType('gemini')
```

## 清理工作

### 迁移成功后可以删除的文件
```bash
# 删除配置文件（保留PM2和Nginx）
rm -rf config/config/
rm -rf config/plugins/

# 删除预设文件
rm -rf presets/built-in/
rm -rf presets/custom/

# 保留的文件
# - config/pm2.json (PM2配置)
# - config/nginx/ (Nginx配置)
# - presets/avatar/ (头像文件)
```

## 回滚方案

如果迁移出现问题，可以通过以下方式回滚：

### 1. 恢复配置文件
```bash
# 从备份恢复
cp -r backup/$(date +%Y-%m-%d)/config ./
cp -r backup/$(date +%Y-%m-%d)/presets ./
```

### 2. 删除数据库文件
```bash
rm -f data/app.db
```

### 3. 重启应用
```bash
npm start
```

## 常见问题

### Q: 迁移失败怎么办？
A: 查看迁移日志，确认失败原因。通常是配置文件格式问题或权限问题。

### Q: 如何验证迁移是否成功？
A: 检查迁移统计输出，确保成功数量符合预期。启动应用测试所有功能。

### Q: 迁移后性能如何？
A: SQLite查询比文件系统操作更快，特别是对于大量预设的查询。

### Q: 如何备份SQLite数据？
A: 使用 `npm run backup-db` 或直接复制 `data/app.db` 文件。

### Q: 可以部分迁移吗？
A: 可以，使用 `npm run migrate-config` 只迁移配置，或 `npm run migrate` 只迁移预设。

## 技术支持

如果在迁移过程中遇到问题：

1. 查看详细的迁移日志
2. 检查备份文件是否完整
3. 确认数据库文件权限
4. 验证配置文件格式

迁移完成后，你将获得：
- 统一的数据管理接口
- 更好的查询性能
- 事务支持和数据一致性
- 为新功能提供的数据基础