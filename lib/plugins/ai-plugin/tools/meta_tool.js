import { MioFunction } from '../../../function.js'
import logger from '../../../../utils/logger.js'

function isChannelEvent(context) {
  if (!context) return false
  return Boolean(
    context.channel ||
    context.user?.channel ||
    context.body?.channel ||
    context.user?.channelType ||
    context.user?.role === 'channel_master' ||
    (typeof context.requestId === 'string' &&
      (context.requestId.startsWith('wechat_') ||
        context.requestId.startsWith('channel_'))),
  )
}

function isGroupEvent(context) {
  if (!context) return false
  return Boolean(
    context.isGroup ||
    context.platform === 'group' ||
    context.metaData?.memberId ||
    context.event?.metaData?.memberId ||
    context.body?.metaData?.memberId ||
    context.body?.memberId ||
    context.channel?.isGroup ||
    context.user?.isGroup,
  )
}

export function extractTargetCall(params = {}) {
  const p = params && typeof params === 'object' ? params : {}
  const toolName = p.tool_name ?? p.tool ?? p.name ?? p.target_tool ?? ''
  let rawSchema =
    p.schema !== undefined
      ? p.schema
      : p.parameters !== undefined
        ? p.parameters
        : p.params !== undefined
          ? p.params
          : p.args !== undefined
            ? p.args
            : p.input

  if (typeof rawSchema === 'string') {
    try {
      rawSchema = JSON.parse(rawSchema)
    } catch {
      // Leave as string or unparseable payload if invalid JSON
    }
  }

  const schema = rawSchema && typeof rawSchema === 'object' ? rawSchema : {}
  return {
    schema,
    toolName: String(toolName || '').trim(),
  }
}

