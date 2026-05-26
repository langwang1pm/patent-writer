import { Settings, Database, FileText, ChevronLeft } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'

interface TopNavProps {
  onToggleRightPanel: () => void
}

export default function TopNav({ onToggleRightPanel }: TopNavProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0">
      {/* 左侧 - Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-semibold text-gray-900">智撰</span>
        <span className="text-sm text-gray-500 font-normal">PatentWriter</span>
      </div>

      {/* 中间 - 面包屑 */}
      <div className="flex items-center gap-2 text-sm">
        {location.pathname.startsWith('/document/') && (
          <>
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              返回对话
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium">文档详情</span>
          </>
        )}
      </div>

      {/* 右侧 - 操作按钮 */}
      <div className="flex items-center gap-2">
        <button
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="知识库配置"
          onClick={() => {
            // TODO: 打开知识库配置面板
          }}
        >
          <Database className="w-5 h-5" />
        </button>
        <button
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="设置"
          onClick={() => {
            // TODO: 打开设置面板
          }}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
