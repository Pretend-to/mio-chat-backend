#!/usr/bin/env node

/**
 * 测试 Web 配置加载
 */

import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import logger from '../utils/logger.js'

async function testWebConfig() {
  try {
    logger.info('测试 Web 配置加载...')
    
    // 初始化数据库连接
    await prismaManager.initialize()
    await SystemSettingsService.initialize()
    
    // 加载配置
    const config = (await import('../lib/config.js')).default
    await config._waitForInit()
    
    logger.info('Web 配置信息：')
    logger.info(`- 管理员访问码: ${config.web.admin_code ? '已设置' : '未设置'}`)
    logger.info(`- 普通用户访问码: ${config.web.user_code ? '已设置' : '未设置'}`)
    logger.info(`- 全屏模式: ${config.web.full_screen}`)
    logger.info(`- 标题: ${config.web.title}`)
    logger.info(`- 备案信息: ${config.web.beian || '未设置'}`)
    
    // 测试数据库中的配置
    logger.info('\n数据库中的 Web 配置：')
    const webFullScreen = await SystemSettingsService.get('web_full_screen')
    const webTitle = await SystemSettingsService.get('web_title')
    const webBeian = await SystemSettingsService.get('web_beian')
    
    logger.info(`- web_full_screen: ${webFullScreen?.value}`)
    logger.info(`- web_title: ${webTitle?.value}`)
    logger.info(`- web_beian: ${webBeian?.value || '未设置'}`)
    
    logger.info('\n✓ Web 配置测试完成!')
    
  } catch (error) {
    logger.error('Web 配置测试失败:', error)
  } finally {
    await prismaManager.disconnect()
  }
}

testWebConfig()