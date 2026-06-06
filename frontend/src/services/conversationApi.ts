import { api } from './api'
import type { Conversation, ConversationListResponse, Message, SendMessageResponse } from '@/types/conversation'

export const conversationApi = {
  /** 创建对话 */
  create: async (title?: string, knowledgeConfigId?: string, projectWorkspaceId?: string): Promise<Conversation> => {
    return api.post('conversations', {
      json: { 
        title: title || '新对话', 
        knowledge_config_id: knowledgeConfigId,
        project_workspace_id: projectWorkspaceId,
      },
    }).json()
  },

  /** 获取对话列表 */
  list: async (params?: { page?: number; page_size?: number; search?: string }): Promise<ConversationListResponse> => {
    return api.get('conversations', { searchParams: params }).json()
  },

  /** 获取对话详情 */
  get: async (id: string): Promise<Conversation> => {
    return api.get(`conversations/${id}`).json()
  },

  /** 更新对话 */
  update: async (id: string, data: { title?: string }): Promise<Conversation> => {
    return api.put(`conversations/${id}`, { json: data }).json()
  },

  /** 删除对话 */
  delete: async (id: string): Promise<void> => {
    await api.delete(`conversations/${id}`)
  },

  /** 获取消息列表 */
  getMessages: async (conversationId: string): Promise<Message[]> => {
    return api.get(`conversations/${conversationId}/messages`).json()
  },

  /** 发送消息 */
  sendMessage: async (conversationId: string, data: { content: string; knowledge_config_id?: string }): Promise<SendMessageResponse> => {
    return api.post(`conversations/${conversationId}/messages`, { json: data }).json()
  },

  /** 获取 SSE 流 */
  getStreamUrl: (conversationId: string, content: string, knowledgeConfigId?: string): string => {
    const params = new URLSearchParams({ content })
    if (knowledgeConfigId) params.set('knowledge_config_id', knowledgeConfigId)
    return `/api/v1/conversations/${conversationId}/stream?${params}`
  },
}
