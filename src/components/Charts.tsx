import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption, ECElementEvent } from 'echarts'

type Row = { label: string; value: number; groups?: Record<string, number>; series?: string; count?: number; total?: number; disagree?: number }
type Dataset = { id: string; title: string; sourceName: string; sourceUrl: string; localSource?: string; date: string; sample: string; unit: string; note: string; rows: Row[] }
type Collection = { datasets: Dataset[]; verificationNotes: string[] }
type EventItem = { date: string; title: string; organization?: string; track?: string; country?: string; status?: string; detail: string; sourceUrl: string; sourceName: string }
type Measure = { name: string; status: string; detail: string; sourceUrl: string }
type Governance = { events: EventItem[]; policies: EventItem[]; companies: { name: string; measures: Measure[] }[]; verificationNotes: string[] }
type SafetyAssessment = { id: string; brand: string; title: string; date: string; url: string; evidence: string }
type ModelRelease = { brand: string; name: string; year: number; url: string }
type SafetyData = { title: string; start: string; end: string; brands: string[]; years: number[]; unit: string; note: string; records: SafetyAssessment[]; modelReleases: ModelRelease[] }
export type ResearchData = { opinion: Collection; cyber: Collection; governance: Governance; safety: SafetyData }

const colors = ['#155eef', '#d92d20', '#007f6d', '#7f2deb', '#ffd600']
const ink = '#10152e'
const muted = '#334155'
const gridLine = '#e2e8f0'
const brandColors: Record<string, string> = { OpenAI: '#10a37f', Anthropic: '#d97757', Meta: '#0866ff', Grok: '#171717', Gemini: '#8e75ff', DeepSeek: '#4d6bfe', Kimi: '#007aff', Qwen: '#615ced', GLM: '#3859ff' }

function EChart({ option, height = 300, title, onClick }: { option: EChartsOption; height?: number; title: string; onClick?: (event: ECElementEvent) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const instance = useRef<echarts.ECharts | null>(null)
  useEffect(() => {
    const element = container.current!
    const chart = echarts.init(element, undefined, { renderer: 'canvas', devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2) })
    instance.current = chart
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(element)
    return () => { observer.disconnect(); chart.dispose(); instance.current = null }
  }, [])
  useEffect(() => { instance.current?.setOption({ color: colors, textStyle: { fontFamily: 'Inter, Microsoft YaHei, sans-serif', color: ink }, animationDuration: 500, aria: { enabled: true }, ...option }, true) }, [option])
  useEffect(() => {
    const chart = instance.current
    if (chart && onClick) chart.on('click', onClick)
    return () => { chart?.off('click', onClick) }
  }, [onClick])
  return <div className="echart" ref={container} style={{ height }} role="img" aria-label={title} />
}

type FrameProps = { number: string; title: string; subtitle: string; option: EChartsOption; height?: number; note: string; controls?: ReactNode; children?: ReactNode; onClick?: (event: ECElementEvent) => void; type?: string }
function Frame({ number, title, subtitle, option, height = 300, note, controls, children, onClick, type = '数据观察' }: FrameProps) {
  return <figure className="figure" id={`figure-${number}`}>
    <div className="figure-topline"><span>FIGURE {number}<i />{type}</span></div>
    <figcaption><h3>{title}</h3><p>{subtitle}</p></figcaption>
    {controls && <div className="figure-controls"><div className="custom-controls">{controls}</div></div>}
    <EChart option={option} title={title} height={height} onClick={onClick} />
    {children}
    <div className="figure-note"><span>口径说明</span><p>{note}</p></div>
  </figure>
}

