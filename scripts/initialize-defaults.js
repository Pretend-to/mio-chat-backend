#!/usr/bin/env node

/**
 * 初始化默认配置脚本
 * 确保数据库中有必要的默认配置项
 */

import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import PluginConfigService from '../lib/database/services/PluginConfigService.js'
import logger from '../utils/logger.js'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import crypto from 'crypto'

/**
 * 生成随机访问码
 */
function generateSecureCode() {
  return crypto.randomBytes(16).toString('base64')
}

/**
 * 加载默认的 owners 配置
 */
function loadDefaultOwners() {
  try {
    const ownersPath = path.join(process.cwd(), 'config', 'owners.yaml')
    if (fs.existsSync(ownersPath)) {
      const ownersContent = fs.readFileSync(ownersPath, 'utf8')
      return yaml.load(ownersContent)
    }
  } catch (error) {
    logger.warn('加载默认 owners 配置失败:', error.message)
  }
  return []
}

/**
 * 初始化默认系统设置
 */
async function initializeDefaultSystemSettings() {
  logger.info('正在初始化默认系统设置...')
  
  // 使用全局的 generateSecureCode 函数

  const defaultSettings = [
    {
      key: 'admin_code',
      value: process.env.ADMIN_CODE || generateSecureCode(),
      category: 'web',
      description: '管理员访问码'
    },
    {
      key: 'user_code', 
      value: process.env.USER_CODE || generateSecureCode(),
      category: 'web',
      description: '普通用户访问码'
    },
    {
      key: 'server_port',
      value: parseInt(process.env.PORT) || 3000,
      category: 'server',
      description: '服务器端口'
    },
    {
      key: 'debug_mode',
      value: process.env.DEBUG === 'true' || false,
      category: 'general',
      description: '调试模式'
    },
    {
      key: 'model_owners',
      value: loadDefaultOwners(),
      category: 'general',
      description: '模型所有者配置'
    },
    {
      key: 'web_full_screen',
      value: process.env.WEB_FULL_SCREEN === 'false' ? false : true,
      category: 'web',
      description: 'Web 界面全屏模式'
    },
    {
      key: 'web_beian',
      value: process.env.WEB_BEIAN || '',
      category: 'web',
      description: 'Web 界面备案信息'
    },
    {
      key: 'web_title',
      value: process.env.WEB_TITLE || 'MioChat',
      category: 'web',
      description: 'Web 界面标题'
    },
    {
      key: 'system_llm_channel',
      value: '',
      category: 'system',
      description: '系统任务专用 LLM 渠道 (留空则默认使用第一个可用渠道)'
    },
    {
      key: 'system_llm_title_prompt',
      value: '请根据这段对话内容，为这个会话起一个极其简短、精准的标题（不超过 6 个字）。注意：你的回答只能包含标题本身，不要包含任何标点符号、解释或引用。',
      category: 'system',
      description: '对话标题自动生成的提示词'
    },
    {
      key: 'system_llm_compact_prompt',
      value: '你是一个精通对话压缩和上下文总结的专家。请根据提供的对话历史，创建一个高密度的叙述性总结。总结应包含：1) 用户的核心意图和项目目标；2) 已达成的关键技术决策及理由；3) 涉及或修改的文件、函数及架构组件；4) 当前的问题、进度及未解决的疑难点；5) 必须遵循的关键约束或规则；6) 项目的精确当前状态及后续即时步骤。请剔除所有社交寒暄、冗余解释和中间头脑风暴过程。目标是提供一个能够完全替代原始历史、让对话无缝延续的上下文摘要。',
      category: 'system',
      description: '对话压缩（上下文总结）的提示词'
    }
  ]

  for (const setting of defaultSettings) {
    try {
      const existing = await SystemSettingsService.get(setting.key)
      if (!existing) {
        await SystemSettingsService.set(setting.key, setting.value, setting.category, setting.description)
        logger.info(`✓ 创建默认设置: ${setting.key}`)
        
        // 如果是访问码，显示生成的值
        if (setting.key === 'admin_code' || setting.key === 'user_code') {
          logger.warn(`🔐 自动生成的${setting.description}: ${setting.value}`)
          logger.warn('⚠️  请妥善保存此访问码！')
        }
      } else {
        logger.info(`- 设置已存在: ${setting.key}`)
      }
    } catch (error) {
      logger.error(`创建默认设置失败 ${setting.key}:`, error)
    }
  }
}

/**
 * 初始化默认插件配置
 */
async function initializeDefaultPluginConfig() {
  logger.info('正在初始化默认插件配置...')
  
  try {
    const existing = await SystemSettingsService.get('onebot')
    if (!existing) {
      const defaultOnebotConfig = {
        enable: false,
        reverse_ws_url: '',
        bot_qq: '2698788044',
        admin_qq: '1099834705',
        token: '',
        plugins: {
          options: {
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
      }
      
      await SystemSettingsService.set('onebot', defaultOnebotConfig, 'onebot', 'OneBot 协议配置')
      
      logger.info('✓ 创建默认 OneBot 配置')
    } else {
      logger.info('- OneBot 配置已存在')
    }
  } catch (error) {
    logger.error('创建默认插件配置失败:', error)
  }
}

/**
 * 主初始化函数
 */
async function main() {
  try {
    logger.info('开始初始化默认配置...')
    
    // 初始化数据库连接
    await prismaManager.initialize()
    
    // 初始化服务
    await SystemSettingsService.initialize()
    await PluginConfigService.initialize()
    
    // 初始化默认配置
    await initializeDefaultSystemSettings()
    await initializeDefaultPluginConfig()
    
    logger.info('默认配置初始化完成!')
    
  } catch (error) {
    logger.error('初始化默认配置失败:', error)
    process.exit(1)
  } finally {
    // 关闭数据库连接
    await prismaManager.disconnect()
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default main