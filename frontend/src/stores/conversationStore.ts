import { create } from 'zustand'
import type { Conversation, Message } from '@/types/conversation'
import { conversationApi } from '@/services/conversationApi'
import { useProjectWorkspaceStore } from './projectWorkspaceStore'

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
      set({ messages, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  sendMessage: async (content: string, knowledgeConfigId?: string) => {
    const { currentConversationId } = get()
    if (!currentConversationId) return

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

        let fullContent = ''          // 完整内容（含标签）
        let thinkingContent = ''       // 思考内容（不含标签）
        let mainContent = ''          // 正文内容
        let hasThinkingEnded = false  // 是否已检测到 <//think> 标签
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

        const scheduleRender = () => {
          if (pendingRenderTimer) return  // 已有待执行的渲染，跳过
          const now = Date.now()
          const elapsed = now - lastRenderTime
          const delay = Math.max(0, RENDER_INTERVAL_MS - elapsed)
          pendingRenderTimer = setTimeout(() => {
            pendingRenderTimer = null
            lastRenderTime = Date.now()
            set((state) => ({
              streamPhase: 'generating',
              messages: state.messages.map((m) =>
                m.id === aiMsgId
                  ? { ...m, content: mainContent, thinking_content: thinkingContent || null }
                  : m
              ),
            }))
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

            // 解析 think 标签：<think>思考内容</think>
            if (!hasThinkingEnded) {
              // 尚未检测到 <//think>，检查当前 fullContent 是否包含
              const thinkEndMatch = fullContent.match(/<\/think>/i)
              if (thinkEndMatch) {
                // 检测到 <//think/>，截取思考内容和正文
                const endPos = thinkEndMatch.index!
                let lockedThinking = fullContent.substring(0, endPos).trim()
                // 去掉开头的 <think> 或 <think/> 标签
                lockedThinking = lockedThinking.replace(/^<think\s*\/?>\s*/i, '').trim()
                thinkingContent = lockedThinking

                // <//think/> 之后的内容作为正文
                const remainingContent = fullContent.substring(endPos + thinkEndMatch[0].length).trim()
                mainContent = remainingContent

                hasThinkingEnded = true

                // 立即更新消息（思考内容 + 正文开头）
                lastRenderTime = Date.now()
                set((state) => ({
                  streamPhase: 'generating',
                  messages: state.messages.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, content: remainingContent, thinking_content: lockedThinking || null }
                      : m
                  ),
                }))
              } else {
                // 还在思考阶段，检查是否有 <think> 开头
                if (fullContent.includes('<think>') || fullContent.match(/<think\s*\/?>/i)) {
                  // 有思考标签，提取思考内容（不含标签）
                  let displayThinking = fullContent.replace(/^<think\s*\/?>\s*/i, '').trim()
                  // 实时更新思考内容（还在收集中，不含正文）
                  set((state) => ({
                    messages: state.messages.map((m) =>
                      m.id === aiMsgId
                        ? { ...m, content: '', thinking_content: displayThinking }
                        : m
                    ),
                  }))
                } else {
                  // 没有思考标签，直接作为正文
                  hasThinkingEnded = true
                  mainContent = fullContent
                  set((state) => ({
                    streamPhase: 'generating',
                    messages: state.messages.map((m) =>
                      m.id === aiMsgId
                        ? { ...m, content: fullContent, thinking_content: null }
                        : m
                    ),
                  }))
                }
              }
            } else {
              // 思考已结束，正文流式输出
              mainContent = fullContent.replace(/<\/think>.*$/is, '').trim()
              // 去掉思考部分，只保留正文
              const thinkEndMatch = fullContent.match(/<\/think>/i)
              if (thinkEndMatch) {
                mainContent = fullContent.substring(thinkEndMatch.index! + thinkEndMatch[0].length).trim()
              }
              scheduleRender()
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

            if (mainContent.length > 0) {
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
            if (mainContent.length > 0) {
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
            console.log('[SSE] done:', data, '| aiMessageId:', aiMessageId, '| documentId:', documentId, '| docxUrl:', docxUrl)

            // 最终处理：确保正文内容正确（去掉思考标签部分）
            let finalContent = mainContent
            const thinkEndMatch = fullContent.match(/<\/think>/i)
            if (thinkEndMatch) {
              finalContent = fullContent.substring(thinkEndMatch.index! + thinkEndMatch[0].length).trim()
            }

            if (aiMessageId) {
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === aiMsgId
                    ? { ...m, id: aiMessageId, content: finalContent, document_id: documentId, docx_url: docxUrl, thinking_content: thinkingContent || null }
                    : m
                ),
              }))
            } else if (docxUrl) {
              // 没有 aiMessageId 时也要把 docx_url 和 document_id 挂到占位消息上
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === aiMsgId
                    ? { ...m, document_id: documentId, docx_url: docxUrl, thinking_content: thinkingContent || null }
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
                  ? { ...m, content: mainContent || '⚠️ 连接中断，请重试' }
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
