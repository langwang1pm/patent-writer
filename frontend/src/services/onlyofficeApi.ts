import { api } from './api'

export interface OnlyOfficeEditorConfig {
  doc_server_url: string
  config: {
    document: {
      fileType: string
      key: string
      title: string
      url: string
      permissions: {
        edit: boolean
        download: boolean
        print: boolean
        review: boolean
      }
    }
    documentType: string
    editorConfig: {
      mode: string
      lang: string
      callbackUrl?: string
      user?: {
        id: string
        name: string
      }
      customization: Record<string, any>
    }
    type: string
    token?: string
  }
}

export const onlyofficeApi = {
  /**
   * 获取 OnlyOffice 编辑器配置
   *
   * @param fileKey 文件标识，格式：
   *   - 知识库文件: "kb:{dify_document_id}"
   *   - 生成文档:   "doc:{document_uuid}" (将来扩展)
   * @param mode 编辑模式: "view" | "edit"
   */
  getEditorConfig: async (
    fileKey: string,
    mode: 'view' | 'edit' = 'view',
  ): Promise<OnlyOfficeEditorConfig> => {
    return api
      .get('onlyoffice/editor-config', {
        searchParams: { file_key: fileKey, mode },
      })
      .json()
  },
}
