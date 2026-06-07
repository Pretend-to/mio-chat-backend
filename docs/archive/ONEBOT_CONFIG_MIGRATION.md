# OneBot 配置存储迁移说明

## 概述

为了统一配置管理，OneBot 配置的存储位置已从 `plugin_configs` 表迁移到 `system_settings` 表。这样可以确保所有系统配置（包括 LLM 适配器、OneBot 等）都使用统一的存储和管理方式。

## 变更内容

### 之前（旧版本）
- **存储位置**: `plugin_configs` 表
- **记录名称**: `onebotConfig`
- **加载方式**: `PluginConfigService.findByName('onebotConfig')`

### 现在（新版本）
- **存储位置**: `system_settings` 表
- **记录键名**: `onebot`
- **加载方式**: `SystemSettingsService.get('onebot')`

## 自动迁移

### 新用户
新用户在初始化时会自动在 `system_settings` 表中创建 OneBot 配置，无需额外操作。

### 现有用户
现有用户需要运行迁移脚本来将配置从旧位置迁移到新位置：

```bash
# 运行 OneBot 配置迁移脚本
node scripts/migrate-onebot-config.js
```

### 全量迁移
如果你正在进行完整的 SQLite 迁移，OneBot 配置会自动包含在迁移过程中：

```bash
# 完整迁移（包含 OneBot 配置）
node scripts/migrate-to-sqlite.js
```

## 配置结构

OneBot 配置的数据结构保持不变：

```json
{
  "enable": false,
  "reverse_ws_url": "",
  "bot_qq": "",
  "admin_qq": "",
  "token": "",
  "plugins": {
    "options": {
      "textwraper": {
        "options": [...]
      }
    }
  }
}
```

## API 接口变更

### 配置读取
- **GET** `/api/config` - 现在会正确返回 OneBot 配置的 `enable` 状态
- **GET** `/api/config/onebot` - 获取 OneBot 配置节点

### 配置更新
- **PUT** `/api/config/onebot` - 更新 OneBot 配置
- **PUT** `/api/config` - 批量更新配置（包含 OneBot）

## 兼容性说明

### 向后兼容
- 旧的 `plugin_configs` 表中的 `onebotConfig` 记录在迁移后会保留
- 可以手动删除旧记录，但建议先确认新配置工作正常

### 代码变更
- `config.getOnebotConfig()` 方法保持不变
- 内部实现已更新为从 `system_settings` 加载配置

## 故障排除

### 配置不生效
如果 OneBot 配置更新后不生效：

1. 检查配置是否正确保存：
   ```sql
   SELECT * FROM system_settings WHERE key = 'onebot';
   ```

2. 重启应用以重新加载配置：
   ```bash
   # 重启应用
   npm restart
   ```

### 迁移失败
如果迁移脚本执行失败：

1. 检查数据库连接是否正常
2. 确认两个服务都已正确初始化
3. 查看错误日志获取详细信息

### 手动迁移
如果自动迁移失败，可以手动执行：

```sql
-- 1. 从旧位置获取配置
SELECT config_data FROM plugin_configs WHERE plugin_name = 'onebotConfig';

-- 2. 插入到新位置（替换 {config_data} 为实际配置）
INSERT INTO system_settings (key, value, category, description) 
VALUES ('onebot', '{config_data}', 'onebot', 'OneBot 协议配置');

-- 3. 验证迁移结果
SELECT * FROM system_settings WHERE key = 'onebot';
```

## 注意事项

1. **备份重要**: 在执行迁移前，建议备份数据库
2. **测试验证**: 迁移后请测试 OneBot 功能是否正常
3. **清理旧数据**: 确认新配置工作正常后，可删除旧的 `plugin_configs` 记录
4. **重启应用**: 配置迁移后需要重启应用以生效

## 相关文件

- `lib/config.js` - 配置加载逻辑
- `scripts/migrate-onebot-config.js` - 专用迁移脚本
- `scripts/migrate-to-sqlite.js` - 完整迁移脚本
- `scripts/initialize-defaults.js` - 默认配置初始化