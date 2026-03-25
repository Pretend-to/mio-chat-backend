#!/usr/bin/env node

/**
 * Logger 真实场景测试
 */

import logger from '../utils/logger.js'

console.log('=== 真实场景测试 ===\n')

// 模拟真实的配置对象
const realWorldConfig = {
  server: {
    port: 3080,
    host: '0.0.0.0'
  },
  
  // LLM 配置（包含敏感信息）
  llm_adapters: {
    openai: [{
      enable: true,
      api_key: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      base_url: 'https://api.openai.com/v1',
      models: ['gpt-4', 'gpt-3.5-turbo']
    }],
    vertex: [{
      enable: true,
      project_id: 'my-project-123',
      region: 'us-central1',
      service_account_json: '{"type":"service_account","project_id":"my-project-123","private_key_id":"key123","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB...\\n-----END PRIVATE KEY-----\\n","client_email":"service@my-project-123.iam.gserviceaccount.com"}'
    }]
  },
  
  // OneBot 配置
  onebot: {
    enable: true,
    token: 'onebot-access-token-1234567890',
    bot_qq: '2698788044',
    admin_qq: '1099834705'
  },
  
  // 模拟图片上传数据
  uploadData: {
    filename: 'test.png',
    mimetype: 'image/png',
    data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    size: 1024
  },
  
  // 模拟用户会话
  session: {
    user_id: 'user123',
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    refresh_token: 'rt_1234567890abcdef1234567890abcdef',
    expires_at: '2024-12-31T23:59:59Z'
  }
}

logger.info('测试真实配置对象的日志输出：')
logger.json(realWorldConfig)

console.log('\n=== 测试各种日志级别 ===')

logger.info('这是一个普通的信息日志')
logger.warn('这是一个警告日志，包含敏感信息', { api_key: 'secret-key-123' })
logger.error('这是一个错误日志', new Error('测试错误'))
logger.mark('这是一个标记日志')

if (global.debug) {
  logger.debug('这是一个调试日志')
}