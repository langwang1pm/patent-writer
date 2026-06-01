import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { ChevronLeft, Edit2, Save } from 'lucide-react'
import { documentApi } from '@/services/documentApi'
import { useCitationStore } from '@/stores/citationStore'
import { cn } from '@/utils/cn'
import type { ChatDocument } from '@/types/conversation'
import { marked } from 'marked'

export default function DocumentView() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const { setCitations, citations } = useCitationStore()
  const [document, setDocument] = useState<ChatDocument | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '开始编辑文档...',
      }),
    ],
    content: '',
    editable: isEditing,
    onUpdate: ({ editor }) => {
      // 文档更新时的处理
    },
  })

  // 使用 editor 变量（避免 TypeScript 报错）
  void editor

  // 加载文档
  useEffect(() => {
    if (!documentId) return

    const loadDocument = async () => {
      setIsLoading(true)
      try {
        const doc = await documentApi.get(documentId)
        setDocument(doc)
        setCitations(doc.citations || [])

        if (editor && doc.content_html) {
          // 优先使用 content_html（HTML 格式）
          editor.commands.setContent(doc.content_html)
        } else if (editor && doc.content_markdown) {
          // 兼容：如果 content_html 不存在，用 content_markdown 转换
          const htmlContent = await marked.parse(doc.content_markdown)
          editor.commands.setContent(htmlContent)
        }
      } catch (error) {
        console.error('加载文档失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDocument()
  }, [documentId, editor, setCitations])

  // 切换编辑模式时更新 editor 的 editable 状态
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing)
    }
  }, [isEditing, editor])

  const handleSave = async () => {
    if (!document || !editor) return

    setIsSaving(true)
    try {
      const contentHtml = editor.getHTML()
      await documentApi.update(document.id, { content_html: contentHtml })
      setDocument({ ...document, content_html: contentHtml })
      setIsEditing(false)
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">文档不存在</p>
          <button
            onClick={() => navigate('/chat')}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            返回对话
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-4 h-4" />
            返回
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">{document.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? '保存中...' : '保存'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
            </>
          )}
        </div>
      </div>

      {/* 编辑器 */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto px-8 py-8">
          {/* 标题 */}
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {document.title}
          </h1>

          {/* 内容 */}
          <div className={cn('prose prose-sm max-w-none', isEditing && 'min-h-[500px]')}>
            <EditorContent
              editor={editor}
              className="outline-none"
            />

            {/* 引用标注提示 */}
            {citations.length > 0 && (
              <div className="mt-8 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">引用标注说明</h3>
                <div className="flex flex-wrap gap-2">
                  {citations.map((citation, index) => (
                    <span
                      key={citation.id}
                      className="inline-flex items-center px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded"
                    >
                      [{index + 1}] {citation.source_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="h-8 px-4 flex items-center justify-between border-t border-gray-200 bg-gray-50 text-xs text-gray-500 shrink-0">
        <span>版本 {document.version}</span>
        <span>引用 {citations.length} 条</span>
        <span>{new Date(document.updated_at).toLocaleString('zh-CN')}</span>
      </div>
    </div>
  )
}
