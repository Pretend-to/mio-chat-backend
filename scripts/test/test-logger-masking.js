#!/usr/bin/env node

/**
 * Logger 屏蔽功能测试脚本
 */

import logger from '../utils/logger.js'

// 测试数据
const testData = {
  // 普通字符串
  normalString: 'Hello World',
  
  // 短字符串（不应被识别为base64）
  shortString: 'abc123',
  
  // 长字符串但不是base64
  longString: 'This is a very long string that is not base64 encoded but might be confused as one because of its length',
  
  // 真实的base64字符串（图片数据）
  imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  
  // data URL格式的base64
  dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  
  // 敏感信息
  api_key: 'sk-1234567890abcdef1234567890abcdef',
  password: 'mySecretPassword123',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  
  // 嵌套对象
  nested: {
    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    secret: 'very-secret-value',
    normal: 'normal value'
  }
}

console.log('=== Logger 屏蔽功能测试 ===\n')

logger.json(testData)