import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './Sidebar'
import CitationPanel from './CitationPanel'
import TopNav from './TopNav'
import { cn } from '@/utils/cn'

export default function AppLayout() {
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航 */}
      <TopNav onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)} />

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 - 对话列表 */}
        <Sidebar />

        {/* 中间内容区 */}
        <main className="flex-1 overflow-hidden bg-white border-x border-gray-200">
          <Outlet />
        </main>

        {/* 右侧边栏 - 引用列表 */}
        <CitationPanel isOpen={rightPanelOpen} />
      </div>
    </div>
  )
}
