import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { KnowledgeState, KnowledgeConfig } from '@/types/knowledge'
import { knowledgeApi } from '@/services/knowledgeApi'
import { knowledgeConfigApi } from '@/services/knowledgeConfigApi'

// 默认分页配置
const DEFAULT_PAGE_SIZE = 10
const DEFAULT_PAGE = 1

export const useKnowledgeStore = create<KnowledgeState>()(
  devtools((set, get) => ({
    files: [],
    configs: [],
    isLoading: false,
    isUploading: false,
    error: null,
    // 分页状态
    pagination: {
      page: DEFAULT_PAGE,
      pageSize: DEFAULT_PAGE_SIZE,
      total: 0,
      totalPages: 0,
    },

    fetchFiles: async (page: number = DEFAULT_PAGE, pageSize: number = DEFAULT_PAGE_SIZE) => {
      set({ isLoading: true, error: null })
      try {
        const data = await knowledgeApi.listFiles(page, pageSize)
        set({
          files: data.items || [],
          isLoading: false,
          pagination: {
            page: data.page || page,
            pageSize: data.page_size || pageSize,
            total: data.total || 0,
            totalPages: data.total_pages || 0,
          },
        })
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
        // 从列表中移除，并更新总数
        const state = get()
        const newFiles = state.files.filter((f) => f.id !== fileId)
        const newTotal = Math.max(0, state.pagination.total - 1)
        const newTotalPages = newTotal > 0
          ? Math.ceil(newTotal / state.pagination.pageSize)
          : 0
        // 如果当前页没有数据了且不是第一页，则回到上一页
        let newPage = state.pagination.page
        if (newFiles.length === 0 && newPage > 1) {
          newPage -= 1
        }
        set({
          files: newFiles,
          pagination: {
            ...state.pagination,
            total: newTotal,
            totalPages: newTotalPages,
            page: newPage,
          },
        })
      } catch (error) {
        console.error('删除文件失败:', error)
        set({
          error: error instanceof Error ? error.message : '删除失败',
        })
        throw error
      }
    },

    searchFiles: async (query: string, page: number = DEFAULT_PAGE, pageSize: number = DEFAULT_PAGE_SIZE) => {
      set({ isLoading: true, error: null })
      try {
        const data = await knowledgeApi.searchFiles(query, page, pageSize)
        set({
          files: data.items || [],
          isLoading: false,
          pagination: {
            page: data.page || page,
            pageSize: data.page_size || pageSize,
            total: data.total || 0,
            totalPages: data.total_pages || 0,
          },
        })
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

    setPage: (page: number) => {
      set((state) => ({
        pagination: { ...state.pagination, page },
      }))
    },

    setPageSize: (pageSize: number) => {
      set((state) => ({
        pagination: {
          ...state.pagination,
          pageSize,
          page: DEFAULT_PAGE, // 切换每页数量时重置到第一页
        },
      }))
    },
    // 知识库配置相关方法
    createConfig: async (config: Partial<KnowledgeConfig>) => {
      set({ isLoading: true, error: null })
      try {
        await knowledgeConfigApi.create(config)
        set({ isLoading: false })
        // 刷新配置列表
        const data = await knowledgeConfigApi.list()
        set({ configs: data.items || [] })
      } catch (error) {
        console.error('创建配置失败:', error)
        set({ isLoading: false, error: error instanceof Error ? error.message : '创建失败' })
        throw error
      }
    },
    updateConfig: async (id: string, config: Partial<KnowledgeConfig>) => {
      set({ isLoading: true, error: null })
      try {
        await knowledgeConfigApi.update(id, config)
        set({ isLoading: false })
        // 刷新配置列表
        const data = await knowledgeConfigApi.list()
        set({ configs: data.items || [] })
      } catch (error) {
        console.error('更新配置失败:', error)
        set({ isLoading: false, error: error instanceof Error ? error.message : '更新失败' })
        throw error
      }
    },
    deleteConfig: async (id: string) => {
      set({ error: null })
      try {
        await knowledgeConfigApi.delete(id)
        // 从列表中移除
        const state = get()
        set({ configs: state.configs.filter((c) => c.id !== id) })
      } catch (error) {
        console.error('删除配置失败:', error)
        set({ error: error instanceof Error ? error.message : '删除失败' })
        throw error
      }
    },
    testConnection: async (id: string) => {
      set({ error: null })
      try {
        await knowledgeConfigApi.test(id)
      } catch (error) {
        console.error('测试连接失败:', error)
        set({ error: error instanceof Error ? error.message : '测试失败' })
        throw error
      }
    },
  }))
)
