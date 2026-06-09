import { api } from './api'
import type { EnterpriseInfo, EnterpriseInfoCreateRequest, EnterpriseInfoUpdateRequest } from "../types/enterpriseInfo";

/** 获取企业信息列表 */
export async function getEnterpriseInfos(skip = 0, limit = 100): Promise<EnterpriseInfo[]> {
  return api.get("", { searchParams: { skip, limit } }).json<EnterpriseInfo[]>();
}

/** 获取单个企业信息 */
export async function getEnterpriseInfo(id: string): Promise<EnterpriseInfo> {
  return api.get(`/${id}`).json<EnterpriseInfo>();
}

/** 创建企业信息 */
export async function createEnterpriseInfo(data: EnterpriseInfoCreateRequest): Promise<EnterpriseInfo> {
  return api.post("", { json: data }).json<EnterpriseInfo>();
}

/** 更新企业信息 */
export async function updateEnterpriseInfo(id: string, data: EnterpriseInfoUpdateRequest): Promise<EnterpriseInfo> {
  return api.put(`/${id}`, { json: data }).json<EnterpriseInfo>();
}

/** 删除企业信息 */
export async function deleteEnterpriseInfo(id: string): Promise<void> {
  await api.delete(`/${id}`);
}
