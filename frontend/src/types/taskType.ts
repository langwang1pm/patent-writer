/** 任务类型 */
export interface TaskType {
  id: string;
  task_name: string;
  description?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

/** 创建任务类型请求 */
export interface TaskTypeCreateRequest {
  task_name: string;
  description?: string | null;
}

/** 更新任务类型请求 */
export interface TaskTypeUpdateRequest {
  task_name?: string;
  description?: string | null;
}
