import prismaManager from '../lib/database/prisma.js'
import PresetService from '../lib/database/services/PresetService.js'
import { 
  createPreset, 
  updatePreset, 
  deletePreset, 
  getAllPresets,
  importPreset 
} from '../lib/server/http/services/presetService.js'
import logger from '../utils/logger.js'

/**
 * 测试完整的 CRUD 功能
 */
async function testCRUD() {
  try {
    logger.info('开始测试 CRUD 功能...')
    
    // 初始化数据库和服务
    await prismaManager.initialize()
    await PresetService.initialize()
    
    // 测试数据
    const testPreset = {
      name: '测试预设_' + Date.now(),
      history: [
        { role: 'system', content: '你是一个测试助手' },
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好！我是测试助手。' }
      ],
      opening: '这是一个测试预设',
      tools: ['test-tool'],
      category: 'common'
    }
    
    // 1. 测试创建预设
    logger.info('测试创建预设...')
    const created = await createPreset(testPreset)
    logger.info(`✓ 创建预设成功: ${created.name}`)
    
    // 2. 测试获取所有预设
    logger.info('测试获取所有预设...')
    const allPresets = await getAllPresets()
    const totalCount = Object.values(allPresets).reduce((sum, category) => sum + category.length, 0)
    logger.info(`✓ 获取预设成功: 总计 ${totalCount} 个`)
    
    // 3. 测试更新预设
    logger.info('测试更新预设...')
    const updateData = {
      ...testPreset,
      opening: '这是更新后的测试预设',
      history: [
        { role: 'system', content: '你是一个更新后的测试助手' },
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好！我是更新后的测试助手。' }
      ]
    }
    const updated = await updatePreset(testPreset.name, updateData)
    logger.info(`✓ 更新预设成功: ${updated.name}`)
    
    // 4. 测试导入预设
    logger.info('测试导入预设...')
    const importData = {
      name: '导入测试预设_' + Date.now(),
      history: [
        { role: 'system', content: '你是一个导入的测试助手' }
      ],
      opening: '这是导入的预设'
    }
    const importBuffer = Buffer.from(JSON.stringify(importData), 'utf8')
    const imported = await importPreset(importBuffer)
    logger.info(`✓ 导入预设成功: ${imported.imported[0].name}`)
    
    // 5. 测试删除预设
    logger.info('测试删除预设...')
    const deleted1 = await deletePreset(testPreset.name)
    logger.info(`✓ 删除预设成功: ${deleted1.name}`)
    
    const deleted2 = await deletePreset(importData.name)
    logger.info(`✓ 删除导入预设成功: ${deleted2.name}`)
    
    // 6. 验证最终状态
    logger.info('验证最终状态...')
    const finalPresets = await getAllPresets()
    const finalCount = Object.values(finalPresets).reduce((sum, category) => sum + category.length, 0)
    logger.info(`✓ 最终预设数量: ${finalCount} 个`)
    
    logger.info('CRUD 功能测试完成！')
    
  } catch (error) {
    logger.error('CRUD 测试失败:', error)
    throw error
  } finally {
    await prismaManager.disconnect()
  }
}

// 执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testCRUD()
    .then(() => {
      logger.info('所有 CRUD 测试通过！')
      process.exit(0)
    })
    .catch(error => {
      logger.error('CRUD 测试失败:', error)
      process.exit(1)
    })
}

export default testCRUD