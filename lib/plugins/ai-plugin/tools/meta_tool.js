import { MioFunction } from '../../../function.js'
import { evaluateToolAccess } from '../../../chat/llm/toolPolicy.js'
import logger from '../../../../utils/logger.js'

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
  const lowerName = cleanName.toLowerCase()

  // 唯一数据源：与 getLLMTools / GET /api/openai/tools 共用同一份注册表，
  // 不再重复遍历 global.middleware.plugins（二者本就是同一份插件数组）。
  const allTools = global.middleware?.llm?.getAllTools?.()
  if (!allTools) return null

  if (allTools.has(cleanName)) {
    return allTools.get(cleanName)
  }

  for (const [toolFullName, toolObj] of allTools.entries()) {
    const baseName = toolFullName.split('_mid_')[0]
    if (
      baseName === cleanName ||
      toolFullName.startsWith(`${cleanName}_mid_`) ||
      baseName.toLowerCase() === lowerName ||
      toolFullName.toLowerCase().startsWith(`${lowerName}_mid_`)
    ) {
      return toolObj
    }
  }

  return null
}

export default class MetaTool extends MioFunction {
  constructor() {
    super({
      description:
        '动态元工具（Meta Tool）——【降级桥接通道】，仅用于调用「不在你当前工具清单中的工具」。\n' +
        '【调用优先级 / DISPATCH RULE，必须遵守】：\n' +
        '1. 原生优先：只要目标工具已经出现在你自己的工具清单（函数 schema）里，就必须直接原生调用它。meta_tool 不是调用工具的常规路径，禁止为了调用已有工具而绕道本工具。\n' +
        '2. 仅当目标工具确实不在你的工具清单中时，才使用本工具桥接调用；不要因为"参数不确定 / 不确定自己能不能调"就默认走 meta_tool。\n' +
        '3. 禁止无脑调用：不要为了"看看系统有哪些工具"而调用 action="list"。\n' +
        '【桥接流程】\n' +
        '- action="query"（tools: ["tool_name"]）：桥接清单外工具前，先探查其参数 Schema 与必填项。\n' +
        '- action="call"（tool_name + 精确 schema）：按探查到的 Schema 执行该清单外工具。\n' +
        '- action="list"：仅当你确认需要清单外的能力时，用于概览系统全部工具分组。',
      name: 'meta_tool',
      parameters: {
        properties: {
          action: {
            description:
              '操作指令: "call"（执行清单外工具，首选），"query"（探查清单外工具的参数 Schema 与必填项），"list"（概览系统全部工具分组，仅清单外场景使用）。清单内已有的工具请直接原生 function call，不要经由本工具。',
            enum: ['list', 'query', 'call'],
            type: 'string',
          },
          schema: {
            description:
              '当 action="call" 时，传递给清单外目标工具的参数对象。必须严格符合先前通过 action="query" 查询到的参数 Schema 规范。',
            type: 'object',
          },
          tool_name: {
            description:
              '要桥接调用（action="call"）或查询（action="query"）的清单外工具名称（基名即可，如 "tts_speech"）。清单内工具无需走此处。',
            type: 'string',
          },
          tools: {
            description:
              '当 action="query" 时需要探查参数 Schema 的清单外工具名列表（支持字符串数组如 ["tts_speech"] 或逗号分隔字符串），支持批量探查。',
            items: { type: 'string' },
            type: 'array',
          },
        },
        required: ['action'],
        type: 'object',
      },
      timeout: 300,
    })
    this.func = this._execute.bind(this)
  }

  getDisplayName(params) {
    const rawAction = String(params?.action || '')
      .toLowerCase()
      .trim()

    if (rawAction === 'list') {
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

    return Object.keys(schema).length > 0
      ? `Calling ${toolName}`
      : `Preparing ${toolName}`
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

    // 3. Never silently turn malformed/empty calls into a list request. This
    // used to hide truncated nested call arguments as an apparently valid
    // action="list" result.
    return {
      error:
        'Missing or unsupported meta_tool action. Use list, query, or call explicitly.',
      success: false,
    }
  }

  async _handleList(e) {
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
            const summary = tool.toMetaSummary
              ? tool.toMetaSummary(e?.parentEvent)
              : evaluateToolAccess(tool, e?.parentEvent, 'meta').allowed
                ? {
                    description:
                      tool.getDescription?.(e?.parentEvent) || tool.description,
                    name: tool.name.split('_mid_')[0],
                  }
                : null
            if (!summary) continue
            const baseName = summary.name
            if (baseName === 'meta_tool' || baseName === 'meta_call') continue
            if (seenNames.has(baseName)) continue
            seenNames.add(baseName)

            const entry = {
              description: summary.description || '',
              group: currentGroup,
              name: baseName,
            }

            if (!groups[currentGroup]) {
              groups[currentGroup] = []
            }
            groups[currentGroup].push(entry)
            toolList.push(entry)
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

      const projection = tool.toMetaSchema
        ? tool.toMetaSchema(e?.parentEvent)
        : evaluateToolAccess(tool, e?.parentEvent, 'meta').allowed
          ? {
              description:
                tool.getDescription?.(e?.parentEvent) || tool.description,
              group: tool.parentPlugin?.name || null,
              name: tool.name.split('_mid_')[0],
              parameters:
                tool.getParameters?.(null, e?.parentEvent) || tool.parameters,
            }
          : null
      if (!projection) {
        results.push({
          error: `Tool "${cleanName}" not found.`,
          name: cleanName,
          success: false,
        })
        continue
      }

      results.push({
        ...projection,
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

    const access = evaluateToolAccess(
      targetTool,
      { ...(e?.parentEvent || e), isMetaCall: true },
      'meta_call',
    )
    if (!access.allowed) {
      logger.warn(
        `[MetaTool] Target tool ${toolName} rejected: ${access.reason}`,
      )
      return {
        error: `Target tool "${toolName}" not found.`,
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
      isMetaCall: true,
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
