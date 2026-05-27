import { useState, useEffect, useCallback } from 'react'
import { Upload, Search, FileText, Trash2, Download, Eye, MoreVertical, Plus, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function KnowledgePage() {
  const {
    files,
    isLoading,
    isUploading,
    fetchFiles,
    uploadFile,
    deleteFile,
    searchFiles,
  } = useKnowledgeStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      searchFiles(query)
    } else {
      fetchFiles()
    }
  }, [searchFiles, fetchFiles])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      for (const file of Array.from(files)) {
        await uploadFile(file)
      }
      setShowUploadModal(false)
      await fetchFiles()
    } catch (error) {
      console.error('上传失败:', error)
    }
  }

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes && bytes !== 0) return '--'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // 解析日期（支持 Unix 时间戳和 ISO 字符串）
  const parseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    
    // 如果是数字（Unix 时间戳）
    if (typeof dateValue === 'number') {
      // 如果是秒级时间戳（10位或更少）
      if (dateValue < 10000000000) {
        return new Date(dateValue * 1000);
      }
      // 如果是毫秒级时间戳（13位）
      return new Date(dateValue);
    }
    
    // 如果是字符串，尝试解析为 ISO 格式
    return new Date(dateValue);
  };

  // 获取状态徽章
  const getStatusBadge = (status: string | undefined) => {
    if (!status) return '--';
    
    const statusConfig: Record<string, { label: string; color: string }> = {
      'available': { label: '可用', color: 'bg-green-100 text-green-700' },
      'indexing': { label: '索引中', color: 'bg-blue-100 text-blue-700' },
      'queuing': { label: '排队中', color: 'bg-yellow-100 text-yellow-700' },
      'paused': { label: '已暂停', color: 'bg-orange-100 text-orange-700' },
      'error': { label: '错误', color: 'bg-red-100 text-red-700' },
      'disabled': { label: '已禁用', color: 'bg-gray-200 text-gray-500' },
      'archived': { label: '已归档', color: 'bg-gray-200 text-gray-600' },
    };
    
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('确定要删除这个文件吗？')) return

    try {
      await deleteFile(fileId)
      await fetchFiles()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部操作栏 */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 shrink-0">知识库</h1>
          
          <div className="flex items-center gap-4">
            {/* 搜索框 */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索文件..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button
              onClick={() => setShowUploadModal(true)}
              disabled={isUploading}
              className="shrink-0"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              上传文件
            </Button>
          </div>
        </div>
      </div>

      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              {searchQuery ? '未找到匹配的文件' : '暂无文件，点击上方按钮上传'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 表头 */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-gray-500 uppercase">
              <div className="col-span-4">文件名</div>
              <div className="col-span-2">字符数</div>
              <div className="col-span-2">状态</div>
              <div className="col-span-2">上传时间</div>
              <div className="col-span-2 text-right">操作</div>
            </div>

            {/* 文件列表 */}
            {files.map((file) => (
              <div
                key={file.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors items-center"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </div>
                    {file.description && (
                      <div className="text-xs text-gray-500 truncate">
                        {file.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-2 text-sm text-gray-500">
                  {file.word_count?.toLocaleString() || '--'}
                </div>

                <div className="col-span-2 text-sm text-gray-500">
                  {getStatusBadge(file.display_status)}
                </div>

                <div className="col-span-2 text-sm text-gray-500">
                  {(() => {
                    const date = parseDate(file.created_at);
                    return date ? format(date, 'yyyy/MM/dd HH:mm', { locale: zhCN }) : '--';
                  })()}
                </div>

                <div className="col-span-2 flex items-center justify-end gap-1">
                  <button
                    onClick={() => window.open(`/api/v1/knowledge/files/${file.id}/download?disposition=inline`, '_blank')}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-white rounded transition-colors"
                    title="查看"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = `/api/v1/knowledge/files/${file.id}/download?disposition=attachment`
                      link.download = file.name
                      link.click()
                    }}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-white rounded transition-colors"
                    title="下载"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 上传文件模态框 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">上传文件</h3>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    点击选择文件或拖拽到此处
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    支持 PDF、Word、TXT、Markdown 格式
                  </p>
                </label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowUploadModal(false)}
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
