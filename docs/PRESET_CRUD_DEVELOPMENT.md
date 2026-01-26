# 预设（Preset）CRUD 功能开发文档

## 概述

本文档描述了如何为 Mio-Chat 后端系统实现预设（Preset）的完整 CRUD（创建、读取、更新、删除）功能。预设模块将遵循与适配器（Adapters）和插件（Plugins）相同的设计模式，提供统一的管理接口。

## 1. 预设模块架构

### 1.1 目录结构

```
presets/
├── built-in/          # 系统内置预设（只读，受保护）
│   ├── preset_5.json
│   ├── preset_61.json
│   └── ...
└── custom/            # 用户自定义预设（支持完整 CRUD）
    ├── example.json
    ├── user_preset_1.json
    └── ...
```

### 1.2 预设数据结构

每个预设文件包含以下字段：

```json
{
  "name": "预设名称",
  "history": [
    {
      "role": "system",
      "content": "系统提示词内容"
    }
  ],
  "opening": "开场白",
  "tools": ["tool1", "tool2"]
}
```

### 1.3 预设分类

预设自动分为三类：

- **common**: 常用预设
- **recommended**: 推荐预设
- **hidden**: 隐藏预设（系统内部使用）

## 2. API 接口设计

### 2.1 设计原则

为了避免与现有业务接口冲突，预设管理功能将采用以下设计原则：

1. **功能分离**：业务读取接口（`/api/openai/presets`）保持不变，供前端应用使用
2. **管理独立**：管理功能统一放在 `/api/config/presets` 路径下，与其他配置管理接口保持一致
3. **权限明确**：所有管理操作都需要管理员权限，与现有的配置管理保持相同的权限控制

### 2.2 端点列表

| 方法 | 路径 | 描述 | 权限要求 |
|------|------|------|----------|
| GET | `/api/config/presets` | 获取所有预设（管理视图） | Admin |
| POST | `/api/config/presets` | 创建新预设 | Admin |
| GET | `/api/config/presets/:id` | 获取特定预设详情 | Admin |
| PUT | `/api/config/presets/:id` | 更新预设 | Admin |
| DELETE | `/api/config/presets/:id` | 删除预设 | Admin |
| POST | `/api/config/presets/reload` | 重新加载所有预设 | Admin |
| POST | `/api/config/presets/import` | 导入预设文件 | Admin |
| GET | `/api/config/presets/:id/export` | 导出预设文件 | Admin |

### 2.2.1 现有业务接口（保持不变）

| 方法 | 路径 | 描述 | 权限要求 |
|------|------|------|----------|
| GET | `/api/openai/presets` | 获取预设列表（业务使用） | 无 |

### 2.3 API 详细说明

#### 获取预设管理列表

```http
GET /api/config/presets?nums=10&start=0&keyword=关键词
```

查询参数：
- `nums`: 返回数量限制
- `start`: 起始位置
- `keyword`: 搜索关键词

响应：
```json
{
  "success": true,
  "data": {
    "common": [...],
    "recommended": [...],
    "hidden": [...],
    "total": {
      "common": 10,
      "recommended": 5,
      "hidden": 3
    }
  }
}
```

#### 获取特定预设详情

```http
GET /api/config/presets/preset_name
```

响应：
```json
{
  "success": true,
  "data": {
    "name": "预设名称",
    "history": [...],
    "opening": "",
    "tools": [],
    "type": "custom", // "built-in" 或 "custom"
    "fileName": "preset_name.json",
    "path": "presets/custom/preset_name.json"
  }
}
```

#### 创建预设

```http
POST /api/config/presets
Content-Type: application/json

{
  "name": "新预设",
  "history": [
    {
      "role": "system",
      "content": "你是一个助手"
    }
  ],
  "opening": "你好！",
  "tools": []
}
```

#### 更新预设

```http
PUT /api/config/presets/preset_new
Content-Type: application/json

{
  "name": "更新后的预设",
  "history": [...],
  "opening": "新的开场白",
  "tools": []
}
```

#### 删除预设

```http
DELETE /api/config/presets/preset_new
```

注意：内置预设（`built-in/` 目录）无法删除。

#### 导入预设

```http
POST /api/config/presets/import
Content-Type: multipart/form-data

file: [预设JSON文件]
```

#### 导出预设

```http
GET /api/config/presets/preset_name/export
```

响应：返回预设文件的 JSON 内容

## 3. 实现步骤

### 3.1 创建控制器

