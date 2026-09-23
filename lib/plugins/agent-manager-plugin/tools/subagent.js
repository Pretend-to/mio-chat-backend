import { getSubAgentRuntime } from '../../../subagents/index.js'
import { MioFunction } from '../../../function.js'
import { getBackgroundToolNames } from '../../../subagents/ResourcePolicy.js'
import {
  DELIVERY_MODES,
  listDeliveryChannels,
  resolveDeliveryBinding,
} from '../../../chat/delivery/DeliveryBindingService.js'

function requireContext(event) {
  const agentId =
    event.agentId || event.channel?.memory?.agentId || event.memory?.agentId
  const parentSessionId =
    event.sessionId || event.body?.sessionId || event.body?.sid
  if (!agentId || !parentSessionId) {
    throw new Error('当前上下文缺少 agentId 或 sessionId，不能派发 SubAgent')
  }
  return { agentId: String(agentId), parentSessionId: String(parentSessionId) }
}

function allowedTools(event) {
  const settings = event.settings || event.body?.settings
  const tools = settings?.toolCallSettings?.tools
  return Array.isArray(tools) ? tools : []
}

function messageId(event) {
  return (
    event.messageId ||
    event.externalMessageId ||
    event.body?.messageId ||
    event.body?.messages?.at?.(-1)?.id ||
    null
  )
}

function cleanRun(run) {
  return {
    cancelReason: run.cancelReason || null,
    error: run.errorJson ? JSON.parse(run.errorJson) : null,
    finishedAt: run.finishedAt,
    groupId: run.groupId,
    id: run.id,
    jobKey: run.jobKey,
    objective: run.objective,
    result: run.resultJson ? JSON.parse(run.resultJson) : null,
    resultText: run.resultText,
    role:
      run.role || run.session?.subagentRole || run.session?.title || run.jobKey,
    sessionId: run.sessionId,
    startedAt: run.startedAt,
    status: run.status,
    taskType: run.taskType,
    tools: run.toolNamesJson ? JSON.parse(run.toolNamesJson) : [],
  }
}

export default class SubAgentTool extends MioFunction {
  constructor({
    deliveryService = { listDeliveryChannels, resolveDeliveryBinding },
    runtimeFactory = getSubAgentRuntime,
  } = {}) {
    super({
      access: { requires: { admin: true } },
      description: [
        '异步派发和管理 SubAgent。SubAgent 使用当前 Agent 的 child Session 隔离临时上下文；调用 spawn/spawn_batch 后立即返回 queued receipt，主 Agent 不要在当前工具调用里等待结果。',
        '多个 jobs 默认并行；用 dependsOn 指定串行 DAG。',
        'SubAgent 无条件完整继承当前主 Agent 的有效工具与权限快照，包括终端和文件工具。高风险操作仍沿用现有安全检查与审批策略。',
        '任务完成后会唤醒主 Agent，但只发送 groupId/runId 和读取指令，不注入结果正文。主 Agent 应使用 status/read_result tool call 主动读取结果；若需要对已完成、已停止或正在运行的 SubAgent 进行调整或执行下一步，可调用 continue 并传入新指令（若 SubAgent 正在运行会自动打断并无缝转向新指示），复用原 SubAgent Session 的完整上下文。',
      ].join('\n'),
      name: 'subagent',
      parameters: {
        properties: {
          action: {
            enum: [
              'spawn',
              'spawn_batch',
              'status',
              'read_result',
              'continue',
              'cancel',
              'capabilities',
            ],
            type: 'string',
          },
          deliveryMode: {
            default: 'default',
            description:
              '父 Agent 唤醒投递策略：default=继承当前/默认渠道，channel=指定渠道，session_only=只写入 Session',
            enum: Object.values(DELIVERY_MODES),
            type: 'string',
          },
          deliveryChannelId: {
            description: '指定父 Agent 已绑定的公开 Channel ID',
            type: 'string',
          },
          completionPolicy: {
            default: 'all',
            enum: ['all', 'any', 'quorum'],
            type: 'string',
          },
          groupId: { type: 'string' },
          instruction: { type: 'string' },
          idempotencyKey: { type: 'string' },
          jobs: {
            items: {
              properties: {
                contextDigest: { type: 'string' },
                dependsOn: { items: { type: 'string' }, type: 'array' },
                input: { type: 'object' },
                key: { type: 'string' },
                objective: { type: 'string' },
                outputContract: { type: 'object' },
                role: { type: 'string' },
                sessionPolicy: {
                  enum: ['fresh', 'persistent'],
                  type: 'string',
                },
                subagentKey: { type: 'string' },
                taskType: {
                  default: 'research',
                  description:
                    '任务分类元数据，用于调度和展示；不会隐式扩大工具权限。',
                  type: 'string',
                },
              },
              required: ['key', 'objective'],
              type: 'object',
            },
            type: 'array',
          },
          objective: { type: 'string' },
          contextDigest: { type: 'string' },
          input: { type: 'object' },
          outputContract: { type: 'object' },
          quorum: { type: 'integer' },
          role: { type: 'string' },
          sessionPolicy: {
            enum: ['fresh', 'persistent'],
            type: 'string',
          },
          subagentKey: { type: 'string' },
          taskType: {
            default: 'research',
            description:
              '任务分类元数据，用于调度和展示；不会隐式扩大工具权限。',
            type: 'string',
          },
          reason: { type: 'string' },
          runId: { type: 'string' },
        },
        required: ['action'],
        type: 'object',
      },
    })
    this.deliveryService = deliveryService
    this.runtimeFactory = runtimeFactory
    this.func = this.execute.bind(this)
  }

