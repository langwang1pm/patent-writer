import { BookOpen, ChevronRight, ExternalLink, MapPin, Quote } from 'lucide-react'
import { useCitationStore } from '@/stores/citationStore'
import { cn } from '@/utils/cn'

interface CitationPanelProps {
  /** 面板是否可见 */
  isOpen: boolean
  /** 标题（默认"引用来源"） */
  title?: string
  /** 空状态提示文字 */
  emptyText?: string
  /** 空状态副标题 */
  emptySubtext?: string
}

export default function CitationPanel({
  isOpen,
  title = '引用来源',
  emptyText = '暂无引用',
  emptySubtext = '生成的文档将显示引用来源',
}: CitationPanelProps) {
  const { citations, activeCitationId, setActiveCitation } = useCitationStore()

  if (!isOpen) return null

  return (
    <aside className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
      {/* 标题栏 */}
      <div className="h-11 px-4 flex items-center border-b border-gray-200 shrink-0 bg-gray-50/50">
        <BookOpen className="w-4 h-4 text-gray-500 mr-1.5" />
        <span className="text-sm font-medium text-gray-700">{title}</span>
        {citations.length > 0 && (
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {citations.length}
          </span>
        )}
      </div>

      {/* 引用列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {citations.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Quote className="w-8 h-8 text-gray-200 mx-auto mb-2.5" />
            <p className="text-sm text-gray-500">{emptyText}</p>
            <p className="text-xs text-gray-400 mt-1">{emptySubtext}</p>
          </div>
        ) : (
          citations.map((citation, index) => (
            <div
              key={citation.id}
              className={cn(
                'group rounded-lg border transition-all cursor-pointer',
                activeCitationId === citation.id
                  ? 'border-primary-300 bg-primary-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/80'
              )}
              onClick={() => setActiveCitation(
                activeCitationId === citation.id ? null : citation.id
              )}
            >
              {/* 卡片头部：序号 + 来源名 */}
              <div className="px-3 py-2.5">
                <div className="flex items-start gap-2">
                  {/* 序号标记 */}
                  <span className={cn(
                    'mt-0.5 w-5 h-5 flex items-center justify-center text-xs font-medium rounded-full shrink-0',
                    activeCitationId === citation.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-primary-100 group-hover:text-primary-700'
                  )}>
                    {index + 1}
                  </span>

                  {/* 来源信息 */}
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      activeCitationId === citation.id ? 'text-primary-800' : 'text-gray-700'
                    )} title={citation.source_name}>
                      {citation.source_name}
                    </p>

                    {/* Chunk 标签 */}
                    {citation.chunk_id && (
                      <span className="inline-block mt-1 text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
                        {citation.chunk_id}
                      </span>
                    )}

                    {/* 相似度（如有） */}
                    {citation.score != null && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        相似度 {(citation.score * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 展开详情：片段预览 + 操作按钮 */}
              {activeCitationId === citation.id && citation.chunk_content && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-100/80">
                  {/* 片段内容预览 */}
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-4 mt-2 pl-7">
                    {citation.chunk_content}
                  </p>

                  {/* 操作按钮行 */}
                  <div className="flex items-center gap-3 mt-2.5 pl-7">
                    <button className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                      <MapPin className="w-3 h-3" />
                      定位到原文
                    </button>
                    {citation.source_id && (
                      <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                        <ExternalLink className="w-3 h-3" />
                        查看原文
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 底部提示 */}
      {citations.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-200 bg-gray-50/80 shrink-0">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            点击引用卡片查看详情
          </p>
        </div>
      )}
    </aside>
  )
}
