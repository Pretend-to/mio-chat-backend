-- 初始数据库结构
-- 创建时间: 2024-12-16

-- 预设表
CREATE TABLE IF NOT EXISTS presets (
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

-- 插件配置表
CREATE TABLE IF NOT EXISTS plugin_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plugin_name TEXT NOT NULL UNIQUE,
  config_data TEXT NOT NULL, -- JSON 格式存储配置
  enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL, -- JSON 格式存储复杂配置
  category TEXT DEFAULT 'general', -- 'general' | 'server' | 'web' | 'onebot' | 'llm'
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- LLM适配器配置表
CREATE TABLE IF NOT EXISTS llm_adapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adapter_type TEXT NOT NULL, -- 'openai' | 'gemini' | 'vertex' | 'deepseek'
  instance_name TEXT NOT NULL, -- 实例名称，同类型可有多个实例
  config_data TEXT NOT NULL, -- JSON 格式存储适配器配置
  enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(adapter_type, instance_name)
);

-- 模型所有者配置表
CREATE TABLE IF NOT EXISTS model_owners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner TEXT NOT NULL,
  keywords TEXT NOT NULL, -- JSON 数组格式存储关键词
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 日志配置表
CREATE TABLE IF NOT EXISTS log_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  buffer_size INTEGER DEFAULT 1000,
  flush_interval INTEGER DEFAULT 1000,
  sources TEXT DEFAULT '[]', -- JSON 格式存储日志源
  filters TEXT DEFAULT '{}', -- JSON 格式存储过滤器
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 日志统计表
CREATE TABLE IF NOT EXISTS log_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  level TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, level)
);

-- 创建基础索引
CREATE INDEX IF NOT EXISTS idx_presets_name ON presets(name);
CREATE INDEX IF NOT EXISTS idx_presets_type ON presets(type);
CREATE INDEX IF NOT EXISTS idx_presets_category ON presets(category);

CREATE INDEX IF NOT EXISTS idx_plugin_configs_name ON plugin_configs(plugin_name);
CREATE INDEX IF NOT EXISTS idx_plugin_configs_enabled ON plugin_configs(enabled);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

CREATE INDEX IF NOT EXISTS idx_llm_adapters_type ON llm_adapters(adapter_type);
CREATE INDEX IF NOT EXISTS idx_llm_adapters_enabled ON llm_adapters(enabled);

CREATE INDEX IF NOT EXISTS idx_model_owners_owner ON model_owners(owner);

CREATE INDEX IF NOT EXISTS idx_log_configs_name ON log_configs(name);

CREATE INDEX IF NOT EXISTS idx_log_stats_date ON log_stats(date);
CREATE INDEX IF NOT EXISTS idx_log_stats_level ON log_stats(level);