export interface Citation {
  id: string
  document_id: string
  ref_mark: string
  source_name: string
  chunk_content: string
  source_id: string | null
  chunk_id: string | null
  score: number | null
  position_start: number | null
  position_end: number | null
  created_at: string
}

export interface CitationListResponse {
  items: Citation[]
  total: number
  document_id: string
}
