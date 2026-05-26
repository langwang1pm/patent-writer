import { api } from './api'
import type { Citation, CitationListResponse } from '@/types/citation'

export const citationApi = {
  /** 获取文档引用列表 */
  list: async (documentId: string): Promise<CitationListResponse> => {
    return api.get(`documents/${documentId}/citations`).json()
  },

  /** 获取引用详情 */
  get: async (id: string): Promise<Citation> => {
    return api.get(`citations/${id}`).json()
  },
}
