#!/usr/bin/env node

/**
 * 修复 owners 配置脚本
 * 确保 owners 配置被正确加载到数据库中
 */

import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import logger from '../utils/logger.js'
import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'

/**
 * 加载默认的 owners 配置
 */
function loadDefaultOwners() {
  try {
    const ownersPath = path.join(process.cwd(), 'config', 'owners.yaml')
    logger.info(`正在加载 owners 配置: ${ownersPath}`)
    
    if (fs.existsSync(ownersPath)) {
      const ownersContent = fs.readFileSync(ownersPath, 'utf8')
      const owners = yaml.load(ownersContent)
      logger.info(`成功加载 ${owners.length} 个 owners 配置`)
      return owners
    } else {
      logger.error(`owners 配置文件不存在: ${ownersPath}`)
      return []
    }
  } catch (error) {
    logger.error('加载默认 owners 配置失败:', error.message)
    return []
  }
}

/**
 * 检查数据库中的 owners 配置
 */
async function checkOwnersInDB() {
  try {
    const owners = await SystemSettingsService.get('model_owners')
    
    if (!owners || !owners.value || owners.value.length === 0) {
      logger.warn('数据库中没有 owners 配置或配置为空')
      return false
    }
    
    logger.info(`数据库中有 ${owners.value.length} 个 owners 配置`)
    return true
  } catch (error) {
    logger.error('检查数据库 owners 配置失败:', error.message)
    return false
  }
}

/**
 * 更新数据库中的 owners 配置
 */
async function updateOwnersInDB() {
  try {
    const defaultOwners = loadDefaultOwners()
    
    if (defaultOwners.length === 0) {
      logger.error('没有可用的 owners 配置')
      return false
    }
    
    // 检查是否已存在
    const existing = await SystemSettingsService.get('model_owners')
    
    if (existing) {
      // 更新现有配置
      await SystemSettingsService.set('model_owners', defaultOwners)
      logger.info('✅ 更新了数据库中的 owners 配置')
    } else {
      // 创建新配置
      await SystemSettingsService.set('model_owners', defaultOwners)
      logger.info('✅ 创建了数据库中的 owners 配置')
    }
    
    return true
  } catch (error) {
    logger.error('更新数据库 owners 配置失败:', error.message)
    return false
  }
}

/**
 * 验证修复结果
 */
async function verifyFix() {
  try {
    const owners = await SystemSettingsService.get('model_owners')
    
    if (!owners || !owners.value || owners.value.length === 0) {
      logger.error('❌ 验证失败：数据库中仍然没有 owners 配置')
      return false
    }
    
    logger.info(`✅ 验证成功：数据库中有 ${owners.value.length} 个 owners 配置`)
    
    // 显示前几个配置
    const sampleOwners = owners.value.slice(0, 3)
    sampleOwners.forEach(owner => {
      logger.info(`  - ${owner.owner}: ${owner.keywords.join(', ')}`)
    })
    
    return true
  } catch (error) {
    logger.error('验证修复结果失败:', error.message)
    return false
  }
}

/**
 * 主函数
 */
async function main() {
  logger.info('🔧 开始修复 owners 配置...')
  
  try {
    // 初始化数据库连接
    await prismaManager.initialize()
    await SystemSettingsService.initialize()
    
    // 检查当前状态
    logger.info('📋 检查当前数据库状态...')
    const hasOwners = await checkOwnersInDB()
    
    if (hasOwners) {
      logger.info('✅ 数据库中已有 owners 配置')
      
      // 询问是否要强制更新
      logger.info('💡 如果需要强制更新，请使用 --force 参数')
      
      if (!process.argv.includes('--force')) {
        await verifyFix()
        return
      }
    }
    
    // 更新配置
    logger.info('🔄 正在更新 owners 配置...')
    const success = await updateOwnersInDB()
    
    if (!success) {
      logger.error('❌ 更新失败')
      process.exit(1)
    }
    
    // 验证结果
    logger.info('🔍 验证修复结果...')
    const verified = await verifyFix()
    
    if (verified) {
      logger.info('🎉 owners 配置修复完成！')
    } else {
      logger.error('❌ 修复验证失败')
      process.exit(1)
    }
    
  } catch (error) {
    logger.error('修复过程中发生错误:', error)
    process.exit(1)
  } finally {
    await prismaManager.disconnect()
  }
}

// 运行脚本
main().catch(error => {
  logger.error('脚本执行失败:', error)
  process.exit(1)
})