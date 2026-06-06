import { useState, useEffect } from 'react'
import { FileText, ChevronLeft, LogOut } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getProjectWorkspace } from '../../services/projectWorkspaceApi'

interface TopNavProps {
  onToggleRightPanel?: () => void
}

export default function TopNav({ onToggleRightPanel }: TopNavProps = {}) {
  const navigate = useNavigate()
  const location = useLocation()

  // 从当前 URL 提取 projectId
  const projectId = location.pathname.match(/\/project\/([a-f0-9-]+)/)?.[1]

  // 当前项目空间名称
  const [projectName, setProjectName] = useState<string | null>(null)
  const [loadingProject, setLoadingProject] = useState(false)

  // 是否在项目空间内（不含 document 页面）
  const isInProject = projectId && !location.pathname.includes('/document/')

  // 加载项目空间名称
  useEffect(() => {
    if (!projectId) {
      setProjectName(null)
      return
    }

    setLoadingProject(true)
    getProjectWorkspace(projectId)
      .then((project) => {
        setProjectName(project.workspace_name)
      })
      .catch(() => {
        setProjectName(null)
      })
      .finally(() => {
        setLoadingProject(false)
      })
  }, [projectId])

  // 使用属性（避免 TypeScript 报错）
  void onToggleRightPanel

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 shrink-0">
      {/* 左侧 - Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-semibold text-gray-900">智撰</span>
        <span className="text-sm text-gray-500 font-normal">PatentWriter</span>
      </div>

      {/* 中间 - 项目空间信息（居中显示） */}
      <div className="flex-1 flex items-center justify-center gap-3">
        {isInProject && (
          <>
            {/* 项目空间名称 */}
            <span className="text-sm text-gray-600">
              {loadingProject ? (
                <span className="text-gray-400">加载中...</span>
              ) : (
                <>当前项目空间：<span className="font-medium text-gray-800">{projectName || '未知'}</span></>
              )}
            </span>

            {/* 面包屑（文档页显示） */}
            {location.pathname.includes('/document/') && (
              <>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => navigate(`/project/${projectId}/chat`)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  返回对话
                </button>
                <span className="text-gray-300">/</span>
                <span className="text-sm text-gray-900 font-medium">文档详情</span>
              </>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isInProject && (
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出项目空间
          </button>
        )}
      </div>
    </header>
  )
}
