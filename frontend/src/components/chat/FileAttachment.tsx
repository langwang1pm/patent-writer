import { FileText, Download, Edit3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'

interface FileAttachmentProps {
  fileName: string
  fileUrl: string
  /** Document 实体 ID，用于在线预览/编辑 */
  documentId?: string | null
  /** 自定义预览回调（优先于内置导航） */
  onPreview?: () => void
}

/** 根据文件扩展名返回颜色 */
function extColor(ext: string): string {
  const map: Record<string, string> = {
    docx: 'bg-blue-100 text-blue-700',
    doc:  'bg-blue-100 text-blue-700',
    pdf:  'bg-red-100 text-red-700',
    xlsx: 'bg-green-100 text-green-700',
    pptx: 'bg-orange-100 text-orange-700',
    txt:  'bg-gray-100 text-gray-600',
  }
  return map[ext] ?? 'bg-gray-100 text-gray-600'
}

export default function FileAttachment({
  fileName,
  fileUrl,
  documentId,
  onPreview,
}: FileAttachmentProps) {
  const navigate = useNavigate()
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const colorCls = extColor(ext)
  const hasDocument = !!documentId

  /** 点击下载 */
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  /** 在线预览/编辑 — 跳转到 Document 编辑器页 */
  const handlePreview = () => {
    if (onPreview) {
      onPreview()
      return
    }
    // 跳转到文档编辑器页面（使用已有的 /document/:documentId 路由）
    if (hasDocument) {
      navigate(`/document/${documentId}`)
    }
  }

  return (
    <div className="mt-3 max-w-md">
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
        {/* 文件类型图标 */}
        <div className={cn('p-2 rounded-lg', colorCls)}>
          <FileText className="w-8 h-8 shrink-0" />
        </div>

        {/* 文件信息 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate" title={fileName}>
            {fileName}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Word 文档{hasDocument ? ' · 可编辑' : ''}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 shrink-0">
          {hasDocument && (
            <button
              onClick={handlePreview}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
              title="在线编辑"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
            title="下载文件"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
