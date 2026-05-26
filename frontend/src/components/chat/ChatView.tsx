import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Send, FileText } from 'lucide-react'
import { useConversationStore } from '@/stores/conversationStore'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { documentApi } from '@/services/documentApi'
import { cn } from '@/utils/cn'

export default function ChatView() {
  const { conversationId } = useParams()
  const { messages, currentConversationId, isLoading, isStreaming, sendMessage, setCurrentConversation } = useConversationStore()
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
        <div className="mt-6 text-sm text-gray-400">
          点击左侧「新建对话」开始使用
        </div>
      </div>
    )
  }

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

              {/* AI 消息 */}
              {message.role === 'assistant' && (
                <div className="space-y-4">
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 加载指示器 */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="border-t border-gray-200 p-4 bg-white shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 border border-gray-300 rounded-xl px-4 py-3 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述你想编写/修改的专利内容..."
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
