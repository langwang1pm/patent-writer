import { useMemo, useEffect } from 'react'
import { useConversationStore } from '@/stores/conversationStore'
import { useCitationStore } from '@/stores/citationStore'

/**
 * 从 AI 消息内容中解析引用标注
 *
 * 支持格式：
 * - [引用来源：xxx - Chunk-xx]
 * - [引用来源：xxx]
 * - [①][②][③] 圈数字标注（配合上下文推断来源名）
 *
 * 返回去重的引用列表，按首次出现位置排序
 */

const CITATION_SOURCE_PATTERN = /【引用来源[：:]\s*([^】]+)】/g

interface ParsedCitationRef {
  id: string
  sourceName: string
  chunkLabel: string | null   // 如 "Chunk-01"
  rawText: string             // 原始匹配文本
  position: number            // 在内容中的位置
}

/**
 * 解析消息内容中的所有引用标注
 */
function parseCitationsFromContent(content: string): ParsedCitationRef[] {
  if (!content) return []

  const citations: ParsedCitationRef[] = []
  let match: RegExpExecArray | null
  const seen = new Set<string>() // 去重

  while ((match = CITATION_SOURCE_PATTERN.exec(content)) !== null) {
    const fullText = match[0]
    const sourcePart = match[1].trim()
    const position = match.index

    // 解析 "来源名 - Chunk-xx" 格式
    const chunkMatch = sourcePart.match(/^(.+?)\s*[-–—]\s*(Chunk-\d+)$/i)
    const sourceName = chunkMatch ? chunkMatch[1].trim() : sourcePart
    const chunkLabel = chunkMatch ? chunkMatch[2] : null

    // 用来源名+chunk标签去重
    const dedupeKey = `${sourceName}|${chunkLabel || ''}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    citations.push({
      id: `chat-cite-${citations.length + 1}-${Date.now()}`,
      sourceName,
      chunkLabel,
      rawText: fullText,
      position,
    })
  }

  return citations
}

/**
 * Hook: 从对话消息中提取并同步引用到 citationStore
 *
 * 在 ChatView 中调用，自动：
 * 1. 监听最新 AI 助手消息的内容变化
 * 2. 实时解析其中的引用标注
 * 3. 同步到全局 citationStore（供 CitationPanel 消费）
 */
export function useChatCitations() {
  const messages = useConversationStore((s) => s.messages)
  const isStreaming = useConversationStore((s) => s.isStreaming)
  const { setCitations, activeCitationId, setActiveCitation } = useCitationStore()

  // 找到最后一条 AI 助手消息
  const lastAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i]
    }
    return null
  }, [messages])

  // 从最新 AI 消息内容解析引用
  const parsedCitations = useMemo(() => {
    if (!lastAssistantMessage?.content) return []
    return parseCitationsFromContent(lastAssistantMessage.content)
  }, [lastAssistantMessage?.content, isStreaming]) // 流式时也要重新解析

  // 转换为 Citation 格式并同步到 store
  const citationList = useMemo(() =>
    parsedCitations.map((ref, index) => ({
      id: ref.id,
      document_id: '',           // 对话场景无 document_id
      ref_mark: `[${index + 1}]`,
      source_name: ref.sourceName,
      chunk_content: ref.chunkLabel
        ? `${ref.sourceName} (${ref.chunkLabel})`
        : ref.sourceName,
      source_id: (ref.sourceName.match(/^([0-9a-f-]{36})~~~/) || [])[1] || null,
      chunk_id: ref.chunkLabel || null,
      score: null,
      position_start: ref.position,
      position_end: ref.position + (ref.rawText?.length || 0),
      created_at: new Date().toISOString(),
    })),
    [parsedCitations]
  )

  // 实时同步到 store（用 useEffect 执行副作用，useMemo 不应用来触发副作用）
  useEffect(() => {
    setCitations(citationList)
  }, [citationList, setCitations])

  return {
    citations: citationList,
    activeCitationId,
    setActiveCitation,
    totalCount: citationList.length,
    hasCitations: citationList.length > 0,
  }
}
