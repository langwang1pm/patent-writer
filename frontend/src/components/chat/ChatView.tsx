import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, FileText, Plus, BookOpen } from 'lucide-react'
import { useConversationStore, type StreamPhase } from '@/stores/conversationStore'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { cn } from '@/utils/cn'
import { useChatCitations } from '@/hooks/useChatCitations'
import CitationPanel from '@/components/layout/CitationPanel'
import { useCitationStore } from '@/stores/citationStore'
import ContentCard from '@/components/chat/ContentCard'

export default function ChatView() {
  const navigate = useNavigate()
  const { conversationId, projectId } = useParams<{ conversationId: string; projectId: string }>()
  const {
    messages,
    currentConversationId,
    isStreaming,
    streamPhase,
    sendMessage,
    setCurrentConversation,
    createConversation,
  } = useConversationStore()
  const currentConfigId = useKnowledgeStore((s) => (s as any).currentConfigId ?? null)
  const [inputValue, setInputValue] = useState('')
  const [showCitationPanel, setShowCitationPanel] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const citations = useCitationStore((s) => s.citations)
  const citationCount = citations.length

  const handleCitationClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.classList.contains('citation-mark')) {
      const citationText = target.textContent || ''
      const match = citationText.match(/\[引用来源[：:]\s*([^\]]+)\]/)
      if (match) {
        const sourceName = match[1]
        const citationStore = useCitationStore.getState()
        const citation = citationStore.citations.find(c =>
          c.source_name.includes(sourceName.split(' - ')[0])
        )
        if (citation) {
          citationStore.setActiveCitation(citation.id)
        }
      }
    }
  }

  useChatCitations()
  useEffect(() => {
    if (conversationId) {
      setCurrentConversation(conversationId)
    }
  }, [conversationId, setCurrentConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  const handleQuickCreate = async () => {
    try {
      const conversation = await createConversation(undefined, undefined, projectId)
      if (projectId) {
        navigate(`/project/${projectId}/chat/${conversation.id}`)
      }
    } catch (error) {
      console.error('创建对话失败:', error)
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return
    const content = inputValue.trim()
    setInputValue('')
    await sendMessage(content, currentConfigId || undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!currentConversationId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">欢迎使用智撰</h2>
        <p className="text-gray-500 max-w-md">
          通过对话方式让 AI 辅助编写专利文档，实时引用知识库内容，保证文档的专业性和可溯源性。
        </p>
        <button
          onClick={handleQuickCreate}
          className="mt-6 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          开始新文档
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">对话窗口</span>
          </div>
          <div className="flex items-center gap-3">
            {citationCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">引用来源</span>
                <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">
                  {citationCount}
                </span>
              </div>
            )}
            <button
              onClick={() => setShowCitationPanel(!showCitationPanel)}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              {showCitationPanel ? '隐藏' : '显示'}引用面板
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3',
                  message.role === 'user'
                    ? 'bg-primary-600 text-white ml-auto'
                    : 'bg-gray-100 text-gray-800'
                )}
              >
                {message.role === 'user' && (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}

                {/* ✅ 正确：role === 'assistant' */}
                {message.role === 'assistant' && (
                  <ContentCard
                    content={message.content}
                    documentId={message.document_id}
                    docxUrl={message.docx_url || null}
                    isStreaming={false}
                    thinkingContent={message.thinking_content}
                    onCitationClick={handleCitationClick}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 流式阶段提示 */}
        {isStreaming && streamPhase !== 'idle' && streamPhase !== 'done' && (
          <div className="flex justify-start px-4">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2.5 text-sm text-gray-500">
                <span className="text-primary-500 flex-shrink-0">
                  {streamPhase === 'connecting' && (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  {streamPhase === 'thinking' && (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                  {streamPhase === 'generating' && (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </span>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-600">
                    {streamPhase === 'connecting' && '正在连接服务'}
                    {streamPhase === 'thinking' && 'AI 正在思考'}
                    {streamPhase === 'generating' && '正在生成内容'}
                  </span>
                  {streamPhase === 'thinking' && (
                    <span className="text-xs text-gray-400 -mt-0.5">正在检索知识库并分析需求...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />

        <div className="border-t border-gray-200 p-4 bg-white shrink-0">
          <div className="mx-4">
            <div
              className={cn(
                'flex items-end gap-3 border rounded-xl px-4 py-3 transition-all',
                isStreaming
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100'
              )}
            >
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isStreaming
                    ? streamPhase === 'thinking'
                      ? 'AI 正在检索知识库，请稍候…'
                      : streamPhase === 'generating'
                      ? 'AI 正在生成内容…'
                      : '处理中…'
                    : '描述你想编写/修改的文档内容...'
                }
                rows={1}
                className="flex-1 resize-none text-sm outline-none bg-transparent placeholder-gray-400 max-h-32"
                disabled={isStreaming}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isStreaming}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  inputValue.trim() && !isStreaming
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              按 Enter 发送，Shift + Enter 换行
            </p>
          </div>
        </div>
      </div>

      {showCitationPanel && <CitationPanel isOpen={showCitationPanel} onClose={() => setShowCitationPanel(false)} />}
    </div>
  )
}
