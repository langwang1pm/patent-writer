import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { KnowledgeFile, KnowledgeState } from '@/types/knowledge'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export const useKnowledgeStore = create<KnowledgeState>()(
  devtools((set, get) => ({
    files: [],
    isLoading: false,
    isUploading: false,
    error: null,

    fetchFiles: async () => {
      set({ isLoading: true, error: null })
      try {
        const response = await fetch(`${API_BASE_URL}/api/knowledge/files`, {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('获取文件列表失败')
        }

        const data = await response.json()
        set({ files: data.items || [], isLoading: false })
      } catch (error) {
        console.error('获取文件列表失败:', error)
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : '获取文件列表失败',
        })
      }
    },

    uploadFile: async (file: File, description?: string) => {
      set({ isUploading: true, error: null })
      try {
        const formData = new FormData()
        formData.append('file', file)
        if (description) {
          formData.append('description', description)
        }

        const response = await fetch(`${API_BASE_URL}/api/knowledge/files/upload`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || '上传失败')
        }

        set({ isUploading: false })
      } catch (error) {
        console.error('上传文件失败:', error)
        set({
          isUploading: false,
          error: error instanceof Error ? error.message : '上传失败',
        })
        throw error
      }
    },

    deleteFile: async (fileId: string) => {
      set({ error: null })
      try {
        const response = await fetch(`${API_BASE_URL}/api/knowledge/files/${fileId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || '删除失败')
        }

        // 从列表中移除
        set((state) => ({
          files: state.files.filter((f) => f.id !== fileId),
        }))
      } catch (error) {
        console.error('删除文件失败:', error)
        set({
          error: error instanceof Error ? error.message : '删除失败',
        })
        throw error
      }
    },

    searchFiles: async (query: string) => {
      set({ isLoading: true, error: null })
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/knowledge/files/search?q=${encodeURIComponent(query)}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          throw new Error('搜索失败')
        }

        const data = await response.json()
        set({ files: data.items || [], isLoading: false })
      } catch (error) {
        console.error('搜索文件失败:', error)
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : '搜索失败',
        })
      }
    },

    clearError: () => {
      set({ error: null })
    },
  }))
)