function barOption(rows: Row[], unit: string, max?: number): EChartsOption {
  const grouped = [...new Set(rows.map((row) => row.series).filter(Boolean))]
  const labels = [...new Set(rows.map((row) => row.label))]
  return {
    grid: { top: grouped.length ? 45 : 25, bottom: 35, left: 204, right: 65 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true, renderMode: 'richText', valueFormatter: (value) => `${value} ${unit}` },
    legend: grouped.length ? { top: 0, textStyle: { color: muted, fontSize: 11 }, icon: 'roundRect', itemWidth: 12, itemHeight: 8 } : undefined,
    xAxis: { type: 'value', axisLine: { show: true, lineStyle: { color: '#94a3b8', width: 1 } }, axisTick: { show: false }, max, axisLabel: { color: muted, fontSize: 10, formatter: unit === '%' ? '{value}%' : undefined }, splitLine: { lineStyle: { color: gridLine, width: 1, type: 'dashed' } } },
    yAxis: { type: 'category', inverse: true, data: labels, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: ink, fontSize: 12, width: 185, overflow: 'break', lineHeight: 18 } },
    series: grouped.length ? grouped.map((series, i) => ({ type: 'bar' as const, name: series, barMaxWidth: 25, data: labels.map((label) => rows.find((row) => row.label === label && row.series === series)?.value), itemStyle: { color: colors[i ? 2 : 0], borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right' as const, fontSize: 12, color: ink } })) : [{ type: 'bar', barMaxWidth: 36, data: rows.map((row, i) => ({ value: row.value, itemStyle: { color: colors[i % colors.length], borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', color: ink, fontSize: 14, formatter: `{c}${unit === '%' ? '%' : ''}` } }],
    media: [{ query: { maxWidth: 500 }, option: { grid: { left: 128, right: 48 }, yAxis: { axisLabel: { width: 116, fontSize: 10 } } } }],
  }
}

export const Figure = memo(function Figure({ number, kind, research }: { number: string; kind: 'pace' | 'opinion' | 'threat'; research: ResearchData }) {
  const [tab, setTab] = useState(0)
  const [group, setGroup] = useState('总体')
  const [allCountries, setAllCountries] = useState(false)
  const [sortCountries, setSortCountries] = useState(false)
  const ids = { pace: ['ai-development-pace'], opinion: ['pew-ai-concerns', 'ai-risk-source', 'ipsos-government-trust'], threat: ['gtig-disclosures', 'gtig-exploitation'] }
  const dataset = [...research.cyber.datasets, ...research.opinion.datasets].find((entry) => entry.id === ids[kind][tab])!
  let rows = dataset.rows.map((row) => ({ ...row, value: row.groups?.[group] ?? row.value }))
  if (kind === 'opinion' && tab === 2) {
    if (!allCountries) rows = rows.filter((row) => ['新加坡', '印度尼西亚', '30 国平均', '日本', '美国', '英国', '德国', '法国'].includes(row.label))
    if (sortCountries) rows.sort((a, b) => b.value - a.value)
  }
  let option = barOption(rows, dataset.unit, dataset.unit === '%' ? 100 : undefined)
  let height = 280
  const title = dataset.title
  let subtitle = `${dataset.date} · ${dataset.sample}`
  let insight: ReactNode = null
  if (kind === 'pace') {
    option = {
      tooltip: { trigger: 'item', confine: true, renderMode: 'richText', formatter: '{b}：{c}%' },
      series: [{
        type: 'pie', radius: '78%', center: ['50%', '50%'],
        itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
        label: { show: true, position: 'inside', formatter: '{c}%', fontSize: 13, fontWeight: 700 },
        data: rows.map((row, i) => ({ name: row.label, value: row.value, itemStyle: { color: colors[i] }, label: { color: i === 4 ? ink : '#ffffff' } })),
        emphasis: { scaleSize: 6 },
      }],
    }
    height = 320
    insight = <div className="pace-legend">{rows.map((row, i) => <span key={row.label}><i style={{ background: colors[i] }} />{row.label} <b>{row.value}%</b></span>)}</div>
  }
  if (kind === 'opinion' && tab === 2) { height = allCountries ? 1000 : 370; subtitle += ' · 同意比例' }
  const labels = kind === 'opinion' ? ['隐私与治理', '风险来自何处', '跨国监管信任'] : ['漏洞披露', '实际利用']
  const controls = <>
    {ids[kind].length > 1 && <div className="chart-tabs">{ids[kind].map((id, index) => <button key={id} className={tab === index ? 'active' : ''} onClick={() => setTab(index)}>{labels[index]}</button>)}</div>}
    {kind === 'pace' && <label className="chart-select">受访群体 <select value={group} onChange={(event) => setGroup(event.target.value)}>{Object.keys(dataset.rows[0].groups ?? {}).map((label) => <option key={label}>{label}</option>)}</select></label>}
    {kind === 'opinion' && tab === 2 && <div className="country-controls"><label><input type="checkbox" checked={allCountries} onChange={(event) => setAllCountries(event.target.checked)} />全部 30 国</label><label><input type="checkbox" checked={sortCountries} onChange={(event) => setSortCountries(event.target.checked)} />按比例排序</label></div>}
  </>
  return <Frame number={number} title={title} subtitle={subtitle} option={option} height={height} note={dataset.note} controls={controls}>{insight}</Frame>
})

