import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Search, MessageSquare, MoreVertical, Trash2, Edit2, BookOpen, Loader2 } from 'lucide-react'
import { format, toZonedTime } from 'date-fns-tz'
import { zhCN } from 'date-fns/locale'
import { cn } from '@/utils/cn'
import { useConversationStore } from '@/stores/conversationStore'

export default function Sidebar() {
  const navigate = useNavigate()
  const params = useParams()
  const { conversations, fetchConversations, createConversation, deleteConversation, setCurrentConversation, currentConversationId, updateConversationTitle } = useConversationStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // 监听路由变化，更新当前对话
  useEffect(() => {
    if (params.conversationId) {
      setCurrentConversation(params.conversationId)
    }
  }, [params.conversationId, setCurrentConversation])

  const [isCreating, setIsCreating] = useState(false)

  const handleCreateConversation = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const conversation = await createConversation()
      navigate(`/chat/${conversation.id}`)
    } catch (error) {
      console.error('创建对话失败:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id)
    setEditTitle(currentTitle)
  }

  const confirmRename = async () => {
    if (!renamingId || !editTitle.trim()) {
      setRenamingId(null)
      return
    }
    try {
      await updateConversationTitle(renamingId, editTitle.trim())
    } catch (error) {
      console.error('重命名失败:', error)
    }
    setRenamingId(null)
  }

  const cancelRename = () => {
    setRenamingId(null)
    setEditTitle('')
  }

  // 重命名时自动聚焦
  useEffect(() => {
    if (renamingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [renamingId])

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <aside className="w-64 bg-gray-100 border-r border-gray-200 flex flex-col shrink-0">
      {/* 顶部操作区 */}
      <div className="p-3 space-y-2">
        <button
          onClick={() => navigate('/knowledge')}
          className="w-full flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          <span>知识库</span>
        </button>

        <button
          onClick={handleCreateConversation}
          disabled={isCreating}
          className='w-full flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-primary-400 disabled:cursor-not-allowed'
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>{isCreating ? '创建中...' : '新建文档'}</span>
        </button>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索对话..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <div className="space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {searchQuery ? '未找到匹配的对话' : '暂无对话记录'}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onMouseEnter={() => setHoveredId(conversation.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={cn(
                  'group relative rounded-lg px-3 py-2 cursor-pointer transition-colors',
                  currentConversationId === conversation.id
                    ? 'bg-primary-50 border border-primary-200'
                    : 'hover:bg-gray-200'
                )}
                onClick={() => navigate(`/chat/${conversation.id}`)}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className={cn('w-4 h-4 mt-0.5 shrink-0', currentConversationId === conversation.id ? 'text-primary-600' : 'text-gray-400')} />
                  <div className="flex-1 min-w-0">
                    {renamingId === conversation.id ? (
                      <input
                        ref={editInputRef}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={confirmRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename()
                          if (e.key === 'Escape') cancelRename()
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm font-medium bg-white border border-primary-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    ) : (
                      <div className={cn('text-sm font-medium truncate', currentConversationId === conversation.id ? 'text-primary-700' : 'text-gray-700')}>
                        {conversation.title}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-0.5">
                      {format(toZonedTime(new Date(conversation.updated_at), Intl.DateTimeFormat().resolvedOptions().timeZone), 'MM/dd HH:mm', { locale: zhCN })}
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div
                  className={cn(
                    'absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity',
                    hoveredId === conversation.id ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    onClick={(e) => {
                      e.stopPropagation()
                      startRename(conversation.id, conversation.title)
                    }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (confirm('确定删除这个对话吗？')) {
                        await deleteConversation(conversation.id)
                        if (currentConversationId === conversation.id) {
                          navigate('/chat')
                        }
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
