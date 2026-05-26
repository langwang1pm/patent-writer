import { create } from 'zustand'
import type { KnowledgeConfig } from '@/types/knowledge'
import { knowledgeApi } from '@/services/knowledgeApi'

interface KnowledgeState {
  configs: KnowledgeConfig[]
  currentConfigId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchConfigs: () => Promise<void>
  createConfig: (data: {
    name: string
    dify_base_url: string
    dify_api_key: string
    knowledge_id: string
    is_default?: boolean
    top_k?: number
    score_threshold?: number
    rerank_enabled?: boolean
  }) => Promise<KnowledgeConfig>
  updateConfig: (id: string, data: Partial<KnowledgeConfig>) => Promise<void>
  deleteConfig: (id: string) => Promise<void>
  setCurrentConfig: (id: string | null) => void
  testConnection: (id: string) => Promise<boolean>
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  configs: [],
  currentConfigId: null,
  isLoading: false,
  error: null,

  fetchConfigs: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await knowledgeApi.list()
      set({
        configs: response.items,
        currentConfigId: response.default_id,
        isLoading: false,
      })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  createConfig: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const config = await knowledgeApi.create(data)
      set((state) => ({
        configs: [config, ...state.configs],
        isLoading: false,
      }))
      return config
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      throw error
    }
  },

  updateConfig: async (id, data) => {
    try {
      const updated = await knowledgeApi.update(id, data)
      set((state) => ({
        configs: state.configs.map((c) => (c.id === id ? updated : c)),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteConfig: async (id) => {
    try {
      await knowledgeApi.delete(id)
      set((state) => ({
        configs: state.configs.filter((c) => c.id !== id),
        currentConfigId: state.currentConfigId === id ? null : state.currentConfigId,
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  setCurrentConfig: (id) => set({ currentConfigId: id }),

  testConnection: async (id) => {
    try {
      const result = await knowledgeApi.test(id)
      return result.success
    } catch {
      return false
    }
  },
}))
