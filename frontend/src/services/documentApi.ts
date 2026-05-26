import { api } from './api'
import type { ChatDocument } from '@/types/conversation'

export const documentApi = {
  /** 获取文档详情 */
  get: async (id: string): Promise<ChatDocument> => {
    return api.get(`documents/${id}`).json()
  },

  /** 更新文档 */
  update: async (id: string, data: { title?: string; content_html?: string; content_markdown?: string }): Promise<ChatDocument> => {
    return api.put(`documents/${id}`, { json: data }).json()
  },

  /** 删除文档 */
  delete: async (id: string): Promise<void> => {
    await api.delete(`documents/${id}`)
  },

  /** 导出文档 */
  export: async (id: string): Promise<Blob> => {
    const response = await api.get(`documents/${id}/export`).then((res) => res.blob())
    return response
  },
}
