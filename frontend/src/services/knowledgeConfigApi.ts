import { api } from './api';
import type { KnowledgeConfig } from '@/types/knowledge';

/**
 * 知识库配置相关 API
 */

// 使用 @/types/knowledge 中定义的 KnowledgeConfig 类型

/**
 * 获取所有知识库配置
 */
export async function listKnowledgeConfigs(): Promise<KnowledgeConfig[]> {
  const data = await api.get<{ items: KnowledgeConfig[] }>('/knowledge/configs').json();
  return data.items;
}

/**
 * 创建知识库配置
 */
export async function createKnowledgeConfig(
  config: Omit<KnowledgeConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<KnowledgeConfig> {
  const data = await api.post<{ config: KnowledgeConfig }>('/knowledge/configs', { json: config }).json();
  return data.config;
}

/**
 * 更新知识库配置
 */
export async function updateKnowledgeConfig(
  id: string,
  config: Partial<KnowledgeConfig>
): Promise<KnowledgeConfig> {
  const data = await api.put<{ config: KnowledgeConfig }>(`/knowledge/configs/${id}`, { json: config }).json();
  return data.config;
}

/**
 * 删除知识库配置
 */
export async function deleteKnowledgeConfig(id: string): Promise<void> {
  await api.delete(`/knowledge/configs/${id}`);
}

/**
 * 测试知识库配置连接
 */
export async function testKnowledgeConfigConnection(id: string): Promise<{ success: boolean; message: string }> {
  const data = await api.post<{ success: boolean; message: string }>(`/knowledge/configs/${id}/test`).json();
  return data;
}

/**
 * 导出 API 对象（供 store 使用）
 */
export const knowledgeConfigApi = {
  listKnowledgeConfigs,
  createKnowledgeConfig,
  updateKnowledgeConfig,
  deleteKnowledgeConfig,
  testKnowledgeConfigConnection,
};
