import { useState, useMemo, useEffect } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { cn } from '@/utils/cn'

import rehypeRaw from 'rehype-raw'
import CitationBadge, { processCitationContent } from '@/components/citation/CitationBadge'
import { useCitationStore } from '@/stores/citationStore'

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

  // 从正文 markdown 中提取标题作为文件名
  const citations = useCitationStore((s) => s.citations)

  // 处理正文中的引用块，将 【引用来源：...】 替换为可交互徽章
  const processedContent = useMemo(() => {
    return processCitationContent(content, citations)
  }, [content, citations])

  const docTitle = useMemo(() => {
    if (!content) return null

    // 1. 尝试匹配第一个 # 开头的 H1 标题
    const headingMatch = content.match(/^#\s+(.+)$/m)
    if (headingMatch) return headingMatch[1].trim()

    // 2. 回退：取第一段非空文本（最多 50 字符）
    const firstLine = content
      .split('\n')
      .map(l => l.trim())
      .find(l => l.length > 0 && !l.startsWith('#'))
    if (firstLine) return firstLine.slice(0, 50).trim()

    return null
  }, [content])

  // 安全文件名：去除 Windows 非法字符，限制长度
  const safeFileName = useMemo(() => {
    const title = docTitle
    if (!title) return `文档-${documentId?.slice(0, 8) || 'unknown'}.docx`
    const sanitized = title
      .replace(/[<>:\x22/\\|?*\x00-\x1f]/g, '')  // 去除 Windows 文件名非法字符
      .replace(/\s+/g, ' ')                    // 合并多余空白
      .trim()
      .slice(0, 80)                            // 限制长度
    return sanitized.length > 0
      ? `${sanitized}.docx`
      : `文档-${documentId?.slice(0, 8) || 'unknown'}.docx`
  }, [docTitle, documentId])

  const hasThinking = thinkingContent && thinkingContent.trim().length > 0

  // 流式输出时自动展开思考过程，完成后自动收起
  useEffect(() => {
    if (hasThinking) {
      if (!isStreaming) {
        // 流式结束，收起
        setThinkingCollapsed(true)
      } else if (content.trim().length > 0) {
        // 正文开始输出，思考过程收起
        setThinkingCollapsed(true)
      } else {
        // 只有思考内容，展开供用户查看
        setThinkingCollapsed(false)
      }
    }
  }, [isStreaming, hasThinking, content])

  return (
    <div className={cn(
      'flex justify-start',
      isStreaming && 'animate-in fade-in duration-200'
    )}>
      <div className="max-w-[100%] rounded-2xl px-4 py-3 bg-white shadow-sm w-full" style={{ color: 'black' }}>
        {/* 流式输出中（AI 正在思考阶段） */}
          {isStreaming && !hasThinking && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="font-medium text-gray-600 whitespace-nowrap">AI 正在思考</span>
            </div>
          )}

        {/* 思考内容（可折叠） */}
        {hasThinking && (
          <div className="mb-3 border border-amber-200 bg-amber-50 rounded-lg overflow-hidden">
            {/* 思考头部：标题 + 折叠按钮 */}
            <button
              onClick={() => setThinkingCollapsed(!thinkingCollapsed)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100/50 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="whitespace-nowrap">{thinkingCollapsed ? '查看思考过程' : '收起思考过程'}</span>
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
            rehypePlugins={[rehypeRaw]}
            components={{
              sup: ({ className, children, ...props }) => {
                if (className && className.includes('citation-ref')) {
                  const idx = Number((props as any)['data-index'] || 0)
                  const refMark = String((props as any)['data-ref-mark'] || children?.toString() || '')
                  return (
                    <CitationBadge
                      refMark={refMark}
                      index={idx}
                      sourceName={String((props as any)['data-source'] || '')}
                      chunkContent={String((props as any)['data-chunk'] || '')}
                      citationId={String((props as any)['data-citation-id'] || '')}
                    />
                  )
                }
                return <sup className={className}>{children}</sup>
              },
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
            {processedContent}
          </ReactMarkdown>

        </div>
      </div>
    </div>
  )
}
