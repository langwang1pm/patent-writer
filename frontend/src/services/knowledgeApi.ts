import { api } from './api'
import type { KnowledgeConfig, KnowledgeConfigListResponse, KnowledgeConfigTestResponse, PaginatedResponse } from '@/types/knowledge'

const API_BASE = '/api/v1'

// ---- 知识库配置 -----------------------------------------------------------

export const knowledgeApi = {
  listConfigs: async (): Promise<KnowledgeConfigListResponse> => {
    return api.get('knowledge/configs').json()
  },

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

  deleteConfig: async (id: string): Promise<void> => {
    await api.delete(`knowledge/configs/${id}`)
  },

  testConfig: async (id: string): Promise<KnowledgeConfigTestResponse> => {
    return api.post(`knowledge/configs/${id}/test`).json()
  },

  // ---- 知识库文件 -----------------------------------------------------------

  /**
   * 获取文件列表（支持分页）
   * @param page 页码，从 1 开始
   * @param pageSize 每页数量
   * @param knowledgeConfigId 可选，不传则使用默认配置
   */
  listFiles: async (
    page: number = 1,
    pageSize: number = 10,
    knowledgeConfigId?: string
  ): Promise<PaginatedResponse<any>> => {
    const cfg: Record<string, any> = { page, page_size: pageSize }
    if (knowledgeConfigId) cfg.knowledge_config_id = knowledgeConfigId
    return api.get('knowledge/files', { searchParams: cfg }).json()
  },

  /**
   * 上传文件到 Dify 知识库
   * 后端会同时保存到本地 uploads/knowledge_files 目录
   */
  uploadFile: async (file: File, knowledgeConfigId?: string): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)

    let url = `${API_BASE}/knowledge/files/upload`
    if (knowledgeConfigId) {
      url += `?knowledge_config_id=${encodeURIComponent(knowledgeConfigId)}`
    }

    const response = await fetch(url, { method: 'POST', body: formData })
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: '上传失败' }))
      throw new Error(err.detail || '上传失败')
    }
    return response.json()
  },

  /**
   * 删除知识库文件
   * 会同时删除 Dify 端的文档和本地数据库记录
   */
  deleteFile: async (fileId: string, knowledgeConfigId?: string): Promise<void> => {
    let url = `${API_BASE}/knowledge/files/${encodeURIComponent(fileId)}`
    if (knowledgeConfigId) {
      url += `?knowledge_config_id=${encodeURIComponent(knowledgeConfigId)}`
    }
    const response = await fetch(url, { method: 'DELETE' })
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: '删除失败' }))
      throw new Error(err.detail || '删除失败')
    }
  },

  /**
   * 搜索知识库文件（按文件名关键词，支持分页）
   * 搜索范围是知识库中的全部内容
   * @param query 搜索关键词
   * @param page 页码，从 1 开始
   * @param pageSize 每页数量
   * @param knowledgeConfigId 可选，不传则使用默认配置
   */
  searchFiles: async (
    query: string,
    page: number = 1,
    pageSize: number = 10,
    knowledgeConfigId?: string
  ): Promise<PaginatedResponse<any>> => {
    const cfg: Record<string, any> = { q: query, page, page_size: pageSize }
    if (knowledgeConfigId) cfg.knowledge_config_id = knowledgeConfigId
    return api.get('knowledge/files/search', { searchParams: cfg }).json()
  },

  /**
   * 获取文件下载/预览 URL
   * 后端会从本地文件系统或 Dify 提供文件
   *
   * @param fileId   Dify document ID
   * @param mode     'inline' = 浏览器预览，'attachment' = 强制下载
   */
  getFileUrl: (fileId: string, mode: 'inline' | 'attachment' = 'inline'): string => {
    return `${API_BASE}/knowledge/files/${encodeURIComponent(fileId)}/download?disposition=${mode}`
  },
}
