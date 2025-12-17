#!/usr/bin/env node

/**
 * 迁移 owners.yaml 到数据库
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import logger from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function migrateOwners() {
  try {
    logger.info('开始迁移模型所有者配置...')
    
    // 初始化数据库连接
    await prismaManager.initialize()
    await SystemSettingsService.initialize()
    
    // 查找 owners.yaml 文件
    const ownersPath = path.resolve(__dirname, '../backup/2025-12-17/config/config/owners.yaml')
    
    if (!fs.existsSync(ownersPath)) {
      logger.error('未找到 owners.yaml 文件:', ownersPath)
      return
    }
    
    // 读取并解析 owners.yaml
    const ownersContent = fs.readFileSync(ownersPath, 'utf8')
    const owners = yaml.load(ownersContent)
    
    if (!Array.isArray(owners)) {
      logger.error('owners.yaml 格式不正确，应该是数组')
      return
    }
    
    logger.info(`读取到 ${owners.length} 个模型所有者配置`)
    
    // 更新数据库中的配置
    await SystemSettingsService.set(
      'model_owners',
      owners,
      'general',
      '模型所有者配置'
    )
    
    logger.info('✅ 模型所有者配置迁移成功!')
    
    // 验证迁移结果
    const result = await SystemSettingsService.get('model_owners')
    logger.info(`验证: 数据库中现在有 ${result.value.length} 个模型所有者配置`)
    
  } catch (error) {
    logger.error('迁移失败:', error)
  } finally {
    await prismaManager.disconnect()
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateOwners()
}

export default migrateOwners