export const DisclosureFigure = memo(function DisclosureFigure({ data }: { data: SafetyData }) {
  const [year, setYear] = useState('全部')
  const years = year === '全部' ? data.years : [Number(year)]
  const records = data.records.filter(record => years.includes(Number(record.date.slice(0, 4))))
  const releases = data.modelReleases.filter(release => years.includes(release.year))
  const totals = data.brands.map(brand => records.filter(record => record.brand === brand).length)
  const releaseTotals = data.brands.map(brand => releases.filter(release => release.brand === brand).length)
  const option: EChartsOption = {
    grid: { left: 105, right: 135, top: 35, bottom: 38 },
    graphic: [{ type: 'text', right: 0, top: 5, style: { text: '报告份数 / 模型发布数', fill: muted, font: '11px "Microsoft YaHei", sans-serif' } }],
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true, renderMode: 'richText', formatter: value => {
        const point = (Array.isArray(value) ? value[0] : value) as { dataIndex: number }
        const brand = data.brands[point.dataIndex]
        const matches = records.filter(record => record.brand === brand)
        const models = releases.filter(release => release.brand === brand)
        const titles = matches.slice(0, 6).map(record => record.title.match(/.{1,32}/g)?.join('\n')).join('\n')
        return `${brand} · ${year === '全部' ? '2023—2026' : year} 年\n报告份数 / 模型发布数：${matches.length} / ${models.length}\n`
          + (titles || '未收录安全评估报告') + (matches.length > 6 ? `\n另有 ${matches.length - 6} 份` : '')
          + '\n\n模型版本：\n' + (models.slice(0, 8).map(model => model.name).join('\n') || '未收录模型发布记录')
          + (models.length > 8 ? `\n另有 ${models.length - 8} 个版本` : '')
      }
    },
    xAxis: { type: 'value', minInterval: 1, name: '份', nameTextStyle: { color: muted }, axisLabel: { color: muted, fontSize: 11 }, splitLine: { lineStyle: { color: gridLine, type: 'dashed' } } },
    yAxis: [
      { type: 'category', inverse: true, data: data.brands, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: ink, fontSize: 13, fontWeight: 600 } },
      { type: 'category', inverse: true, data: totals.map((total, index) => `${total} / ${releaseTotals[index]}`), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: muted, fontSize: 12, margin: 18 } },
    ],
    series: [{
      name: '报告份数', type: 'bar', barWidth: 24,
      data: data.brands.map((brand, index) => ({ value: totals[index], itemStyle: { color: brandColors[brand], borderRadius: [0, 3, 3, 0] } })),
    }],
  }
  return <Frame number="03" title={data.title} subtitle="2023 年 1 月—2026 年 10 月 · 按品牌与年份统计已核实的公开评估文档" type="公开评估" option={option} height={480} note={data.note}
    controls={<div className="chart-tabs" aria-label="安全评估年份">{['全部', ...data.years.map(String)].map(value => <button key={value} aria-pressed={year === value} className={year === value ? 'active' : ''} onClick={() => setYear(value)}>{value === '全部' ? '全部年份' : value + ' 年'}</button>)}</div>}>
    <div className="stat-strip"><div><strong>{records.length}</strong><span>已核实评估文档</span></div><div><strong>{year === '全部' ? '2023—2026' : year}</strong><span>统计年份 · 2026 年截至 10 月 20 日</span></div></div>
  </Frame>
})

