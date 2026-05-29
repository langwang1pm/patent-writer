import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, FileText, Plus, Search, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { useConversationStore, type StreamPhase } from '@/stores/conversationStore'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { documentApi } from '@/services/documentApi'
import { cn } from '@/utils/cn'

/** 流式阶段对应的提示信息 */
const STREAM_PHASE_CONFIG: Record<Exclude<StreamPhase, 'idle' | 'done'>, {
  icon: React.ReactNode
  label: string
  sublabel: string
}> = {
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
  const { messages, currentConversationId, isLoading, isStreaming, streamPhase, sendMessage, setCurrentConversation, createConversation } = useConversationStore()
  const { currentConfigId } = useKnowledgeStore()
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const handleExportDocument = async (documentId: string) => {
    try {
      const blob = await documentApi.export(documentId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `patent-document-${documentId.slice(0, 8)}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('导出失败:', error)
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
  const phaseConfig = isStreaming && streamPhase !== 'idle' && streamPhase !== 'done'
    ? STREAM_PHASE_CONFIG[streamPhase]
    : null

  return (
    <div className="h-full flex flex-col">
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
                'max-w-2xl rounded-2xl px-4 py-3',
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              )}
            >
              {/* 用户消息 */}
              {message.role === 'user' && (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}

              {/* AI 消息 — Markdown 渲染 */}
              {message.role === 'assistant' && (
                <div className="space-y-4 prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      h1: ({children}) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                      h2: ({children}) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                      h3: ({children}) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                      h4: ({children}) => <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>,
                      p: ({children}) => <p className="mb-2 leading-relaxed">{children}</p>,
                      ul: ({children}) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
                      li: ({children}) => <li className="leading-relaxed">{children}</li>,
                      strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                      code: ({inline, children}) => 
                        inline
                          ? <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                          : <code className="block bg-gray-100 p-2 rounded text-xs font-mono overflow-x-auto">{children}</code>,
                      pre: ({children}) => <pre className="bg-gray-100 p-3 rounded overflow-x-auto mb-2">{children}</pre>,
                      blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 pl-3 italic text-gray-600 my-2">{children}</blockquote>,
                      table: ({children}) => <div className="overflow-x-auto my-2"><table className="min-w-full border-collapse border border-gray-300 text-xs">{children}</table></div>,
                      th: ({children}) => <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold">{children}</th>,
                      td: ({children}) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 流式加载指示器 — 根据阶段显示不同内容 */}
        {isStreaming && phaseConfig && (
          <div className="flex justify-start">
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
      </div>

      {/* 输入框 */}
      <div className="border-t border-gray-200 p-4 bg-white shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className={cn(
            "flex items-end gap-3 border rounded-xl px-4 py-3 transition-all",
            isStreaming
              ? "border-gray-200 bg-gray-50"
              : "border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100"
          )}>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isStreaming
                  ? (streamPhase === 'thinking' ? 'AI 正在检索知识库，请稍候...' :
                     streamPhase === 'generating' ? 'AI 正在生成内容...' :
                     '处理中...')
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
  )
}
