/** 任务类型 */
export interface TaskType {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

/** 创建任务类型请求 */
export interface TaskTypeCreateRequest {
  name: string;
  description?: string | null;
}

/** 更新任务类型请求 */
export interface TaskTypeUpdateRequest {
  name?: string;
  description?: string | null;
}
