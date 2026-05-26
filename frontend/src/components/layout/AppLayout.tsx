import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航 */}
      <TopNav />

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 - 对话列表 */}
        <Sidebar />

        {/* 中间内容区 */}
        <main className="flex-1 overflow-hidden bg-white border-x border-gray-200">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
