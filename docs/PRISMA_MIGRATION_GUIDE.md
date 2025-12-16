# Prisma ORM 迁移指南

## 为什么选择 Prisma

### 优势对比
| 特性 | 手写SQL | Prisma ORM |
|------|---------|------------|
| 类型安全 | ❌ | ✅ 完全类型安全 |
| 开发效率 | 🔶 中等 | ✅ 高效 |
| 代码维护 | ❌ 复杂 | ✅ 简单 |
| 数据库迁移 | ❌ 手动 | ✅ 自动化 |
| 查询构建 | ❌ 字符串拼接 | ✅ 链式API |
| 关系处理 | ❌ 复杂JOIN | ✅ 自动处理 |
| 错误处理 | ❌ 运行时发现 | ✅ 编译时检查 |

## 快速开始

### 1. 安装依赖
```bash
pnpm add prisma @prisma/client
pnpm add -D prisma
```

### 2. 初始化 Prisma
```bash
# 生成 Prisma 客户端
npx prisma generate

# 推送数据库结构（开发环境）
npx prisma db push

# 或者使用迁移（生产环境）
npx prisma migrate dev --name init
```

### 3. 查看数据库
```bash
# 启动 Prisma Studio（可视化数据库管理工具）
npx prisma studio
```

## 数据模型设计

### Prisma Schema 特性
```prisma
// 自动生成的字段
model Preset {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // 唯一约束
  name      String   @unique
  
  // 索引
  type      String
  @@index([type])
  
  // 自定义表名
  @@map("presets")
}
```

### JSON 字段处理
```prisma
model Preset {
  // 存储为字符串，应用层处理JSON
  history String // JSON格式
  tools   String @default("[]") // JSON数组
}
```

## 服务层架构

### 基础服务类
```javascript
// lib/database/services/BaseService.js
class BaseService {
  constructor(modelName) {
    this.modelName = modelName
    this.prisma = null
  }

  async init() {
    if (!this.prisma) {
      this.prisma = DatabaseManager.getPrisma()
    }
  }

  // 通用CRUD方法
  async findMany(options = {}) {
    await this.init()
    return await this.prisma[this.modelName].findMany(options)
  }

  async findUnique(where) {
    await this.init()
    return await this.prisma[this.modelName].findUnique({ where })
  }

  async create(data) {
    await this.init()
    return await this.prisma[this.modelName].create({ data })
  }

  async update(where, data) {
    await this.init()
    return await this.prisma[this.modelName].update({ where, data })
  }

  async delete(where) {
    await this.init()
    return await this.prisma[this.modelName].delete({ where })
  }
}
```

### 具体服务实现
```javascript
// lib/database/services/PresetService.js
class PresetService extends BaseService {
  constructor() {
    super('preset')
  }

  // 业务特定方法
  async findByCategory(category) {
    return await this.findMany({
      where: { category },
      orderBy: { name: 'asc' }
    })
  }

  async search(keyword) {
    return await this.findMany({
      where: {
        OR: [
          { name: { contains: keyword } },
          { textwrapper: { contains: keyword } }
        ]
      }
    })
  }
}
```

## 数据迁移策略

### 1. 从JSON文件迁移
```javascript
// scripts/migrate-presets.js
import PresetService from '../lib/database/services/PresetService.js'
import fs from 'fs'
import path from 'path'

async function migratePresets() {
  const presetsDir = './presets/built-in'
  const files = fs.readdirSync(presetsDir)
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    
    const filePath = path.join(presetsDir, file)
    const preset = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    
    await PresetService.create({
      name: preset.name,
      type: 'built-in',
      category: preset.hidden ? 'hidden' : 'common',
      history: JSON.stringify(preset.history || []),
      opening: preset.opening || '',
      textwrapper: preset.textwrapper || '',
      tools: JSON.stringify(preset.tools || []),
      recommended: preset.recommended || false,
      hidden: preset.hidden || false
    })
  }
}
```

