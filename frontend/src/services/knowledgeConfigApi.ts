import { api } from './api';

/**
 * 知识库配置相关 API
 */

export interface KnowledgeConfig {
  id?: number;
  name: string;
  description: string;
  dify_dataset_id: string;
  dify_api_key: string;
  dify_base_url: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * 获取所有知识库配置
 */
export async function listKnowledgeConfigs(): Promise<KnowledgeConfig[]> {
  const data = await api.get<{ configs: KnowledgeConfig[] }>('/knowledge/configs').json();
  return data.configs;
}

/**
 * 创建知识库配置
 */
export async function createKnowledgeConfig(
  config: Omit<KnowledgeConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<KnowledgeConfig> {
  const data = await api.post<KnowledgeConfig>('/knowledge/configs', { json: config }).json();
  return data;
}

/**
 * 更新知识库配置
 */
export async function updateKnowledgeConfig(
  id: number,
  config: Partial<KnowledgeConfig>
): Promise<KnowledgeConfig> {
  const data = await api.put<KnowledgeConfig>(`/knowledge/configs/${id}`, { json: config }).json();
  return data;
}

/**
 * 删除知识库配置
 */
export async function deleteKnowledgeConfig(id: number): Promise<void> {
  await api.delete(`/knowledge/configs/${id}`);
}

/**
 * 测试知识库配置连接
 */
export async function testKnowledgeConfigConnection(id: number): Promise<{ success: boolean; message: string }> {
  const data = await api.post<{ success: boolean; message: string }>(`/knowledge/configs/${id}/test`).json();
  return data;
}
