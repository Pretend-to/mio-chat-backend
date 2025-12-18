#!/usr/bin/env node

/**
 * 测试 owners 配置加载
 */

import logger from '../utils/logger.js'
import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import fs from 'fs'

async function testOwnersLoading() {
  logger.info('🧪 测试 owners 配置加载...')
  
  try {
    // 删除数据库文件，模拟新用户环境
    const dbPath = 'prisma/dev.db'
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath)
      logger.info('清理数据库文件')
    }
    
    // 初始化数据库
    await prismaManager.initialize()
    await SystemSettingsService.initialize()
    
    // 运行初始化脚本
    const { default: initializeDefaults } = await import('./initialize-defaults.js')
    
    // 检查 owners 配置
    const owners = await SystemSettingsService.get('model_owners')
    
    if (!owners || !owners.value) {
      logger.error('❌ 未找到 model_owners 配置')
      return false
    }
    
    const ownersData = owners.value
    logger.info(`✅ 加载了 ${ownersData.length} 个模型所有者配置`)
    
    // 验证一些关键的 owners
    const expectedOwners = ['OpenAI', 'Google', 'Anthropic', 'DeepSeek']
    const actualOwners = ownersData.map(o => o.owner)
    
    let allFound = true
    for (const expected of expectedOwners) {
      if (actualOwners.includes(expected)) {
        logger.info(`✅ 找到 ${expected}`)
      } else {
        logger.error(`❌ 未找到 ${expected}`)
        allFound = false
      }
    }
    
    // 验证关键词
    const openaiOwner = ownersData.find(o => o.owner === 'OpenAI')
    if (openaiOwner && openaiOwner.keywords.includes('gpt')) {
      logger.info('✅ OpenAI 关键词配置正确')
    } else {
      logger.error('❌ OpenAI 关键词配置错误')
      allFound = false
    }
    
    if (allFound) {
      logger.info('🎉 owners 配置加载测试通过！')
      return true
    } else {
      logger.error('❌ owners 配置加载测试失败')
      return false
    }
    
  } catch (error) {
    logger.error('测试过程中发生错误:', error)
    return false
  } finally {
    await prismaManager.disconnect()
  }
}

// 运行测试
testOwnersLoading().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  logger.error('测试执行失败:', error)
  process.exit(1)
})