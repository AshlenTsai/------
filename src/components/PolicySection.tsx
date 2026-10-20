import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { EventTimeline, GovernanceFigures, type ResearchData } from './Charts'

const countryColors: Record<string, string> = { 美国: '#7f2deb', 中国: '#d92d20', 欧盟: '#155eef' }
const anchors = [
  [0, '2025年12月', '行政令 14365'],
  [0, '2026年3月', '全国 AI 立法框架'],
  [1, '2025年9月', '加州 SB 53'],
  [1, '2026年', '加州独立评估制度'],
  [2, '2026年9月29日', 'S.5576 安全法案'],
  [3, '2023年', '生成式 AI 暂行办法'],
  [4, '2025年', '生成合成内容标识办法'],
  [5, '2026年度', '综合性 AI 立法计划'],
  [6, '2026年3月', '研究推进 AI 立法'],
  [7, '2024年8月1日', 'AI 法案生效'],
  [8, '2025年2月2日', '禁止性规则开始适用'],
  [9, '2025年7月10日', '通用 AI 实践准则'],
  [10, '2025年8月2日', '通用 AI 模型义务'],
  [11, '2026年7月27日', 'AI Omnibus 修订'],
  [12, '2026年8月2日', '透明度规则与监督执法'],
] as const

export function PolicySection({ paragraphs, data }: { paragraphs: string[]; data: ResearchData['governance'] }) {
  const comparisonStart = paragraphs.findIndex(paragraph => paragraph.startsWith('从中国、美国和欧盟的治理路径来看'))
  const body = useRef<HTMLDivElement>(null)
  const events = anchors.map(([paragraph, anchor, title]) => {
    const policy = data.policies.find(item => item.title === title)!
    // SB 53正文叙述的是签署时间，数据同时保留其次年生效日期
    const date = title === '加州 SB 53' ? '2025-09-29' : policy.date
    const status = title === '加州 SB 53' ? '签署 · 次年生效' : policy.status
    return { ...policy, date, status, paragraph, anchor, color: countryColors[policy.country!], track: policy.country, organization: `${policy.country} · ${status}` }
  })
  const julyPolicy = data.policies.find(item => item.title === '研究制定人工智能法')!
  const highlights = [
    ...events.map((event, index) => ({ ...event, timelineIndex: index as number | undefined })),
    { ...julyPolicy, paragraph: 6, anchor: '2026年7月', color: countryColors.中国, timelineIndex: undefined },
  ]
  const [layout, setLayout] = useState({ positions: anchors.map(() => 0), height: 0 })

  useLayoutEffect(() => {
    const element = body.current!
    const measure = () => {
      if (!element.isConnected) return
      const bounds = element.getBoundingClientRect()
      const positions = anchors.map((_, index) => {
        const mark = element.querySelector<HTMLElement>(`[data-policy="${index}"]`)!.getBoundingClientRect()
        return mark.top + mark.height / 2 - bounds.top
      })
      setLayout(previous => previous.height === bounds.height && positions.every((value, index) => value === previous.positions[index]) ? previous : { positions, height: bounds.height })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    document.fonts.ready.then(measure)
    return () => observer.disconnect()
  }, [])

  return <><div className="incident-layout policy-layout">
    <div className="incident-body policy-body" ref={body}>{paragraphs.slice(0, comparisonStart).map((paragraph, p) => {
      const text = paragraph.replace(/\[\d+\]/g, '')
      const parts: ReactNode[] = []
      let cursor = 0
      highlights.filter(event => event.paragraph === p).sort((a, b) => text.indexOf(a.anchor) - text.indexOf(b.anchor)).forEach(event => {
        const start = text.indexOf(event.anchor, cursor)
        parts.push(text.slice(cursor, start), <a key={event.anchor} href={event.sourceUrl} target="_blank" rel="noreferrer" title={`${event.title} · ${event.status}｜${event.detail}`}><mark data-policy={event.timelineIndex} className="date-highlight policy-date" style={{ '--policy-color': event.color } as CSSProperties}>{event.anchor}</mark></a>)
        cursor = start + event.anchor.length
      })
      return <p className="body-paragraph" key={p}>{parts}{text.slice(cursor)}</p>
    })}</div>
    <aside className="incident-timeline policy-timeline" aria-label="中美欧政策时间线"><EventTimeline items={events} positions={layout.positions} height={layout.height} number="06" headingId="policy" /></aside>
  </div>
    <GovernanceFigures kind="comparison" number="07" data={data} />
    {paragraphs.slice(comparisonStart).map((paragraph, index) => <p className="body-paragraph" key={index}>{paragraph.replace(/\[\d+\]/g, '')}</p>)}
  </>
}
