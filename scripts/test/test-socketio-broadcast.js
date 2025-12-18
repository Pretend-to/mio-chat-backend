#!/usr/bin/env node

/**
 * 测试Socket.IO广播模型更新功能
 */

import config from '../lib/config.js'
import logger from '../utils/logger.js'
import { updateConfigSection, broadcastModelUpdate } from '../lib/server/http/services/configService.js'
// 导入check.js来初始化全局中间件
import '../lib/check.js'

async function testSocketIOBroadcast() {
  try {
    logger.info('开始测试Socket.IO广播功能...')
    
    // 等待配置初始化完成
    await config._waitForInit()
    
    // 1. 检查全局中间件是否存在
    logger.info('1. 检查全局中间件状态...')
    console.log('global.middleware 存在:', !!global.middleware)
    console.log('global.middleware.socketServer 存在:', !!global.middleware?.socketServer)
    console.log('global.middleware.socketServer.io 存在:', !!global.middleware?.socketServer?.io)
    console.log('global.middleware.llm 存在:', !!global.middleware?.llm)
    
    if (!global.middleware?.socketServer?.io) {
      logger.warn('Socket.IO服务器未初始化，无法测试广播功能')
      logger.info('提示：需要启动完整的应用程序才能测试Socket.IO功能')
      return
    }
    
    // 2. 获取当前连接的客户端数量
    const sockets = await global.middleware.socketServer.io.fetchSockets()
    logger.info(`2. 当前连接的客户端数量: ${sockets.length}`)
    
    if (sockets.length === 0) {
      logger.warn('没有连接的客户端，无法测试广播功能')
      logger.info('提示：需要有客户端连接到Socket.IO服务器才能测试广播')
    }
    
    // 3. 测试直接调用broadcastModelUpdate
    logger.info('3. 测试直接调用broadcastModelUpdate...')
    await broadcastModelUpdate()
    logger.info('broadcastModelUpdate调用完成')
    
    // 4. 测试通过配置更新触发广播
    logger.info('4. 测试通过配置更新触发广播...')
    const currentConfig = config.llm_adapters
    
    if (currentConfig.vertex && currentConfig.vertex.length > 0) {
      const updatedConfig = JSON.parse(JSON.stringify(currentConfig))
      const originalModel = updatedConfig.vertex[0].default_model
      const newModel = originalModel === 'gemini-2.0-flash-exp' ? 'gemini-3-pro-preview' : 'gemini-2.0-flash-exp'
      
      updatedConfig.vertex[0].default_model = newModel
      logger.info(`将默认模型从 ${originalModel} 更改为 ${newModel}`)
      
      // 通过API更新配置（这应该会触发广播）
      await updateConfigSection('llm_adapters', updatedConfig)
      
      // 恢复原始配置
      updatedConfig.vertex[0].default_model = originalModel
      await updateConfigSection('llm_adapters', updatedConfig)
      
      logger.info('配置更新测试完成')
    } else {
      logger.warn('未找到可用的适配器配置，跳过配置更新测试')
    }
    
    logger.info('✅ Socket.IO广播测试完成')
    
  } catch (error) {
    logger.error('测试失败:', error)
    process.exit(1)
  }
}

// 运行测试
testSocketIOBroadcast().then(() => {
  logger.info('测试完成')
  process.exit(0)
}).catch(error => {
  logger.error('测试异常:', error)
  process.exit(1)
})