import { FileText, ChevronRight, Download, ExternalLink } from 'lucide-react'
import type { ChatDocument } from '@/types/conversation'

interface DocumentCardProps {
  document: ChatDocument
  onInsert?: (document: ChatDocument) => void
  onExport?: (document: ChatDocument) => void
  onView?: (document: ChatDocument) => void
}

export default function DocumentCard({ document, onInsert, onExport, onView }: DocumentCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 transition-colors">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-primary-600" />
        <span className="font-medium text-gray-900">{document.title}</span>
        {document.citation_count > 0 && (
          <span className="text-xs text-gray-400">
            引用 {document.citation_count} 条
          </span>
        )}
      </div>

      {/* 预览 */}
      <div
        className="text-sm text-gray-600 line-clamp-3 mb-3"
        dangerouslySetInnerHTML={{ __html: document.content_html }}
      />

      {/* 操作 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onView?.(document)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          查看完整文档
        </button>
        <button
          onClick={() => onInsert?.(document)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
          插入编辑器
        </button>
        <button
          onClick={() => onExport?.(document)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Download className="w-3 h-3" />
          下载
        </button>
      </div>
    </div>
  )
}
