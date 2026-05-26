import { BookOpen, ChevronRight, ExternalLink, MapPin } from 'lucide-react'
import { useCitationStore } from '@/stores/citationStore'
import { cn } from '@/utils/cn'

interface CitationPanelProps {
  isOpen: boolean
}

export default function CitationPanel({ isOpen }: CitationPanelProps) {
  const { citations, activeCitationId, setActiveCitation } = useCitationStore()

  if (!isOpen) return null

  return (
    <aside className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0">
      {/* 标题 */}
      <div className="h-12 px-4 flex items-center border-b border-gray-200 shrink-0">
        <BookOpen className="w-4 h-4 text-gray-500 mr-2" />
        <span className="text-sm font-medium text-gray-700">引用来源</span>
        <span className="ml-auto text-xs text-gray-400">{citations.length} 条</span>
      </div>

      {/* 引用列表 */}
      <div className="flex-1 overflow-y-auto p-3">
        {citations.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">暂无引用</p>
            <p className="text-xs text-gray-400 mt-1">生成的文档将显示引用来源</p>
          </div>
        ) : (
          <div className="space-y-3">
            {citations.map((citation, index) => (
              <div
                key={citation.id}
                className={cn(
                  'rounded-lg border transition-all cursor-pointer',
                  activeCitationId === citation.id
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
                onClick={() => setActiveCitation(citation.id)}
              >
                {/* 头部 */}
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-primary-100 text-primary-700 text-xs font-medium rounded">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-700 truncate flex-1" title={citation.source_name}>
                      {citation.source_name}
                    </span>
                  </div>
                  {citation.score && (
                    <div className="mt-1 text-xs text-gray-400">
                      相似度: {(citation.score * 100).toFixed(0)}%
                    </div>
                  )}
                </div>

                {/* 片段预览 */}
                <div className="px-3 py-2">
                  <p className="text-xs text-gray-600 line-clamp-3">
                    {citation.chunk_content}
                  </p>
                </div>

                {/* 操作 */}
                {activeCitationId === citation.id && (
                  <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-2">
                    <button className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
                      <MapPin className="w-3 h-3" />
                      定位
                    </button>
                    <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                      <ExternalLink className="w-3 h-3" />
                      查看原文
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500">
          点击引用可查看详情并定位到原文
        </p>
      </div>
    </aside>
  )
}
