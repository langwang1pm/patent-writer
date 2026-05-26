import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:conversationId" element={<ChatPage />} />
          <Route path="document/:documentId" element={<DocumentPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

// 懒加载页面组件
const ChatPage = () => {
  const ChatView = lazy(() => import('./components/chat/ChatView'))
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>}>
      <ChatView />
    </Suspense>
  )
}

const DocumentPage = () => {
  const DocumentView = lazy(() => import('./components/editor/DocumentView'))
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>}>
      <DocumentView />
    </Suspense>
  )
}

export default App
