#!/usr/bin/env node

/**
 * Logger 屏蔽功能边界情况测试
 */

import logger from '../utils/logger.js'

console.log('=== Logger 边界情况测试 ===\n')

// 测试各种边界情况
const edgeCases = {
  // 空值和特殊值
  nullValue: null,
  undefinedValue: undefined,
  emptyString: '',
  
  // 短字符串（不应被屏蔽）
  shortBase64Like: 'YWJj', // 只有4个字符
  
  // 长字符串但不是base64
  longNonBase64: 'a'.repeat(100),
  
  // 包含特殊字符的长字符串
  longWithSpecialChars: 'This-is-a-very-long-string-with-special-chars-!@#$%^&*()_+-=[]{}|;:,.<>?'.repeat(2),
  
  // 真实的JWT token（应该被屏蔽）
  jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  
  // 大的base64字符串（模拟大图片）
  largeBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='.repeat(10),
  
  // 各种敏感字段名的变体
  API_KEY: 'secret-api-key-value',
  apiKey: 'another-secret-key',
  client_secret: 'oauth-client-secret',
  privateKey: 'private-key-content',
  service_account_json: '{"type":"service_account","project_id":"test"}',
  
  // 嵌套结构
  config: {
    database: {
      password: 'db-password-123',
      connection_string: 'postgresql://user:pass@localhost/db'
    },
    auth: {
      jwt_secret: 'jwt-signing-secret',
      refresh_token: 'refresh-token-value'
    }
  }
}

logger.json(edgeCases)

console.log('\n=== 测试单独的方法 ===')

// 测试单独的检测方法
const testStrings = [
  'normal string',
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
]

testStrings.forEach((str, index) => {
  const isBase64 = logger.isBase64String(str)
  const masked = logger.maskBase64(str)
  console.log(`Test ${index + 1}:`)
  console.log(`  Original: ${str.substring(0, 50)}${str.length > 50 ? '...' : ''}`)
  console.log(`  Is Base64: ${isBase64}`)
  console.log(`  Masked: ${masked}`)
  console.log()
})