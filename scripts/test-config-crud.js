#!/usr/bin/env node

import axios from 'axios'
import logger from '../utils/logger.js'
import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'

/**
 * 配置接口 CRUD 全面测试脚本
 * 测试所有配置相关的 API 端点
 */

class ConfigCRUDTester {
  constructor() {
    this.baseURL = 'http://127.0.0.1:3000'
    this.adminCode = 'gb6u1soOivcvg62rz1iuYg==' // 直接使用正确的验证码
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    }
  }

  /**
   * 初始化测试环境
   */
  async getAdminCode() {
    try {
      // 初始化数据库连接
      await prismaManager.initialize()
      await SystemSettingsService.initialize()
      
      logger.info(`使用管理员访问码: ${this.adminCode.substring(0, 4)}...`)
      return this.adminCode
    } catch (error) {
      logger.error('初始化失败:', error)
      throw error
    }
  }

  /**
   * 创建带认证的请求配置
   */
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-admin-code': this.adminCode
    }
  }

  /**
   * 执行测试用例
   */
  async runTest(testName, testFn) {
    try {
      logger.info(`\n🧪 开始测试: ${testName}`)
      await testFn()
      this.testResults.passed++
      logger.info(`✅ 测试通过: ${testName}`)
    } catch (error) {
      this.testResults.failed++
      this.testResults.errors.push({ testName, error: error.message })
      logger.error(`❌ 测试失败: ${testName}`, error.message)
    }
  }

  /**
   * 测试获取完整配置
   */
  async testGetFullConfig() {
    const response = await axios.get(`${this.baseURL}/api/config`, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 200) {
      throw new Error(`状态码错误: ${response.status}`)
    }

    const data = response.data
    if (data.code !== 0 || !data.data) {
      throw new Error('响应格式错误')
    }

    // 验证配置结构
    const config = data.data
    const requiredSections = ['server', 'web', 'llm_adapters']
    
    for (const section of requiredSections) {
      if (!(section in config)) {
        throw new Error(`缺少配置节点: ${section}`)
      }
    }

    logger.info(`配置节点数量: ${Object.keys(config).length}`)
  }

  /**
   * 测试获取配置节点
   */
  async testGetConfigSection() {
    const sections = ['server', 'web', 'llm_adapters']
    
    for (const section of sections) {
      const response = await axios.get(`${this.baseURL}/api/config/${section}`, {
        headers: this.getAuthHeaders()
      })

      if (response.status !== 200) {
        throw new Error(`获取 ${section} 节点失败: ${response.status}`)
      }

      const data = response.data
      if (data.code !== 0 || data.data === undefined) {
        throw new Error(`${section} 节点响应格式错误`)
      }

      logger.info(`✓ ${section} 节点获取成功`)
    }
  }

  /**
   * 测试更新配置节点
   */
  async testUpdateConfigSection() {
    // 测试更新 server 配置
    const serverUpdate = {
      port: 3000,
      max_rate_pre_min: 60
    }

    const response = await axios.put(`${this.baseURL}/api/config/server`, serverUpdate, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 200) {
      throw new Error(`更新 server 配置失败: ${response.status}`)
    }

    const data = response.data
    if (data.code !== 0) {
      throw new Error('更新 server 配置响应失败')
    }

    logger.info('✓ server 配置更新成功')
  }

  /**
   * 测试更新完整配置
   */
  async testUpdateFullConfig() {
    const configUpdate = {
      server: {
        port: 3000,
        max_rate_pre_min: 60
      }
    }

    const response = await axios.put(`${this.baseURL}/api/config`, configUpdate, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 200) {
      throw new Error(`更新完整配置失败: ${response.status}`)
    }

    const data = response.data
    if (data.code !== 0) {
      throw new Error('更新完整配置响应失败')
    }

    logger.info('✓ 完整配置更新成功')
  }

  /**
   * 测试配置验证
   */
  async testValidateConfig() {
    // 测试有效配置
    const validConfig = {
      server: {
        port: 3000,
        max_rate_pre_min: 60
      }
    }

    let response = await axios.post(`${this.baseURL}/api/config/validate`, validConfig, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 200) {
      throw new Error(`验证有效配置失败: ${response.status}`)
    }

    let data = response.data
    if (data.code !== 0 || !data.data.valid) {
      throw new Error('有效配置验证失败')
    }

    logger.info('✓ 有效配置验证通过')

    // 测试无效配置
    const invalidConfig = {
      server: {
        port: -1, // 无效端口
        max_rate_pre_min: -1 // 无效速率限制
      }
    }

    response = await axios.post(`${this.baseURL}/api/config/validate`, invalidConfig, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 200) {
      throw new Error(`验证无效配置失败: ${response.status}`)
    }

    data = response.data
    if (data.code !== 0 || data.data.valid) {
      throw new Error('无效配置验证应该失败')
    }

    logger.info('✓ 无效配置验证正确失败')
  }

  /**
   * 测试 LLM 适配器管理
   */
  async testLLMAdapterManagement() {
    const adapterType = 'openai'
    
    // 测试添加 LLM 实例
    const instanceConfig = {
      name: `测试实例_${Date.now()}`,
      api_key: 'test-api-key-12345',
      base_url: 'https://api.openai.com/v1',
      enable: true
    }

    let response = await axios.post(`${this.baseURL}/api/config/llm/${adapterType}`, instanceConfig, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 200) {
      throw new Error(`添加 LLM 实例失败: ${response.status}`)
    }

    let data = response.data
    if (data.code !== 0) {
      throw new Error('添加 LLM 实例响应失败')
    }

    const instanceIndex = data.data.instanceIndex
    logger.info(`✓ LLM 实例添加成功，索引: ${instanceIndex}`)

    // 测试更新 LLM 实例
    const updateConfig = {
      name: `更新测试实例_${Date.now()}`,
      enable: false
    }

    response = await axios.put(`${this.baseURL}/api/config/llm/${adapterType}/${instanceIndex}`, updateConfig, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 200) {
      throw new Error(`更新 LLM 实例失败: ${response.status}`)
    }

    data = response.data
    if (data.code !== 0) {
      throw new Error('更新 LLM 实例响应失败')
    }

    logger.info('✓ LLM 实例更新成功')

    // 测试删除 LLM 实例
    response = await axios.delete(`${this.baseURL}/api/config/llm/${adapterType}/${instanceIndex}`, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 200) {
      throw new Error(`删除 LLM 实例失败: ${response.status}`)
    }

    data = response.data
    if (data.code !== 0) {
      throw new Error('删除 LLM 实例响应失败')
    }

    logger.info('✓ LLM 实例删除成功')
  }

  /**
   * 测试预设管理
   */
  async testPresetManagement() {
    // 测试创建预设
    const presetData = {
      name: `测试预设_${Date.now()}`,
      history: [
        { role: 'system', content: '你是一个测试助手' },
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好！我是测试助手。' }
      ],
      opening: '这是一个测试预设',
      category: 'common'
    }

    let response = await axios.post(`${this.baseURL}/api/config/presets`, presetData, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 201) {
      throw new Error(`创建预设失败: ${response.status}`)
    }

    let data = response.data
    if (data.code !== 0) {
      throw new Error('创建预设响应失败')
    }

    const presetName = data.data.name
    logger.info(`✓ 预设创建成功: ${presetName}`)

    // 测试获取预设列表
    response = await axios.get(`${this.baseURL}/api/config/presets`, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 200) {
      throw new Error(`获取预设列表失败: ${response.status}`)
    }

    data = response.data
    if (data.code !== 0 || !data.data) {
      throw new Error('获取预设列表响应失败')
    }

    logger.info(`✓ 预设列表获取成功，总数: ${data.data.pagination?.total || data.data.summary?.totalCount || '未知'}`)

    // 测试获取单个预设
    response = await axios.get(`${this.baseURL}/api/config/presets/${presetName}`, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 200) {
      throw new Error(`获取单个预设失败: ${response.status}`)
    }

    data = response.data
    if (data.code !== 0 || !data.data) {
      throw new Error('获取单个预设响应失败')
    }

    logger.info('✓ 单个预设获取成功')

    // 测试更新预设
    const updateData = {
      ...presetData,
      opening: '这是更新后的测试预设'
    }

    response = await axios.put(`${this.baseURL}/api/config/presets/${presetName}`, updateData, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 200) {
      throw new Error(`更新预设失败: ${response.status}`)
    }

    data = response.data
    if (data.code !== 0) {
      throw new Error('更新预设响应失败')
    }

    logger.info('✓ 预设更新成功')

    // 测试预设验证
    response = await axios.post(`${this.baseURL}/api/config/presets/validate`, presetData, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 200) {
      throw new Error(`预设验证失败: ${response.status}`)
    }

    data = response.data
    if (data.code !== 0 || !data.data.valid) {
      throw new Error('预设验证响应失败')
    }

    logger.info('✓ 预设验证成功')

    // 测试删除预设
    response = await axios.delete(`${this.baseURL}/api/config/presets/${presetName}`, {
      headers: this.getAuthHeaders()
    })

    if (response.status !== 200) {
      throw new Error(`删除预设失败: ${response.status}`)
    }

    data = response.data
    if (data.code !== 0) {
      throw new Error('删除预设响应失败')
    }

    logger.info('✓ 预设删除成功')
  }

  /**
   * 测试错误处理
   */
  async testErrorHandling() {
    // 测试无效的配置节点
    try {
      await axios.get(`${this.baseURL}/api/config/invalid_section`, {
        headers: this.getAuthHeaders()
      })
      throw new Error('应该返回 404 错误')
    } catch (error) {
      if (error.response?.status !== 404) {
        throw new Error(`期望 404 错误，实际: ${error.response?.status}`)
      }
      logger.info('✓ 无效配置节点正确返回 404')
    }

    // 测试无效的预设名称
    try {
      await axios.get(`${this.baseURL}/api/config/presets/nonexistent_preset`, {
        headers: this.getAuthHeaders()
      })
      throw new Error('应该返回 404 错误')
    } catch (error) {
      if (error.response?.status !== 404) {
        throw new Error(`期望 404 错误，实际: ${error.response?.status}`)
      }
      logger.info('✓ 不存在的预设正确返回 404')
    }

    // 测试无效的 LLM 适配器类型
    try {
      await axios.post(`${this.baseURL}/api/config/llm/invalid_adapter`, {}, {
        headers: this.getAuthHeaders()
      })
      throw new Error('应该返回 400 错误')
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error(`期望 400 错误，实际: ${error.response?.status}`)
      }
      logger.info('✓ 无效适配器类型正确返回 400')
    }
  }

  /**
   * 测试权限验证
   */
  async testAuthenticationAndAuthorization() {
    // 测试无认证访问
    try {
      await axios.get(`${this.baseURL}/api/config`)
      throw new Error('应该返回 403 错误')
    } catch (error) {
      if (error.response?.status !== 403) {
        throw new Error(`期望 403 错误，实际: ${error.response?.status}`)
      }
      logger.info('✓ 无认证访问正确返回 403')
    }

    // 测试错误的认证信息
    try {
      await axios.get(`${this.baseURL}/api/config`, {
        headers: {
          'x-admin-code': 'invalid_token'
        }
      })
      throw new Error('应该返回 403 错误')
    } catch (error) {
      if (error.response?.status !== 403) {
        throw new Error(`期望 403 错误，实际: ${error.response?.status}`)
      }
      logger.info('✓ 错误认证信息正确返回 403')
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    logger.info('🚀 开始配置接口 CRUD 全面测试')
    
    try {
      // 获取管理员访问码
      await this.getAdminCode()

      // 基础配置测试
      await this.runTest('获取完整配置', () => this.testGetFullConfig())
      await this.runTest('获取配置节点', () => this.testGetConfigSection())
      await this.runTest('更新配置节点', () => this.testUpdateConfigSection())
      await this.runTest('更新完整配置', () => this.testUpdateFullConfig())
      await this.runTest('配置验证', () => this.testValidateConfig())

      // LLM 适配器管理测试
      await this.runTest('LLM 适配器管理', () => this.testLLMAdapterManagement())

      // 预设管理测试
      await this.runTest('预设管理', () => this.testPresetManagement())

      // 错误处理测试
      await this.runTest('错误处理', () => this.testErrorHandling())

      // 权限验证测试
      await this.runTest('权限验证', () => this.testAuthenticationAndAuthorization())

    } catch (error) {
      logger.error('测试执行过程中发生错误:', error)
      this.testResults.failed++
      this.testResults.errors.push({ testName: '测试执行', error: error.message })
    }

    // 输出测试结果
    this.printTestResults()
  }

  /**
   * 输出测试结果
   */
  printTestResults() {
    logger.info('\n📊 测试结果汇总:')
    logger.info(`✅ 通过: ${this.testResults.passed}`)
    logger.info(`❌ 失败: ${this.testResults.failed}`)
    logger.info(`📈 成功率: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(2)}%`)

    if (this.testResults.errors.length > 0) {
      logger.info('\n❌ 失败详情:')
      this.testResults.errors.forEach((error, index) => {
        logger.error(`${index + 1}. ${error.testName}: ${error.error}`)
      })
    }

    if (this.testResults.failed === 0) {
      logger.info('\n🎉 所有测试通过！配置接口 CRUD 功能正常')
    } else {
      logger.warn('\n⚠️  部分测试失败，请检查配置接口实现')
    }
  }
}

// 执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ConfigCRUDTester()
  
  tester.runAllTests()
    .then(() => {
      process.exit(tester.testResults.failed === 0 ? 0 : 1)
    })
    .catch(error => {
      logger.error('测试执行失败:', error)
      process.exit(1)
    })
    .finally(async () => {
      // 确保数据库连接关闭
      await prismaManager.disconnect()
    })
}

export default ConfigCRUDTester