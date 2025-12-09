# 插件 CRUD 使用示例

## 示例 1: 管理 MCP 插件

### 场景: 添加 Brave Search MCP 服务器

```bash
#!/bin/bash

ADMIN_CODE="your_admin_code"
BASE_URL="http://localhost:3000"

# 1. 查看当前 MCP 插件配置
echo "📖 获取当前配置..."
curl -s "${BASE_URL}/api/plugins/mcp-plugin/config?admin_code=${ADMIN_CODE}" | jq

# 2. 更新配置，添加 Brave Search
echo "✏️  添加 Brave Search..."
curl -s -X PUT "${BASE_URL}/api/plugins/mcp-plugin/config?admin_code=${ADMIN_CODE}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "mcpServers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/your-name/Documents"]
      },
      "brave-search": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-brave-search"],
        "env": {
          "BRAVE_API_KEY": "BSA_YOUR_API_KEY_HERE"
        }
      }
    }
  }' | jq

# 3. 等待配置文件更新
sleep 1

# 4. 重载插件以连接新的 MCP 服务器
echo "🔄 重载插件..."
curl -s -X POST "${BASE_URL}/api/plugins/mcp-plugin/reload?admin_code=${ADMIN_CODE}" | jq

# 5. 验证工具已加载
echo "✅ 验证工具列表..."
curl -s "${BASE_URL}/api/plugins/mcp-plugin/tools?admin_code=${ADMIN_CODE}" | jq '.data.tools[] | .group'
```

---

## 示例 2: JavaScript/TypeScript 客户端

### React Hook 示例

