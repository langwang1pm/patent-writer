import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { cn } from '@/utils/cn'

interface ThinkingCardProps {
  content: string
  collapsed: boolean
  onToggle?: () => void
  isStreaming?: boolean
}

export default function ThinkingCard({ content, collapsed, onToggle, isStreaming }: ThinkingCardProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed)
  const isCollapsed = collapsed ?? internalCollapsed

  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalCollapsed(!internalCollapsed)
    }
  }

  // 清理思考内容：去掉 <think> 和 </think> 标签本身（兼容各种格式）
  const cleanContent = content
    .replace(/<think\s*\/?>/gi, '')
    .replace(/<\/think\s*>/gi, '')
    .trim()

  // 计算字符数用于摘要显示
  const charCount = cleanContent.length

  return (
    <div className={cn(
      'flex justify-start',
      isStreaming && 'animate-in fade-in duration-200'
    )}>
      <div className={cn(
        'max-w-[85%] rounded-2xl border transition-all duration-200',
        isCollapsed
          ? 'border-amber-200 bg-amber-50 px-4 py-2.5'
          : 'border-amber-200 bg-amber-50/80 px-4 py-3'
      )}>
        {/* 折叠状态：紧凑行 */}
        {isCollapsed ? (
          <button
            onClick={handleToggle}
            className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 transition-colors w-full text-left group"
          >
            <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-500" />
            <span className="font-medium">已完成思考</span>
            <span className="text-xs text-amber-500">({charCount} 字)</span>
            <ChevronDown className="w-3.5 h-3.5 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          /* 展开状态：完整内容 */
          <div>
            {/* 头部：标题 + 收起按钮 */}
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-500" />
              <span className="text-sm font-medium text-amber-700">
                {isStreaming ? '正在思考...' : '思考过程'}
              </span>
              {!isStreaming && (
                <button
                  onClick={handleToggle}
                  className="ml-auto p-1 rounded hover:bg-amber-100 transition-colors"
                  title="收起"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-amber-500" />
                </button>
              )}
              {isStreaming && (
                <div className="ml-auto flex gap-1">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>

            {/* 思考内容 */}
            <div className="text-sm text-gray-700 prose prose-sm max-w-none markdown-body thinking-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
              >
                {cleanContent || (isStreaming ? '' : '(无思考内容)')}
              </ReactMarkdown>
              {isStreaming && !cleanContent && (
                <span className="inline-block w-2 h-4 bg-amber-300/60 animate-pulse ml-1" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
