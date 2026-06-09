import { api } from './api'
import type { TaskType, TaskTypeCreateRequest, TaskTypeUpdateRequest } from "../types/taskType";

/** 获取任务类型列表 */
export async function getTaskTypes(skip = 0, limit = 100): Promise<TaskType[]> {
  return api.get("task-types", { searchParams: { skip, limit } }).json<TaskType[]>();
}

/** 获取单个任务类型 */
export async function getTaskType(id: string): Promise<TaskType> {
  return api.get(`task-types/${id}`).json<TaskType>();
}

/** 创建任务类型 */
export async function createTaskType(data: TaskTypeCreateRequest): Promise<TaskType> {
  return api.post("task-types", { json: data }).json<TaskType>();
}

/** 更新任务类型 */
export async function updateTaskType(id: string, data: TaskTypeUpdateRequest): Promise<TaskType> {
  return api.put(`task-types/${id}`, { json: data }).json<TaskType>();
}

/** 删除任务类型 */
export async function deleteTaskType(id: string): Promise<void> {
  await api.delete(`task-types/${id}`);
}
