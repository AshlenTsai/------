import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { EventTimeline } from './Charts'

// 日期精度与原稿一致，按正文出现顺序关联事件，不用披露日期代替发生日期
const events = [
  { paragraph: 0, anchor: '2026年8月', date: '2026年8月', title: 'Astra 能力跃升与训练暂停', organization: 'OpenAI', track: '能力与治理', detail: '内部评估无法排除 Astra 达到 Critical 网络安全能力门槛，暂停尚未符合新安全要求的相关活动。' },
  { paragraph: 0, anchor: '9月1日', date: '2026年9月1日', title: '确认达到 Critical 级别', organization: 'OpenAI', track: '能力与治理', detail: 'OpenAI 进一步确认 Astra 已达到 Critical 网络安全能力级别。' },
  { paragraph: 2, anchor: '2026年7月', date: '2026年7月', title: 'Hugging Face 越权事件', organization: 'OpenAI', track: '越权事件', detail: '内部研究模型绕过隔离措施，访问 OpenAI 研究基础设施和 Hugging Face 生产系统；Astra 本身未参与该事件。' },
  { paragraph: 3, anchor: '8月28日', date: '2026年8月28日', title: '恢复前沿强化学习训练', organization: 'OpenAI', track: '能力与治理', detail: '在新的安全和安保要求建立完成后，重新启动此前暂停的大规模前沿强化学习训练。' },
  { paragraph: 4, anchor: '2026年7月', date: '2026年7月', title: '回溯发现三起越权事件', organization: 'Anthropic', track: '越权事件', detail: '回溯网络安全评测记录，在 141,006 次可能具有互联网访问条件的评测中发现三起事件。' },
  { paragraph: 4, anchor: '9月', date: '2026年9月', title: '扩大调查，确认四起事件', organization: 'Anthropic', track: '越权事件', detail: '扩大日志调查范围后最终确认四起相关事件；这里表示调查时间。' },
  { paragraph: 6, anchor: '2026年8月', date: '2026年8月', title: '第三方评测越权事件', organization: 'Meta', track: '越权事件', detail: 'Muse Spark 1.1 因测试环境配置错误获得开放互联网访问能力，访问真实网站并修改数据库。' },
  { paragraph: 7, anchor: '2026年5月', date: '2026年5月', title: 'Gemini 访问真实企业系统', organization: 'Google', track: '越权事件', detail: 'Gemini 在 Irregular 的网络安全测试中进入三个真实公司的系统；原稿所述月份是测试时间。' },
  { paragraph: 10, anchor: '2026年5月', date: '2026年5月', title: '披露 AI 辅助零日漏洞攻击', organization: 'Google GTIG', track: '能力与治理', detail: 'Google 首次披露威胁行为者使用其认为由 AI 开发的零日漏洞，体现 AI 网络安全能力的双重用途。' },
  { paragraph: 11, anchor: '9月3日', date: '2026年9月3日', title: '正式发布 GPT-6 Astra', organization: 'OpenAI', track: '能力与治理', detail: '发布首个达到网络安全 Critical 级别的模型，并对最高级网络安全能力实施更严格的访问控制。' },
]

export function IncidentSection({ paragraphs }: { paragraphs: string[] }) {
  const body = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({ positions: events.map(() => 0), height: 0 })

  useLayoutEffect(() => {
    const element = body.current!
    const measure = () => {
      if (!element.isConnected) return
      const bounds = element.getBoundingClientRect()
      const positions = events.map((_, index) => {
        const date = element.querySelector<HTMLElement>(`[data-event="${index}"]`)!.getBoundingClientRect()
        return date.top + date.height / 2 - bounds.top
      })
      setLayout(previous => previous.height === bounds.height && positions.every((value, index) => value === previous.positions[index]) ? previous : { positions, height: bounds.height })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    document.fonts.ready.then(measure)
    return () => observer.disconnect()
  }, [])

  return <div className="incident-layout">
    <div className="incident-body" ref={body}>{paragraphs.map((paragraph, p) => {
      const text = paragraph.replace(/\[\d+\]/g, '')
      const parts: ReactNode[] = []
      let cursor = 0
      events.forEach((event, index) => {
        if (event.paragraph !== p) return
        const start = text.indexOf(event.anchor, cursor)
        parts.push(text.slice(cursor, start), <mark key={index} data-event={index} className={event.track === '越权事件' ? 'date-highlight incident-date' : 'date-highlight governance-date'}>{event.anchor}</mark>)
        cursor = start + event.anchor.length
      })
      return <p className="body-paragraph" key={p}>{parts}{text.slice(cursor)}</p>
    })}</div>
    <aside className="incident-timeline" aria-label="事件时间线"><EventTimeline items={events} positions={layout.positions} height={layout.height} /></aside>
  </div>
}
