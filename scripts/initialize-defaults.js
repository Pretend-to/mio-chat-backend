#!/usr/bin/env node

/**
 * 初始化默认配置脚本
 * 确保数据库中有必要的默认配置项
 */

import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import PluginConfigService from '../lib/database/services/PluginConfigService.js'
import logger from '../utils/logger.js'
import crypto from 'crypto'

/**
 * 生成随机访问码
 */
function generateSecureCode() {
  return crypto.randomBytes(16).toString('base64')
}

/**
 * 默认模型所有者/分组配置
 */
const DEFAULT_MODEL_OWNERS = [
  { owner: 'OpenAI', keywords: ['gpt', 'o1', 'o3', 'o4'] },
  { owner: 'Cohere', keywords: ['command'] },
  { owner: 'Anthropic', keywords: ['claude'] },
  { owner: 'Google', keywords: ['gemini', 'PaLM', 'gemma'] },
  { owner: 'X.AI', keywords: ['grok'] },
  { owner: 'DeepSeek', keywords: ['deepseek'] },
  { owner: '智谱清言', keywords: ['glm'] },
  { owner: '豆包', keywords: ['doubao'] },
  { owner: '月之暗面 (kimi)', keywords: ['moonshot', 'kimi'] },
  { owner: '科大讯飞', keywords: ['sparkdesk'] },
  { owner: '通义千问', keywords: ['qwen', 'qwq', 'qvq'] },
  { owner: '腾讯混元', keywords: ['hunyuan'] },
  { owner: '小米', keywords: ['mimo'] },
  { owner: 'Minimax', keywords: ['minimax'] },
  { owner: '火山引擎', keywords: ['volcengine', 'volc', 'ark'] },
  { owner: '快手', keywords: ['kuaishou', 'kling', 'kwaiyii', 'kwai'] },
  { owner: '美团', keywords: ['meituan', 'longcat'] },
  { owner: 'OpenRouter', keywords: ['openrouter'] },
  { owner: 'Groq', keywords: ['groq'] },
  { owner: 'GitHub', keywords: ['github', 'copilot'] },
  { owner: '零一万物', keywords: ['zeroone', '01.ai', 'yi'] },
  { owner: '百川智能', keywords: ['baichuan'] },
  { owner: '阶跃星辰', keywords: ['stepfun', 'step', 'yuewen'] },
  { owner: 'Perplexity', keywords: ['perplexity'] }
]

/**
 * 初始化默认系统设置
 */
async function initializeDefaultSystemSettings() {
  logger.debug('正在初始化默认系统设置...')
  
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
      value: DEFAULT_MODEL_OWNERS,
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
      value: `你是一个专业的对话上下文压缩专家，负责将对话历史压缩为结构化 XML 记忆结晶。

## 输入格式
你会收到两部分输入：
- <previous_summary>：上次生成的 XML 结晶（若为空则表示首次压缩）
- <new_messages>：本次新增的待压缩对话内容

## 核心任务
采用"滚雪球"方式：将 previous_summary 中的信息与 new_messages 中的新信息融合，生成一份更完整、更新的结晶。

## 输出格式
严格输出以下 XML 结构，不要包含任何解释、前言或结尾说明：

<long_term_profile>
用户的稳定特征：编程语言偏好、技术栈、工作风格、架构哲学、常用工具等。
从历史信息中提炼，逐步积累，不要随意清空。
</long_term_profile>

<short_term_goals>
当前会话或近期明确提出的目标、需求、期望结果。
完成的目标可以从此区块移除或归入 current_plan 的"已完成"子节点。
</short_term_goals>

<current_plan>
当前正在执行的任务计划：
- 总体方案和关键决策
- 已完成的步骤
- 正在进行的步骤
- 待完成的步骤
</current_plan>

<file_architecture_delta>
本次会话涉及的文件路径、新增/修改的函数/类/组件、代码架构变更。
格式示例：
- [MODIFY] path/to/file.js - 修改了 xxx 函数
- [NEW] path/to/new.js - 新建了 xxx 模块
</file_architecture_delta>

<constraints>
必须遵守的约束条件：
- 技术决策约束（如"必须保持无状态"）
- 用户明确的限制（如"不要引入新依赖"）
- 已知的 bug 和待修复问题
- 开发规范要求
</constraints>

## 关键规则
1. previous_summary 中的有效信息必须被继承，除非被新信息明确替代
2. 每个区块聚焦关键信息，删除社交寒暄、中间头脑风暴等无用内容
3. 文件变更记录要精确到路径和函数名
4. 严格保持 XML 格式，不输出标签以外的任何内容`,
      category: 'system',
      description: '对话压缩（上下文结晶）的提示词，支持分区 XML 滚雪球压缩'
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
      } else if (setting.key === 'model_owners') {
        // 无感更新模型所有者配置：如果与硬编码的默认值不一致，自动更新数据库中的值
        const existingValue = existing.value
        if (JSON.stringify(existingValue) !== JSON.stringify(setting.value)) {
          await SystemSettingsService.set(setting.key, setting.value, setting.category, setting.description)
          logger.info(`✓ 无感更新模型所有者配置 (${setting.key})`)
        }
      } else {
        // logger.debug(`- 设置已存在: ${setting.key}`)
      }
    } catch (error) {
      logger.error(`创建/更新默认设置失败 ${setting.key}:`, error)
    }
  }
}

/**
 * 初始化默认插件配置
 */
async function initializeDefaultPluginConfig() {
  logger.debug('正在初始化默认插件配置...')
  
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
      // logger.debug('- OneBot 配置已存在')
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
    logger.debug('开始初始化默认配置...')
    
    // 初始化数据库连接
    await prismaManager.initialize()
    
    // 初始化服务
    await SystemSettingsService.initialize()
    await PluginConfigService.initialize()
    
    // 初始化默认配置
    await initializeDefaultSystemSettings()
    await initializeDefaultPluginConfig()
    
    logger.debug('默认配置初始化完成!')
    
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