export const EventTimeline = memo(function EventTimeline({ items, positions, height, number = '01', headingId = 'incidents' }: { items: (Pick<EventItem, 'date' | 'title' | 'organization' | 'track' | 'detail' | 'status'> & { color?: string })[]; positions: number[]; height: number; number?: string; headingId?: string }) {
  const [selected, setSelected] = useState(0)
  const eventColor = (event: { track?: string; color?: string }) => event.color ?? (event.track === '越权事件' ? colors[1] : colors[0])
  const option: EChartsOption = {
    tooltip: {
      confine: true, renderMode: 'richText',
      formatter: (value) => {
        const event = items[(value as { dataIndex: number }).dataIndex]
        return `${event.date} · ${event.track}${event.status ? ` · ${event.status}` : ''}\n${event.detail.match(/.{1,16}/g)?.join('\n')}`
      },
    },
    series: [{
      type: 'custom', coordinateSystem: 'none', data: items.map((_, index) => index),
      renderItem: (params, api) => {
        const index = params.dataIndex
        const event = items[index]
        const y = positions[index] // 节点中心与正文日期的实际行位置对齐
        const textWidth = api.getWidth() - 40
        return {
          type: 'group', children: [
            ...(index < items.length - 1 ? [{ type: 'line' as const, shape: { x1: 12, y1: y, x2: 12, y2: positions[index + 1] }, style: { stroke: '#d6e0ed', lineWidth: 2 } }] : []),
            { type: 'circle', shape: { cx: 12, cy: y, r: index === selected ? 7 : 5 }, style: { fill: eventColor(event), stroke: '#ffffff', lineWidth: 2 } },
            { type: 'text', style: { x: 30, y: y - 7, text: event.date, fill: eventColor(event), font: 'bold 11px Microsoft YaHei' } },
            { type: 'text', style: { x: 30, y: y + 17, text: event.title, width: textWidth, overflow: 'break', lineHeight: 19, fill: ink, font: 'bold 12px Microsoft YaHei' } },
          ],
        }
      },
    }],
  }
  return <figure className="figure event-timeline" id={`figure-${number}`} aria-labelledby={headingId}>
    <EChart title="与正文日期逐项对齐的事件时间线" height={height} option={option} onClick={(event) => setSelected(event.dataIndex)} />
  </figure>
})

function CompanyMatrix({ number, data }: { number: string; data: Governance }) {
  const [current, setCurrent] = useState<(Measure & { company: string }) | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const names = data.companies[0].measures.map((measure) => measure.name)
  const statusNames = ['资料不足', '制度承诺', '公开实施证据']
  return <figure className="figure" id={`figure-${number}`}>
    <div className="figure-topline"><span>FIGURE {number}<i />定性证据矩阵</span></div>
    <figcaption><h3>企业安全措施，有哪些公开证据？</h3><p>{data.companies.length} 家企业 × {names.length} 项措施 · 点击色块阅读对应依据</p></figcaption>
    <div className="matrix-legend"><span>● 公开实施证据</span><span>◐ 制度承诺</span><span>— 资料不足</span></div>
    <table className="company-matrix" aria-label="企业安全措施公开证据">
      <thead><tr><th scope="col">企业</th>{names.map(name => <th scope="col" key={name}>{name}</th>)}</tr></thead>
      <tbody>{data.companies.map(company => <tr key={company.name}>
        <th scope="row">{company.name}</th>
        {company.measures.map(measure => <td key={measure.name}><button
          className={`matrix-cell status-${statusNames.indexOf(measure.status)}`}
          aria-label={`${company.name} · ${measure.name}：${measure.status}`}
          aria-haspopup="dialog"
          onClick={() => { setCurrent({ ...measure, company: company.name }); dialog.current?.showModal() }}
        >{['—', '◐', '●'][statusNames.indexOf(measure.status)]}</button></td>)}
      </tr>)}</tbody>
    </table>
    <dialog ref={dialog} className="evidence-dialog" aria-labelledby="evidence-dialog-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }}>
      <div className="evidence-dialog-content">
        <div className="evidence-dialog-header"><h3 id="evidence-dialog-title">相关证据</h3><button aria-label="关闭相关证据" onClick={() => dialog.current?.close()}>×</button></div>
        {current && <div className="evidence-detail"><span className="detail-tag">{current.status}</span><h4>{current.company} · {current.name}</h4><p>{current.detail}</p><a href={current.sourceUrl} target="_blank" rel="noreferrer">阅读原始来源 ↗</a></div>}
      </div>
    </dialog>
    <div className="figure-note"><span>口径说明</span><p>由公开资料人工编码，包含企业自报，不能当作安全水平评分。资料不足不代表没有采取措施；第三方能力评测也不等于完整治理审计。</p></div>
  </figure>
}

