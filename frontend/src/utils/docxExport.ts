/**
 * 将 HTML 内容转换为适合 docx 导出的格式
 */
export function htmlToDocxContent(html: string): string {
  // 移除所有 HTML 标签，保留纯文本
  // TODO: 实现真正的 HTML 解析，转换为 docx 结构
  return html.replace(/<[^>]+>/g, '').trim()
}

/**
 * 下载文件
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
