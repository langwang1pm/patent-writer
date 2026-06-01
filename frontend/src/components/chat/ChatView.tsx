import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, FileText, Plus, Search, Sparkles, BookOpen } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { useConversationStore, type StreamPhase } from '@/stores/conversationStore'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { cn } from '@/utils/cn'
import FileAttachment from '@/components/chat/FileAttachment'
import { useChatCitations } from '@/hooks/useChatCitations'
import CitationPanel from '@/components/layout/CitationPanel'
import { useCitationStore } from '@/stores/citationStore'


/** 流式阶段对应的提示信息 */
const STREAM_PHASE_CONFIG: Record<
  Exclude<StreamPhase, 'idle' | 'done'>,
  { icon: React.ReactNode; label: string; sublabel: string }
> = {
  connecting: {
    icon: <Search className="w-4 h-4 animate-pulse" />,
    label: '正在连接服务',
    sublabel: '正在建立连接...',
  },
  thinking: {
    icon: <Sparkles className="w-4 h-4 animate-pulse" />,
    label: 'AI 正在思考',
    sublabel: '正在检索知识库并分析需求...',
  },
  generating: {
    icon: (
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    ),
    label: '正在生成内容',
    sublabel: '',
  },
}

export default function ChatView() {
  const navigate = useNavigate()
  const { conversationId } = useParams()
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
  const [showCitationPanel, setShowCitationPanel] = useState(true) // 默认显示引用面板
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const citations = useCitationStore((s) => s.citations)
  const citationCount = citations.length

  // 处理引用标注点击事件（事件委托）
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
          // 这里可以添加滚动到对应卡片的逻辑
        }
      }
    }
  }

  useChatCitations()
  // 监听路由变化
  useEffect(() => {
    if (conversationId) {
      setCurrentConversation(conversationId)
    }
  }, [conversationId, setCurrentConversation])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 自动调整输入框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  const handleQuickCreate = async () => {
    try {
      const conversation = await createConversation()
      navigate(`/chat/${conversation.id}`)
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

  // 空状态
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

  // 获取当前阶段的提示配置
  const phaseConfig =
    isStreaming && streamPhase !== 'idle' && streamPhase !== 'done'
      ? STREAM_PHASE_CONFIG[streamPhase]
      : null

  return (
    <div className="h-full flex">
      {/* 左侧：对话区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 - 始终显示 */}
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              对话窗口
            </span>
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
        {/* 消息列表 */}
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
                {/* 用户消息 */}
                {message.role === 'user' && (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}

                {/* AI 消息 — Markdown 渲染 */}
                {message.role === 'assistant' && (
                  <div 
                    className="space-y-4 prose prose-sm max-w-none markdown-body"
                    onClick={handleCitationClick}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                    >
                      {message.content}
                    </ReactMarkdown>

                    {/* ── docx 附件卡片 ── */}
                    {message.docx_url && (
                      <FileAttachment
                        fileName={`文档-${message.id.slice(0, 8)}.docx`}
                        fileUrl={message.docx_url}
                        documentId={message.document_id}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 流式加载指示器 — 根据阶段显示不同内容 */}
        {isStreaming && phaseConfig && (
          <div className="flex justify-start px-4">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2.5 text-sm text-gray-500">
                <span className="text-primary-500 flex-shrink-0">{phaseConfig.icon}</span>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-600">{phaseConfig.label}</span>
                  {phaseConfig.sublabel && (
                    <span className="text-xs text-gray-400 -mt-0.5">{phaseConfig.sublabel}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* 输入框 — 放在左侧对话区域内部，确保在底部 */}
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

      {/* 右侧：引用面板 */}
      {showCitationPanel && <CitationPanel isOpen={showCitationPanel} onClose={() => setShowCitationPanel(false)} />}
    </div>
  )
}
