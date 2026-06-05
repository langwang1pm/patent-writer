import ky from "ky";
import type { ProjectWorkspaceWithRelations, ProjectWorkspaceCreateRequest, ProjectWorkspaceUpdateRequest } from "../types/projectWorkspace";

const api = ky.extend({
  prefixUrl: "/api/v1/project-workspaces",
  headers: {
    "Content-Type": "application/json",
  },
});

/** 获取项目空间列表 */
export async function getProjectWorkspaces(skip = 0, limit = 100): Promise<ProjectWorkspaceWithRelations[]> {
  return api.get("", { searchParams: { skip, limit } }).json<ProjectWorkspaceWithRelations[]>();
}

/** 获取单个项目空间 */
export async function getProjectWorkspace(id: string): Promise<ProjectWorkspaceWithRelations> {
  return api.get(`/${id}`).json<ProjectWorkspaceWithRelations>();
}

/** 创建项目空间 */
export async function createProjectWorkspace(data: ProjectWorkspaceCreateRequest): Promise<ProjectWorkspaceWithRelations> {
  return api.post("", { json: data }).json<ProjectWorkspaceWithRelations>();
}

/** 更新项目空间 */
export async function updateProjectWorkspace(id: string, data: ProjectWorkspaceUpdateRequest): Promise<ProjectWorkspaceWithRelations> {
  return api.put(`/${id}`, { json: data }).json<ProjectWorkspaceWithRelations>();
}

/** 删除项目空间 */
export async function deleteProjectWorkspace(id: string): Promise<void> {
  await api.delete(`/${id}`);
}