创建 `lib/server/http/controllers/presetController.js`：

```javascript
import fs from 'fs/promises'
import path from 'path'
import { logger } from '../../../utils/logger.js'

const PRESETS_DIR = path.join(process.cwd(), 'presets')
const BUILTIN_DIR = path.join(PRESETS_DIR, 'built-in')
const CUSTOM_DIR = path.join(PRESETS_DIR, 'custom')

class PresetController {
  async getPresets(req, res) {
    try {
      const { nums = 100, start = 0, keyword } = req.query
      const presets = await global.middleware.llm.getAllPresets()

      // 应用过滤和搜索
      let result = this.filterAndSearch(presets, keyword, parseInt(start), parseInt(nums))

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('获取预设失败:', error)
      res.status(500).json({
        success: false,
        message: error.message
      })
    }
  }

  async createPreset(req, res) {
    try {
      const preset = req.body
      this.validatePreset(preset)

      const fileName = `preset_${preset.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`
      const filePath = path.join(CUSTOM_DIR, fileName)

      // 检查是否已存在
      try {
        await fs.access(filePath)
        return res.status(409).json({
          success: false,
          message: '预设已存在'
        })
      } catch {}

      await fs.writeFile(filePath, JSON.stringify(preset, null, 2), 'utf8')

      // 重新加载预设
      await this.reloadPresets()

      res.json({
        success: true,
        message: '预设创建成功',
        data: { fileName }
      })
    } catch (error) {
      logger.error('创建预设失败:', error)
      res.status(500).json({
        success: false,
        message: error.message
      })
    }
  }

  async updatePreset(req, res) {
    try {
      const presetId = req.params.id
      const updateData = req.body

      this.validatePreset(updateData)

      // 查找预设文件
      const filePath = await this.findPresetFile(presetId)
      if (!filePath) {
        return res.status(404).json({
          success: false,
          message: '预设不存在'
        })
      }

      // 检查是否为内置预设
      if (filePath.startsWith(BUILTIN_DIR)) {
        return res.status(403).json({
          success: false,
          message: '无法修改内置预设'
        })
      }

      await fs.writeFile(filePath, JSON.stringify(updateData, null, 2), 'utf8')

      // 重新加载预设
      await this.reloadPresets()

      res.json({
        success: true,
        message: '预设更新成功'
      })
    } catch (error) {
      logger.error('更新预设失败:', error)
      res.status(500).json({
        success: false,
        message: error.message
      })
    }
  }

  async deletePreset(req, res) {
    try {
      const presetId = req.params.id

      const filePath = await this.findPresetFile(presetId)
      if (!filePath) {
        return res.status(404).json({
          success: false,
          message: '预设不存在'
        })
      }

      // 检查是否为内置预设
      if (filePath.startsWith(BUILTIN_DIR)) {
        return res.status(403).json({
          success: false,
          message: '无法删除内置预设'
        })
      }

      await fs.unlink(filePath)

      // 重新加载预设
      await this.reloadPresets()

      res.json({
        success: true,
        message: '预设删除成功'
      })
    } catch (error) {
      logger.error('删除预设失败:', error)
      res.status(500).json({
        success: false,
        message: error.message
      })
    }
  }

  async reloadPresets(req, res) {
    try {
      await global.middleware.reloadPresets()

      res.json({
        success: true,
        message: '预设重新加载成功',
        data: global.middleware.llm.getAllPresets()
      })
    } catch (error) {
      logger.error('重新加载预设失败:', error)
      res.status(500).json({
        success: false,
        message: error.message
      })
    }
  }

  // 辅助方法
  validatePreset(preset) {
    const required = ['name', 'history']
    for (const field of required) {
      if (!preset[field]) {
        throw new Error(`缺少必填字段: ${field}`)
      }
    }

    if (!Array.isArray(preset.history)) {
      throw new Error('history 必须是数组')
    }

    for (const msg of preset.history) {
      if (!msg.role || !msg.content) {
        throw new Error('history 中的每条消息必须包含 role 和 content')
      }
    }
  }

  async findPresetFile(presetId) {
    // 在两个目录中查找预设
    const searchDirs = [CUSTOM_DIR, BUILTIN_DIR]

    for (const dir of searchDirs) {
      try {
        const files = await fs.readdir(dir)
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(dir, file)
            const content = await fs.readFile(filePath, 'utf8')
            const preset = JSON.parse(content)

            // 检查名称匹配或文件名匹配
            if (preset.name === presetId || file === presetId || file === `${presetId}.json`) {
              return filePath
            }
          }
        }
      } catch (error) {
        logger.warn(`搜索预设目录失败: ${dir}`, error)
      }
    }

    return null
  }

  filterAndSearch(presets, keyword, start, nums) {
    const allPresets = [
      ...presets.common || [],
      ...presets.recommended || [],
      ...presets.hidden || []
    ]

    // 应用关键词搜索
    if (keyword) {
      return allPresets.filter(p =>
        p.name.includes(keyword) ||
        p.opening?.includes(keyword) ||
        p.history.some(h => h.content.includes(keyword))
      )
    }

    return allPresets.slice(start, start + nums)
  }
}

export default new PresetController()
```

### 3.2 扩展现有配置控制器

为了保持代码组织的一致性，建议将预设管理功能集成到现有的 `configController.js` 中，而不是创建新的控制器。这样可以：

1. 保持配置管理的统一性
2. 复用现有的认证和错误处理逻辑
3. 避免重复代码

在 `lib/server/http/controllers/configController.js` 中添加预设相关方法：

```javascript
// 在现有 configController.js 中添加以下方法

async getPresets(req, res) {
  try {
    const { nums = 100, start = 0, keyword } = req.query
    const presets = global.middleware.llm.getAllPresets()

    // 统计各类别总数
    const totals = {
      common: presets.common?.length || 0,
      recommended: presets.recommended?.length || 0,
      hidden: presets.hidden?.length || 0
    }

    // 应用过滤和分页
    const result = this.filterAndSearchPresets(presets, keyword, parseInt(start), parseInt(nums))

    res.json({
      success: true,
      data: {
        ...result,
        total: totals
      }
    })
  } catch (error) {
    logger.error('获取预设失败:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

async getPreset(req, res) {
  try {
    const presetId = req.params.id
    const preset = await this.findPresetById(presetId)

    if (!preset) {
      return res.status(404).json({
        success: false,
        message: '预设不存在'
      })
    }

    res.json({
      success: true,
      data: preset
    })
  } catch (error) {
    logger.error('获取预设详情失败:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

async createPreset(req, res) {
  try {
    const preset = req.body
    this.validatePreset(preset)

    const fileName = `preset_${preset.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`
    const filePath = path.join(CUSTOM_DIR, fileName)

    // 检查是否已存在
    if (await this.presetExists(preset.name)) {
      return res.status(409).json({
        success: false,
        message: '预设已存在'
      })
    }

    await fs.writeFile(filePath, JSON.stringify(preset, null, 2), 'utf8')

    // 重新加载预设
    await this.reloadPresets()

    res.json({
      success: true,
      message: '预设创建成功',
      data: { fileName }
    })
  } catch (error) {
    logger.error('创建预设失败:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

async updatePreset(req, res) {
  try {
    const presetId = req.params.id
    const updateData = req.body

    this.validatePreset(updateData)

    const { filePath, preset } = await this.findPresetWithFile(presetId)
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: '预设不存在'
      })
    }

    // 检查是否为内置预设
    if (filePath.startsWith(BUILTIN_DIR)) {
      return res.status(403).json({
        success: false,
        message: '无法修改内置预设'
      })
    }

    await fs.writeFile(filePath, JSON.stringify(updateData, null, 2), 'utf8')
    await this.reloadPresets()

    res.json({
      success: true,
      message: '预设更新成功'
    })
  } catch (error) {
    logger.error('更新预设失败:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

async deletePreset(req, res) {
  try {
    const presetId = req.params.id

    const { filePath } = await this.findPresetWithFile(presetId)
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: '预设不存在'
      })
    }

    // 检查是否为内置预设
    if (filePath.startsWith(BUILTIN_DIR)) {
      return res.status(403).json({
        success: false,
        message: '无法删除内置预设'
      })
    }

    await fs.unlink(filePath)
    await this.reloadPresets()

    res.json({
      success: true,
      message: '预设删除成功'
    })
  } catch (error) {
    logger.error('删除预设失败:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

async importPreset(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '未上传文件'
      })
    }

    const presetData = JSON.parse(req.file.buffer.toString('utf8'))
    this.validatePreset(presetData)

    const fileName = `preset_import_${Date.now()}.json`
    const filePath = path.join(CUSTOM_DIR, fileName)

    await fs.writeFile(filePath, JSON.stringify(presetData, null, 2), 'utf8')
    await this.reloadPresets()

    res.json({
      success: true,
      message: '预设导入成功',
      data: { fileName, presetName: presetData.name }
    })
  } catch (error) {
    logger.error('导入预设失败:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

async exportPreset(req, res) {
  try {
    const presetId = req.params.id
    const preset = await this.findPresetById(presetId)

    if (!preset) {
      return res.status(404).json({
        success: false,
        message: '预设不存在'
      })
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${preset.name}.json"`)
    res.send(JSON.stringify(preset, null, 2))
  } catch (error) {
    logger.error('导出预设失败:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

// 辅助方法
async reloadPresets() {
  await global.middleware.reloadPresets()
}

filterAndSearchPresets(presets, keyword, start, nums) {
  const allPresets = [
    ...presets.common || [],
    ...presets.recommended || [],
    ...presets.hidden || []
  ]

  let filtered = allPresets

  // 应用关键词搜索
  if (keyword) {
    filtered = allPresets.filter(p =>
      p.name.includes(keyword) ||
      p.opening?.includes(keyword) ||
      p.history.some(h => h.content.includes(keyword))
    )
  }

  // 返回分类的完整数据（用于管理视图）
  return {
    common: (presets.common || []).filter(p => !keyword ||
      p.name.includes(keyword) ||
      p.opening?.includes(keyword) ||
      p.history.some(h => h.content.includes(keyword))
    ),
    recommended: (presets.recommended || []).filter(p => !keyword ||
      p.name.includes(keyword) ||
      p.opening?.includes(keyword) ||
      p.history.some(h => h.content.includes(keyword))
    ),
    hidden: (presets.hidden || []).filter(p => !keyword ||
      p.name.includes(keyword) ||
      p.opening?.includes(keyword) ||
      p.history.some(h => h.content.includes(keyword))
    )
  }
}
```

### 3.3 注册路由

在 `lib/server/http/index.js` 的配置管理路由部分添加预设路由：

```javascript
// 在现有配置管理路由之后添加（约第 118 行后）
  // 预设管理路由（需要管理员验证）
  app.get('/api/config/presets', authConfigAPI, asyncHandler(configController.getPresets))
  app.get('/api/config/presets/:id', authConfigAPI, asyncHandler(configController.getPreset))
  app.post('/api/config/presets', authConfigAPI, asyncHandler(configController.createPreset))
  app.put('/api/config/presets/:id', authConfigAPI, asyncHandler(configController.updatePreset))
  app.delete('/api/config/presets/:id', authConfigAPI, asyncHandler(configController.deletePreset))
  app.post('/api/config/presets/reload', authConfigAPI, asyncHandler(configController.reloadPresets))
  app.post('/api/config/presets/import',
    authConfigAPI,
    upload.single('file'),
    asyncHandler(configController.importPreset)
  )
  app.get('/api/config/presets/:id/export', authConfigAPI, asyncHandler(configController.exportPreset))
```

### 3.4 扩展配置系统

修改 `lib/config.js` 以支持预设热重载：

```javascript
// 在 Config 类中添加方法
async reloadPreset(presetId) {
  logger.info(`重新加载预设: ${presetId}`)
  await this.loadLLMPresets()
  return this.getAllPresets()
}

async reloadPresets() {
  logger.info('重新加载所有预设...')
  await this.loadLLMPresets()
  return this.getAllPresets()
}
```

### 3.5 扩展中间件

修改 `lib/middleware.js` 添加预设管理方法：

```javascript
// 在 Middleware 类中添加
async reloadPresets() {
  try {
    return await config.reloadPresets()
  } catch (error) {
    logger.error('重新加载预设失败:', error)
    throw error
  }
}

async getPreset(presetId) {
  try {
    const presets = await this.llm.getAllPresets()
    const allPresets = [
      ...presets.common || [],
      ...presets.recommended || [],
      ...presets.hidden || []
    ]

    return allPresets.find(p => p.name === presetId)
  } catch (error) {
    logger.error(`获取预设失败: ${presetId}`, error)
    throw error
  }
}
```

## 4. 安全考虑

### 4.1 权限控制

- 所有写操作（POST、PUT、DELETE）需要管理员权限
- 使用现有的 `authConfigAPI` 中间件进行认证
- 内置预设（`built-in/` 目录）受保护，不可修改或删除

### 4.2 输入验证

- 验证必填字段
- 检查 history 数组结构
- 过滤特殊字符防止路径遍历攻击
- 限制预设文件大小

### 4.3 错误处理

- 捕获并记录所有错误
- 返回适当的 HTTP 状态码
- 防止敏感信息泄露

## 5. 测试计划

### 5.1 单元测试

```bash
# 创建测试文件
touch test/preset.test.js
```

测试用例：
- 预设验证逻辑
- 文件操作（创建、读取、更新、删除）
- 权限检查
- 错误处理

### 5.2 集成测试

- API 端点测试
- 预设重载功能
- 权限中间件集成

### 5.3 测试命令

```bash
# 运行预设相关测试
npm test -- preset

# 测试特定功能
npm test -- preset -- --grep "创建预设"
```

## 6. 部署注意事项

### 6.1 目录权限

确保 `presets/` 目录具有适当的读写权限：

```bash
# 确保目录存在
mkdir -p presets/custom

# 设置正确的权限
chmod 755 presets
chmod 755 presets/built-in
chmod 755 presets/custom
```

### 6.2 备份策略

建议定期备份用户自定义预设：

```bash
# 备份脚本示例
#!/bin/bash
BACKUP_DIR="/backup/presets-$(date +%Y%m%d)"
cp -r presets/custom $BACKUP_DIR
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
```

## 7. 未来扩展

### 7.1 高级功能

- 预设分类和标签系统
- 预设导入/导出功能
- 预设版本控制
- 预设分享市场

### 7.2 性能优化

- 预设缓存机制
- 增量加载
- 搜索索引

### 7.3 监控和日志

- 预设使用统计
- 操作审计日志
- 性能监控

## 8. 故障排除

### 8.1 常见问题

**问题：预设创建失败**
- 检查 `presets/custom/` 目录权限
- 验证预设数据格式
- 查看服务器日志

**问题：预设未显示**
- 确认文件在正确目录
- 检查 JSON 格式是否有效
- 尝试重新加载预设

**问题：无法删除内置预设**
- 这是预期行为，内置预设受保护
- 可以创建自定义预设替代

### 8.2 日志位置

预设相关日志位于：
- 应用日志：查看 `logger.info/warn/error` 输出
- 错误日志：`error.log`
- 访问日志：HTTP 请求记录

## 9. API 示例

### 9.1 cURL 示例

```bash
# 获取预设管理列表
curl -X GET http://localhost:3000/api/config/presets \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 获取特定预设详情
curl -X GET http://localhost:3000/api/config/presets/测试预设 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 创建新预设
curl -X POST http://localhost:3000/api/config/presets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "测试预设",
    "history": [
      {
        "role": "system",
        "content": "你是一个测试助手"
      }
    ],
    "opening": "你好！",
    "tools": []
  }'

# 更新预设
curl -X PUT http://localhost:3000/api/config/presets/测试预设 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "测试预设",
    "history": [
      {
        "role": "system",
        "content": "你是一个更新后的测试助手"
      }
    ],
    "opening": "你好，我是更新后的助手！",
    "tools": []
  }'

