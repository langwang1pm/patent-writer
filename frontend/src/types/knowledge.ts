// Dify 知识库文档类型（对齐 Dify Dataset API 返回结构）
export interface KnowledgeFile {
  id: string
  name: string
  word_count: number
  hit_count: number
  indexing_status: 'waiting' | 'indexing' | 'completed' | 'error' | 'paused'
  display_status: 'queuing' | 'indexing' | 'paused' | 'error' | 'available' | 'disabled' | 'archived'
  enabled: boolean
  disabled_at: string | null
  archived: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
  error: string | null
  // 前端计算属性（不来自 API）
  size?: number
  data_source_type?: string
}

export interface KnowledgeState {
  files: KnowledgeFile[]
  isLoading: boolean
  isUploading: boolean
  error: string | null

  fetchFiles: () => Promise<void>
  uploadFile: (file: File) => Promise<void>
  deleteFile: (fileId: string) => Promise<void>
  searchFiles: (query: string) => Promise<void>
  clearError: () => void
}

export interface KnowledgeConfig {
  id: string
  name: string
  dify_base_url: string
  dify_api_key: string
  knowledge_id: string
  is_default: boolean
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
