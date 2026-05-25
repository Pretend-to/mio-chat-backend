#!/usr/bin/env node

/**
 * 强制更新系统上下文压缩提示词脚本
 */

import prismaManager from '../../lib/database/prisma.js'
import SystemSettingsService from '../../lib/database/services/SystemSettingsService.js'
import logger from '../../utils/logger.js'

const COMPACT_PROMPT_VALUE = `你是一个专业的对话上下文压缩专家，负责将对话历史压缩为结构化 XML 记忆结晶。

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
3. 文件变更记录要精确到路径 and 函数名
4. 严格保持 XML 格式，不输出标签以外的任何内容`;

async function updateCompactPrompt() {
  try {
    logger.info('正在更新 system_llm_compact_prompt...')
    
    // 初始化数据库连接
    await prismaManager.initialize()
    await SystemSettingsService.initialize()
    
    // 强制设置 system_llm_compact_prompt
    await SystemSettingsService.set(
      'system_llm_compact_prompt',
      COMPACT_PROMPT_VALUE,
      'system',
      '对话压缩（上下文结晶）的提示词，支持分区 XML 滚雪球压缩'
    )
    
    logger.info('✓ system_llm_compact_prompt 已成功更新为最新的分区 XML 格式')
    
  } catch (error) {
    logger.error('更新提示词失败:', error)
  } finally {
    await prismaManager.disconnect()
  }
}

updateCompactPrompt()