export function extractQueryTools(params = {}) {
  const p = params || {}
  const raw = p.tools ?? p.tool_names ?? p.tool_name ?? p.tool ?? p.name
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

export function findTool(name) {
  if (!name || typeof name !== 'string') return null
  const cleanName = name.trim()

  // 1. Check global.middleware.llm.getAllTools()
  if (typeof global.middleware?.llm?.getAllTools === 'function') {
    const allTools = global.middleware.llm.getAllTools()
    if (allTools.has(cleanName)) {
      return allTools.get(cleanName)
    }
    for (const [toolFullName, toolObj] of allTools.entries()) {
      if (
        toolFullName === cleanName ||
        toolFullName.startsWith(`${cleanName}_mid_`) ||
        toolFullName.split('_mid_')[0] === cleanName
      ) {
        return toolObj
      }
    }
  }

  // 2. Check global.middleware.plugins
  const plugins = global.middleware?.plugins || []
  for (const plugin of plugins) {
    if (typeof plugin.getTools === 'function') {
      const toolsMap = plugin.getTools()
      for (const [, toolsArray] of toolsMap) {
        for (const tool of toolsArray) {
          if (
            tool.name === cleanName ||
            tool.name.startsWith(`${cleanName}_mid_`) ||
            tool.name.split('_mid_')[0] === cleanName
          ) {
            return tool
          }
        }
      }
    }
  }

  return null
}

export default class MetaTool extends MioFunction {
  constructor() {
    super({
      adminOnly: false,
      description:
        '动态元工具（Meta Tool），用于系统所有工具的统一发现、参数结构探查与桥接调用。\n' +
        '【核心执行规范 / CRITICAL RULE】：\n' +
        '1. 发现能力：调用 action="list" 概览系统当前所有已加载的工具分组与功能简介。\n' +
        '2. 探查结构（必须）：在首次或调用不确定的新工具之前，【务必先调用 action="query"】（传入 tools: ["tool_name"]）查询其参数 Schema、必填字段与类型！严禁凭空盲猜参数名直接发起调用，以避免因参数错误导致的无效调用。\n' +
        '3. 精确执行：根据 query 返回的标准 Schema 准备参数后，使用 action="call"（传入 tool_name 和精确的 schema）进行调用。',
      name: 'meta_tool',
      parameters: {
        properties: {
          action: {
            default: 'call',
            description:
              '操作指令: "list"（浏览所有可用工具清单），"query"（探查具体工具的参数 Schema 与必填项），"call"（执行目标工具）。【强规则】：调用新工具或参数不确定前，必须先使用 "query" 探查参数结构，切勿盲目调用。',
            enum: ['list', 'query', 'call'],
            type: 'string',
          },
          schema: {
            description:
              '当 action="call" 时传递给目标工具的参数对象（或 JSON 字符串）。【注意】：必须严格符合先前通过 action="query" 查询到的参数 Schema 规范。',
            type: 'object',
          },
          tool_name: {
            description:
              '要执行（action="call"）或查询（action="query"）的目标工具名称，例如 "replace", "bash", "tts_speech"。',
            type: 'string',
          },
          tools: {
            description:
              '当 action="query" 时需要探查参数 Schema 的工具名列表（支持字符串数组如 ["replace", "tts_speech"] 或逗号分隔字符串）。支持批量探查。',
            items: { type: 'string' },
            type: 'array',
          },
        },
        type: 'object',
      },
      timeout: 300,
    })
    this.func = this._execute.bind(this)
  }

  getDescription() {
    const baseDesc =
      '动态元工具（Meta Tool），用于系统所有工具的统一发现、参数结构探查与桥接调用。\n' +
      '【核心执行规范 / CRITICAL RULE】：\n' +
      '1. 发现能力：调用 action="list" 概览系统当前所有已加载的工具分组与功能简介。\n' +
      '2. 探查结构（必须）：在首次或调用不确定的新工具之前，【务必先调用 action="query"】（传入 tools: ["tool_name"]）查询其参数 Schema、必填字段与类型！严禁凭空盲猜参数名直接发起调用，以避免因参数错误导致的无效调用。\n' +
      '3. 精确执行：根据 query 返回的标准 Schema 准备参数后，使用 action="call"（传入 tool_name 和精确的 schema）进行调用。'

    try {
      const plugins = global.middleware?.plugins || []
      const groupsText = []
      for (const plugin of plugins) {
        if (typeof plugin.getTools === 'function') {
          const toolsMap = plugin.getTools()
          for (const [groupName, toolsArray] of toolsMap) {
            const displayedTools = toolsArray
              .filter(
                (t) =>
                  !t.name.startsWith('meta_tool') &&
                  !t.name.startsWith('meta_call'),
              )
              .map((t) => t.name.split('_mid_')[0])
            if (displayedTools.length > 0) {
              groupsText.push(
                `- Group "${groupName}": [${displayedTools.join(', ')}]`,
              )
            }
          }
        }
      }

      if (groupsText.length > 0) {
        return `${baseDesc}\n\n当前已装配的分组及工具样例：\n${groupsText.join('\n')}`
      }
    } catch {
      // Fallback to base description
    }

    return baseDesc
  }

  getDisplayName(params) {
    const rawAction = String(params?.action || '')
      .toLowerCase()
      .trim()

    if (
      rawAction === 'list' ||
      (!rawAction &&
        !params?.tool_name &&
        !params?.tool &&
        !params?.tools &&
        !params?.schema)
    ) {
      return 'Listing available tools'
    }

    if (
      rawAction === 'query' ||
      (params?.tools && !params?.schema && !params?.tool_name)
    ) {
      const toolNames = extractQueryTools(params)
      return toolNames.length > 0
        ? `Querying schema: ${toolNames.join(', ')}`
        : 'Querying tool schemas'
    }

    // Default to tool execution call
    const { toolName, schema } = extractTargetCall(params)
    if (!toolName) return null

    const targetTool = findTool(toolName)
    if (targetTool && typeof targetTool.getDisplayName === 'function') {
      try {
        const targetDisplayName = targetTool.getDisplayName(schema)
        if (targetDisplayName) {
          return targetDisplayName
        }
      } catch (err) {
        logger.debug(
          `[MetaTool] Target tool "${toolName}" getDisplayName failed:`,
          err,
        )
      }
    }

    return `Calling ${toolName}`
  }

  async _execute(e) {
    const params = e?.params || {}
    const rawAction = String(params.action || '')
      .toLowerCase()
      .trim()

    if (rawAction === 'list' || rawAction === 'ls') {
      return this._handleList(e)
    }

    if (
      rawAction === 'query' ||
      rawAction === 'schema' ||
      rawAction === 'describe'
    ) {
      return this._handleQuery(e)
    }

    if (
      rawAction === 'call' ||
      rawAction === 'execute' ||
      rawAction === 'run'
    ) {
      return this._handleCall(e)
    }

    // Heuristics if action is not explicitly declared:
    // 1. If tools array/string provided and no schema/tool execution payload -> query
    if (params.tools && !params.schema && !params.tool_name) {
      return this._handleQuery(e)
    }

    // 2. If tool_name or schema provided -> call
    if (params.tool_name || params.tool || params.name || params.schema) {
      return this._handleCall(e)
    }

    // 3. Otherwise default to list
    return this._handleList(e)
  }

  async _handleList(e) {
    const isChannel = isChannelEvent(e?.parentEvent)
    const isGroup = isGroupEvent(e?.parentEvent)

    const plugins = global.middleware?.plugins || []
    const groups = {}
    const toolList = []
    const seenNames = new Set()

    for (const plugin of plugins) {
      const pluginName = plugin.name || 'default'
      if (typeof plugin.getTools === 'function') {
        const toolsMap = plugin.getTools()
        for (const [groupName, toolsArray] of toolsMap) {
          const currentGroup = groupName || pluginName
          for (const tool of toolsArray) {
            if (tool.channelOnly && !isChannel) continue
            if (tool.groupOnly && !isGroup) continue

            const baseName = tool.name.split('_mid_')[0]
            if (baseName === 'meta_tool' || baseName === 'meta_call') continue
            if (seenNames.has(baseName)) continue
            seenNames.add(baseName)

            const desc =
              typeof tool.getDescription === 'function'
                ? tool.getDescription()
                : tool.description

            const summary = {
              adminOnly: Boolean(tool.adminOnly),
              channelOnly: Boolean(tool.channelOnly),
              description: desc || '',
              group: currentGroup,
              groupOnly: Boolean(tool.groupOnly),
              name: baseName,
            }

            if (!groups[currentGroup]) {
              groups[currentGroup] = []
            }
            groups[currentGroup].push(summary)
            toolList.push(summary)
          }
        }
      }
    }

    return {
      groups,
      success: true,
      tools: toolList,
      total: toolList.length,
    }
  }

  async _handleQuery(e) {
    const targetNames = extractQueryTools(e?.params)
    if (targetNames.length === 0) {
      return {
        error:
          'Please specify one or more tool names in "tools" (array or string) or "tool_name" to query schemas.',
        success: false,
      }
    }

    const isChannel = isChannelEvent(e?.parentEvent)
    const isGroup = isGroupEvent(e?.parentEvent)

    const results = []
    for (const rawName of targetNames) {
      const cleanName = String(rawName).trim()
      const tool = findTool(cleanName)

      if (!tool) {
        results.push({
          error: `Tool "${cleanName}" not found.`,
          name: cleanName,
          success: false,
        })
        continue
      }

      if (tool.channelOnly && !isChannel) {
        results.push({
          error: `Tool "${cleanName}" is restricted to channel environments only.`,
          name: cleanName,
          success: false,
        })
        continue
      }

      if (tool.groupOnly && !isGroup) {
        results.push({
          error: `Tool "${cleanName}" is restricted to multi-agent group environments only.`,
          name: cleanName,
          success: false,
        })
        continue
      }

      const baseName = tool.name.split('_mid_')[0]
      const desc =
        typeof tool.getDescription === 'function'
          ? tool.getDescription()
          : tool.description
      const parameters =
        typeof tool.getParameters === 'function'
          ? tool.getParameters()
          : tool.parameters

      results.push({
        adminOnly: Boolean(tool.adminOnly),
        channelOnly: Boolean(tool.channelOnly),
        description: desc || '',
        group: tool.parentPlugin?.name || null,
        groupOnly: Boolean(tool.groupOnly),
        name: baseName,
        parameters: parameters || {},
        success: true,
      })
    }

    return {
      count: results.length,
      success: true,
      tools: results,
    }
  }

  async _handleCall(e) {
    const { toolName, schema } = extractTargetCall(e?.params)

    if (!toolName) {
      return {
        error: 'Missing required parameter "tool_name" for action "call".',
        success: false,
      }
    }

    const targetTool = findTool(toolName)
    if (!targetTool) {
      return {
        error: `Target tool "${toolName}" not found. You can use action="list" to check available tools.`,
        success: false,
      }
    }

    const targetBaseName = targetTool.name.split('_mid_')[0]
    if (targetBaseName === 'meta_tool' || targetBaseName === 'meta_call') {
      return {
        error: 'Recursive meta_tool invocation is not allowed.',
        success: false,
      }
    }

    const parentEvent = e?.parentEvent
    if (targetTool.channelOnly && !isChannelEvent(parentEvent)) {
      logger.warn(
        `[MetaTool] Target tool ${toolName} is channel-only, rejected.`,
      )
      return {
        error: `[System Error] 工具 ${toolName} 仅限渠道端使用`,
        success: false,
      }
    }

    if (targetTool.groupOnly && !isGroupEvent(parentEvent)) {
      logger.warn(`[MetaTool] Target tool ${toolName} is group-only, rejected.`)
      return {
        error: `[System Error] 工具 ${toolName} 仅限群聊多 Agent 场景使用`,
        success: false,
      }
    }

    // Synchronize displayName to parentEvent / active tool call data if not already set
    try {
      const displayName = this.getDisplayName(e?.params)
      if (displayName && parentEvent) {
        if (
          parentEvent.currentToolCall &&
          !parentEvent.currentToolCall.displayName
        ) {
          parentEvent.currentToolCall.displayName = displayName
          parentEvent.update?.({
            content: parentEvent.currentToolCall,
            type: 'toolCall',
          })
        }
      }
    } catch {
      // ignore
    }

    // Construct bridged event context
    const bridgedEvent = {
      ...e,
      params: schema,
    }

    // Execute target tool via targetTool.run (retaining lifecycle hooks, policies, and error handling).
    const result = await targetTool.run(bridgedEvent)
    if (
      result &&
      typeof result === 'object' &&
      (result.error || result.success === false)
    ) {
      if (!result.hint) {
        result.hint = `提示：若执行失败或参数不匹配，请先执行 action="query", tools=["${toolName}"] 探查该工具的标准参数 Schema。`
      }
    }
    return result
  }
}
