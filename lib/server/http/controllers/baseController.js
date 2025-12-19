import config from '../../../config.js'
import { makeStandardResponse } from '../utils/responseFormatter.js'
import shareService from '../services/shareService.js'
import logger from '../../../../utils/logger.js'

// 基本网关路由
export function getGateway(req, res) {
  logger.info('GET /api/gateway')
  const data = {
    name: 'mio-chat-backend',
    version: '1.0.0',
    description: 'mio-chat-backend is a backend service for mio-chat.',
  }
  const response = makeStandardResponse(data)
  res.json(response)
}

// 基本信息路由
export async function getBaseInfo(req, res) {
  const llm_providers = config.getProvidersAvailable()
  const default_model = await config.getDefaultModel()

  // 将 default_model 集成到每个 provider 中
  const providers_with_defaults = llm_providers.map(provider => ({
    ...provider,
    default_model: default_model[provider.displayName] || null
  }))

  res.status(200).json({
    code: 0,
    message: 'success',
    data: {
      full_screen: config.web.full_screen,
      beian: config.web.beian,
      admin_qq: config.onebot.admin_qq || 1099834705,
      bot_qq: config.onebot.bot_qq,
      title: config.web.title,
      llm_providers: providers_with_defaults,  // 包含 default_model 的 providers
    },
  })
}

/**
 * 获取默认的 OneBot 插件选项
 */
function getDefaultOnebotPluginOptions() {
  return {
    textwraper: {
      options: [
        {
          value: '',
          label: '默认'
        },
        {
          value: 'AP',
          label: '画图',
          children: [
            {
              value: 'eDraw',
              label: '绘个图',
              preset: '#绘个图{xxx}'
            },
            {
              value: 'apDraw',
              label: '绘图',
              preset: '#绘图{xxx}'
            }
          ]
        },
        {
          value: 'SF',
          label: 'sf对话',
          children: [
            {
              value: 'sfgemini',
              label: 'sf #gg',
              preset: '#gg{xxx}'
            }
          ]
        },
        {
          value: 'GPT',
          label: 'AI对话',
          children: [
            {
              value: 'gptHelp',
              label: '帮助',
              preset: '#chatgpt帮助'
            },
            {
              value: 'gptCancel',
              label: '结束对话',
              preset: '#chatgpt结束对话'
            },
            {
              value: 'gptUseAPI',
              label: '基于API',
              preset: '#api{xxx}'
            },
            {
              value: 'gptUseGlm4',
              label: '基于GLM4',
              preset: '#glm4{xxx}'
            },
            {
              value: 'gptUseGemini',
              label: '基于Gemini',
              preset: '#gemini{xxx}'
            },
            {
              value: 'gptUseClaude',
              label: '基于Claude',
              preset: '#claude{xxx}'
            }
          ]
        },
        {
          value: 'Genshin',
          label: '娱乐功能',
          children: [
            {
              value: 'genshinHelp',
              label: '帮助',
              preset: '#帮助'
            },
            {
              value: 'genshinBind',
              label: '绑定UID',
              preset: '#绑定{xxx}'
            },
            {
              value: 'genshinIUpdate',
              label: '更新面板',
              preset: '#更新面板'
            },
            {
              value: 'genshinPanel',
              label: '角色面板',
              preset: '#{xxx}面板'
            },
            {
              value: 'genshinSk',
              label: '角色天赋',
              preset: '#{xxx}天赋'
            },
            {
              value: 'genshinCe',
              label: '角色命座',
              preset: '#{xxx}命座'
            },
            {
              value: 'genshinOb',
              label: '角色养成材料',
              preset: '#{xxx}材料'
            }
          ]
        }
      ]
    }
  }
}

/**
 * 静默迁移 OneBot 插件配置
 * 如果数据库中没有插件选项，自动添加默认配置
 */
async function ensureOnebotPluginOptions() {
  try {
    // 动态导入数据库服务
    const { default: SystemSettingsService } = await import('../../../database/services/SystemSettingsService.js')
    
    // 确保服务已初始化
    if (!SystemSettingsService.prisma) {
      await SystemSettingsService.initialize()
    }
    
    // 获取当前的 OneBot 配置
    const currentSetting = await SystemSettingsService.get('onebot')
    
    if (!currentSetting || !currentSetting.value) {
      // 如果没有 OneBot 配置，不进行迁移（应该由初始化脚本处理）
      return false
    }
    
    const currentConfig = currentSetting.value
    
    // 检查是否缺少插件配置
    const needsMigration = !currentConfig.plugins || 
                          !currentConfig.plugins.options || 
                          (typeof currentConfig.plugins.options === 'object' && Object.keys(currentConfig.plugins.options).length === 0)
    
    if (needsMigration) {
      logger.info('检测到 OneBot 配置缺少插件选项，开始静默迁移...')
      
      // 合并默认插件配置
      const updatedConfig = {
        ...currentConfig,
        plugins: {
          options: getDefaultOnebotPluginOptions()
        }
      }
      
      // 保存到数据库
      await SystemSettingsService.set('onebot', updatedConfig, 'onebot', 'OneBot 协议配置')
      
      // 重新加载内存中的配置
      await config.reload()
      
      logger.info('✅ OneBot 插件选项静默迁移完成')
      return true
    }
    
    return false
  } catch (error) {
    logger.error('OneBot 插件选项静默迁移失败:', error)
    return false
  }
}

// Onebot插件路由
export async function getOnebotPlugins(req, res) {
  try {
    // 尝试静默迁移插件配置
    await ensureOnebotPluginOptions()
    
    // 安全地获取 OneBot 插件配置
    const onebotConfig = config.onebot || {}
    const plugins = onebotConfig.plugins || {}
    const options = plugins.options || {}
    
    res.status(200).json({
      code: 0,
      message: 'success',
      data: {
        options: options,
      },
    })
  } catch (error) {
    logger.error('获取 OneBot 插件选项失败:', error)
    res.status(500).json({
      code: 1,
      message: '获取插件选项失败: ' + error.message,
      data: null,
    })
  }
}

export async function getShare(req, res) {
  const id = req.query.id
  let shareDate

  try {
    shareDate = await shareService.getShare(id)
    res.json(makeStandardResponse(shareDate))
  } catch (error) {
    res.status(400).json({
      code: 1,
      message: error.message,
      data: null,
    })
  }
}

export async function setShare(req, res) {
  const { contactor } = req.body

  const shareDate = await shareService.createShare(contactor)

  res.json(makeStandardResponse(shareDate))
}

export function redirectShare(req, res) {
  const shareId = req.params.id
  const path = `/chat/0?shareId=${shareId}`
  // 从请求头中获取域名(如果有端口，加上)
  const host = req.headers.host
  const protocol = req.protocol
  const redirectUrl = `${protocol}://${host}${path}`
  res.redirect(redirectUrl)
}
