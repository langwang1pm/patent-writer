import { create } from "zustand";
import type { ProjectWorkspaceWithRelations, ProjectWorkspaceCreateRequest, ProjectWorkspaceUpdateRequest } from "../types/projectWorkspace";
import type { EnterpriseInfo } from "../types/enterpriseInfo";
import type { TaskType } from "../types/taskType";
import * as projectWorkspaceApi from "../services/projectWorkspaceApi";
import * as enterpriseInfoApi from "../services/enterpriseInfoApi";
import * as taskTypeApi from "../services/taskTypeApi";

interface ProjectWorkspaceStore {
  // 项目空间列表
  projectWorkspaces: ProjectWorkspaceWithRelations[];
  loading: boolean;
  error: string | null;
  
  // 企业信息列表（用于下拉选择）
  enterpriseInfos: EnterpriseInfo[];
  // 任务类型列表（用于下拉选择）
  taskTypes: TaskType[];
  
  // 弹窗状态
  modalOpen: boolean;
  editingProject: ProjectWorkspaceWithRelations | null; // null = 创建模式, non-null = 编辑模式
  
  // 加载项目空间列表
  fetchProjectWorkspaces: () => Promise<void>;
  // 加载企业信息列表
  fetchEnterpriseInfos: () => Promise<void>;
  // 加载任务类型列表
  fetchTaskTypes: () => Promise<void>;
  
  // 创建项目空间
  createProjectWorkspace: (data: ProjectWorkspaceCreateRequest) => Promise<void>;
  // 更新项目空间
  updateProjectWorkspace: (id: string, data: ProjectWorkspaceUpdateRequest) => Promise<void>;
  // 删除项目空间
  deleteProjectWorkspace: (id: string) => Promise<void>;
  
  // 弹窗控制
  openCreateModal: () => void;
  openEditModal: (project: ProjectWorkspaceWithRelations) => void;
  closeModal: () => void;
}

export const useProjectWorkspaceStore = create<ProjectWorkspaceStore>((set, get) => ({
  projectWorkspaces: [],
  loading: false,
  error: null,
  enterpriseInfos: [],
  taskTypes: [],
  modalOpen: false,
  editingProject: null,
  
  fetchProjectWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const projectWorkspaces = await projectWorkspaceApi.getProjectWorkspaces();
      set({ projectWorkspaces, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  fetchEnterpriseInfos: async () => {
    try {
      const enterpriseInfos = await enterpriseInfoApi.getEnterpriseInfos();
      set({ enterpriseInfos });
    } catch (error) {
      console.error("Failed to fetch enterprise infos:", error);
    }
  },
  
  fetchTaskTypes: async () => {
    try {
      const taskTypes = await taskTypeApi.getTaskTypes();
      set({ taskTypes });
    } catch (error) {
      console.error("Failed to fetch task types:", error);
    }
  },
  
  createProjectWorkspace: async (data) => {
    set({ loading: true, error: null });
    try {
      const newProject = await projectWorkspaceApi.createProjectWorkspace(data);
      set((state) => ({
        projectWorkspaces: [newProject, ...state.projectWorkspaces],
        loading: false,
        modalOpen: false,
        editingProject: null,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
  
  updateProjectWorkspace: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedProject = await projectWorkspaceApi.updateProjectWorkspace(id, data);
      set((state) => ({
        projectWorkspaces: state.projectWorkspaces.map((p) =>
          p.id === id ? updatedProject : p
        ),
        loading: false,
        modalOpen: false,
        editingProject: null,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
  
  deleteProjectWorkspace: async (id) => {
    set({ loading: true, error: null });
    try {
      await projectWorkspaceApi.deleteProjectWorkspace(id);
      set((state) => ({
        projectWorkspaces: state.projectWorkspaces.filter((p) => p.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
  
  openCreateModal: () => {
    // 打开弹窗时，确保加载了企业和任务类型列表
    const state = get();
    if (state.enterpriseInfos.length === 0) {
      state.fetchEnterpriseInfos();
    }
    if (state.taskTypes.length === 0) {
      state.fetchTaskTypes();
    }
    set({ modalOpen: true, editingProject: null });
  },
  
  openEditModal: (project) => {
    // 打开弹窗时，确保加载了企业和任务类型列表
    const state = get();
    if (state.enterpriseInfos.length === 0) {
      state.fetchEnterpriseInfos();
    }
    if (state.taskTypes.length === 0) {
      state.fetchTaskTypes();
    }
    set({ modalOpen: true, editingProject: project });
  },
  
  closeModal: () => {
    set({ modalOpen: false, editingProject: null });
  },
}));
