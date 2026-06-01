import { useState } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import CitationPanel from './CitationPanel'

export default function AppLayout() {
  const [showCitationPanel, setShowCitationPanel] = useState(false)
  const isChatPage = !!useMatch('/chat/*')

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航 */}
      <TopNav />

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 - 对话列表 */}
        <Sidebar />

        {/* 中间内容区 */}
        <main className="flex-1 overflow-hidden bg-white border-r border-gray-200">
          {/* 把切换函数通过 context/outlet context 传给子路由 */}
          <Outlet context={{ showCitationPanel, setShowCitationPanel }} />
        </main>

        {/* 右侧引用面板 */}
        {isChatPage && (
          <CitationPanel
            isOpen={showCitationPanel}
            onClose={() => setShowCitationPanel(false)}
          />
        )}
      </div>
    </div>
  )
}
