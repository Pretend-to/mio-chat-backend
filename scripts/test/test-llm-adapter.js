#!/usr/bin/env node

import axios from 'axios'
import logger from '../utils/logger.js'
import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'

/**
 * LLM 适配器管理测试
 */

async function testLLMAdapter() {
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
    
    // 测试添加 LLM 实例
    logger.info('测试添加 LLM 实例...')
    const instanceConfig = {
      name: `测试实例_${Date.now()}`,
      api_key: 'test-api-key-12345',
      base_url: 'https://api.openai.com/v1',
      enable: true
    }
    
    const addResponse = await axios.post('http://localhost:3000/api/config/llm/openai', instanceConfig, { headers })
    logger.info(`添加实例状态码: ${addResponse.status}`)
    console.log('添加实例响应:', JSON.stringify(addResponse.data, null, 2))
    
    if (addResponse.data.code !== 0) {
      throw new Error('添加 LLM 实例失败')
    }
    
    const instanceIndex = addResponse.data.data.instanceIndex
    logger.info(`✓ LLM 实例添加成功，索引: ${instanceIndex}`)
    
    // 测试更新 LLM 实例
    logger.info('\n测试更新 LLM 实例...')
    const updateConfig = {
      name: `更新测试实例_${Date.now()}`,
      enable: false
    }
    
    const updateResponse = await axios.put(`http://localhost:3000/api/config/llm/openai/${instanceIndex}`, updateConfig, { headers })
    logger.info(`更新实例状态码: ${updateResponse.status}`)
    console.log('更新实例响应:', JSON.stringify(updateResponse.data, null, 2))
    
    if (updateResponse.data.code !== 0) {
      throw new Error('更新 LLM 实例失败')
    }
    
    logger.info('✓ LLM 实例更新成功')
    
    // 测试删除 LLM 实例
    logger.info('\n测试删除 LLM 实例...')
    const deleteResponse = await axios.delete(`http://localhost:3000/api/config/llm/openai/${instanceIndex}`, { headers })
    logger.info(`删除实例状态码: ${deleteResponse.status}`)
    console.log('删除实例响应:', JSON.stringify(deleteResponse.data, null, 2))
    
    if (deleteResponse.data.code !== 0) {
      throw new Error('删除 LLM 实例失败')
    }
    
    logger.info('✓ LLM 实例删除成功')
    
    logger.info('\n✅ LLM 适配器管理测试完成')
    
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

testLLMAdapter()