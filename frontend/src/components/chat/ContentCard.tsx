import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { cn } from '@/utils/cn'
import FileAttachment from '@/components/chat/FileAttachment'

interface ContentCardProps {
  content: string
  documentId: string | null
  docxUrl: string | null
  isStreaming?: boolean
  thinkingContent?: string | null  // 思考/推理内容
  onCitationClick?: (e: React.MouseEvent) => void
}

export default function ContentCard({
  content,
  documentId,
  docxUrl,
  isStreaming,
  thinkingContent,
  onCitationClick,
}: ContentCardProps) {
  const [thinkingCollapsed, setThinkingCollapsed] = useState(true)  // 思考内容默认折叠

  const hasThinking = thinkingContent && thinkingContent.trim().length > 0

  return (
    <div className={cn(
      'flex justify-start',
      isStreaming && 'animate-in fade-in duration-200'
    )}>
      <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white shadow-sm" style={{ color: 'black' }}>
        {/* 思考内容（可折叠） */}
        {hasThinking && (
          <div className="mb-3 border border-amber-200 bg-amber-50 rounded-lg overflow-hidden">
            {/* 思考头部：标题 + 折叠按钮 */}
            <button
              onClick={() => setThinkingCollapsed(!thinkingCollapsed)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100/50 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{thinkingCollapsed ? '查看思考过程' : '收起思考过程'}</span>
              {thinkingCollapsed ? (
                <ChevronDown className="w-4 h-4 ml-auto text-amber-400" />
              ) : (
                <ChevronUp className="w-4 h-4 ml-auto text-amber-400" />
              )}
            </button>

            {/* 思考内容（可折叠） */}
            {!thinkingCollapsed && (
              <div className="px-3 py-2 text-sm text-gray-700 prose prose-sm max-w-none markdown-body border-t border-amber-200">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                >
                  {thinkingContent}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* 正文内容 */}
        <div
          className="space-y-4 max-w-none markdown-body"
          style={{
            color: 'black',
            fontSize: '1rem',
            lineHeight: '1.75',
            wordBreak: 'break-all',
            overflowWrap: 'break-word',
          }}
          onClick={onCitationClick}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              p: ({ children }) => <p style={{ color: 'black', margin: '0.5em 0', wordBreak: 'break-all', overflowWrap: 'break-word' }}>{children}</p>,
              li: ({ children }) => <li style={{ color: 'black', wordBreak: 'break-all' }}>{children}</li>,
              h1: ({ children }) => <h1 style={{ color: 'black', fontSize: '1.5rem', fontWeight: 600, margin: '1em 0 0.5em', wordBreak: 'break-all' }}>{children}</h1>,
              h2: ({ children }) => <h2 style={{ color: 'black', fontSize: '1.25rem', fontWeight: 600, margin: '1em 0 0.5em', wordBreak: 'break-all' }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ color: 'black', fontSize: '1.125rem', fontWeight: 600, margin: '1em 0 0.5em', wordBreak: 'break-all' }}>{children}</h3>,
              strong: ({ children }) => <strong style={{ color: 'black' }}>{children}</strong>,
              em: ({ children }) => <em style={{ color: 'black' }}>{children}</em>,
              code: ({ children }) => <code style={{ color: 'black', backgroundColor: '#f0f0f0', padding: '0.2em 0.4em', borderRadius: '3px', fontSize: '0.875em', wordBreak: 'break-all' }}>{children}</code>,
              pre: ({ children, ...props }) => (
                <pre {...props} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', backgroundColor: '#f5f5f5', borderRadius: '0.5rem', padding: '1rem', overflowX: 'auto' }}>
                  {children}
                </pre>
              ),
            }}
          >
            {content}
          </ReactMarkdown>

          {/* 流式输出时的光标 */}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-primary-400 animate-pulse ml-0.5" />
          )}

          {/* docx 附件卡片 */}
          {docxUrl && (
            <FileAttachment
              fileName={`文档-${documentId?.slice(0, 8) || 'unknown'}.docx`}
              fileUrl={docxUrl}
              documentId={documentId || undefined}
            />
          )}
        </div>
      </div>
    </div>
  )
}
