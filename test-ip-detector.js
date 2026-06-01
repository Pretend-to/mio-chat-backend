import { IPDetector } from './utils/ipDetector.js'

/**
 * IP 检测器测试套件
 */
class IPDetectorTest {
  constructor() {
    this.detector = new IPDetector({ debug: true })
    this.testResults = []
  }

  // 创建模拟请求对象
  createMockRequest(headers = {}, connection = {}) {
    return {
      headers: {
        'user-agent': 'Test-Agent/1.0',
        ...headers
      },
      connection: {
        remoteAddress: '127.0.0.1',
        ...connection
      },
      socket: connection,
      ip: connection.remoteAddress
    }
  }

  // 测试用例执行器
  runTest(testName, testFn) {
    console.log(`\n🧪 测试: ${testName}`)
    console.log('=' .repeat(50))
    
    try {
      const result = testFn()
      this.testResults.push({ name: testName, status: 'PASS', result })
      console.log('✅ 测试通过')
      return result
    } catch (error) {
      this.testResults.push({ name: testName, status: 'FAIL', error: error.message })
      console.log('❌ 测试失败:', error.message)
      return null
    }
  }

  // 测试 1: 基础连接 IP 检测
  testBasicConnection() {
    return this.runTest('基础连接 IP 检测', () => {
      const req = this.createMockRequest({}, { remoteAddress: '192.168.1.100' })
      const result = this.detector.detectIP(req)
      
      console.log('检测结果:', result)
      
      if (result.ip !== '192.168.1.100') {
        throw new Error(`期望 IP: 192.168.1.100, 实际: ${result.ip}`)
      }
      
      if (result.source !== 'connection') {
        throw new Error(`期望来源: connection, 实际: ${result.source}`)
      }
      
      return result
    })
  }

  // 测试 2: Cloudflare CDN
  testCloudflareIP() {
    return this.runTest('Cloudflare CDN IP 检测', () => {
      const req = this.createMockRequest({
        'cf-connecting-ip': '203.0.113.45',
        'x-forwarded-for': '10.0.0.1, 203.0.113.45'
      }, { remoteAddress: '127.0.0.1' })
      
      const result = this.detector.detectIP(req)
      console.log('Cloudflare 检测结果:', result)
      
      if (result.ip !== '203.0.113.45') {
        throw new Error(`期望 Cloudflare IP: 203.0.113.45, 实际: ${result.ip}`)
      }
      
      if (result.source !== 'cf-connecting-ip') {
        throw new Error(`期望来源: cf-connecting-ip, 实际: ${result.source}`)
      }
      
      return result
    })
  }

  // 测试 3: 多层代理链
  testProxyChain() {
    return this.runTest('多层代理链 IP 检测', () => {
      const req = this.createMockRequest({
        'x-forwarded-for': '198.51.100.1, 10.0.0.5, 172.16.0.10',
        'x-real-ip': '198.51.100.1'
      }, { remoteAddress: '127.0.0.1' })
      
      const result = this.detector.detectIP(req)
      console.log('代理链检测结果:', result)
      
      // 应该选择第一个公网 IP
      if (result.ip !== '198.51.100.1') {
        throw new Error(`期望公网 IP: 198.51.100.1, 实际: ${result.ip}`)
      }
      
      return result
    })
  }

  // 测试 4: IPv6 地址
  testIPv6() {
    return this.runTest('IPv6 地址检测', () => {
      const req = this.createMockRequest({
        'x-forwarded-for': '2001:db8::1'
      }, { remoteAddress: '::1' })
      
      const result = this.detector.detectIP(req)
      console.log('IPv6 检测结果:', result)
      
      if (result.ip !== '2001:db8::1') {
        throw new Error(`期望 IPv6: 2001:db8::1, 实际: ${result.ip}`)
      }
      
      return result
    })
  }

  // 测试 5: 无效 IP 处理
  testInvalidIP() {
    return this.runTest('无效 IP 处理', () => {
      const req = this.createMockRequest({
        'x-forwarded-for': 'invalid-ip, not-an-ip',
        'x-real-ip': '999.999.999.999'
      }, { remoteAddress: null })
      
      const result = this.detector.detectIP(req)
      console.log('无效 IP 检测结果:', result)
      
      if (result.ip !== '未知') {
        throw new Error(`期望: 未知, 实际: ${result.ip}`)
      }
      
      return result
    })
  }

