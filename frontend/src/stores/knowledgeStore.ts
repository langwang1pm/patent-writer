import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { KnowledgeFile, KnowledgeState } from '@/types/knowledge'
import { knowledgeApi } from '@/services/knowledgeApi'

export const useKnowledgeStore = create<KnowledgeState>()(
  devtools((set, get) => ({
    files: [],
    isLoading: false,
    isUploading: false,
    error: null,

    fetchFiles: async () => {
      set({ isLoading: true, error: null })
      try {
        const data = await knowledgeApi.listFiles()
        set({ files: data.items || [], isLoading: false })
      } catch (error) {
        console.error('获取文件列表失败:', error)
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : '获取文件列表失败',
        })
      }
    },

    uploadFile: async (file: File) => {
      set({ isUploading: true, error: null })
      try {
        await knowledgeApi.uploadFile(file)
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
        await knowledgeApi.deleteFile(fileId)
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
        const data = await knowledgeApi.searchFiles(query)
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