```typescript
// usePluginManager.ts
import { useState, useEffect } from 'react'

interface Plugin {
  name: string
  displayName: string
  enabled: boolean
  toolCount: number
  version: string
}

export function usePluginManager(adminCode: string) {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(false)
  
  const baseURL = '/api/plugins'
  
  // 获取插件列表
  const fetchPlugins = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${baseURL}?admin_code=${adminCode}`)
      const data = await res.json()
      if (data.code === 0) {
        setPlugins(data.data.plugins)
      }
    } catch (error) {
      console.error('Failed to fetch plugins:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // 更新插件配置
  const updateConfig = async (pluginName: string, config: any) => {
    const res = await fetch(`${baseURL}/${pluginName}/config?admin_code=${adminCode}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    const data = await res.json()
    return data.code === 0
  }
  
  // 重载插件
  const reloadPlugin = async (pluginName: string) => {
    const res = await fetch(`${baseURL}/${pluginName}/reload?admin_code=${adminCode}`, {
      method: 'POST'
    })
    const data = await res.json()
    if (data.code === 0) {
      await fetchPlugins() // 刷新列表
    }
    return data.code === 0
  }
  
  // 切换插件状态
  const togglePlugin = async (pluginName: string, enabled: boolean) => {
    const res = await fetch(`${baseURL}/${pluginName}/toggle?admin_code=${adminCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    })
    const data = await res.json()
    if (data.code === 0) {
      await fetchPlugins() // 刷新列表
    }
    return data.code === 0
  }
  
  useEffect(() => {
    fetchPlugins()
  }, [])
  
  return {
    plugins,
    loading,
    fetchPlugins,
    updateConfig,
    reloadPlugin,
    togglePlugin
  }
}
```

### React 组件示例

```tsx
// PluginManager.tsx
import React from 'react'
import { usePluginManager } from './usePluginManager'

export function PluginManager({ adminCode }: { adminCode: string }) {
  const { plugins, loading, reloadPlugin, togglePlugin } = usePluginManager(adminCode)
  
  if (loading) return <div>加载中...</div>
  
  return (
    <div className="plugin-manager">
      <h2>插件管理</h2>
      
      {plugins.map(plugin => (
        <div key={plugin.name} className="plugin-card">
          <div className="plugin-header">
            <h3>{plugin.displayName}</h3>
            <span className={`status ${plugin.enabled ? 'enabled' : 'disabled'}`}>
              {plugin.enabled ? '已启用' : '已禁用'}
            </span>
          </div>
          
          <div className="plugin-info">
            <p>版本: {plugin.version}</p>
            <p>工具数量: {plugin.toolCount}</p>
          </div>
          
          <div className="plugin-actions">
            <button onClick={() => reloadPlugin(plugin.name)}>
              重载
            </button>
            <button onClick={() => togglePlugin(plugin.name, !plugin.enabled)}>
              {plugin.enabled ? '禁用' : '启用'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## 示例 3: Python 自动化脚本

```python
#!/usr/bin/env python3
import requests
import json
import time

class PluginManager:
    def __init__(self, base_url='http://localhost:3000', admin_code='admin123'):
        self.base_url = base_url
        self.admin_code = admin_code
    
    def _request(self, method, endpoint, data=None):
        url = f"{self.base_url}{endpoint}"
        params = {'admin_code': self.admin_code}
        
        if method == 'GET':
            response = requests.get(url, params=params)
        elif method == 'POST':
            response = requests.post(url, params=params, json=data)
        elif method == 'PUT':
            response = requests.put(url, params=params, json=data)
        
        return response.json()
    
    def list_plugins(self):
        """获取所有插件"""
        return self._request('GET', '/api/plugins')
    
    def get_plugin(self, name):
        """获取插件详情"""
        return self._request('GET', f'/api/plugins/{name}')
    
    def update_config(self, name, config):
        """更新插件配置"""
        return self._request('PUT', f'/api/plugins/{name}/config', config)
    
    def reload_plugin(self, name):
        """重载插件"""
        return self._request('POST', f'/api/plugins/{name}/reload')
    
    def toggle_plugin(self, name, enabled):
        """启用/禁用插件"""
        return self._request('POST', f'/api/plugins/{name}/toggle', {'enabled': enabled})

# 使用示例
if __name__ == '__main__':
    manager = PluginManager(admin_code='your_admin_code')
    
    # 1. 列出所有插件
    result = manager.list_plugins()
    print(f"共有 {result['data']['total']} 个插件:")
    for plugin in result['data']['plugins']:
        print(f"  - {plugin['name']}: {plugin['toolCount']} 个工具")
    
    # 2. 更新 MCP 插件配置
    new_config = {
        'enabled': True,
        'mcpServers': {
            'filesystem': {
                'command': 'npx',
                'args': ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/files']
            }
        }
    }
    
    print("\n更新 mcp-plugin 配置...")
    manager.update_config('mcp-plugin', new_config)
    
    # 等待配置写入
    time.sleep(1)
    
    # 3. 重载插件
    print("重载 mcp-plugin...")
    result = manager.reload_plugin('mcp-plugin')
    print(f"重载成功! 工具数量: {result['data']['toolCount']}")
```

---

## 示例 4: 监控脚本

### 定期检查插件状态

```bash
#!/bin/bash

ADMIN_CODE="your_admin_code"
BASE_URL="http://localhost:3000"

while true; do
    echo "=== $(date) ==="
    
    # 获取插件列表
    PLUGINS=$(curl -s "${BASE_URL}/api/plugins?admin_code=${ADMIN_CODE}")
    
    # 检查每个插件
    echo "$PLUGINS" | jq -r '.data.plugins[] | "\(.name): \(.enabled) - \(.toolCount) tools"'
    
    # 检查是否有启用但没有工具的插件
    BROKEN=$(echo "$PLUGINS" | jq -r '.data.plugins[] | select(.enabled == true and .toolCount == 0) | .name')
    
    if [ ! -z "$BROKEN" ]; then
        echo "⚠️  警告: 以下插件已启用但没有工具:"
        echo "$BROKEN"
        
        # 尝试重载
        for plugin in $BROKEN; do
            echo "🔄 重载 $plugin..."
            curl -s -X POST "${BASE_URL}/api/plugins/${plugin}/reload?admin_code=${ADMIN_CODE}"
        done
    fi
    
    echo ""
    sleep 60  # 每分钟检查一次
done
```

---

## 示例 5: 配置备份与恢复

```bash
#!/bin/bash

ADMIN_CODE="your_admin_code"
BASE_URL="http://localhost:3000"
BACKUP_DIR="./plugin-backups"

mkdir -p "$BACKUP_DIR"

# 备份所有插件配置
backup_configs() {
    echo "📦 备份插件配置..."
    
    PLUGINS=$(curl -s "${BASE_URL}/api/plugins?admin_code=${ADMIN_CODE}" | jq -r '.data.plugins[].name')
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
    mkdir -p "$BACKUP_PATH"
    
    for plugin in $PLUGINS; do
        CONFIG=$(curl -s "${BASE_URL}/api/plugins/${plugin}/config?admin_code=${ADMIN_CODE}")
        echo "$CONFIG" > "$BACKUP_PATH/${plugin}.json"
        echo "  ✅ $plugin"
    done
    
    echo "备份完成: $BACKUP_PATH"
}

# 恢复插件配置
restore_configs() {
    BACKUP_PATH=$1
    
    if [ ! -d "$BACKUP_PATH" ]; then
        echo "❌ 备份目录不存在: $BACKUP_PATH"
        exit 1
    fi
    
    echo "📥 恢复插件配置..."
    
    for config_file in "$BACKUP_PATH"/*.json; do
        plugin_name=$(basename "$config_file" .json)
        echo "  恢复 $plugin_name..."
        
        curl -s -X PUT "${BASE_URL}/api/plugins/${plugin_name}/config?admin_code=${ADMIN_CODE}" \
            -H "Content-Type: application/json" \
            -d @"$config_file"
        
        sleep 1
        
        # 重载插件
        curl -s -X POST "${BASE_URL}/api/plugins/${plugin_name}/reload?admin_code=${ADMIN_CODE}"
    done
    
    echo "恢复完成!"
}

# 使用示例
case "$1" in
    backup)
        backup_configs
        ;;
    restore)
        restore_configs "$2"
        ;;
    *)
        echo "用法: $0 {backup|restore <backup_path>}"
        exit 1
        ;;
esac
```

使用:
```bash
# 备份
./plugin-backup.sh backup

# 恢复
./plugin-backup.sh restore ./plugin-backups/backup_20250109_120000
```

---

## 总结

这些示例展示了插件 CRUD API 的多种使用场景:

1. **Bash 脚本** - 快速管理和自动化
2. **React/TypeScript** - 构建管理界面
3. **Python** - 集成到现有运维系统
4. **监控脚本** - 持续健康检查
5. **备份恢复** - 配置版本管理

选择适合你的场景的方式开始使用吧！
