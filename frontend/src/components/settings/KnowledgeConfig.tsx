import { useState } from 'react'
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useKnowledgeStore } from '@/stores/knowledgeStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function KnowledgeConfig() {
  const { configs, createConfig, updateConfig, deleteConfig, testConnection, isLoading } = useKnowledgeStore()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    try {
      await createConfig({
        name: data.get('name') as string,
        dify_base_url: data.get('dify_base_url') as string,
        dify_api_key: data.get('dify_api_key') as string,
        knowledge_id: data.get('knowledge_id') as string,
        is_default: data.get('is_default') === 'on',
      })
      setIsAdding(false)
    } catch (error) {
      console.error('创建失败:', error)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">知识库配置</h2>
        <Button size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4 mr-1" />
          添加配置
        </Button>
      </div>

      {/* 添加表单 */}
      {isAdding && (
        <form onSubmit={handleCreate} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">配置名称</label>
            <Input name="name" placeholder="例如：专利知识库" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dify 服务地址</label>
            <Input name="dify_base_url" placeholder="http://localhost:5001" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <Input name="dify_api_key" type="password" placeholder="app-xxxxxx" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">知识库 ID</label>
            <Input name="knowledge_id" placeholder="知识库 ID" required />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="is_default" id="is_default" />
            <label htmlFor="is_default" className="text-sm text-gray-600">设为默认</label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAdding(false)}>
              取消
            </Button>
          </div>
        </form>
      )}

      {/* 配置列表 */}
      <div className="space-y-3">
        {configs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无知识库配置</p>
            <p className="text-sm mt-1">点击上方按钮添加</p>
          </div>
        ) : (
          configs.map((config) => (
            <div key={config.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{config.name}</span>
                  {config.is_default && (
                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                      默认
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testConnection(config.id)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="测试连接"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(config.id)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="编辑"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteConfig(config.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                <p>Dify: {config.dify_base_url}</p>
                <p>知识库 ID: {config.knowledge_id}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
