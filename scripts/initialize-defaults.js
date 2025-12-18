#!/usr/bin/env node

/**
 * 初始化默认配置脚本
 * 确保数据库中有必要的默认配置项
 */

import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import PluginConfigService from '../lib/database/services/PluginConfigService.js'
import logger from '../utils/logger.js'

/**
 * 初始化默认系统设置
 */
async function initializeDefaultSystemSettings() {
  logger.info('正在初始化默认系统设置...')
  
  // 生成默认访问码
  const generateSecureCode = async () => {
    const crypto = await import('crypto')
    return crypto.randomBytes(16).toString('base64')
  }

  const defaultSettings = [
    {
      key: 'admin_code',
      value: process.env.ADMIN_CODE || await generateSecureCode(),
      category: 'web',
      description: '管理员访问码'
    },
    {
      key: 'user_code', 
      value: process.env.USER_CODE || await generateSecureCode(),
      category: 'web',
      description: '普通用户访问码'
    },
    {
      key: 'server_port',
      value: parseInt(process.env.PORT) || 3000,
      category: 'server',
      description: '服务器端口'
    },
    {
      key: 'debug_mode',
      value: process.env.DEBUG === 'true' || false,
      category: 'general',
      description: '调试模式'
    },
    {
      key: 'model_owners',
      value: [],
      category: 'general',
      description: '模型所有者配置'
    },
    {
      key: 'web_full_screen',
      value: process.env.WEB_FULL_SCREEN === 'false' ? false : true,
      category: 'web',
      description: 'Web 界面全屏模式'
    },
    {
      key: 'web_beian',
      value: process.env.WEB_BEIAN || '',
      category: 'web',
      description: 'Web 界面备案信息'
    },
    {
      key: 'web_title',
      value: process.env.WEB_TITLE || 'MioChat',
      category: 'web',
      description: 'Web 界面标题'
    }
  ]

  for (const setting of defaultSettings) {
    try {
      const existing = await SystemSettingsService.get(setting.key)
      if (!existing) {
        await SystemSettingsService.set(setting.key, setting.value, setting.category, setting.description)
        logger.info(`✓ 创建默认设置: ${setting.key}`)
        
        // 如果是访问码，显示生成的值
        if (setting.key === 'admin_code' || setting.key === 'user_code') {
          logger.warn(`🔐 自动生成的${setting.description}: ${setting.value}`)
          logger.warn('⚠️  请妥善保存此访问码！')
        }
      } else {
        logger.info(`- 设置已存在: ${setting.key}`)
      }
    } catch (error) {
      logger.error(`创建默认设置失败 ${setting.key}:`, error)
    }
  }
}

/**
 * 初始化默认插件配置
 */
async function initializeDefaultPluginConfig() {
  logger.info('正在初始化默认插件配置...')
  
  try {
    const existing = await PluginConfigService.findByName('onebotConfig')
    if (!existing) {
      const defaultOnebotConfig = {
        enable: false,
        reverse_ws_url: '',
        bot_qq: '',
        admin_qq: '',
        token: '',
        plugins: null
      }
      
      await PluginConfigService.create('onebotConfig', defaultOnebotConfig, true)
      
      logger.info('✓ 创建默认 OneBot 配置')
    } else {
      logger.info('- OneBot 配置已存在')
    }
  } catch (error) {
    logger.error('创建默认插件配置失败:', error)
  }
}

/**
 * 主初始化函数
 */
async function main() {
  try {
    logger.info('开始初始化默认配置...')
    
    // 初始化数据库连接
    await prismaManager.initialize()
    
    // 初始化服务
    await SystemSettingsService.initialize()
    await PluginConfigService.initialize()
    
    // 初始化默认配置
    await initializeDefaultSystemSettings()
    await initializeDefaultPluginConfig()
    
    logger.info('默认配置初始化完成!')
    
  } catch (error) {
    logger.error('初始化默认配置失败:', error)
    process.exit(1)
  } finally {
    // 关闭数据库连接
    await prismaManager.disconnect()
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default main