# Scripts 目录说明

## 目录结构

```
scripts/
├── README.md                    # 本说明文件
├── test/                        # 测试脚本目录
├── utils/                       # 内部工具和迁移脚本
├── initialize-defaults.js       # 初始化默认配置
├── quick-start.js               # 快速启动
└── setup.js                     # 项目设置
```

## 核心脚本说明

### 生产环境脚本
- `initialize-defaults.js` - 初始化默认配置（核心服务使用）
- `setup.js` - 完整项目设置
- `quick-start.js` - 快速启动项目

### 内部工具脚本 (utils/)
- `get-admin-code.js` - 获取管理员访问码
- `clear-admin-code.js` - 清除管理员访问码
- `migrate-to-sqlite.js` - 数据迁移脚本
- `release.sh` - 发布脚本
- `run-tests.sh` - 运行测试脚本
- `migrate-onebot-config.js` - OneBot 配置迁移

### 部署与 Docker
可以直接使用 `docker-compose` 命令或 `npm run docker:*` 脚本。

## 测试脚本目录 (test/)

包含各种功能测试脚本，用于验证系统各个模块的功能。

## 临时脚本目录 (../tmp/)

用于存放临时测试脚本和调试脚本，该目录已添加到 .gitignore 中。

## 使用建议

1. **临时测试脚本**：请在 `tmp/` 目录中创建
2. **长期保留的测试**：放在 `scripts/test/` 目录中
3. **核心功能脚本**：放在 `scripts/` 根目录
4. **命名规范**：
   - 测试脚本：`test-*.js`
   - 调试脚本：`debug-*.js`
   - 检查脚本：`check-*.js`
   - 清理脚本：`clean-*.js`