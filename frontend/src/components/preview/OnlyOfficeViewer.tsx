import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft } from 'lucide-react'
import { onlyofficeApi } from '@/services/onlyofficeApi'

// 声明全局 OnlyOffice API
declare global {
  interface Window {
    DocsAPI: {
      DocEditor: new (containerId: string, config: any) => any
    }
  }
}

export default function OnlyOfficeViewer() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<any>(null)

  const fileKey = searchParams.get('fileKey') || ''
  const fileName = searchParams.get('fileName') || '文档'
  const [mode, setMode] = useState<'view' | 'edit'>(
    searchParams.get('mode') === 'edit' ? 'edit' : 'view',
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // 加载 OnlyOffice JS API
  useEffect(() => {
    if (window.DocsAPI) {
      setScriptLoaded(true)
      return
    }

    // 获取 OnlyOffice 服务器地址（先请求配置获取）
    const loadScript = async () => {
      try {
        const { doc_server_url } = await onlyofficeApi.getEditorConfig(fileKey, mode)
        const script = document.createElement('script')
        script.src = `${doc_server_url}/web-apps/apps/api/documents/api.js`
        script.async = true
        script.onload = () => setScriptLoaded(true)
        script.onerror = () => setError('无法连接 OnlyOffice 文档服务器，请确认服务已启动')
        document.head.appendChild(script)
      } catch (e: any) {
        setError(e.message || '获取 OnlyOffice 配置失败')
        setIsLoading(false)
      }
    }

    loadScript()
  }, [fileKey, mode])

  // 初始化编辑器
  useEffect(() => {
    if (!scriptLoaded || !window.DocsAPI || !containerRef.current) return

    const initEditor = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const { config } = await onlyofficeApi.getEditorConfig(fileKey, mode)

        // 如果已有编辑器实例，先销毁
        if (editorRef.current) {
          try {
            editorRef.current.destroyEditor()
          } catch {}
          editorRef.current = null
        }

        // 创建新的编辑器实例
        const editor = new window.DocsAPI.DocEditor(`onlyoffice-container`, config)
        editorRef.current = editor
      } catch (e: any) {
        setError(e.message || '初始化编辑器失败')
      } finally {
        setIsLoading(false)
      }
    }

    initEditor()

    // 清理
    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.destroyEditor()
        } catch {}
        editorRef.current = null
      }
    }
  }, [scriptLoaded, fileKey, mode])

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部工具栏 */}
      <div className="h-11 px-4 flex items-center justify-between border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-900 truncate max-w-xs" title={fileName}>
            {fileName}
          </span>
        </div>

        {/* 预览模式：隐藏编辑按钮 */}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          <p className="font-medium">预览失败</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* 加载中 */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">正在加载文档预览...</p>
          </div>
        </div>
      )}

      {/* OnlyOffice 编辑器容器 */}
      <div className="flex-1 relative">
        <div
          id="onlyoffice-container"
          ref={containerRef}
          className="absolute inset-0"
          style={{ visibility: isLoading || error ? 'hidden' : 'visible' }}
        />
      </div>
    </div>
  )
}
