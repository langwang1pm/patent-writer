import { useEffect, useCallback } from 'react'
import { useCitationStore } from '@/stores/citationStore'
import { citationApi } from '@/services/citationApi'

export function useCitationSync(documentId: string | null) {
  const { setCitations, citations } = useCitationStore()

  const syncCitations = useCallback(async () => {
    if (!documentId) return

    try {
      const response = await citationApi.list(documentId)
      setCitations(response.items)
    } catch (error) {
      console.error('同步引用失败:', error)
    }
  }, [documentId, setCitations])

  // 初始加载
  useEffect(() => {
    syncCitations()
  }, [syncCitations])

  return {
    citations,
    syncCitations,
  }
}
