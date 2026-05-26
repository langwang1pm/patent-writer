import { api } from './api'
import type { KnowledgeConfig, KnowledgeConfigListResponse, KnowledgeConfigTestResponse } from '@/types/knowledge'

export const knowledgeApi = {
  /** 获取知识库配置列表 */
  list: async (): Promise<KnowledgeConfigListResponse> => {
    return api.get('knowledge/configs').json()
  },

  /** 创建知识库配置 */
  create: async (data: {
    name: string
    dify_base_url: string
    dify_api_key: string
    knowledge_id: string
    is_default?: boolean
    top_k?: number
    score_threshold?: number
    rerank_enabled?: boolean
  }): Promise<KnowledgeConfig> => {
    return api.post('knowledge/configs', { json: data }).json()
  },

  /** 更新知识库配置 */
  update: async (id: string, data: Partial<{
    name: string
    dify_base_url: string
    dify_api_key: string
    knowledge_id: string
    is_default: boolean
    top_k: number
    score_threshold: number
    rerank_enabled: boolean
    status: string
  }>): Promise<KnowledgeConfig> => {
    return api.put(`knowledge/configs/${id}`, { json: data }).json()
  },

  /** 删除知识库配置 */
  delete: async (id: string): Promise<void> => {
    await api.delete(`knowledge/configs/${id}`)
  },

  /** 测试连接 */
  test: async (id: string): Promise<KnowledgeConfigTestResponse> => {
    return api.post(`knowledge/configs/${id}/test`).json()
  },
}
