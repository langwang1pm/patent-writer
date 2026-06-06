/** 企业信息 */
export interface EnterpriseInfo {
  id: string;
  enterprise_name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

/** 创建企业信息请求 */
export interface EnterpriseInfoCreateRequest {
  enterprise_name: string;
  description?: string | null;
}

/** 更新企业信息请求 */
export interface EnterpriseInfoUpdateRequest {
  enterprise_name?: string;
  description?: string | null;
}
