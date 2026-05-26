/**
 * 解析文档中的引用标注
 */

// 引用标注正则表达式
const CITATION_PATTERN = /\[([①-⑩]|\[\d+\])\]/g

interface ParsedCitation {
  mark: string
  position: number
  endPosition: number
}

/**
 * 查找文档中所有的引用标注
 */
export function parseCitations(content: string): ParsedCitation[] {
  const citations: ParsedCitation[] = []
  let match

  while ((match = CITATION_PATTERN.exec(content)) !== null) {
    citations.push({
      mark: match[0],
      position: match.index,
      endPosition: match.index + match[0].length,
    })
  }

  return citations
}

/**
 * 移除文档中的引用标注
 */
export function removeCitations(content: string): string {
  return content.replace(CITATION_PATTERN, '').trim()
}

/**
 * 在指定位置添加引用标注
 */
export function addCitation(content: string, position: number, mark: string): string {
  return content.slice(0, position) + mark + content.slice(position)
}
