import { create } from 'zustand'
import type { Conversation, Message } from '@/types/conversation'
import { conversationApi } from '@/services/conversationApi'

interface ConversationState {
  conversations: Conversation[]
  currentConversationId: string | null
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null

  // Actions
  fetchConversations: () => Promise<void>
  createConversation: (title?: string, knowledgeConfigId?: string) => Promise<Conversation>
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
  isStreaming: false,
  error: null,

  fetchConversations: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await conversationApi.list({ page_size: 100 })
      set({ conversations: response.items, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  createConversation: async (title?: string, knowledgeConfigId?: string) => {
    set({ isLoading: true, error: null })
    try {
      const conversation = await conversationApi.create(title, knowledgeConfigId)
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversationId: conversation.id,
        messages: [],
        isLoading: false,
      }))
      return conversation
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      throw error
    }
  },

  setCurrentConversation: (id: string | null) => {
    set({ currentConversationId: id, messages: [] })
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

    set({ isStreaming: true, error: null })

    try {
      const response = await conversationApi.sendMessage(currentConversationId, {
        content,
        knowledge_config_id: knowledgeConfigId,
      })

      // 添加用户消息和 AI 回复
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: `temp-${Date.now()}`,
            conversation_id: currentConversationId,
            role: 'user' as const,
            content,
            document_id: null,
            created_at: new Date().toISOString(),
          },
          {
            id: response.message_id,
            conversation_id: currentConversationId,
            role: 'assistant' as const,
            content: response.content,
            document_id: response.document?.id || null,
            created_at: new Date().toISOString(),
            document: response.document,
          },
        ],
        isStreaming: false,
      }))

      // 刷新对话列表，获取后端可能自动生成的标题
      await get().fetchConversations()
    } catch (error) {
      set({ error: (error as Error).message, isStreaming: false })
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
