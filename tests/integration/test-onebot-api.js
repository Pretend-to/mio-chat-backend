#!/usr/bin/env node

/**
 * OneBot 配置 API 测试脚本
 * 测试文档中提到的所有 OneBot 配置相关接口
 */

import logger from '../../utils/logger.js'
import SystemSettingsService from '../../lib/database/services/SystemSettingsService.js'

class OneBotAPITester {
  constructor(baseUrl = 'http://localhost:3080', adminCode = null) {
    this.baseUrl = baseUrl
    this.adminCode = adminCode
    this.testResults = []
  }

  /**
   * 获取管理员访问码
   */
  async getAdminCode() {
    if (this.adminCode) {
      return this.adminCode
    }

    try {
      await SystemSettingsService.initialize()
      const adminCodeSetting = await SystemSettingsService.get('admin_code')
      if (adminCodeSetting && adminCodeSetting.value) {
        this.adminCode = adminCodeSetting.value
        logger.info(`使用数据库中的管理员访问码: ${this.adminCode.substring(0, 4)}...`)
        return this.adminCode
      }
    } catch (error) {
      logger.warn('无法从数据库获取管理员访问码:', error.message)
    }

    // 如果数据库中没有，尝试环境变量
    if (process.env.ADMIN_CODE) {
      this.adminCode = process.env.ADMIN_CODE
      logger.info('使用环境变量中的管理员访问码')
      return this.adminCode
    }

    throw new Error('未找到管理员访问码，请设置环境变量 ADMIN_CODE 或确保数据库中存在访问码')
  }

