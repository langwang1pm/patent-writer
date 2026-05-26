export interface KnowledgeFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  description?: string
  created_at: string
  updated_at: string
}

export interface KnowledgeState {
  files: KnowledgeFile[]
  isLoading: boolean
  isUploading: boolean
  error: string | null

  fetchFiles: () => Promise<void>
  uploadFile: (file: File, description?: string) => Promise<void>
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
