import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Upload, Search, FileText, Trash2, Loader2,
  CheckCircle, Clock, AlertCircle, PauseCircle,
  Eye, Download, FileSpreadsheet, Presentation,
} from 'lucide-react'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { knowledgeApi } from '@/services/knowledgeApi'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { KnowledgeConfigListResponse } from '@/types/knowledge'

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  available:  { label: '可用', color: 'text-green-700 bg-green-50',  icon: CheckCircle },
  indexing:  { label: '处理中', color: 'text-yellow-700 bg-yellow-50', icon: Clock },
  queuing:   { label: '排队中', color: 'text-gray-600 bg-gray-50',    icon: Clock },
  paused:    { label: '已暂停', color: 'text-orange-700 bg-orange-50', icon: PauseCircle },
  error:     { label: '失败',   color: 'text-red-700 bg-red-50',     icon: AlertCircle },
  disabled:  { label: '已禁用', color: 'text-gray-400 bg-gray-100',   icon: PauseCircle },
  archived:  { label: '已归档', color: 'text-gray-400 bg-gray-100',   icon: PauseCircle },
}

/** 判断文件是否需要通过 OnlyOffice 预览 */
const ONLYOFFICE_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'csv'])

function isOnlyOfficeFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return ONLYOFFICE_EXTENSIONS.has(ext)
}

/** 获取文件图标 */
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet
  if (['ppt', 'pptx'].includes(ext)) return Presentation
  return FileText
}

/** 打开文件预览 */
function openFilePreview(file: any) {
  const filename = file.name || ''
  if (isOnlyOfficeFile(filename)) {
    // Office 文件 -> OnlyOffice 预览页
    const fileKey = `kb:${file.id}`
    const url = `/preview?fileKey=${encodeURIComponent(fileKey)}&fileName=${encodeURIComponent(filename)}&mode=view`
    window.open(url, '_blank')
  } else {
    // PDF/MD/TXT 等 -> 浏览器原生预览
    const fileUrl = knowledgeApi.getFileUrl(file.id, 'inline')
    window.open(fileUrl, '_blank')
  }
}

export default function KnowledgePage() {
  const {
    files, isLoading, isUploading, error,
    fetchFiles, uploadFile, deleteFile, searchFiles, clearError,
  } = useKnowledgeStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [configs, setConfigs] = useState<KnowledgeConfigListResponse | null>(null)

  // 获取配置列表，拿到默认 config id
  useEffect(() => {
    knowledgeApi.listConfigs().then(setConfigs).catch(() => setConfigs(null))
  }, [])

  const defaultConfigId = configs?.default_id ?? configs?.items?.[0]?.id ?? undefined

  useEffect(() => { fetchFiles() }, [fetchFiles])
  useEffect(() => { if (error) clearError() }, [error, clearError])

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    q.trim() ? searchFiles(q) : fetchFiles()
  }, [searchFiles, fetchFiles])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list?.length) return
    try {
      for (const f of Array.from(list)) await uploadFile(f)
      setShowUploadModal(false)
      await fetchFiles()
    } catch { /* store 已处理 error */ }
    e.target.value = ''
  }

  const handleDelete = async (fileId: string, name: string) => {
    if (!confirm(`确定删除「${name}」吗？`)) return
    try { await deleteFile(fileId) } catch {}
  }

  const fmtDate = (ts: any) => {
    if (!ts) return '-'
    const ms = typeof ts === 'string' && ts.length > 10 ? Date.parse(ts) : Number(ts) * 1000
    return new Date(ms).toLocaleString('zh-CN', {
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit',
    })
  }

  const fmtCount = (n: number | undefined) => {
    if (n == null) return '-'
    if (n >= 10000) return `${(n / 10000).toFixed(1)}万字`
    if (n >= 1000)  return `${(n / 1000).toFixed(1)}k`
    return `${n}`
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部操作栏 */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">知识库</h1>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              type="text" placeholder="搜索文件名..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowUploadModal(true)} disabled={isUploading}>
            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                             : <Upload className="w-4 h-4 mr-2" />}
            上传文件
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-6 mt-3 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />加载中...
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileText className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">
              {searchQuery ? '未找到匹配的文件' : '暂无文件，点击「上传文件」开始添加'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* 表头 */}
            <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs font-medium text-gray-500 uppercase">
              <div className="col-span-4">文件名</div>
              <div className="col-span-2 text-center">字符数</div>
              <div className="col-span-2 text-center">状态</div>
              <div className="col-span-2 text-center">上传时间</div>
              <div className="col-span-2 text-right">操作</div>
            </div>

            {files.map((file: any) => {
              const st = (file.display_status || 'queuing') as string
              const info = STATUS_MAP[st] || STATUS_MAP.queuing
              const StatusIcon = info.icon
              const dlUrl   = knowledgeApi.getFileUrl(file.id, 'attachment')
              return (
                <div key={file.id}
                     className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors items-center">
                  {/* 文件名 */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    {(() => { const Icon = getFileIcon(file.name); return <Icon className="w-5 h-5 text-primary-600 shrink-0" /> })()}
                    <span
                      className="text-sm text-gray-900 truncate cursor-pointer hover:text-primary-600 hover:underline"
                      title={file.name}
                      onClick={() => openFilePreview(file)}
                    >
                      {file.name}
                    </span>
                  </div>

                  {/* 字数 */}
                  <div className="col-span-2 text-center text-sm text-gray-500">
                    {file.word_count?.toLocaleString() ?? '--'}
                  </div>

                  {/* 状态 */}
                  <div className="col-span-2 flex justify-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {info.label}
                    </span>
                  </div>

                  {/* 上传时间 */}
                  <div className="col-span-2 text-center text-sm text-gray-500">
                    {fmtDate(file.created_at)}
                  </div>

                  {/* 操作 */}
                  <div className="col-span-2 flex justify-end gap-1">
                    {/* 查看/预览 */}
                    <button
                      onClick={() => openFilePreview(file)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-white rounded transition-colors"
                      title={isOnlyOfficeFile(file.name) ? '在线预览' : '查看'}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {/* 下载 */}
                    <a href={dlUrl} download={file.name}
                       className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-white rounded transition-colors"
                       title="下载">
                      <Download className="w-4 h-4" />
                    </a>
                    {/* 删除 */}
                    <button
                      onClick={() => handleDelete(file.id, file.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded transition-colors"
                      title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 上传模态框 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 max-w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">上传文件到知识库</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors cursor-pointer">
              <input
                type="file" id="knowledge-file-upload" multiple
                onChange={handleUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md,.html,.csv,.xlsx,.pptx"
              />
              <label htmlFor="knowledge-file-upload" className="cursor-pointer">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600">点击选择文件，或拖拽到此处</p>
                <p className="text-xs text-gray-400 mt-1">
                  支持 PDF、Word、TXT、Markdown、HTML、CSV、Excel、PPT
                </p>
              </label>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <Button type="button" variant="secondary" onClick={() => setShowUploadModal(false)}>
                取消
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