### 2. 批量操作优化
```javascript
// 使用事务进行批量操作
async function batchCreatePresets(presets) {
  await DatabaseManager.transaction(async (prisma) => {
    for (const preset of presets) {
      await prisma.preset.create({ data: preset })
    }
  })
}

// 或使用 createMany（更高效，但不支持关联）
async function bulkCreatePresets(presets) {
  await prisma.preset.createMany({
    data: presets,
    skipDuplicates: true
  })
}
```

## 查询优化

### 1. 选择性字段查询
```javascript
// 只查询需要的字段
const presets = await prisma.preset.findMany({
  select: {
    id: true,
    name: true,
    category: true
  }
})
```

### 2. 分页查询
```javascript
async function getPresetsWithPagination(page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize
  
  const [presets, total] = await Promise.all([
    prisma.preset.findMany({
      skip,
      take: pageSize,
      orderBy: { name: 'asc' }
    }),
    prisma.preset.count()
  ])
  
  return {
    items: presets,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}
```

### 3. 聚合查询
```javascript
// 统计信息
const stats = await prisma.preset.groupBy({
  by: ['category'],
  _count: {
    id: true
  },
  _avg: {
    id: true
  }
})
```

## 错误处理

### Prisma 错误码
```javascript
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

try {
  await prisma.preset.create({ data: presetData })
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new Error('预设名称已存在')
      case 'P2025':
        throw new Error('预设不存在')
      default:
        throw new Error(`数据库错误: ${error.message}`)
    }
  }
  throw error
}
```

## 性能优化

### 1. 连接池配置
```javascript
// lib/database/prisma.js
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./data/app.db?connection_limit=20&pool_timeout=20"
    }
  }
})
```

### 2. 查询优化
```javascript
// 使用索引
const presets = await prisma.preset.findMany({
  where: {
    type: 'built-in', // 有索引的字段
    category: 'common' // 有索引的字段
  }
})

// 避免 N+1 查询
const presetsWithStats = await prisma.preset.findMany({
  include: {
    _count: {
      select: { tools: true }
    }
  }
})
```

### 3. 缓存策略
```javascript
class PresetService {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5分钟
  }

  async findByName(name) {
    const cacheKey = `preset:${name}`
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }
    
    const preset = await this.prisma.preset.findUnique({
      where: { name }
    })
    
    this.cache.set(cacheKey, {
      data: preset,
      timestamp: Date.now()
    })
    
    return preset
  }
}
```

## 开发工具

### 1. Prisma Studio
```bash
# 启动可视化数据库管理工具
npx prisma studio
```

### 2. 数据库重置
```bash
# 重置数据库（开发环境）
npx prisma db push --force-reset
```

### 3. 生成客户端
```bash
# 重新生成 Prisma 客户端
npx prisma generate
```

## 部署注意事项

### 1. 生产环境迁移
```bash
# 生产环境使用迁移而不是 db push
npx prisma migrate deploy
```

### 2. 环境变量
```env
# .env
DATABASE_URL="file:./data/app.db"
```

### 3. Docker 部署
```dockerfile
# 在 Docker 中生成 Prisma 客户端
RUN npx prisma generate
```

## 最佳实践

### 1. 服务层设计
- 每个数据模型对应一个服务类
- 服务类包含业务逻辑，不直接暴露 Prisma 操作
- 使用事务处理复杂业务操作

### 2. 错误处理
- 统一的错误处理机制
- 将 Prisma 错误转换为业务错误
- 记录详细的错误日志

### 3. 性能优化
- 合理使用索引
- 避免 N+1 查询
- 实现适当的缓存策略
- 使用分页查询处理大量数据

### 4. 数据验证
- 在服务层进行数据验证
- 使用 Zod 等库进行类型验证
- 确保数据一致性

这个 Prisma 方案比手写 SQL 更加现代化、类型安全，并且大大提升了开发效率！