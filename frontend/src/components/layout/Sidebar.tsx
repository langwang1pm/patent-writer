import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Search, MessageSquare, MoreVertical, Trash2, Edit2, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '@/utils/cn'
import { useConversationStore } from '@/stores/conversationStore'

export default function Sidebar() {
  const navigate = useNavigate()
  const params = useParams()
  const { conversations, fetchConversations, createConversation, deleteConversation, setCurrentConversation, currentConversationId } = useConversationStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // 监听路由变化，更新当前对话
  useEffect(() => {
    if (params.conversationId) {
      setCurrentConversation(params.conversationId)
    }
  }, [params.conversationId, setCurrentConversation])

  const handleCreateConversation = async () => {
    try {
      const conversation = await createConversation()
      navigate(`/chat/${conversation.id}`)
    } catch (error) {
      console.error('创建对话失败:', error)
    }
  }

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <aside className="w-64 bg-gray-100 border-r border-gray-200 flex flex-col shrink-0">
      {/* 顶部操作区 */}
      <div className="p-3 space-y-2">
        <button
          onClick={() => {
            // TODO: 导航到知识库管理页面
            console.log('知识库页面待开发')
          }}
          className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          <span>知识库</span>
        </button>

        <button
          onClick={handleCreateConversation}
          className="w-full flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>新建文档</span>
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
                    <div className={cn('text-sm font-medium truncate', currentConversationId === conversation.id ? 'text-primary-700' : 'text-gray-700')}>
                      {conversation.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(conversation.updated_at), 'MM/dd HH:mm', { locale: zhCN })}
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
                      // TODO: 重命名
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
