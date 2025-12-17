#!/usr/bin/env node

/**
 * 调试配置存储和读取
 */

console.log('开始调试配置...')

async function debugConfig() {
  try {
    console.log('导入数据库服务...')
    // 导入数据库服务
    const { default: SystemSettingsService } = await import('../lib/database/services/SystemSettingsService.js')
    
    console.log('初始化数据库服务...')
    // 确保服务已初始化
    if (!SystemSettingsService.prisma) {
      await SystemSettingsService.initialize()
    }

    console.log('=== 调试配置存储 ===')
    
    // 获取所有系统设置
    const allSettings = await SystemSettingsService.getAll()
    
    console.log(`数据库中共有 ${allSettings.length} 个配置项:`)
    allSettings.forEach(setting => {
      console.log(`  - ${setting.key}: ${JSON.stringify(setting.value)} (${setting.category})`)
    })
    
    console.log('\n=== 测试配置服务 ===')
    
    // 测试配置服务的 getFullConfig
    const { getFullConfig } = await import('../lib/server/http/services/configService.js')
    const fullConfig = await getFullConfig()
    
    console.log('完整配置:')
    console.log(JSON.stringify(fullConfig, null, 2))
    
  } catch (error) {
    console.error('调试失败:', error)
  } finally {
    // 关闭数据库连接
    try {
      const { default: SystemSettingsService } = await import('../lib/database/services/SystemSettingsService.js')
      if (SystemSettingsService.prisma) {
        await SystemSettingsService.prisma.$disconnect()
      }
    } catch (e) {
      console.error('关闭数据库连接失败:', e)
    }
  }
}

debugConfig().catch(error => {
  console.error('调试脚本运行失败:', error)
  process.exit(1)
})