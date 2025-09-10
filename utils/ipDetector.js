import { isIP } from 'net'

/**
 * 强大的 IP 检测和获取中间件
 * 支持各种代理、CDN 和负载均衡环境
 */
export class IPDetector {
  constructor(options = {}) {
    this.config = {
      // 信任的代理 IP 范围
      trustedProxies: options.trustedProxies || [
        '127.0.0.1',
        '::1',
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16'
      ],
      // 是否启用地理位置检测
      enableGeoLocation: options.enableGeoLocation || false,
      // 是否记录 IP 获取过程
      debug: options.debug || false,
      // 自定义 IP 头优先级
      customHeaders: options.customHeaders || []
    }
  }

  /**
   * Express 中间件函数
   */
  middleware() {
    return (req, res, next) => {
      const ipInfo = this.detectIP(req)
      
      // 将 IP 信息附加到请求对象
      req.clientIP = ipInfo.ip
      req.ipInfo = ipInfo
      
      if (this.config.debug) {
        console.log(`[IP检测] ${req.method} ${req.path} - IP: ${ipInfo.ip} (来源: ${ipInfo.source})`)
      }
      
      next()
    }
  }

  /**
   * Socket.IO 连接 IP 检测
   */
  detectSocketIP(socket) {
    const req = socket.request || socket.handshake
    return this.detectIP(req)
  }

  /**
   * 核心 IP 检测逻辑
   */
  detectIP(req) {
    const candidates = []
    
    // 1. CDN 和代理服务商特定头
    const cdnHeaders = [
      'cf-connecting-ip',        // Cloudflare
      'x-forwarded-for',         // 标准代理头
      'x-real-ip',              // Nginx 代理
      'x-client-ip',            // Apache 代理
      'x-cluster-client-ip',    // 集群代理
      'x-forwarded',            // 其他代理
      'forwarded-for',          // RFC 7239
      'forwarded',              // RFC 7239 标准
      'true-client-ip',         // Akamai CDN
      'x-original-forwarded-for' // 原始转发
    ]

    // 2. 添加自定义头
    const allHeaders = [...this.config.customHeaders, ...cdnHeaders]

    // 3. 收集所有可能的 IP
    for (const header of allHeaders) {
      const value = req.headers[header]
      if (value) {
        // 处理逗号分隔的 IP 列表
        const ips = value.split(',').map(ip => ip.trim())
        candidates.push(...ips.map(ip => ({ ip, source: header })))
      }
    }

    // 4. 添加连接 IP
    const connectionIPs = [
      req.connection?.remoteAddress,
      req.socket?.remoteAddress,
      req.info?.remoteAddress,
      req.ip
    ].filter(Boolean)

    candidates.push(...connectionIPs.map(ip => ({ ip, source: 'connection' })))

    // 5. 验证和选择最佳 IP
    const validIP = this.selectBestIP(candidates)
    
    return {
      ip: validIP.ip || '未知',
      source: validIP.source || '未知',
      allCandidates: candidates,
      isPrivate: this.isPrivateIP(validIP.ip),
      isValid: this.isValidIP(validIP.ip)
    }
  }

  /**
   * 选择最佳 IP 地址
   */
  selectBestIP(candidates) {
    // 过滤有效的 IP
    const validCandidates = candidates.filter(({ ip }) => this.isValidIP(ip))
    
    if (validCandidates.length === 0) {
      return { ip: '未知', source: '无有效IP' }
    }

    // 优先选择公网 IP
    const publicIPs = validCandidates.filter(({ ip }) => !this.isPrivateIP(ip))
    if (publicIPs.length > 0) {
      return publicIPs[0] // 返回第一个公网 IP
    }

    // 如果没有公网 IP，返回第一个有效的私网 IP
    return validCandidates[0]
  }

  /**
   * 验证 IP 地址格式
   */
  isValidIP(ip) {
    if (!ip || typeof ip !== 'string') return false
    
    // 清理 IP（移除端口号，但保留 IPv6 格式）
    let cleanIP = ip.trim()
    
    // 处理 IPv4 带端口的情况 (192.168.1.1:8080)
    if (cleanIP.includes(':') && !cleanIP.includes('::') && cleanIP.split(':').length === 2) {
      cleanIP = cleanIP.split(':')[0]
    }
    
    // 处理 IPv6 带端口的情况 [2001:db8::1]:8080
    if (cleanIP.startsWith('[') && cleanIP.includes(']:')) {
      cleanIP = cleanIP.substring(1, cleanIP.indexOf(']:'))
    }
    
    return isIP(cleanIP) !== 0
  }

  /**
   * 检查是否为私网 IP
   */
  isPrivateIP(ip) {
    if (!this.isValidIP(ip)) return true
    
    // 使用相同的清理逻辑
    let cleanIP = ip.trim()
    
    // 处理 IPv4 带端口的情况
    if (cleanIP.includes(':') && !cleanIP.includes('::') && cleanIP.split(':').length === 2) {
      cleanIP = cleanIP.split(':')[0]
    }
    
    // 处理 IPv6 带端口的情况
    if (cleanIP.startsWith('[') && cleanIP.includes(']:')) {
      cleanIP = cleanIP.substring(1, cleanIP.indexOf(']:'))
    }
    
    // IPv4 私网地址
    const ipv4Private = [
      /^127\./,                    // 127.0.0.0/8
      /^10\./,                     // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
      /^192\.168\./,               // 192.168.0.0/16
      /^169\.254\./                // 169.254.0.0/16 (链路本地)
    ]

    // IPv6 私网地址
    const ipv6Private = [
      /^::1$/,                     // 本地回环
      /^fe80:/,                    // 链路本地
      /^fc00:/,                    // 唯一本地地址
      /^fd00:/                     // 唯一本地地址
    ]

    return [...ipv4Private, ...ipv6Private].some(pattern => pattern.test(cleanIP))
  }

  /**
   * 获取 IP 地理位置信息（可选功能）
   */
  async getGeoLocation(ip) {
    if (!this.config.enableGeoLocation || this.isPrivateIP(ip)) {
      return null
    }

    try {
      // 这里可以集成第三方地理位置服务
      // 例如：ipapi.co, ipinfo.io 等
      return {
        country: '未知',
        city: '未知',
        isp: '未知'
      }
    } catch (error) {
      console.error('获取地理位置失败:', error)
      return null
    }
  }

  /**
   * 生成 IP 检测报告
   */
  generateReport(req) {
    const ipInfo = req.ipInfo || this.detectIP(req)
    
    return {
      timestamp: new Date().toISOString(),
      clientIP: ipInfo.ip,
      source: ipInfo.source,
      isPrivate: ipInfo.isPrivate,
      isValid: ipInfo.isValid,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
      allCandidates: ipInfo.allCandidates,
      headers: this.config.debug ? req.headers : undefined
    }
  }
}

// 创建默认实例
export const ipDetector = new IPDetector({
  debug: process.env.NODE_ENV === 'development',
  trustedProxies: [
    '127.0.0.1',
    '::1',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16'
  ]
})

// 导出中间件函数
export const detectIPMiddleware = ipDetector.middleware()

export default IPDetector