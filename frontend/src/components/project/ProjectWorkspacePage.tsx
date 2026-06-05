import { useEffect, useState } from "react";
import { useProjectWorkspaceStore } from "../../stores/projectWorkspaceStore";
import ProjectWorkspaceModal from "./ProjectWorkspaceModal";
import type { ProjectWorkspaceWithRelations } from "../../types/projectWorkspace";

export default function ProjectWorkspacePage() {
  const {
    projectWorkspaces,
    loading,
    error,
    fetchProjectWorkspaces,
    deleteProjectWorkspace,
    openCreateModal,
    openEditModal,
    closeModal,
    modalOpen,
    editingProject,
    createProjectWorkspace,
    updateProjectWorkspace,
  } = useProjectWorkspaceStore();
  
  const [deleteConfirm, setDeleteConfirm] = useState<ProjectWorkspaceWithRelations | null>(null);
  
  useEffect(() => {
    fetchProjectWorkspaces();
  }, [fetchProjectWorkspaces]);
  
  const handleDelete = async (project: ProjectWorkspaceWithRelations) => {
    try {
      await deleteProjectWorkspace(project.id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error("删除失败:", error);
    }
  };
  
  const handleCreateSubmit = async (data: { name: string; enterprise_info_id: string; task_type_id: string }) => {
    await createProjectWorkspace(data);
  };
  
  const handleEditSubmit = async (data: { name: string; enterprise_info_id: string; task_type_id: string }) => {
    if (editingProject) {
      await updateProjectWorkspace(editingProject.id, data);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* 页面标题 */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">项目空间</h1>
            <p className="mt-2 text-gray-600">管理您的专利撰写项目空间</p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + 新建项目空间
          </button>
        </div>
        
        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        
        {/* 加载状态 */}
        {loading && (
          <div className="text-center py-12 text-gray-500">
            加载中...
          </div>
        )}
        
        {/* 空状态 */}
        {!loading && projectWorkspaces.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无项目空间</h3>
            <p className="text-gray-500 mb-4">创建您的第一个项目空间开始专利撰写</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              创建项目空间
            </button>
          </div>
        )}
        
        {/* 项目空间列表 - 卡片布局 */}
        {!loading && projectWorkspaces.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectWorkspaces.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{project.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(project)}
                      className="text-blue-600 hover:text-blue-800 transition"
                      title="编辑"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(project)}
                      className="text-red-600 hover:text-red-800 transition"
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>🏢</span>
                    <span>{project.enterprise_info?.name || "未设置企业"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📄</span>
                    <span>{project.task_type?.name || "未设置任务类型"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🕒</span>
                    <span>更新于 {new Date(project.updated_at).toLocaleDateString("zh-CN")}</span>
                  </div>
                </div>
                
                {/* 进入项目空间按钮 */}
                <button
                  onClick={() => {
                    // TODO: 跳转到项目空间详情页（当前主页面）
                    window.location.href = `/project/${project.id}`;
                  }}
                  className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  进入项目空间 →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 创建/编辑弹窗 */}
      {modalOpen && (
        <ProjectWorkspaceModal
          editingProject={editingProject}
          onSubmit={editingProject ? handleEditSubmit : handleCreateSubmit}
          onClose={closeModal}
        />
      )}
      
      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">确认删除</h3>
            <p className="text-gray-600 mb-6">
              确定要删除项目空间「{deleteConfirm.name}」吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
