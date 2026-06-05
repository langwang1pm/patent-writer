/** 项目空间 */
export interface ProjectWorkspace {
  id: string;
  workspace_name: string;
  enterprise_info_id: string;
  task_type_id: string;
  created_at: string;
  updated_at: string;
  enterprise_info?: EnterpriseInfo;
  task_type?: TaskType;
}

/** 创建项目空间请求 */
export interface ProjectWorkspaceCreateRequest {
  workspace_name: string;
  enterprise_info_id: string;
  task_type_id: string;
}

/** 更新项目空间请求 */
export interface ProjectWorkspaceUpdateRequest {
  workspace_name?: string;
  enterprise_info_id?: string;
  task_type_id?: string;
}

/** 项目空间详情（含关联对象） */
export interface ProjectWorkspaceWithRelations extends ProjectWorkspace {
  enterprise_info: EnterpriseInfo;
  task_type: TaskType;
}
