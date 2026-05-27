import { api } from './api'
import type { KnowledgeConfig, KnowledgeConfigListResponse, KnowledgeConfigTestResponse } from '@/types/knowledge'

// ---- 知识库配置 ----

export const knowledgeApi = {
  /** 获取知识库配置列表 */
  listConfigs: async (): Promise<KnowledgeConfigListResponse> => {
    return api.get('knowledge/configs').json()
  },

  /** 创建知识库配置 */
  createConfig: async (data: {
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
  updateConfig: async (id: string, data: Partial<{
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
  deleteConfig: async (id: string): Promise<void> => {
    await api.delete(`knowledge/configs/${id}`)
  },

  /** 测试连接 */
  testConfig: async (id: string): Promise<KnowledgeConfigTestResponse> => {
    return api.post(`knowledge/configs/${id}/test`).json()
  },

  // ---- 知识库文件 ----

  /** 获取文件列表 */
  listFiles: async (knowledgeConfigId?: string): Promise<{ items: any[]; total: number }> => {
    const searchParams = knowledgeConfigId ? { searchParams: { knowledge_config_id: knowledgeConfigId } } : {}
    return api.get('knowledge/files', searchParams).json()
  },

  /** 上传文件 */
  uploadFile: async (file: File, knowledgeConfigId?: string): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)
    const searchParams = knowledgeConfigId ? `?knowledge_config_id=${knowledgeConfigId}` : ''
    // ky 不直接支持 FormData，用原生 fetch 上传
    const API_BASE = '/api/v1'
    const response = await fetch(`${API_BASE}/knowledge/files/upload${searchParams}`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: '上传失败' }))
      throw new Error(errorData.detail || '上传失败')
    }
    return response.json()
  },

  /** 删除文件 */
  deleteFile: async (fileId: string, knowledgeConfigId?: string): Promise<void> => {
    const searchParams = knowledgeConfigId ? { searchParams: { knowledge_config_id: knowledgeConfigId } } : {}
    await api.delete(`knowledge/files/${fileId}`, searchParams)
  },

  /** 搜索文件 */
  searchFiles: async (query: string, knowledgeConfigId?: string): Promise<{ items: any[]; total: number }> => {
    const searchParams: Record<string, string> = { q: query }
    if (knowledgeConfigId) searchParams.knowledge_config_id = knowledgeConfigId
    return api.get('knowledge/files/search', { searchParams }).json()
  },
}
