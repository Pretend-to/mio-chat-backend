# 初始化流程修复文档

## 修复内容

### 1. 清理配置文件相关代码

- **删除废弃的文件操作方法**：
  - `loadYamlFile()` - 已删除
  - `loadJsonFile()` - 已删除  
  - `writeYamlFile()` - 已删除
  - `checkConfigExists()` - 已删除
  - `_initializePaths()` - 已删除
  - `_loadPresetsFromFileSystem()` - 已删除
  - `loadPluginConfig()` - 已删除

- **删除不必要的导入**：
  - `fs` - 从 config.js 中删除
  - `yaml` - 从 config.js 中删除
  - `fileURLToPath` - 从 config.js 中删除
  - `path` - 从 config.js 中删除

### 2. 修复配置服务中的文件加载

- **修复 `lib/server/http/services/configService.js`**：
  - 替换 `config.loadJsonFile()` 为原生 `fs.readFileSync()` + `JSON.parse()`
  - 添加必要的 `fs` 导入

### 3. 更新用户提示信息

- **修复 `lib/check.js`**：
  - 将配置文件路径提示改为 Web 管理界面提示
  - 更新错误信息，指导用户使用数据库配置

### 4. 完善初始化流程

- **创建默认配置初始化脚本** (`scripts/initialize-defaults.js`)：
  - 自动创建必要的系统设置
  - 初始化默认插件配置
  - 支持环境变量配置

- **修改配置系统** (`lib/config.js`)：
  - 添加从数据库加载系统配置的方法
  - 使配置初始化异步化
  - 添加配置初始化状态检查

- **更新应用启动流程** (`app.js`)：
  - 在数据库初始化后运行默认配置初始化
  - 等待配置初始化完成后再进行状态检查

### 5. 添加测试和验证

- **创建初始化测试脚本** (`scripts/test-initialization.js`)：
  - 测试完整的初始化流程
  - 验证配置加载是否正常
  - 检查数据库连接和服务状态

- **更新 package.json 脚本**：
  - `npm run dev` - 开发模式启动（推荐）
  - `npm run quick-start` - 快速启动（显示访问码）
  - `npm run init-defaults` - 运行默认配置初始化
  - `npm run test-init` - 测试初始化流程

## 修复后的初始化流程

1. **数据库初始化**
   - 初始化 Prisma 管理器
   - 初始化所有数据库服务

2. **默认配置初始化**
   - 创建必要的系统设置（如果不存在）
   - 初始化默认插件配置

3. **配置系统初始化**
   - 从数据库加载系统配置
   - 加载插件配置和预设
   - 设置调试模式

4. **系统状态检查**
   - 验证安全配置
   - 检查协议配置

5. **启动服务器**

## 环境变量支持

现在支持通过环境变量设置初始配置：

- `ADMIN_CODE` - 管理员访问码
- `USER_CODE` - 普通用户访问码  
- `PORT` - 服务器端口
- `DEBUG` - 调试模式

## 使用方法

### 首次运行

```bash
# 1. 初始化数据库
npm run db:push

# 2. 启动应用（自动生成访问码）
npm run dev
# 或直接使用
node app.js
```

### 其他启动方式

```bash
# 显示生成的访问码
npm run quick-start

# 设置自定义访问码启动
ADMIN_CODE=your-secure-password USER_CODE=user-password node app.js
```

### 生产环境启动

```bash
# 1. 初始化数据库
npm run db:push

# 2. 初始化默认配置（可选，应用启动时会自动运行）
npm run init-defaults

# 3. 使用 PM2 启动
npm start
```

### 测试初始化流程

```bash
npm run test-init
```

## 注意事项

1. **配置文件已废弃**：所有配置现在都存储在 SQLite 数据库中
2. **环境变量优先级**：环境变量会在首次初始化时写入数据库
3. **向后兼容**：旧的配置文件不再被读取，需要通过 Web 界面重新配置
4. **安全要求**：必须设置 `ADMIN_CODE` 环境变量或在数据库中配置管理员访问码

## 故障排除

如果遇到初始化问题：

1. 检查数据库文件是否存在且可写
2. 确保环境变量设置正确
3. 运行 `npm run test-init` 诊断问题
4. 查看应用日志获取详细错误信息