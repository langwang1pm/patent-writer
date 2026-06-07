export interface Conversation {
  id: string
  title: string
  knowledge_config_id: string | null
  project_workspace_id: string | null
  enterprise_info_id: string | null
  task_type_id: string | null
  created_at: string
  updated_at: string
  messages: Message[]
  message_count: number
  document_count: number
}

import type { Citation } from './citation'

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  document_id: string | null
  created_at: string
  document?: ChatDocument | null
  /** 流式结束后导出的 docx 下载地址（相对路径） */
  docx_url?: string | null
  /** 思考/推理内容（<think>...</think> 之间的内容） */
  thinking_content?: string | null
}

export interface ChatDocument {
  id: string
  conversation_id: string
  title: string
  content_html: string
  content_markdown: string | null
  version: number
  created_at: string
  updated_at: string
  citation_count: number
  citations: Citation[]
}

export interface ConversationListResponse {
  items: Conversation[]
  total: number
  page: number
  page_size: number
}

export interface SendMessageRequest {
  content: string
  knowledge_config_id?: string
}

export interface SendMessageResponse {
  message_id: string
  role: string
  content: string
  document: ChatDocument | null
  citations: Citation[]
}
