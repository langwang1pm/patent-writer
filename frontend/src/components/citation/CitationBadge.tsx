import { useState, useRef, useEffect } from 'react'
import { useCitationStore } from '@/stores/citationStore'
import { cn } from '@/utils/cn'

interface CitationBadgeProps {
  /** 显示在徽章上的圈号（如 ① ② ③） */
  refMark: string
  /** 序号（阿拉伯数字，用于 tooltip 中的编号） */
  index: number
  /** 引用来源名称 */
  sourceName: string
  /** 引用片段内容 */
  chunkContent?: string
  /** 引用记录 ID */
  citationId: string
}

/**
 * 行内引用徽章组件
 * 在正文中以绿色圆形序号显示，hover 时浮层显示引用详情
 */
export default function CitationBadge({
  refMark,
  index,
  sourceName,
  chunkContent,
  citationId,
}: CitationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const { activeCitationId, setActiveCitation } = useCitationStore()
  const isActive = activeCitationId === citationId
  const badgeRef = useRef<HTMLSpanElement>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})

  // 计算 tooltip 位置：确保不超出视口
  useEffect(() => {
    if (showTooltip && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect()
      const style: React.CSSProperties = {}
      if (rect.top < 200) {
        style.bottom = 'auto'
        style.top = '100%'
        style.marginTop = 6
      } else {
        style.top = 'auto'
        style.bottom = 'calc(100% + 6px)'
      }
      setTooltipStyle(style)
    }
  }, [showTooltip])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveCitation(activeCitationId === citationId ? null : citationId)
  }

  return (
    <span
      className="inline-flex align-baseline leading-none relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <sup
        ref={badgeRef}
        className={cn(
          'citation-badge inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[11px] font-bold leading-none cursor-pointer select-none align-baseline mx-[1px]',
          'bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700 transition-colors',
          isActive && 'ring-2 ring-sky-300 ring-offset-[0.5px]'
        )}
        title={`${index}. ${sourceName}`}
        onClick={handleClick}
      >
        {refMark}
      </sup>

      {/* 浮层 */}
      {showTooltip && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[100]"
          style={tooltipStyle}
        >
          <div className="bg-white text-gray-800 text-xs rounded-lg px-3 py-2.5 max-w-[320px] shadow-lg border border-gray-200 whitespace-nowrap">
            <p className="font-semibold text-sky-600 text-[11px] mb-1.5">
              引用来源 #{index}
            </p>
            {chunkContent && (
              <div className="text-gray-500 text-[11px] leading-relaxed">
                {chunkContent.split('\\n').map((line, li) => {
                  const uuidMatch = line.match(/^([0-9a-f-]{36})~~~(.+?)~~~(.+)$/)
                  if (uuidMatch) {
                                        const docUuid = uuidMatch[1]
                    const docName = uuidMatch[2]
                    const ext = docName.split('.').pop()?.toLowerCase() || ''
                    const isOffice = ['doc','docx','xls','xlsx','ppt','pptx','odt','ods','odp','csv'].includes(ext)
                    const docUrl = isOffice
                      ? '/preview?fileKey=kb:' + docUuid + '&fileName=' + encodeURIComponent(docName) + '&mode=view'
                      : '/api/v1/knowledge/files/' + docUuid + '/download?disposition=inline'
                    return (
                      <p key={li} className="mb-0.5 last:mb-0 whitespace-pre-wrap break-all">
                        <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 underline font-medium">
                          {docName}
                        </a>
                        ~~~{uuidMatch[3]}
                      </p>
                    )
                  }
                  return <p key={li} className="mb-0.5 last:mb-0 whitespace-pre-wrap break-all">{line}</p>
                })}
              </div>
            )}
          </div>
          {/* 三角箭头 */}
          <div
            className={cn(
              'w-2 h-2 bg-white rotate-45 mx-auto -mt-1 border-l border-t border-gray-200',
              tooltipStyle.bottom ? 'mb-0 mt-[-4px]' : 'mb-[-4px] mt-0'
            )}
          />
        </div>
      )}
    </span>
  )
}

/**
 * 从正文内容中解析【引用来源：...】块，将其替换为 <sup class="citation-ref"> 标签
 *
 * 输入示例:
 *   【引用来源：某某文件.docx - 第5段；第22段】
 *
 * 替换为:
 *   <sup class="citation-ref" data-index="0" data-citation-id="cit-0" data-source="某某文件.docx">①</sup>
 *   <sup class="citation-ref" data-index="1" data-citation-id="cit-1" data-source="某某文件.docx">②</sup>
 */
export ﻿﻿﻿﻿﻿﻿function processCitationContent(
  content: string,
  citations: Array<{ id: string; ref_mark: string; source_name: string; chunk_content?: string }>
): string {
  if (!content) return content

  const CITATION_BLOCK_RE = /【引用来源[：:]\s*([^】]+)】/g
  const dedupMap = new Map<string, number>()
  let badgeSeq = 0

  function formatInner(text: string): string {
    const segRefRe = /[-–—]\s*(第\d+段|Chunk-\d+)/i
    const segMatch = text.match(segRefRe)
    const srcName = segMatch ? text.substring(0, segMatch.index!).trim() : ''
    return text.split(/[；;]/).map(s => s.trim()).filter(Boolean).map(part => {
      if (srcName && !part.match(/(?:[-–—]\s*|~~~)(第\d+段|Chunk-\d+)/i)) {
        return srcName + '- ' + part
      }
      return part
    }).join('\\n')
  }

  return content.replace(CITATION_BLOCK_RE, (_match: string, inner: string) => {
    const dedupKey = inner.trim()
    let badgeNum = dedupMap.get(dedupKey)
    if (badgeNum === undefined) {
      badgeNum = ++badgeSeq
      dedupMap.set(dedupKey, badgeNum)
    }

    const segRefRe = /[-–—]\s*(第\d+段|Chunk-\d+)/i
    const segMatch = inner.match(segRefRe)
    const sourceName = segMatch ? inner.substring(0, segMatch.index!).trim() : inner.trim()

    // 优先精确匹配，降级到模糊匹配
    const exactMatch = sourceName
      ? citations.filter(c => sourceName.length > 0 && c.source_name === dedupKey)
      : []
    const matched = exactMatch.length > 0
      ? exactMatch
      : sourceName
        ? citations.filter(c => sourceName.length > 0 && c.source_name.includes(sourceName))
        : []

    const formatted = formatInner(inner)
    const safeChunk = formatted.replace(/"/g, '&quot;')

    if (matched.length > 0) {
      const cit = matched[0]
      const safeSource = cit.source_name.replace(/"/g, '&quot;')
      return '<sup class="citation-ref" data-citation-id="' + cit.id + '" data-index="' + badgeNum + '" data-source="' + safeSource + '" data-chunk="' + safeChunk + '" data-ref-mark="' + badgeNum + '">' + badgeNum + '</sup>'
    }

    return '<sup class="citation-ref" data-citation-id="" data-index="' + badgeNum + '" data-source="' + safeChunk + '" data-chunk="' + safeChunk + '" data-ref-mark="' + badgeNum + '">' + badgeNum + '</sup>'
  })
}