  async execute(event) {
    const { agentId, parentSessionId } = requireContext(event)
    const params = event.params || {}
    const runtime = this.runtimeFactory()

    if (params.action === 'capabilities') {
      const parentTools = allowedTools(event)
      const defaultTools = getBackgroundToolNames(parentTools, event)
      return {
        assignableTools: defaultTools,
        defaultTools,
        deliveryChannels:
          await this.deliveryService.listDeliveryChannels(agentId),
        explicitOnlyTools: [],
        message: 'SubAgent 无条件完整继承当前父上下文的有效工具与权限快照。',
        success: true,
      }
    }

    if (params.action === 'spawn' || params.action === 'spawn_batch') {
      const effectiveDeliveryMode =
        params.deliveryMode || DELIVERY_MODES.DEFAULT
      const resolvedDelivery =
        await this.deliveryService.resolveDeliveryBinding({
          agentId,
          deliveryChannelId: params.deliveryChannelId,
          deliveryMode: effectiveDeliveryMode,
          event,
        })
      const parentTools = allowedTools(event)
      const defaultToolNames = getBackgroundToolNames(parentTools, event)
      const jobs =
        params.action === 'spawn'
          ? [
              {
                contextDigest: params.contextDigest,
                input: params.input,
                key: params.subagentKey || params.role || 'task',
                objective: params.objective,
                outputContract: params.outputContract,
                role: params.role,
                sessionPolicy: params.sessionPolicy,
                subagentKey: params.subagentKey,
                taskType: params.taskType,
              },
            ]
          : params.jobs
      const group = await runtime.runService.createGroup({
        agentId,
        allowedToolNames: defaultToolNames,
        completionPolicy: params.completionPolicy || 'all',
        deliveryBindingId: resolvedDelivery.binding?.id || null,
        deliveryMode: resolvedDelivery.deliveryMode,
        idempotencyKey: params.idempotencyKey || null,
        jobs,
        parentMessageId: messageId(event),
        parentSessionId,
        quorum: params.quorum ?? null,
        defaultToolNames,
      })
      runtime.dispatcher.startGroup(group.id)
      return {
        groupId: group.id,
        message: `SubAgent RunGroup 已入队，共 ${group.runs.length} 个 Run；无需等待，可继续当前对话。完成后请通过 status/read_result tool call 主动读取结果。`,
        runs: group.runs.map((run) => ({
          id: run.id,
          jobKey: run.jobKey,
          objective: run.objective,
          role:
            run.role || run.session?.subagentRole || params.role || run.jobKey,
          sessionId: run.sessionId,
          status: run.status,
          tools: run.toolNamesJson ? JSON.parse(run.toolNamesJson) : [],
        })),
        status: group.status,
        success: true,
        delivery: {
          channelId: resolvedDelivery.deliveryChannelId,
          mode: resolvedDelivery.deliveryMode,
        },
        deliveryChannels:
          await this.deliveryService.listDeliveryChannels(agentId),
      }
    }

    if (params.action === 'status') {
      if (params.runId) {
        return {
          run: cleanRun(
            await runtime.runService.getRun(params.runId, { agentId }),
          ),
          success: true,
        }
      }
      if (!params.groupId) throw new Error('status requires groupId or runId')
      const group = await runtime.runService.getGroup(params.groupId, {
        agentId,
      })
      return {
        group: {
          id: group.id,
          runs: group.runs.map(cleanRun),
          status: group.status,
        },
        success: true,
      }
    }

    if (params.action === 'read_result') {
      if (!params.runId) throw new Error('read_result requires runId')
      const run = await runtime.runService.getRun(params.runId, { agentId })
      return { run: cleanRun(run), success: true }
    }

    if (params.action === 'continue') {
      if (!params.runId || !params.instruction) {
        throw new Error('continue requires runId and instruction')
      }
      const targetRun = await runtime.runService.getRun(params.runId, {
        agentId,
      })
      if (['running', 'queued', 'waiting_tool'].includes(targetRun?.status)) {
        await runtime.dispatcher.abortRun(
          params.runId,
          'interrupted_for_continuation',
        )
      }
      const run = await runtime.runService.continueRun(params.runId, {
        instruction: params.instruction,
      })
      runtime.dispatcher.startGroup(run.groupId)
      return { run: cleanRun(run), success: true }
    }

    if (params.action === 'cancel') {
      if (params.runId) {
        await runtime.runService.getRun(params.runId, { agentId })
        return {
          run: cleanRun(
            await runtime.dispatcher.abortRun(params.runId, params.reason),
          ),
          success: true,
        }
      }
      if (!params.groupId) throw new Error('cancel requires groupId or runId')
      const group = await runtime.runService.getGroup(params.groupId, {
        agentId,
      })
      const runs = []
      for (const run of group.runs) {
        runs.push(
          cleanRun(await runtime.dispatcher.abortRun(run.id, params.reason)),
        )
      }
      return { groupId: group.id, runs, success: true }
    }

    throw new Error(`Unknown subagent action: ${params.action}`)
  }
}
