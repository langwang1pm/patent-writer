export interface KnowledgeConfig {
  id: string
  name: string
  dify_base_url: string
  dify_api_key: string
  knowledge_id: string
  is_default: boolean
  top_k: number
  score_threshold: number
  rerank_enabled: boolean
  status: string
  created_at: string
  updated_at: string
}

export interface KnowledgeConfigListResponse {
  items: KnowledgeConfig[]
  total: number
  default_id: string | null
}

export interface KnowledgeConfigTestResponse {
  success: boolean
  message: string
  document_count: number | null
  latency_ms: number | null
}
