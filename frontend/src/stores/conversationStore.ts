import { create } from 'zustand'
import type { Conversation, Message } from '@/types/conversation'
import { conversationApi } from '@/services/conversationApi'
import { useProjectWorkspaceStore } from './projectWorkspaceStore'
import { useCitationStore } from './citationStore'

// 解析多个 <think>...</think> 块，每个块对应一个消息卡片
function parseMessageBlocks(raw: string): Array<{ thinking: string; content: string }> {
  const blocks: Array<{ thinking: string; content: string }> = []
  let remaining = raw
  while (remaining.length > 0) {
    const thinkStart = remaining.match(/<think\s*\/?>/i)
    if (!thinkStart) {
      if (remaining.trim() && blocks.length > 0) {
        const prev = blocks[blocks.length - 1]
        prev.content += (prev.content ? '\n' : '') + remaining.trim()
      }
      break
    }
    const beforeThink = remaining.substring(0, thinkStart.index!).trim()
    if (beforeThink && blocks.length > 0) {
      const prev = blocks[blocks.length - 1]
      prev.content += (prev.content ? '\n' : '') + beforeThink
    }
    const afterTag = remaining.substring(thinkStart.index! + thinkStart[0].length)
    const thinkEnd = afterTag.match(/<\/think>/i)
    if (thinkEnd) {
      const thinking = afterTag.substring(0, thinkEnd.index!).trim()
      const afterClose = afterTag.substring(thinkEnd.index! + thinkEnd[0].length)
      blocks.push({ thinking, content: '' })
      remaining = afterClose
    } else {
      blocks.push({ thinking: afterTag.trim(), content: '' })
      remaining = ''
    }
  }
  return blocks
}
/** 流式输出的阶段 */
export type StreamPhase = 'idle' | 'connecting' | 'thinking' | 'generating' | 'done'

interface ConversationState {
  conversations: Conversation[]
  currentConversationId: string | null
  messages: Message[]
  isLoading: boolean
  isLoadingMore: boolean    // 滚动加载中
  isStreaming: boolean
  streamPhase: StreamPhase  // 新增：流式阶段
  error: string | null
  hasMore: boolean          // 是否有更多可加载
  currentPage: number       // 当前页码（用于追加加载）
  total: number             // 会话总数

