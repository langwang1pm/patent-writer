import { create } from 'zustand'
import type { Citation } from '@/types/citation'

interface CitationState {
  citations: Citation[]
  activeCitationId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  setCitations: (citations: Citation[]) => void
  setActiveCitation: (id: string | null) => void
  highlightCitation: (id: string) => void
  clearCitations: () => void
}

export const useCitationStore = create<CitationState>((set) => ({
  citations: [],
  activeCitationId: null,
  isLoading: false,
  error: null,

  setCitations: (citations) => set({ citations }),

  setActiveCitation: (id) => set({ activeCitationId: id }),

  highlightCitation: (id) => set({ activeCitationId: id }),

  clearCitations: () => set({ citations: [], activeCitationId: null }),

  // 合并引用来源：以 source_name 去重，追加新来源
  accumulateCitations: (newCitations: Array<{ source_name: string; source_id: string; chunk_content: string }>) =>
    set((state) => {
      const existingNames = new Set(state.citations.map((c) => c.source_name))
      const toAdd = newCitations.filter((c) => !existingNames.has(c.source_name))
      if (toAdd.length === 0) return {}
      const refCircles = [
        '①', '②', '③', '④', '⑤',
        '⑥', '⑦', '⑧', '⑨', '⑩',
        '⑪', '⑫', '⑬', '⑭', '⑮',
        '⑯', '⑰', '⑱', '⑲', '⑳',
      ]
      const merged = [...state.citations, ...toAdd]
      const reindexed = merged.map((cit, i) => ({
        ...cit,
        id: 'cit-' + i,
        ref_mark: refCircles[i] || '[' + (i + 1) + ']',
      }))
      return { citations: reindexed as Citation[] }
    }),
}))
