import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <TopNav />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-hidden bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