  // Actions
  fetchConversations: () => Promise<void>        // 首次加载（重置）
  loadMoreConversations: () => Promise<void>      // 滚动加载更多（追加）
  searchConversations: (query: string) => Promise<void>  // 搜索（后端全量）
  createConversation: (title?: string, knowledgeConfigId?: string, projectWorkspaceId?: string) => Promise<Conversation>
  setCurrentConversation: (id: string | null) => void
  fetchMessages: (conversationId: string) => Promise<void>
  sendMessage: (content: string, knowledgeConfigId?: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  updateConversationTitle: (id: string, title: string) => Promise<void>
  clearError: () => void
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoading: false,
  isLoadingMore: false,
  isStreaming: false,
  streamPhase: 'idle',
  error: null,
  hasMore: true,
  currentPage: 1,
  total: 0,

  // 首次加载（重置列表）
  fetchConversations: async () => {
    const currentProjectWorkspaceId = useProjectWorkspaceStore.getState().currentProjectWorkspaceId
    set({ isLoading: true, error: null, currentPage: 1, hasMore: true, total: 0 })
    try {
      const response = await conversationApi.list({ page: 1, page_size: 20, project_workspace_id: currentProjectWorkspaceId ?? undefined })
      set({
        conversations: response.items,
        total: response.total,
        isLoading: false,
        hasMore: response.items.length < response.total,
        currentPage: 1,
      })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  // 滚动加载更多（追加）
  loadMoreConversations: async () => {
    const { isLoadingMore, hasMore, currentPage, conversations } = get()
    if (isLoadingMore || !hasMore) return

    const currentProjectWorkspaceId = useProjectWorkspaceStore.getState().currentProjectWorkspaceId
    set({ isLoadingMore: true, error: null })
    try {
      const nextPage = currentPage + 1
      const response = await conversationApi.list({ page: nextPage, page_size: 10, project_workspace_id: currentProjectWorkspaceId ?? undefined })
      set({
        conversations: [...conversations, ...response.items],
        isLoadingMore: false,
        hasMore: conversations.length + response.items.length < response.total,
        currentPage: nextPage,
      })
    } catch (error) {
      set({ error: (error as Error).message, isLoadingMore: false })
    }
  },

  // 搜索（后端全量搜索，不走分页追加）
  searchConversations: async (query: string) => {
    if (!query.trim()) {
      // 搜索词清空时恢复分页加载
      get().fetchConversations()
      return
    }
    set({ isLoading: true, error: null, currentPage: 1, hasMore: false })
    try {
      // 搜索范围为当前项目空间内的会话
      const currentProjectWorkspaceId = useProjectWorkspaceStore.getState().currentProjectWorkspaceId
      const response = await conversationApi.list({ page: 1, page_size: 100, search: query, project_workspace_id: currentProjectWorkspaceId ?? undefined })
      set({ conversations: response.items, isLoading: false, hasMore: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  createConversation: async (title?: string, knowledgeConfigId?: string, projectWorkspaceId?: string) => {
    set({ isLoading: true, error: null })
    try {
      const conversation = await conversationApi.create(title, knowledgeConfigId, projectWorkspaceId)
      set((state) => ({
        // 新建对话插入到列表最前面
        conversations: [conversation, ...state.conversations],
        currentConversationId: conversation.id,
        messages: [],
        isLoading: false,
        // 如果有新对话，说明还有更多，重新标记 hasMore
        hasMore: state.hasMore || state.conversations.length >= state.currentPage * 10,
      }))
      return conversation
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      throw error
    }
  },

  setCurrentConversation: (id: string | null) => {
    set({ currentConversationId: id, messages: [], streamPhase: 'idle' })
    if (id) {
      get().fetchMessages(id)
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ isLoading: true, error: null })
    try {
      const messages = await conversationApi.getMessages(conversationId)
      // 处理多块消息：查看是否有消息包含多个 <think> 标签
      const processed = messages.flatMap(msg => {
        if (msg.role === 'assistant') {
          const hasThink = msg.thinking_content || (msg.content && msg.content.includes('<think>'))
          if (hasThink) {
            const fullContent = msg.thinking_content
              ? '<think>' + msg.thinking_content + '</think>\n' + msg.content
              : msg.content
            const blocks = parseMessageBlocks(fullContent)
            if (blocks.length > 1) {
              return blocks.map((block, idx) => ({
                ...msg,
                id: idx === 0 ? msg.id : msg.id + '-block-' + idx,
                content: block.content,
                thinking_content: block.thinking || null,
              }))
            }
          }
        }
        return [msg]
      })
      set({ messages: processed, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  sendMessage: async (content: string, knowledgeConfigId?: string) => {
    const { currentConversationId } = get()
    if (!currentConversationId) return

    // 清除上次回答的引用来源，等待本次回答的新来源
    useCitationStore.getState().setCitations([])

    set({ isStreaming: true, streamPhase: 'connecting', error: null })

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
    const startTime = Date.now()
    const aiMsgId = `temp-ai-0-${startTime}`
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
      // ── 通过 SSE 流式调用 Dify Agent ──
      const streamUrl = conversationApi.getStreamUrl(
        currentConversationId,
        content,
        knowledgeConfigId,
      )

      // 连接建立后切换到 thinking 阶段
      set({ streamPhase: 'thinking' })

      await new Promise<void>((resolve, reject) => {
        const eventSource = new EventSource(streamUrl)

        let fullContent = ''
        // 解析 fullContent 中的多个 <think>...</think> 块，每个块对应一个消息卡片
        const parseContentBlocks = (raw: string): Array<{ thinking: string; content: string }> => {
          const blocks: Array<{ thinking: string; content: string }> = []
          let remaining = raw
          while (remaining.length > 0) {
            const thinkStart = remaining.match(/<think\s*\/?>/i)
            if (!thinkStart) {
              if (remaining.trim() && blocks.length > 0) {
                const prev = blocks[blocks.length - 1]
                prev.content += (prev.content ? '\n' : '') + remaining.trim()
              }
              break
            }
            const beforeThink = remaining.substring(0, thinkStart.index!).trim()
            if (beforeThink && blocks.length > 0) {
              const prev = blocks[blocks.length - 1]
              prev.content += (prev.content ? '\n' : '') + beforeThink
            }
            const afterTag = remaining.substring(thinkStart.index! + thinkStart[0].length)
            const thinkEnd = afterTag.match(/<\/think>/i)
            if (thinkEnd) {
              const thinking = afterTag.substring(0, thinkEnd.index!).trim()
              const afterClose = afterTag.substring(thinkEnd.index! + thinkEnd[0].length)
              blocks.push({ thinking, content: '' })
              remaining = afterClose  // 继续解析剩余内容，可能还有更多思考块
            } else {
              blocks.push({ thinking: afterTag.trim(), content: '' })
              remaining = ''
            }
          }
          return blocks
        }
        let isDone = false            // 标记是否已收到 done 事件

        // ── message_start：连接确认 ──
        eventSource.addEventListener('message_start', (event: any) => {
          if (isDone) return
          try {
            const data = JSON.parse(event.data)
            const userMessageId = data.user_message_id
            if (userMessageId) {
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === userMsg.id ? { ...m, id: userMessageId } : m
                ),
              }))
            }
          } catch (e) {
            console.error('解析 message_start 失败:', e)
          }
        })

        // ── heartbeat：心跳保活，清除恢复定时器 ──
        eventSource.addEventListener('heartbeat', () => {
          if (errorRecoveryTimer) {
            clearTimeout(errorRecoveryTimer)
            errorRecoveryTimer = null
            console.log('[SSE] 心跳到达，连接已恢复')
          }
        })

        // ── content_delta：解析 think 标签，分离思考和正文 ──
        // 节流：避免每个 delta 都触发 React 重渲染
        let lastRenderTime = 0
        let pendingRenderTimer: ReturnType<typeof setTimeout> | null = null
        let errorRecoveryTimer: ReturnType<typeof setTimeout> | null = null
        const RENDER_INTERVAL_MS = 50  // 每 50ms 最多渲染一次（~20fps）

        const renderBlocks = () => {
          const blocks = parseContentBlocks(fullContent)
          // 保留当前 temp-ai 消息上已有的 document_id 和 docx_url
          const existingMsgs = get().messages
          const existingTempMsg = existingMsgs.find(m => m.id.startsWith('temp-ai-'))
          const existingDocId = existingTempMsg?.document_id ?? null
          const existingDocxUrl = existingTempMsg?.docx_url ?? null
          const blockMessages = blocks.map((block, idx) => ({
            id: `temp-ai-${idx}-${startTime}`,
            conversation_id: currentConversationId,
            role: 'assistant' as const,
            content: block.content,
            thinking_content: block.thinking || null,
            document_id: existingDocId,
            docx_url: existingDocxUrl,
            created_at: new Date().toISOString(),
          }))
          const msgs = get().messages
          const firstTempIdx = msgs.findIndex(m => m.id.startsWith('temp-ai-'))
          if (firstTempIdx >= 0) {
            set({
              streamPhase: 'generating',
              messages: [...msgs.slice(0, firstTempIdx), ...blockMessages],
            })
          } else {
            set((state) => ({
              streamPhase: 'generating',
              messages: [...state.messages, ...blockMessages],
            }))
          }
        }

        const scheduleRender = () => {
          if (pendingRenderTimer) return
          const now = Date.now()
          const elapsed = now - lastRenderTime
          const delay = Math.max(0, RENDER_INTERVAL_MS - elapsed)
          pendingRenderTimer = setTimeout(() => {
            pendingRenderTimer = null
            lastRenderTime = Date.now()
            renderBlocks()
          }, delay)
        }

        eventSource.addEventListener('content_delta', (event: any) => {
          if (isDone) return
          // 有数据到达，清除恢复定时器
          if (errorRecoveryTimer) {
            clearTimeout(errorRecoveryTimer)
            errorRecoveryTimer = null
            console.log('[SSE] 连接已恢复，继续接收')
          }
          try {
            const data = JSON.parse(event.data)
            const delta = data.delta || ''
            fullContent += delta
            // 当前正在收集思考内容且尚未结束：实时更新
            const blocks = parseContentBlocks(fullContent)
            if (blocks.length === 0) {
              // 还没有思考块，直接作为正文
              set((state) => ({
                streamPhase: 'generating',
                messages: state.messages.map((m) =>
                  m.id.startsWith('temp-ai-')
                    ? { ...m, content: fullContent, thinking_content: null }
                    : m
                ),
              }))
            } else if (blocks.length === 1 && blocks[0].thinking && !blocks[0].content) {
              // 只有思考内容，正在收集思考中
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id.startsWith('temp-ai-')
                    ? { ...m, content: '', thinking_content: blocks[0].thinking }
                    : m
                ),
              }))
            } else {
              // 已有完整的思考块，使用 renderBlocks 统一更新
              renderBlocks()
            }
          } catch (e) {
            console.error('解析 content_delta 失败:', e)
          }
        })

        eventSource.addEventListener('error', (event: any) => {
          if (isDone) {
            console.log('[SSE] error 事件在 done 之后，忽略')
            return
          }
          try {
            const data = JSON.parse(event.data)
            const errorMsg = data.message || '流式生成出错'
            console.log('[SSE] error event:', errorMsg)

            if (fullContent.length > 0) {
              console.log('[SSE] 已有内容，忽略 error 事件')
              return
            }

            set((state) => ({
              messages: state.messages.map((m) =>
                m.id === aiMsgId
                  ? { ...m, content: `⚠️ ${errorMsg}` }
                  : m
              ),
              isStreaming: false,
              streamPhase: 'done',
              error: errorMsg,
            }))
          } catch {
            if (fullContent.length > 0) {
              console.log('[SSE] error 事件解析失败，但已有内容，忽略')
              return
            }
            set({ isStreaming: false, streamPhase: 'done', error: '网络错误或服务不可用' })
          }
          eventSource.close()
          reject(new Error('Stream error'))
        })

        // ── done：完成 ──
        eventSource.addEventListener('done', (event: any) => {
          if (isDone) return
          isDone = true

          // 清除节流定时器和恢复定时器
          if (pendingRenderTimer) {
            clearTimeout(pendingRenderTimer)
            pendingRenderTimer = null
          }
          if (errorRecoveryTimer) {
            clearTimeout(errorRecoveryTimer)
            errorRecoveryTimer = null
          }

          try {
            const data = JSON.parse(event.data)
            const aiMessageId = data.ai_message_id
            const documentId = data.document_id || null
            const docxUrl = data.docx_url || null
            // 处理引用来源
            const citations = data.citations || []
            if (citations.length > 0) {
              useCitationStore.getState().setCitations(citations)
            }
            console.log('[SSE] done:', data, '| aiMessageId:', aiMessageId, '| documentId:', documentId, '| docxUrl:', docxUrl)

            // 最终处理：确保正文内容正确（去掉思考标签部分）
            const blocks = parseContentBlocks(fullContent)
            let finalContent = blocks.length > 0 ? blocks[blocks.length - 1].content : fullContent
            const thinkEndMatch = fullContent.match(/<\/think>/i)
            if (thinkEndMatch) {
              finalContent = fullContent.substring(thinkEndMatch.index! + thinkEndMatch[0].length).trim()
            }

            // 所有块共享同一个 document_id 和 docx_url
            if (aiMessageId) {
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id.startsWith('temp-ai-')
                    ? { ...m, document_id: documentId, docx_url: docxUrl }
                    : m
                ),
              }))
              // 将最后一个 temp-ai-消息的 ID 替换为后端返回的 aiMessageId
              const msgs = get().messages
              const lastTempIdx = msgs.map((m, i) => m.id.startsWith('temp-ai-') ? i : -1).filter(i => i >= 0).slice(-1)[0]
              if (lastTempIdx !== undefined) {
                const lastMsg = msgs[lastTempIdx]
                if (lastMsg) {
                  msgs[lastTempIdx] = { ...lastMsg, id: aiMessageId, content: finalContent }
                  set({ messages: [...msgs] })
                }
              }
            } else if (docxUrl) {
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id.startsWith('temp-ai-')
                    ? { ...m, document_id: documentId, docx_url: docxUrl }
                    : m
                ),
              }))
            }
          } catch (e) {
            console.error('解析 done 失败:', e)
          }

          eventSource.close()
          set({ isStreaming: false, streamPhase: 'done' })
          get().fetchConversations()
          resolve()
        })

        // 超时处理（600秒内未收到数据则认为超时）
        setTimeout(() => {
          if (get().isStreaming) {
            console.warn('SSE 超时（600秒）——内容可能不完整')
            const currentContent = get().messages.find(m => m.id === aiMsgId)?.content
            if (currentContent && currentContent.length > 0) {
              // 已有内容，保留已有内容但标记为完成
              set({ isStreaming: false, streamPhase: 'done' })
              resolve()
            } else {
              eventSource.close()
              set({ isStreaming: false, streamPhase: 'done' })
              resolve()
            }
          }
        }, 600000)

        // 连接错误处理
        eventSource.onerror = () => {
          if (isDone) {
            console.log('[SSE] onerror 在 done 之后，忽略')
            return
          }
          if (get().isStreaming) {
            // 清除节流定时器
            if (pendingRenderTimer) {
              clearTimeout(pendingRenderTimer)
              pendingRenderTimer = null
            }
            set((state) => ({
              messages: state.messages.map((m) =>
                m.id === aiMsgId
                  ? { ...m, content: fullContent || '⚠️ 连接中断，请重试' }
                  : m
              ),
              isStreaming: false,
              streamPhase: 'done',
              error: '连接中断，请检查网络或 Dify 服务状态',
            }))
            eventSource.close()
            reject(new Error('EventSource connection failed'))
          }
        }
      })
    } catch (error) {
      set({ error: (error as Error).message, isStreaming: false, streamPhase: 'done' })
    }
  },

  deleteConversation: async (id: string) => {
    try {
      await conversationApi.delete(id)
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
        messages: state.currentConversationId === id ? [] : state.messages,
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateConversationTitle: async (id: string, title: string) => {
    try {
      const updated = await conversationApi.update(id, { title })
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === id ? { ...c, title: updated.title } : c)),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  clearError: () => set({ error: null }),
}))
