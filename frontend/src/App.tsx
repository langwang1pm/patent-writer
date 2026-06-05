import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 项目空间页面（主页） */}
        <Route path="/" element={<ProjectWorkspacePage />} />
        
        {/* 项目空间详情页（进入项目后，显示当前主页面） */}
        <Route path="/project/:projectId" element={<AppLayout />}>
          <Route index element={<Navigate to="chat" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:conversationId" element={<ChatPage />} />
          <Route path="document/:documentId" element={<DocumentPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
        </Route>
        
        {/* OnlyOffice 全屏预览（不在 AppLayout 内） */}
        <Route path="/preview" element={<PreviewPage />} />
      </Routes>
    </BrowserRouter>
  )
}

// 懒加载页面组件
const ProjectWorkspacePage = () => {
  const ProjectWorkspaceView = lazy(() => import('./components/project/ProjectWorkspacePage'))
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>}>
      <ProjectWorkspaceView />
    </Suspense>
  )
}

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

const KnowledgePage = () => {
  const KnowledgeView = lazy(() => import('./components/knowledge/KnowledgePage'))
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>}>
      <KnowledgeView />
    </Suspense>
  )
}

const PreviewPage = () => {
  const OnlyOfficeViewer = lazy(() => import('./components/preview/OnlyOfficeViewer'))
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>}>
      <OnlyOfficeViewer />
    </Suspense>
  )
}

export default App
