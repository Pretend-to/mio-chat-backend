#!/usr/bin/env node

import axios from 'axios'
import logger from '../utils/logger.js'
import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'

/**
 * 简化的配置接口测试
 */

async function testConfigAPI() {
  try {
    // 获取管理员访问码
    await prismaManager.initialize()
    await SystemSettingsService.initialize()
    
    const adminCode = await SystemSettingsService.get('admin_code')
    if (!adminCode || !adminCode.value) {
      throw new Error('未找到管理员访问码')
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'x-admin-code': adminCode.value
    }
    
    logger.info(`使用管理员访问码: ${adminCode.value.substring(0, 4)}...`)
    
    // 测试获取完整配置
    logger.info('测试获取完整配置...')
    const configResponse = await axios.get('http://localhost:3000/api/config', { headers })
    logger.info(`状态码: ${configResponse.status}`)
    console.log('响应数据:', JSON.stringify(configResponse.data, null, 2))
    
    // 测试获取server配置节点
    logger.info('\n测试获取server配置节点...')
    const serverResponse = await axios.get('http://localhost:3000/api/config/server', { headers })
    logger.info(`状态码: ${serverResponse.status}`)
    console.log('响应数据:', JSON.stringify(serverResponse.data, null, 2))
    
    // 测试更新server配置
    logger.info('\n测试更新server配置...')
    const updateData = { port: 3000, max_rate_pre_min: 60 }
    const updateResponse = await axios.put('http://localhost:3000/api/config/server', updateData, { headers })
    logger.info(`状态码: ${updateResponse.status}`)
    console.log('响应数据:', JSON.stringify(updateResponse.data, null, 2))
    
    logger.info('\n✅ 基础配置接口测试完成')
    
  } catch (error) {
    logger.error('测试失败:', error.message)
    if (error.response) {
      logger.error(`状态码: ${error.response.status}`)
      console.log('错误响应数据:', JSON.stringify(error.response.data, null, 2))
    }
  } finally {
    await prismaManager.disconnect()
  }
}

testConfigAPI()