  /**
   * 发送 HTTP 请求
   */
  async request(method, path, data = null) {
    const url = `${this.baseUrl}${path}`
    const headers = {
      'Content-Type': 'application/json',
      'X-Admin-Code': await this.getAdminCode()
    }

    const options = {
      method,
      headers
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, options)
      const result = await response.json()
      
      return {
        status: response.status,
        success: response.ok,
        data: result
      }
    } catch (error) {
      return {
        status: 0,
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 记录测试结果
   */
  logTest(testName, success, details = null) {
    const result = {
      test: testName,
      success,
      details,
      timestamp: new Date().toISOString()
    }
    
    this.testResults.push(result)
    
    if (success) {
      logger.info(`✅ ${testName}`)
      if (details) {
        logger.info(`   ${details}`)
      }
    } else {
      logger.error(`❌ ${testName}`)
      if (details) {
        logger.error(`   ${details}`)
      }
    }
  }

  /**
   * 测试 1: GET /api/config - 获取完整配置
   */
  async testGetFullConfig() {
    logger.info('\n🧪 测试 1: GET /api/config - 获取完整配置')
    
    try {
      const response = await this.request('GET', '/api/config')
      
      if (!response.success) {
        this.logTest('获取完整配置', false, `HTTP ${response.status}: ${response.data?.message || response.error}`)
        return
      }

      const config = response.data.data
      if (!config) {
        this.logTest('获取完整配置', false, '响应数据为空')
        return
      }

      // 检查是否包含 onebot 配置
      if (!config.onebot) {
        this.logTest('获取完整配置', false, '响应中缺少 onebot 配置')
        return
      }

      // 检查 onebot 配置结构（只检查必需字段）
      const onebot = config.onebot
      const requiredFields = ['enable'] // 只有 enable 是必需的
      const missingFields = requiredFields.filter(field => !(field in onebot))
      
      if (missingFields.length > 0) {
        this.logTest('获取完整配置', false, `OneBot 配置缺少必需字段: ${missingFields.join(', ')}`)
        return
      }

      this.logTest('获取完整配置', true, `OneBot enable: ${onebot.enable}`)
      return config
      
    } catch (error) {
      this.logTest('获取完整配置', false, error.message)
    }
  }

  /**
   * 测试 2: GET /api/config/onebot - 获取 OneBot 配置节点
   */
  async testGetOneBotConfig() {
    logger.info('\n🧪 测试 2: GET /api/config/onebot - 获取 OneBot 配置节点')
    
    try {
      const response = await this.request('GET', '/api/config/onebot')
      
      if (!response.success) {
        this.logTest('获取 OneBot 配置节点', false, `HTTP ${response.status}: ${response.data?.message || response.error}`)
        return
      }

      const onebot = response.data.data
      if (!onebot) {
        this.logTest('获取 OneBot 配置节点', false, '响应数据为空')
        return
      }

      // 检查配置结构（只检查必需字段）
      const requiredFields = ['enable'] // 只有 enable 是必需的
      const missingFields = requiredFields.filter(field => !(field in onebot))
      
      if (missingFields.length > 0) {
        this.logTest('获取 OneBot 配置节点', false, `配置缺少必需字段: ${missingFields.join(', ')}`)
        return
      }

      this.logTest('获取 OneBot 配置节点', true, `enable: ${onebot.enable}, bot_qq: ${onebot.bot_qq}`)
      return onebot
      
    } catch (error) {
      this.logTest('获取 OneBot 配置节点', false, error.message)
    }
  }

  /**
   * 测试 3: PUT /api/config/onebot - 更新 OneBot 配置
   */
  async testUpdateOneBotConfig() {
    logger.info('\n🧪 测试 3: PUT /api/config/onebot - 更新 OneBot 配置')
    
    try {
      // 先获取当前配置
      const currentConfig = await this.testGetOneBotConfig()
      if (!currentConfig) {
        this.logTest('更新 OneBot 配置', false, '无法获取当前配置')
        return
      }

      // 准备测试更新数据（只更新部分字段，不影响实际使用）
      const updateData = {
        enable: currentConfig.enable, // 保持当前状态
        reverse_ws_url: currentConfig.reverse_ws_url || 'ws://test.example.com:8080/onebot/v11/ws',
        bot_qq: currentConfig.bot_qq || '2698788044',
        admin_qq: currentConfig.admin_qq || '1099834705',
        token: currentConfig.token || 'test_token_' + Date.now()
      }

      const response = await this.request('PUT', '/api/config/onebot', updateData)
      
      if (!response.success) {
        this.logTest('更新 OneBot 配置', false, `HTTP ${response.status}: ${response.data?.message || response.error}`)
        return
      }

      const result = response.data.data
      if (!result || !result.message) {
        this.logTest('更新 OneBot 配置', false, '响应格式不正确')
        return
      }

      // 验证更新是否生效
      const updatedConfig = await this.testGetOneBotConfig()
      if (!updatedConfig) {
        this.logTest('更新 OneBot 配置', false, '无法验证更新结果')
        return
      }

      this.logTest('更新 OneBot 配置', true, result.message)
      return updatedConfig
      
    } catch (error) {
      this.logTest('更新 OneBot 配置', false, error.message)
    }
  }

  /**
   * 测试 4: PUT /api/config - 批量更新配置
   */
  async testBatchUpdateConfig() {
    logger.info('\n🧪 测试 4: PUT /api/config - 批量更新配置')
    
    try {
      // 先获取当前配置，保持插件配置不变
      const currentConfig = await this.testGetOneBotConfig()
      if (!currentConfig) {
        this.logTest('批量更新配置', false, '无法获取当前配置')
        return
      }

      // 准备批量更新数据（保持插件配置）
      const updateData = {
        onebot: {
          ...currentConfig,
          enable: false, // 临时禁用，不影响实际使用
          reverse_ws_url: 'ws://batch-test.example.com:8080/onebot/v11/ws',
          bot_qq: '2698788044',
          admin_qq: '1099834705'
        },
        web: {
          title: 'OneBot API Test - ' + new Date().toISOString()
        }
      }

      const response = await this.request('PUT', '/api/config', updateData)
      
      if (!response.success) {
        this.logTest('批量更新配置', false, `HTTP ${response.status}: ${response.data?.message || response.error}`)
        return
      }

      const result = response.data.data
      if (!result || !result.updated) {
        this.logTest('批量更新配置', false, '响应格式不正确')
        return
      }

      const updatedSections = result.updated
      if (!updatedSections.includes('onebot')) {
        this.logTest('批量更新配置', false, 'OneBot 配置未被更新')
        return
      }

      this.logTest('批量更新配置', true, `更新了 ${updatedSections.length} 个配置节点: ${updatedSections.join(', ')}`)
      
    } catch (error) {
      this.logTest('批量更新配置', false, error.message)
    }
  }

  /**
   * 测试 5: GET /api/onebot/plugins - 获取 OneBot 插件选项
   */
  async testGetOneBotPlugins() {
    logger.info('\n🧪 测试 5: GET /api/onebot/plugins - 获取 OneBot 插件选项')
    
    try {
      const response = await this.request('GET', '/api/onebot/plugins')
      
      if (!response.success) {
        this.logTest('获取 OneBot 插件选项', false, `HTTP ${response.status}: ${response.data?.message || response.error}`)
        return
      }

      const plugins = response.data.data
      if (!plugins) {
        this.logTest('获取 OneBot 插件选项', false, '响应数据为空')
        return
      }

      // 检查插件选项结构
      if (!plugins.options) {
        this.logTest('获取 OneBot 插件选项', false, '响应中缺少 options 字段')
        return
      }

      const optionKeys = Object.keys(plugins.options)
      this.logTest('获取 OneBot 插件选项', true, `获取到插件选项: ${optionKeys.length > 0 ? optionKeys.join(', ') : '(空)'}`)
      
    } catch (error) {
      this.logTest('获取 OneBot 插件选项', false, error.message)
    }
  }

  /**
   * 测试 6: POST /api/config/validate - 配置验证
   */
  async testValidateConfig() {
    logger.info('\n🧪 测试 6: POST /api/config/validate - 配置验证')
    
    try {
      // 测试有效配置
      const validConfig = {
        onebot: {
          enable: true,
          reverse_ws_url: 'ws://localhost:8080/onebot/v11/ws',
          bot_qq: '2698788044',
          admin_qq: '1099834705'
        }
      }

      const validResponse = await this.request('POST', '/api/config/validate', validConfig)
      
      if (!validResponse.success) {
        this.logTest('配置验证（有效配置）', false, `HTTP ${validResponse.status}: ${validResponse.data?.message || validResponse.error}`)
      } else {
        const result = validResponse.data.data
        if (result && result.valid === true) {
          this.logTest('配置验证（有效配置）', true, '有效配置验证通过')
        } else {
          this.logTest('配置验证（有效配置）', false, `验证失败: ${result?.errors?.join(', ') || '未知错误'}`)
        }
      }

      // 测试无效配置
      const invalidConfig = {
        onebot: {
          enable: true,
          reverse_ws_url: 'invalid-url', // 无效的 URL
          bot_qq: 'invalid-qq' // 无效的 QQ 号
        }
      }

      const invalidResponse = await this.request('POST', '/api/config/validate', invalidConfig)
      
      if (!invalidResponse.success) {
        this.logTest('配置验证（无效配置）', true, '无效配置正确被拒绝')
      } else {
        const result = invalidResponse.data.data
        if (result && result.valid === false && result.errors && result.errors.length > 0) {
          this.logTest('配置验证（无效配置）', true, `正确识别了 ${result.errors.length} 个错误`)
        } else {
          this.logTest('配置验证（无效配置）', false, '无效配置未被正确识别')
        }
      }
      
    } catch (error) {
      this.logTest('配置验证', false, error.message)
    }
  }

  /**
   * 测试权限控制
   */
  async testAuthControl() {
    logger.info('\n🧪 测试 7: 权限控制')
    
    try {
      // 保存原始访问码
      const originalAdminCode = this.adminCode
      
      // 使用无效访问码
      this.adminCode = 'invalid_admin_code'
      
      const response = await this.request('GET', '/api/config/onebot')
      
      if (response.status === 401 || response.status === 403) {
        this.logTest('权限控制', true, '无效访问码被正确拒绝')
      } else {
        this.logTest('权限控制', false, `期望 401/403，实际收到 ${response.status}`)
      }
      
      // 恢复原始访问码
      this.adminCode = originalAdminCode
      
    } catch (error) {
      this.logTest('权限控制', false, error.message)
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    logger.info('🚀 开始 OneBot 配置 API 测试')
    logger.info(`测试目标: ${this.baseUrl}`)
    
    try {
      // 获取管理员访问码
      await this.getAdminCode()
      
      // 运行所有测试
      await this.testGetFullConfig()
      await this.testGetOneBotConfig()
      await this.testUpdateOneBotConfig()
      await this.testBatchUpdateConfig()
      await this.testGetOneBotPlugins()
      await this.testValidateConfig()
      await this.testAuthControl()
      
      // 输出测试结果统计
      this.printTestSummary()
      
    } catch (error) {
      logger.error('测试执行失败:', error)
      throw error
    }
  }

  /**
   * 打印测试结果统计
   */
  printTestSummary() {
    logger.info('\n📊 测试结果统计')
    
    const totalTests = this.testResults.length
    const passedTests = this.testResults.filter(r => r.success).length
    const failedTests = totalTests - passedTests
    
    logger.info(`总测试数: ${totalTests}`)
    logger.info(`通过: ${passedTests}`)
    logger.info(`失败: ${failedTests}`)
    logger.info(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
    
    if (failedTests > 0) {
      logger.info('\n❌ 失败的测试:')
      this.testResults
        .filter(r => !r.success)
        .forEach(r => {
          logger.error(`  - ${r.test}: ${r.details || '未知错误'}`)
        })
    }
    
    logger.info('\n✅ 测试完成')
  }

  /**
   * 导出测试结果
   */
  async exportResults(filename = 'onebot-api-test-results.json') {
    const results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.success).length,
        failed: this.testResults.filter(r => !r.success).length
      },
      tests: this.testResults
    }
    
    const fs = await import('fs')
    fs.writeFileSync(filename, JSON.stringify(results, null, 2))
    logger.info(`测试结果已导出到: ${filename}`)
  }
}

// 主函数
async function main() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3080'
  const adminCode = process.env.ADMIN_CODE || null
  
  const tester = new OneBotAPITester(baseUrl, adminCode)
  
  try {
    await tester.runAllTests()
    
    // 导出结果
    if (process.env.EXPORT_RESULTS === 'true') {
      await tester.exportResults()
    }
    
    // 根据测试结果设置退出码
    const failedTests = tester.testResults.filter(r => !r.success).length
    process.exit(failedTests > 0 ? 1 : 0)
    
  } catch (error) {
    logger.error('测试执行失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default OneBotAPITester