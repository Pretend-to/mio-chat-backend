# 设计文档：面向 Content Cache 的消息自动压缩机制 (记忆结晶)

## 1. 背景与目标
随着对话长度增加，LLM 的 Context 消耗会显著提升成本并增加延迟。现代 LLM API（如 DeepSeek, Gemini）提供了 **Content Caching (上下文缓存)** 功能，通过缓存输入前缀来降低成本和延迟。

传统的“滑动窗口”或“全量重写摘要”机制会不断改变 Prompt 的前缀，导致缓存失效。本设计旨在通过 **“记忆结晶 (Memory Crystallization)”** 机制，实现既能压缩长上下文，又能最大限度利好缓存的方案。

---

## 2. 核心机制：分段阶梯式压缩 (Segmented Compression)

### 2.1 传统模式 vs. 结晶模式
*   **传统滑动窗口**：丢弃最早的一条，加入最新的一条。
    *   *后果*：每一轮请求的前缀都会发生位偏移，缓存命中率为 0%。
*   **记忆结晶模式**：当消息达到固定阈值（如 50 条）时，将这一块消息“冻结”并压缩为一个固定的摘要块（Archive Block）。
    *   *优势*：一旦 Block 生成，其内容和在 Prompt 中的位置永远固定。后续请求将一直命中这些 Block 的缓存。

### 2.2 Prompt 结构设计
Prompt 将采用阶梯式结构，确保前缀稳定性：
```text
[System Prompt]                   <-- 绝对固定 (Cache Hit 100%)
[Archive Block 1 (Messages 1-50)] <-- 永久固定 (Cache Hit 100%)
[Archive Block 2 (Messages 51-100)]<-- 永久固定 (Cache Hit 100%)
[Recent Messages (101-105...)]     <-- 动态增长 (仅此处产生少量 Cache Miss)
```

---

## 3. 交互流程 (UX Design)

为了平衡压缩过程的高延迟，采用 **“异步预处理 + 仪式感感知”** 的 UX。

### 3.1 触发时机
*   **非阻塞触发**：在 AI 回复完成且进入空闲期（用户停止输入 3 秒后）进行。
*   **阈值检查**：对话条数达到 N 或 Token 数达到预设水位线。

### 3.2 用户感知 (仪式感)
1.  **状态提示**：前端收到 `context_archiving_started` 信号，在聊天流中显示微小的系统提示：*“正在整理过往记忆...”*。
2.  **视觉动效**：被选中的 50 条消息执行“向中心坍缩”的动画。
3.  **记忆卡片**：坍缩后生成一个精致的组件 **“记忆结晶 (Memory Fragment)”**。
    *   用户点击可查看该段摘要。
    *   提供“回溯原文”功能，临时展开原始消息。

---

## 4. 技术实现要点

### 4.1 后端逻辑 (LLMMessageEvent / TaskRunner)
*   **背景任务**：启动独立的 LLM 实例（system_llm_channel）执行摘要生成。
*   **增量更新**：摘要生成后，存入数据库或通知前端更新持久化存储。
*   **协议扩展**：
    *   `context_archiving_started`: 通知前端开始 UI 表现。
    *   `context_archiving_completed`: 发送摘要内容和受影响的消息 ID 范围。

### 4.2 前端逻辑 (Contactor / ChatView)
*   **虚拟消息类型**：引入 `type: "memory_fragment"` 的消息节点。
*   **消息链维护**：收到结晶指令后，将 `messageChain` 中对应的原始消息标记为 `hidden`，并插入 Fragment 节点。
*   **缓存友好型消息构造**：在 `_getValidOpenaiMessage` 中，优先拼接已生成的 Fragments，再拼接剩余的原始消息。

---

## 5. 性能与成本预期
*   **Cache 命中率**：长对话场景下，前缀缓存命中率预期提升至 **80% - 95%**。
*   **Token 节省**：大幅减少冗余的历史消息传输，同时避免了频繁重写全量摘要导致的 Token 浪费。
*   **响应速度**：首字响应时间 (TTFT) 在缓存命中后将缩短 50% 以上。

---
*Status: Draft / Design*
*Created: 2026-05-06*
