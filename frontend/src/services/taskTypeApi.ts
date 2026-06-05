import ky from "ky";
import type { TaskType, TaskTypeCreateRequest, TaskTypeUpdateRequest } from "../types/taskType";

const api = ky.extend({
  prefixUrl: "/api/v1/task-types",
  headers: {
    "Content-Type": "application/json",
  },
});

/** 获取任务类型列表 */
export async function getTaskTypes(skip = 0, limit = 100): Promise<TaskType[]> {
  return api.get("", { searchParams: { skip, limit } }).json<TaskType[]>();
}

/** 获取单个任务类型 */
export async function getTaskType(id: string): Promise<TaskType> {
  return api.get(`/${id}`).json<TaskType>();
}

/** 创建任务类型 */
export async function createTaskType(data: TaskTypeCreateRequest): Promise<TaskType> {
  return api.post("", { json: data }).json<TaskType>();
}

/** 更新任务类型 */
export async function updateTaskType(id: string, data: TaskTypeUpdateRequest): Promise<TaskType> {
  return api.put(`/${id}`, { json: data }).json<TaskType>();
}

/** 删除任务类型 */
export async function deleteTaskType(id: string): Promise<void> {
  await api.delete(`/${id}`);
}
