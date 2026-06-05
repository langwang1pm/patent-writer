import type { ProjectWorkspaceWithRelations } from "../../types/projectWorkspace";

interface ProjectWorkspaceModalProps {
  editingProject: ProjectWorkspaceWithRelations | null; // null = 创建模式
  onSubmit: (data: { name: string; enterprise_info_id: string; task_type_id: string }) => Promise<void>;
  onClose: () => void;
}

export default function ProjectWorkspaceModal({ editingProject, onSubmit, onClose }: ProjectWorkspaceModalProps) {
  const { enterpriseInfos, taskTypes } = useProjectWorkspaceStore();
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get("name") as string,
      enterprise_info_id: formData.get("enterprise_info_id") as string,
      task_type_id: formData.get("task_type_id") as string,
    };
    
    // 简单验证
    if (!data.name.trim()) {
      alert("请输入项目空间名称");
      return;
    }
    if (!data.enterprise_info_id) {
      alert("请选择客户企业");
      return;
    }
    if (!data.task_type_id) {
      alert("请选择任务类型");
      return;
    }
    
    await onSubmit(data);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingProject ? "编辑项目空间" : "新建项目空间"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* 项目空间名称 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              项目空间名称 *
            </label>
            <input
              type="text"
              name="name"
              defaultValue={editingProject?.name || ""}
              placeholder="请输入项目空间名称"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>
          
          {/* 客户企业 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              客户企业 *
            </label>
            <select
              name="enterprise_info_id"
              defaultValue={editingProject?.enterprise_info_id || ""}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="">请选择客户企业</option>
              {enterpriseInfos.map((enterprise) => (
                <option key={enterprise.id} value={enterprise.id}>
                  {enterprise.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* 任务类型 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              任务类型（文档类型） *
            </label>
            <select
              name="task_type_id"
              defaultValue={editingProject?.task_type_id || ""}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="">请选择任务类型</option>
              {taskTypes.map((taskType) => (
                <option key={taskType.id} value={taskType.id}>
                  {taskType.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* 按钮组 */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {editingProject ? "保存修改" : "创建项目空间"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 需要导入 useProjectWorkspaceStore
import { useProjectWorkspaceStore } from "../../stores/projectWorkspaceStore";
