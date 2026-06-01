# SSE 流式输出问题诊断指南

## 问题现象
用户发送消息后，需要等待很久才能看到 AI 回复（一次性显示完整内容，而不是流式输出）。

## 诊断步骤

### 1. 检查前端是否调用了流式接口

打开浏览器开发者工具（F12），查看 Network 面板：

1. 发送一条消息
2. 查看是否有 `/conversations/{id}/stream` 请求
3. 如果没有，说明前端调用了非流式接口 `POST /conversations/{id}/messages`

**解决方法**：
检查 `conversationStore.ts` 的 `sendMessage` 方法，确保调用的是 `conversationApi.getStreamUrl()` 而不是 `conversationApi.sendMessage()`。

---

### 2. 检查 SSE 流是否正常

在 Network 面板中找到 `/stream` 请求，查看 Response 选项卡：

**正常情况**：
```
event: message_start
data: {"conversation_id": "...", "user_message_id": "..."}

event: content_delta
data: {"delta": "首"}

event: content_delta
data: {"delta": "都"}

event: content_delta
data: {"delta": "需要"}
...
```

**异常情况**：
- 一直显示 "Pending" 或 "Downloading"
- 所有内容一次性返回（没有逐行显示）

---

### 3. 测试后端 SSE 接口（使用 curl）

```bash
# 测试 SSE 流式接口
curl -N -X GET "http://localhost:8000/api/v1/conversations/{conversation_id}/stream?content=你好" \
  -H "Accept:text/event-stream" \
  --max-time 30
```

**参数说明**：
- `-N`: 禁用缓冲（重要！）
- `--max-time 30`: 最多等待 30 秒

**预期结果**：应该逐行看到 `event: content_delta` 事件。

---

### 4. 检查 Dify 服务端是否真正流式

登录 Dify 控制台，查看应用日志：

1. 进入你的 Dify 应用
2. 查看 "日志" 或 "监控" 页面
3. 检查 "响应模式" 是否为 `streaming`
4. 查看每次生成是否有多个事件（而不是一次返回）

**如果 Dify 不是真正流式**：
- 在 Dify 应用设置中，确保 "响应模式" 设置为 "流式"
- 检查 Dify 应用类型（Agent 或 Chatbot）是否支持流式

---

### 5. 检查代理服务器缓冲

如果你使用了 Nginx、Caddy 或其他反向代理，可能需要禁用缓冲：

**Nginx**:
```nginx
location /api/v1/conversations/ {
    proxy_buffering off;  # 关键！
    proxy_cache off;
    chunked_transfer_encoding on;
}
```

**Node.js (vite proxy)**:
Vite 开发服务器的代理默认不缓冲，但生产环境可能需要配置。

---

## 快速修复方案

### 方案 A: 强制前端使用流式接口

修改 `conversationStore.ts`，注释掉非流式调用：

```typescript
sendMessage: async (content: string, knowledgeConfigId?: string) => {
  const { currentConversationId } = get()
  if (!currentConversationId) return

  set({ isStreaming: true, error: null })

  // 先添加用户消息到 UI
  const userMsg: Message = {
    id: `temp-user-${Date.now()}`,
    conversation_id: currentConversationId,
    role: 'user' as const,
    content,
    document_id: null,
    created_at: new Date().toISOString(),
  }

  // 创建占位 AI 消息（流式填充内容）
  const aiMsgId = `temp-ai-${Date.now()}`
  const placeholderAiMsg: Message = {
    id: aiMsgId,
    conversation_id: currentConversationId,
    role: 'assistant' as const,
    content: '',
    document_id: null,
    created_at: new Date().toISOString(),
  }

  set((state) => ({
    messages: [...state.messages, userMsg, placeholderAiMsg],
  }))

  try {
    // ✅ 强制使用 SSE 流式调用
    const streamUrl = conversationApi.getStreamUrl(
      currentConversationId,
      content,
      knowledgeConfigId,
    )

    await new Promise<void>((resolve, reject) => {
      const eventSource = new EventSource(streamUrl)
      // ... (保持现有代码)
    })
  } catch (error) {
    set({ error: (error as Error).message, isStreaming: false })
  }
},
```

---

### 方案 B: 添加 SSE 调试日志

在 `conversationStore.ts` 中添加详细日志：

```typescript
eventSource.addEventListener('content_delta', (event: any) => {
  try {
    const data = JSON.parse(event.data)
    const delta = data.delta || ''
    fullContent += delta
    
    // ✅ 添加日志
    console.log('[SSE] delta:', JSON.stringify(delta), '| full length:', fullContent.length)
    
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === aiMsgId ? { ...m, content: fullContent } : m
      ),
    }))
  } catch (e) {
    console.error('[SSE] 解析失败:', e)
  }
})
```

在浏览器控制台查看：
- 如果看到逐条 `delta` 日志 → 前端正常，问题在 Dify 服务端
- 如果一直没日志，然后一次性收到所有内容 → SSE 被缓冲了

---

### 方案 C: 使用 WebSocket 替代 SSE（终极方案）

如果 SSE 一直有缓冲问题，可以改用 WebSocket：

**后端** (`backend/app/api/conversations.py`):
```python
from fastapi import WebSocket

@router.websocket("/conversations/{conversation_id}/ws")
async def websocket_stream(websocket: WebSocket, conversation_id: uuid.UUID):
    await websocket.accept()
    
    # 接收用户消息
    data = await websocket.receive_json()
    content = data['content']
    
    # 调用 Dify 流式 API
    async for event_type, delta, extra in dify.chat_messages_stream(...):
        await websocket.send_json({
            'event': event_type,
            'delta': delta,
            'extra': extra,
        })
```

**前端**:
```typescript
const ws = new WebSocket(`ws://localhost:8000/api/v1/conversations/${id}/ws`)
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.event === 'content_delta') {
    // 更新 UI
  }
}
```

---

## 验证修复

1. 打开浏览器开发者工具（F12）
2. 切换到 Network 面板
3. 发送一条消息
4. 点击 `/stream` 请求，查看 Response 选项卡
5. 应该看到逐行输出的 `content_delta` 事件
6. UI 上应该看到文字一个字一个字地蹦出来（而不是一次性显示）

---

## 常见陷阱

### ❌ 陷阱 1: EventSource 自动重连

`EventSource` 在连接关闭后会自动重试，可能导致重复生成。你的代码已经有 `isDone` 标志来防止这个问题，做得很好！

### ❌ 陷阱 2: Dify 的 `response_mode` 参数

确保在调用 Dify API 时，`response_mode` 设置为 `"streaming"`（字符串），而不是 `True` 或 `1`。

### ❌ 陷阱 3: 数据库事务未提交

你的代码中，`ai_message` 是在流式结束后才保存到数据库的。如果在这之前前端断开连接，消息会丢失。

**改进方案**：
- 先创建一个空的 `ai_message` 记录
- 流式过程中只更新内存中的 `content`
- 流式结束后再更新数据库中的 `content`

---

## 总结

| 问题位置 | 检查方法 | 解决方案 |
|---------|---------|---------|
| 前端调用了非流式接口 | 查看 Network 面板 | 修改 `conversationStore.ts` |
| SSE 被缓冲 | `curl -N` 测试 | 禁用代理缓冲 |
| Dify 不是真正流式 | 查看 Dify 日志 | 修改 Dify 应用配置 |
| 后端没有正确 yield | 查看后端日志 | 调试 `chat_messages_stream()` |

建议按顺序排查，大部分情况下是**前端调用了非流式接口**或 **SSE 被缓冲**导致的问题。
