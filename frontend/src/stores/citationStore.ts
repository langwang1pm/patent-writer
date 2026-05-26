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
}))