# 删除预设
curl -X DELETE http://localhost:3000/api/config/presets/测试预设 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 重新加载预设
curl -X POST http://localhost:3000/api/config/presets/reload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 导入预设文件
curl -X POST http://localhost:3000/api/config/presets/import \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@/path/to/preset.json"

# 导出预设
curl -X GET http://localhost:3000/api/config/presets/测试预设/export \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -o exported_preset.json

# 获取预设（业务接口，无需认证）
curl -X GET http://localhost:3000/api/openai/presets?type=custom&nums=10
```

### 9.2 JavaScript 示例

```javascript
// 管理端 - 获取预设列表
async function getPresetsForManagement() {
  const response = await fetch('/api/config/presets', {
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
  })
  const data = await response.json()
  return data.data
}

// 管理端 - 创建预设
async function createPreset(preset) {
  const response = await fetch('/api/config/presets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify(preset)
  })
  return response.json()
}

// 业务端 - 获取预设列表（无需认证）
async function getPresetsForApp() {
  const response = await fetch('/api/openai/presets?type=custom&nums=10')
  const data = await response.json()
  return data.data
}

// 导入预设
async function importPreset(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/config/presets/import', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    },
    body: formData
  })
  return response.json()
}

// 导出预设
async function exportPreset(presetName) {
  const response = await fetch(`/api/config/presets/${presetName}/export`, {
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
  })

  if (response.ok) {
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${presetName}.json`
    a.click()
    window.URL.revokeObjectURL(url)
  }
}
```

---

*本文档版本：1.0*
*最后更新：2025-12-11*