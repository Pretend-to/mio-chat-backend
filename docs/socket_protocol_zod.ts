import { z } from "zod";

/**
 * ==========================================================
 * MioChat Socket.IO 通信协议 Zod Schema 规范
 * (为后续迁移 TypeScript 和统一全栈类型校验做准备)
 * ==========================================================
 */

// ======================= 1. 基础公共类型 =======================

// LLM 请求与响应中的 MetaData 结构
export const MetaDataSchema = z.object({
  contactorId: z.string().describe("当前对话所在的 Contactor (Agent) 的 ID"),
  messageId: z.string().describe("该条消息的唯一 ID (即 request_id)"),
  isTask: z.boolean().optional().describe("是否是后台运行的长任务"),
  // 可扩展其他元数据
}).catchall(z.any());

// ======================= 2. 连接与鉴权阶段 =======================

// 客户端连接时附带的 Query 参数
export const SocketAuthQuerySchema = z.object({
  id: z.string().describe("客户端唯一设备/实例 ID"),
  code: z.string().describe("管理员的 Access Code"),
});

// 后端在 `connect` 成功时发给前端的初始化信息
export const ConnectSuccessPayloadSchema = z.object({
  onebot_enabled: z.boolean().describe("是否启用了 OneBot 协议"),
  models: z.array(z.any()).describe("当前系统支持的 LLM 模型列表"),
  pendingTasks: z.array(z.string()).describe("离线期间未读/挂起任务的 Contactor ID 列表"),
  recommendedPresets: z.array(
    z.object({
      name: z.string(),
      avatar: z.string().optional(),
      history: z.number().optional(),
      opening: z.string().optional(),
      tools: z.array(z.string()).optional(),
    })
  ).optional().describe("系统推荐的默认 Agent 预设配置"),
});


// ======================= 3. LLM 协议 (Protocol: 'llm') =======================
// 所有 `llm` 协议相关的底层包装体
const LLMBaseEnvelope = z.object({
  request_id: z.string().describe("全局绑定的请求/消息ID，必须与 messageId 一致"),
  protocol: z.literal("llm"),
});

// ---------------- 3.1 `update` 事件 (流式增量) ----------------
export const ReasonChunkSchema = z.object({
  type: z.literal("reason"),
  data: z.object({
    text: z.string().describe("深度思考文本片段"),
    startTime: z.number().describe("思考开始的时间戳"),
    duration: z.number().describe("思考持续时长（毫秒，未完成时为 0）"),
  }),
  metaData: MetaDataSchema,
});

export const ContentChunkSchema = z.object({
  type: z.literal("content"),
  content: z.string().describe("普通正文文本片段"),
  metaData: MetaDataSchema,
});

export const ToolCallChunkSchema = z.object({
  type: z.literal("toolCall"),
  content: z.object({
    id: z.string().describe("ToolCall 的唯一 ID"),
    index: z.number().describe("工具调用的索引序列"),
    name: z.string().describe("工具名称"),
    action: z.enum(["pending", "running"]).describe("当前工具的运行状态"),
    parameters: z.string().optional().describe("增量拼接的参数字符串 (兼容 arguments)"),
    arguments: z.string().optional().describe("参数字符串"),
    result: z.any().optional().describe("工具执行完成后的返回结果"),
  }),
  metaData: MetaDataSchema,
});

export const LLMUpdateMessageSchema = LLMBaseEnvelope.extend({
  message: z.literal("update"),
  data: z.union([ReasonChunkSchema, ContentChunkSchema, ToolCallChunkSchema]),
});

// ---------------- 3.2 `sync` 事件 (全量快照同步) ----------------
// 用于重连时或进入后台任务时一次性拉取整个对话的中间态
export const SyncChunkSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("reason"),
    data: z.object({ text: z.string(), startTime: z.number(), duration: z.number() }),
  }),
  z.object({
    type: z.literal("content"),
    content: z.string(),
  }),
  z.object({
    type: z.literal("toolCall"),
    content: ToolCallChunkSchema.shape.content, // 复用 ToolCall 内容结构
  })
]);

export const LLMSyncMessageSchema = LLMBaseEnvelope.extend({
  message: z.literal("sync"),
  data: z.object({
    chunks: z.array(SyncChunkSchema).describe("已生成的快照块数组"),
    status: z.enum(["streaming", "completed", "failed"]).describe("当前流的整体状态"),
    messageId: z.string().describe("消息ID"),
    metaData: MetaDataSchema,
    error: z.any().optional(),
  }),
});

// ---------------- 3.3 `complete` / `failed` 事件 ----------------
export const LLMCompleteMessageSchema = LLMBaseEnvelope.extend({
  message: z.literal("complete"),
  data: z.object({
    metaData: MetaDataSchema,
  }).optional(),
});

export const LLMFailedMessageSchema = LLMBaseEnvelope.extend({
  message: z.literal("failed"),
  data: z.any().describe("错误详情"), // 这里后端直接抛了错误对象，暂用 any
});

// ============== 统合前端接收的 LLM 消息结构 ==============
export const FrontendLLMEventSchema = z.union([
  LLMUpdateMessageSchema,
  LLMSyncMessageSchema,
  LLMCompleteMessageSchema,
  LLMFailedMessageSchema,
]);


// ======================= 4. 前端发往后端的指令 (Client to Server) =======================

// 前端进入某个 Chat 时触发同步
export const EnterChatEmitSchema = z.string().describe("Contactor ID");

// 前端主动发送的消息包结构 (通过 socket.emit('message', stringified JSON))
export const ClientLLMRequestSchema = LLMBaseEnvelope.extend({
  message: z.enum(["streamCompletions", "interruptGeneration"]),
  data: z.object({
    messages: z.array(z.any()).describe("上下文消息链"),
    options: z.any().optional(),
    metaData: MetaDataSchema,
  }).optional(),
});


// ======================= 5. 系统级控制与通知事件 =======================

export const SystemMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("plugins_updated"),
    data: z.any(),
  }),
  z.object({
    type: z.literal("models_updated"),
    data: z.object({
      providers: z.array(z.any()),
      models: z.array(z.any()),
      default_model: z.string().optional(),
    }),
  }),
]);