const comparison = [
  ['治理结构', '中央统筹与分领域规则', '联邦、州与企业多层参与', '欧盟统一规则与分层执法'],
  ['主要工具', '服务管理、内容标识、技术框架', '安全框架、州法、联邦提案', '风险分级、模型义务、合规准则'],
  ['推进方向', '专项规则走向综合立法', '统一联邦框架与州级探索并行', '分阶段适用与监管沙箱'],
  ['共同难题', '能力、权限与责任如何衔接', '能力、权限与责任如何衔接', '能力、权限与责任如何衔接'],
]
function Comparison({ number }: { number: string }) {
  return <figure className="figure" id={`figure-${number}`}>
    <div className="figure-topline"><span>FIGURE {number}<i />综合比较</span></div>
    <figcaption><h3 id="comparison-title">三条治理路径</h3><p>制度结构的定性对照</p></figcaption>
    <table className="governance-comparison" aria-labelledby="comparison-title">
      <thead><tr><th scope="col">比较维度</th>{['中国', '美国', '欧盟'].map(country => <th scope="col" key={country}>{country}</th>)}</tr></thead>
      <tbody>{comparison.map(([dimension, ...measures]) => <tr key={dimension}>
        <th scope="row">{dimension}</th>{measures.map((measure, index) => <td key={index}>{measure}</td>)}
      </tr>)}</tbody>
    </table>
    <div className="figure-note"><span>口径说明</span><p>本图为基于政策文件的研究性归纳，没有把不同层级法规数量直接比较，也不构成监管严格程度排名。</p></div>
  </figure>
}

export const GovernanceFigures = memo(function GovernanceFigures({ kind, number, data }: { kind: 'companies' | 'comparison'; number: string; data: Governance }) {
  if (kind === 'companies') return <CompanyMatrix number={number} data={data} />
  if (kind === 'comparison') return <Comparison number={number} />
  return null
})

const layers = [
  { title: '模型能力', actions: '能力评估 · 危险行为测试 · 模型对齐', detail: '在训练与部署前评估高风险能力，明确能力门槛，并检验模型在环境信息与任务目标冲突时能否停止。', question: '它能够做什么？', color: '#155eef' },
  { title: '运行环境', actions: '沙箱隔离 · 身份认证 · 最小权限', detail: '限制可访问的网络、文件、身份凭据与计算资源，使工具权限与任务需求匹配，并独立验证隔离是否有效。', question: '它被允许做什么？', color: '#d92d20' },
  { title: '行为监督', actions: '实时监测 · 异常阻断 · 人工确认', detail: '记录完整执行轨迹，对异常访问及时阻断；对关键操作设置人工确认与可以实际执行的紧急停止机制。', question: '如何及时发现并停止？', color: '#007f6d' },
  { title: '外部治理', actions: '独立评测 · 事故报告 · 法律责任', detail: '通过独立安全评估、重大事故报告和责任制度减少信息不对称，使企业技术措施接受外部监督。', question: '谁来监督并承担责任？', color: '#7f2deb' },
]
export const DefenseFigure = memo(function DefenseFigure() {
  const [selected, setSelected] = useState(0)
  return <figure className="figure" id="figure-09">
    <div className="figure-topline"><span>FIGURE 09<i />概念模型</span></div>
    <figcaption><h3>相互衔接的安全体系</h3></figcaption>
    <div className="defense-layout">
      <ol className="defense-flow" aria-label="四层防护流程">
        {layers.map((layer, index) => <li key={layer.title}>
          <button className="defense-step" style={{ background: layer.color }} aria-label={layer.title} aria-pressed={selected === index} aria-controls="defense-detail" onClick={() => setSelected(index)}>
            <strong><span>0{index + 1}</span>{layer.title}</strong><span>{layer.actions}</span>
          </button>
        </li>)}
      </ol>
      <div className="evidence-detail defense-detail" id="defense-detail" aria-live="polite">
        <span className="detail-tag">LAYER 0{selected + 1}</span><h4>{layers[selected].question}</h4><p>{layers[selected].detail}</p>
      </div>
    </div>
  </figure>
})
