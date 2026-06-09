import { api } from './api'
import type { ProjectWorkspaceWithRelations, ProjectWorkspaceCreateRequest, ProjectWorkspaceUpdateRequest } from "../types/projectWorkspace";

/** 获取项目空间列表 */
export async function getProjectWorkspaces(skip = 0, limit = 100): Promise<ProjectWorkspaceWithRelations[]> {
  return api.get("project-workspaces", { searchParams: { skip, limit } }).json<ProjectWorkspaceWithRelations[]>();
}

/** 获取单个项目空间 */
export async function getProjectWorkspace(id: string): Promise<ProjectWorkspaceWithRelations> {
  return api.get(`project-workspaces/${id}`).json<ProjectWorkspaceWithRelations>();
}

/** 创建项目空间 */
export async function createProjectWorkspace(data: ProjectWorkspaceCreateRequest): Promise<ProjectWorkspaceWithRelations> {
  return api.post("project-workspaces", { json: data }).json<ProjectWorkspaceWithRelations>();
}

/** 更新项目空间 */
export async function updateProjectWorkspace(id: string, data: ProjectWorkspaceUpdateRequest): Promise<ProjectWorkspaceWithRelations> {
  return api.put(`project-workspaces/${id}`, { json: data }).json<ProjectWorkspaceWithRelations>();
}

/** 删除项目空间 */
export async function deleteProjectWorkspace(id: string): Promise<void> {
  await api.delete(`project-workspaces/${id}`);
}