  // 测试 6: 私网 IP 识别
  testPrivateIPDetection() {
    return this.runTest('私网 IP 识别', () => {
      const privateIPs = [
        '127.0.0.1',
        '10.0.0.1',
        '172.16.0.1',
        '192.168.1.1',
        '::1',
        'fe80::1'
      ]
      
      const results = []
      
      for (const ip of privateIPs) {
        const isPrivate = this.detector.isPrivateIP(ip)
        results.push({ ip, isPrivate })
        console.log(`${ip} -> 私网: ${isPrivate}`)
        
        if (!isPrivate) {
          throw new Error(`${ip} 应该被识别为私网 IP`)
        }
      }
      
      // 测试公网 IP
      const publicIP = '8.8.8.8'
      const isPublic = !this.detector.isPrivateIP(publicIP)
      console.log(`${publicIP} -> 公网: ${isPublic}`)
      
      if (!isPublic) {
        throw new Error(`${publicIP} 应该被识别为公网 IP`)
      }
      
      return results
    })
  }

  // 测试 7: Express 中间件集成
  testExpressMiddleware() {
    return this.runTest('Express 中间件集成', () => {
      const middleware = this.detector.middleware()
      
      const req = this.createMockRequest({
        'x-forwarded-for': '203.0.113.100'
      })
      
      const res = {}
      let nextCalled = false
      const next = () => { nextCalled = true }
      
      // 执行中间件
      middleware(req, res, next)
      
      console.log('中间件执行结果:')
      console.log('- req.clientIP:', req.clientIP)
      console.log('- req.ipInfo:', req.ipInfo)
      console.log('- next() 被调用:', nextCalled)
      
      if (req.clientIP !== '203.0.113.100') {
        throw new Error(`期望 clientIP: 203.0.113.100, 实际: ${req.clientIP}`)
      }
      
      if (!nextCalled) {
        throw new Error('中间件应该调用 next()')
      }
      
      return { clientIP: req.clientIP, ipInfo: req.ipInfo }
    })
  }

  // 测试 8: Socket.IO 集成
  testSocketIOIntegration() {
    return this.runTest('Socket.IO 集成测试', () => {
      const mockSocket = {
        request: this.createMockRequest({
          'x-forwarded-for': '198.51.100.200'
        }),
        handshake: {
          address: '127.0.0.1'
        }
      }
      
      const result = this.detector.detectSocketIP(mockSocket)
      console.log('Socket.IO 检测结果:', result)
      
      if (result.ip !== '198.51.100.200') {
        throw new Error(`期望 Socket IP: 198.51.100.200, 实际: ${result.ip}`)
      }
      
      return result
    })
  }

  // 测试 9: 性能测试
  testPerformance() {
    return this.runTest('性能测试', () => {
      const req = this.createMockRequest({
        'cf-connecting-ip': '203.0.113.50',
        'x-forwarded-for': '10.0.0.1, 203.0.113.50, 172.16.0.1',
        'x-real-ip': '203.0.113.50'
      })
      
      const iterations = 10000
      const startTime = Date.now()
      
      for (let i = 0; i < iterations; i++) {
        this.detector.detectIP(req)
      }
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      const avgTime = totalTime / iterations
      
      console.log(`性能测试结果:`)
      console.log(`- 总迭代次数: ${iterations}`)
      console.log(`- 总耗时: ${totalTime}ms`)
      console.log(`- 平均耗时: ${avgTime.toFixed(3)}ms`)
      
      if (avgTime > 1) {
        throw new Error(`性能过慢，平均耗时 ${avgTime.toFixed(3)}ms > 1ms`)
      }
      
      return { iterations, totalTime, avgTime }
    })
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 开始 IP 检测器测试套件')
    console.log('=' .repeat(60))
    
    // 执行所有测试
    this.testBasicConnection()
    this.testCloudflareIP()
    this.testProxyChain()
    this.testIPv6()
    this.testInvalidIP()
    this.testPrivateIPDetection()
    this.testExpressMiddleware()
    this.testSocketIOIntegration()
    this.testPerformance()
    
    // 输出测试总结
    console.log('\n📊 测试总结')
    console.log('=' .repeat(60))
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length
    const failed = this.testResults.filter(r => r.status === 'FAIL').length
    
    console.log(`✅ 通过: ${passed}`)
    console.log(`❌ 失败: ${failed}`)
    console.log(`📈 成功率: ${((passed / this.testResults.length) * 100).toFixed(1)}%`)
    
    if (failed > 0) {
      console.log('\n❌ 失败的测试:')
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`))
    }
    
    return {
      total: this.testResults.length,
      passed,
      failed,
      successRate: (passed / this.testResults.length) * 100
    }
  }
}

// 运行测试
const tester = new IPDetectorTest()
tester.runAllTests().then(summary => {
  console.log('\n🎉 测试完成!')
  process.exit(summary.failed > 0 ? 1 : 0)
})