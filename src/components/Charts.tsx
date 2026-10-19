import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption, ECElementEvent } from 'echarts'

type Row = { label: string; value: number; groups?: Record<string, number>; series?: string; count?: number; total?: number; disagree?: number }
type Dataset = { id: string; title: string; sourceName: string; sourceUrl: string; localSource?: string; date: string; sample: string; unit: string; note: string; rows: Row[] }
type Collection = { datasets: Dataset[]; verificationNotes: string[] }
type EventItem = { date: string; title: string; organization?: string; track?: string; country?: string; status?: string; detail: string; sourceUrl: string; sourceName: string }
type Measure = { name: string; status: string; detail: string; sourceUrl: string }
type Governance = { events: EventItem[]; policies: EventItem[]; companies: { name: string; measures: Measure[] }[]; verificationNotes: string[] }
export type ResearchData = { opinion: Collection; cyber: Collection; governance: Governance }

const colors = ['#f5b928', '#fbd675', '#60a5fa', '#a78bfa', '#d1d5db']
const ink = '#374151'
const muted = '#6b7280'
const gridLine = '#e5e7eb'

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

type FrameProps = { number: string; title: string; subtitle: string; option: EChartsOption; height?: number; sources?: { name: string; url: string }[]; note: string; controls?: ReactNode; children?: ReactNode; onClick?: (event: ECElementEvent) => void; type?: string }
function Frame({ number, title, subtitle, option, height = 300, sources = [], note, controls, children, onClick, type = '数据观察' }: FrameProps) {
  return <figure className="figure" id={`figure-${number}`}>
    <div className="figure-topline"><span>FIGURE {number}<i />{type}</span></div>
    <figcaption><h3>{title}</h3><p>{subtitle}</p></figcaption>
    {controls && <div className="figure-controls"><div className="custom-controls">{controls}</div></div>}
    <EChart option={option} title={title} height={height} onClick={onClick} />
    {children}
    <div className="figure-note"><span>口径说明</span><p>{note}</p></div>
    {sources.length > 0 && <div className="figure-sources"><span>来源</span>{sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a>)}</div>}
  </figure>
}

function barOption(rows: Row[], unit: string, max?: number): EChartsOption {
  const grouped = [...new Set(rows.map((row) => row.series).filter(Boolean))]
  const labels = [...new Set(rows.map((row) => row.label))]
  return {
    grid: { top: grouped.length ? 45 : 25, bottom: 35, left: 204, right: 65 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true, renderMode: 'richText', valueFormatter: (value) => `${value} ${unit}` },
    legend: grouped.length ? { top: 0, textStyle: { color: muted, fontSize: 11 }, icon: 'roundRect', itemWidth: 12, itemHeight: 8 } : undefined,
    xAxis: { type: 'value', max, axisLabel: { color: muted, fontSize: 10, formatter: unit === '%' ? '{value}%' : undefined }, splitLine: { lineStyle: { color: gridLine, type: 'dashed' } } },
    yAxis: { type: 'category', inverse: true, data: labels, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: ink, fontSize: 12, width: 185, overflow: 'break', lineHeight: 18 } },
    series: grouped.length ? grouped.map((series, i) => ({ type: 'bar' as const, name: series, barMaxWidth: 25, data: labels.map((label) => rows.find((row) => row.label === label && row.series === series)?.value), itemStyle: { color: colors[i ? 2 : 0], borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right' as const, fontSize: 12, color: ink } })) : [{ type: 'bar', barMaxWidth: 36, data: rows.map((row, i) => ({ value: row.value, itemStyle: { color: colors[i % colors.length], borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', color: ink, fontSize: 14, formatter: `{c}${unit === '%' ? '%' : ''}` } }],
    media: [{ query: { maxWidth: 500 }, option: { grid: { left: 128, right: 48 }, yAxis: { axisLabel: { width: 116, fontSize: 10 } } } }],
  }
}

function sourcesFor(dataset: Dataset) {
  return [{ name: dataset.sourceName, url: dataset.sourceUrl }, ...(dataset.localSource ? [{ name: '原始资料存档', url: dataset.localSource }] : [])]
}

export const Figure = memo(function Figure({ number, kind, research }: { number: string; kind: 'capability' | 'disclosure' | 'pace' | 'opinion' | 'threat'; research: ResearchData }) {
  const [tab, setTab] = useState(0)
  const [group, setGroup] = useState('总体')
  const [allCountries, setAllCountries] = useState(false)
  const [sortCountries, setSortCountries] = useState(false)
  const ids = { capability: ['aisi-doubling'], disclosure: ['model-disclosure'], pace: ['ai-development-pace'], opinion: ['pew-ai-concerns', 'ai-risk-source', 'ipsos-government-trust'], threat: ['gtig-disclosures', 'gtig-exploitation'] }
  const dataset = [...research.cyber.datasets, ...research.opinion.datasets].find((entry) => entry.id === ids[kind][tab])!
  let rows = dataset.rows.map((row) => ({ ...row, value: row.groups?.[group] ?? row.value }))
  if (kind === 'opinion' && tab === 2) {
    if (!allCountries) rows = rows.filter((row) => ['新加坡', '印度尼西亚', '30 国平均', '日本', '美国', '英国', '德国', '法国'].includes(row.label))
    if (sortCountries) rows.sort((a, b) => b.value - a.value)
  }
  let option = barOption(rows, dataset.unit, dataset.unit === '%' && kind !== 'disclosure' ? 100 : undefined)
  let height = 280
  let title = dataset.title
  let subtitle = `${dataset.date} · ${dataset.sample}`
  let insight: ReactNode = null
  if (kind === 'capability') {
    title = '自主网络能力，进步得有多快？'
    insight = <div className="insight-row"><div><strong>8 <span>个月</span><i>→</i>4.7 <span>个月</span></strong><p>两次研究估计的能力翻倍周期</p></div><span className="insight-label">80% 任务成功率<br />受控评测环境</span></div>
  }
  if (kind === 'disclosure') {
    insight = <div className="stat-strip"><div><strong>857</strong><span>模型发布总数</span></div><div><strong>31</strong><span>有公开安全结果</span></div><div><strong>9</strong><span>发布时或之前公开</span></div></div>
    option = barOption(rows, '%', 5)
    height = 225
  }
  if (kind === 'pace') {
    const total = rows.reduce((sum, row) => sum + row.value, 0)
    option = {
      tooltip: { trigger: 'item', confine: true, renderMode: 'richText', formatter: '{a}：{c}%' },
      grid: { left: 5, right: 5, top: 30, bottom: 35 },
      xAxis: { type: 'value', max: Math.max(100, total), axisLabel: { formatter: '{value}%', color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: gridLine } } },
      yAxis: { type: 'category', data: [''], show: false },
      series: rows.map((row, i) => ({ name: row.label, type: 'bar', stack: 'total', barWidth: 70, data: [row.value], itemStyle: { color: colors[i] }, label: { show: true, position: 'inside', color: ink, formatter: '{c}%', fontSize: 14 } })),
    }
    height = 170
    insight = <><div className="pace-legend">{rows.map((row, i) => <span key={row.label}><i style={{ background: colors[i] }} />{row.label} <b>{row.value}%</b></span>)}</div><div className="chart-takeaway"><strong>{rows[0].value + rows[1].value}%</strong><p>{group === '总体' ? '受访者' : `${group}受访者`}选择暂停或放慢研发<br /><span>两项选择均以完成安全评估为条件</span></p></div></>
  }
  if (kind === 'opinion' && tab === 2) { height = allCountries ? 1000 : 370; subtitle += ' · 同意比例' }
  const labels = kind === 'opinion' ? ['隐私与治理', '风险来自何处', '跨国监管信任'] : ['漏洞披露', '实际利用']
  const controls = <>
    {ids[kind].length > 1 && <div className="chart-tabs">{ids[kind].map((id, index) => <button key={id} className={tab === index ? 'active' : ''} onClick={() => setTab(index)}>{labels[index]}</button>)}</div>}
    {kind === 'pace' && <label className="chart-select">受访群体 <select value={group} onChange={(event) => setGroup(event.target.value)}>{Object.keys(dataset.rows[0].groups ?? {}).map((label) => <option key={label}>{label}</option>)}</select></label>}
    {kind === 'opinion' && tab === 2 && <div className="country-controls"><label><input type="checkbox" checked={allCountries} onChange={(event) => setAllCountries(event.target.checked)} />全部 30 国</label><label><input type="checkbox" checked={sortCountries} onChange={(event) => setSortCountries(event.target.checked)} />按比例排序</label></div>}
  </>
  return <Frame number={number} title={title} subtitle={subtitle} option={option} height={height} note={dataset.note} sources={sourcesFor(dataset)} controls={controls}>{insight}</Frame>
})

function Timeline({ kind, number, data }: { kind: 'events' | 'policies'; number: string; data: Governance }) {
  const [selected, setSelected] = useState(0)
  const [filter, setFilter] = useState('全部')
  const policy = kind === 'policies'
  const allItems = policy ? data.policies : data.events
  const category = (item: EventItem) => (policy ? item.country : item.track)!
  const lanes = policy ? ['中国', '美国'] : ['能力与治理', '越权事件']
  const items = allItems.filter((item) => filter === '全部' || category(item) === filter)
  const current = items[Math.min(selected, items.length - 1)]
  const option: EChartsOption = {
    grid: { top: 50, bottom: 60, left: policy ? 50 : 86, right: 25 },
    tooltip: { trigger: 'item', confine: true, renderMode: 'richText', formatter: (value) => { const p = value as { dataIndex: number }; const item = items[p.dataIndex]; return `${item.date}\n${item.title}\n${item.status || item.organization}\n点击查看详情与来源` } },
    xAxis: { type: 'time', min: policy ? '2023-05-01' : '2026-07-01', max: '2026-11-01', axisLine: { lineStyle: { color: gridLine } }, axisLabel: { color: muted, fontSize: 10, formatter: policy ? '{yyyy}-{MM}' : '{MM}/{dd}', hideOverlap: true }, splitLine: { show: false } },
    yAxis: { type: 'category', data: lanes, axisLabel: { color: ink, fontSize: 11 }, axisTick: { show: false }, axisLine: { show: false }, splitLine: { show: true, lineStyle: { color: gridLine } } },
    dataZoom: [{ type: 'slider', height: 15, bottom: 3, borderColor: gridLine, fillerColor: '#facc1525', handleStyle: { color: '#eab308' }, textStyle: { fontSize: 9, color: muted }, brushSelect: false }],
    series: [{ type: 'scatter', symbolSize: 15, data: items.map((item, i) => ({ value: [item.date, category(item)], name: item.title, symbol: item.status === '提案' ? 'triangle' : item.status === '已发布' ? 'diamond' : 'circle', itemStyle: { color: category(item) === lanes[0] ? colors[2] : colors[0], borderWidth: i === selected ? 4 : 2, borderColor: i === selected ? '#fde68a' : '#ffffff' }, label: { show: true, formatter: policy ? (item.title.length > 11 ? item.title.slice(0, 10) + '…' : item.title) : item.organization, position: i % 2 ? 'bottom' : 'top', fontSize: 10, color: ink, distance: 10 } })), labelLayout: { hideOverlap: true }, emphasis: { scale: 1.5 } }],
  }
  return <Frame number={number} title={policy ? '中美 AI 治理：沿时间线看制度演进' : '能力进展与安全事件的两条时间线'} subtitle={policy ? '2023—2026 · 点击节点查看法律状态与官方原文' : '2026 年 7—10 月 · 以公开披露与治理行动日期为准'} type="证据时间线" option={option} height={300} note={policy ? '● 已生效　◆ 已发布　▲ 提案。政策框架、行政令和立法计划不等于国会或立法机关已通过的统一 AI 法；状态截至 2026-10-20。' : '本图是精选案例，不是事故发生率统计。披露日期可能晚于实际发生时间；可拖动下方滑块缩放时间范围。'} controls={<label className="chart-select">筛选 <select value={filter} onChange={(event) => { setFilter(event.target.value); setSelected(0) }}>{['全部', ...lanes].map((lane) => <option key={lane}>{lane}</option>)}</select></label>} onClick={(event) => setSelected(event.dataIndex)} sources={[{ name: current.sourceName, url: current.sourceUrl }]}>
    <div className="timeline-node-list" aria-label="选择时间节点">{items.map((item, i) => <button key={`${item.date}-${item.title}`} className={selected === i ? 'active' : ''} onClick={() => setSelected(i)}>{item.date.slice(5)} · {item.title}</button>)}</div>
    {current && <div className="evidence-detail"><span className="detail-tag">{current.status || current.organization}</span><h4>{current.date} · {current.title}</h4><p>{current.detail}</p><a href={current.sourceUrl} target="_blank" rel="noreferrer">{current.sourceName} ↗</a></div>}
  </Frame>
}

function CompanyMatrix({ number, data }: { number: string; data: Governance }) {
  const [selected, setSelected] = useState(0)
  const names = data.companies[0].measures.map((measure) => measure.name)
  const statusNames = ['资料不足', '制度承诺', '公开实施证据']
  const flat = data.companies.flatMap((company, y) => company.measures.map((measure, x) => ({ ...measure, company: company.name, value: [x, y, statusNames.indexOf(measure.status)] })))
  const current = flat[selected]
  const option: EChartsOption = {
    grid: { top: 25, bottom: 50, left: 105, right: 10 },
    tooltip: { position: 'top', confine: true, renderMode: 'richText', formatter: (value) => { const item = flat[(value as { dataIndex: number }).dataIndex]; return `${item.company} · ${item.name}\n${item.status}\n点击查看证据` } },
    xAxis: { type: 'category', data: names, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: ink, fontSize: 11 } },
    yAxis: { type: 'category', inverse: true, data: data.companies.map((company) => company.name.replace(' DeepMind', '\nDeepMind')), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: ink, fontSize: 12, lineHeight: 16 } },
    visualMap: { show: false, type: 'piecewise', pieces: [{ value: 0, color: '#f3f4f6' }, { value: 1, color: '#fef3c7' }, { value: 2, color: '#a7d8c0' }] },
    series: [{ type: 'heatmap', data: flat.map((item) => item.value), itemStyle: { borderWidth: 7, borderColor: '#ffffff', borderRadius: 10 }, label: { show: true, color: '#374151', fontSize: 16, formatter: (params) => ['—', '◐', '●'][(params.value as number[])[2]] }, emphasis: { itemStyle: { borderColor: '#eab308', borderWidth: 2 } } }],
    media: [{ query: { maxWidth: 500 }, option: { grid: { left: 75 }, xAxis: { axisLabel: { fontSize: 10, formatter: (value: string) => value.slice(0, 2) + '\n' + value.slice(2) } }, yAxis: { axisLabel: { fontSize: 10 } } } }],
  }
  return <Frame number={number} title="企业安全措施，有哪些公开证据？" subtitle="4 家企业 × 6 项措施 · 点击色块阅读对应依据" type="定性证据矩阵" option={option} height={300} note="由公开资料人工编码，包含企业自报，不能当作安全水平评分。资料不足不代表没有采取措施；第三方能力评测也不等于完整治理审计。" sources={[{ name: current.company, url: current.sourceUrl }]} onClick={(event) => setSelected(event.dataIndex)} controls={<div className="matrix-legend"><span>● 公开实施证据</span><span>◐ 制度承诺</span><span>— 资料不足</span></div>}>
    <label className="chart-select evidence-select">查看证据 <select value={selected} onChange={(event) => setSelected(Number(event.target.value))}>{flat.map((item, i) => <option key={`${item.company}-${item.name}`} value={i}>{item.company} · {item.name}</option>)}</select></label>
    <div className="evidence-detail"><span className="detail-tag">{current.status}</span><h4>{current.company} · {current.name}</h4><p>{current.detail}</p><a href={current.sourceUrl} target="_blank" rel="noreferrer">查看原始证据 ↗</a></div>
  </Frame>
}

const comparison = [
  ['治理结构', '中央统筹与分领域规则', '联邦、州与企业多层参与'],
  ['主要工具', '服务管理、内容标识、技术框架', '安全框架、州法、联邦提案'],
  ['推进方向', '专项规则走向综合立法', '统一联邦框架与州级探索并行'],
  ['共同难题', '能力、权限与责任如何衔接', '能力、权限与责任如何衔接'],
]
function Comparison({ number, data }: { number: string; data: Governance }) {
  const [selected, setSelected] = useState(0)
  const option: EChartsOption = {
    grid: { top: 45, bottom: 15, left: 80, right: 10 },
    visualMap: { show: false, min: 0, max: 1, inRange: { color: ['#eff6ff', '#fffbeb'] } },
    tooltip: { confine: true, renderMode: 'richText', formatter: (value) => { const [x, y] = (value as { value: number[] }).value; return `${['中国', '美国'][x]} · ${comparison[y][0]}\n${comparison[y][x + 1]}` } },
    xAxis: { type: 'category', position: 'top', data: ['中国', '美国'], axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 14, color: ink } },
    yAxis: { type: 'category', inverse: true, data: comparison.map((item) => item[0]), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 11, color: muted } },
    series: [{ type: 'heatmap', data: comparison.flatMap((item, y) => [0, 1].map((x) => ({ value: [x, y, 1], itemStyle: { color: x === 0 ? '#eff6ff' : '#fffbeb', borderColor: '#ffffff', borderWidth: 6 }, label: { show: true, color: ink, fontSize: 12, formatter: item[x + 1].replace('、', '、\n').replace('与州级', '\n与州级').replace('走向', '\n走向').replace('如何', '\n如何') } }))), emphasis: { itemStyle: { borderColor: '#eab308', borderWidth: 2 } } }],
    media: [{ query: { maxWidth: 500 }, option: { grid: { left: 60 }, series: [{ label: { fontSize: 10 } }] } }],
  }
  return <Frame number={number} title="两条治理路径，同一个核心问题" subtitle="制度结构的定性对照 · 点击维度查看对应说明" type="综合比较" option={option} height={350} note="本图为基于政策文件的研究性归纳，没有把不同层级法规数量直接比较，也不构成监管严格程度排名。" sources={[{ name: '中国政策依据', url: data.policies.find((item) => item.country === '中国')!.sourceUrl }, { name: '美国政策依据', url: data.policies.find((item) => item.title.includes('立法框架'))!.sourceUrl }]} onClick={(event) => setSelected(Math.floor(event.dataIndex / 2))}>
    <div className="evidence-detail"><h4>{comparison[selected][0]}</h4><p>中国：{comparison[selected][1]}。美国：{comparison[selected][2]}。</p><p>进一步的证据与法律状态，可在上方政策时间线中逐项查阅。</p></div>
  </Frame>
}

export const GovernanceFigures = memo(function GovernanceFigures({ kind, number, data }: { kind: 'events' | 'companies' | 'policies' | 'comparison'; number: string; data: Governance }) {
  if (kind === 'companies') return <CompanyMatrix number={number} data={data} />
  if (kind === 'comparison') return <Comparison number={number} data={data} />
  return <Timeline number={number} kind={kind} data={data} />
})

const layers = [
  { title: '模型能力', actions: '能力评估 · 危险行为测试 · 模型对齐', detail: '在训练与部署前评估高风险能力，明确能力门槛，并检验模型在环境信息与任务目标冲突时能否停止。', question: '它能够做什么？', color: '#d7a222' },
  { title: '运行环境', actions: '沙箱隔离 · 身份认证 · 最小权限', detail: '限制可访问的网络、文件、身份凭据与计算资源，使工具权限与任务需求匹配，并独立验证隔离是否有效。', question: '它被允许做什么？', color: '#7293be' },
  { title: '行为监督', actions: '实时监测 · 异常阻断 · 人工确认', detail: '记录完整执行轨迹，对异常访问及时阻断；对关键操作设置人工确认与可以实际执行的紧急停止机制。', question: '如何及时发现并停止？', color: '#589c87' },
  { title: '外部治理', actions: '独立评测 · 事故报告 · 法律责任', detail: '通过独立安全评估、重大事故报告和责任制度减少信息不对称，使企业技术措施接受外部监督。', question: '谁来监督并承担责任？', color: '#8a83b5' },
]
export const DefenseFigure = memo(function DefenseFigure() {
  const [selected, setSelected] = useState(0)
  const option: EChartsOption = {
    graphic: layers.map((layer, i) => ({
      type: 'group', left: 'center', top: 18 + i * 90, onclick: () => setSelected(i),
      children: [
        { type: 'rect', shape: { x: 0, y: 0, width: 360, height: 66, r: 5 }, style: { fill: layer.color, stroke: i === selected ? '#374151' : layer.color, lineWidth: i === selected ? 2 : 0 } },
        { type: 'text', style: { x: 180, y: 20, text: `${String(i + 1).padStart(2, '0')}   ${layer.title}`, textAlign: 'center', fill: '#fffdf8', font: '14px Microsoft YaHei' } },
        { type: 'text', style: { x: 180, y: 43, text: layer.actions, textAlign: 'center', fill: '#fffdf8', font: '11px Microsoft YaHei' } },
        ...(i < 3 ? [{ type: 'line' as const, shape: { x1: 180, y1: 69, x2: 180, y2: 83 }, style: { stroke: '#cbd5e1', lineWidth: 1 } }, { type: 'polygon' as const, shape: { points: [[176, 80], [184, 80], [180, 85]] }, style: { fill: '#cbd5e1' } }] : []),
      ],
    })),
  }
  return <Frame number="10" title="安全，是一套相互衔接的防护体系" subtitle="从模型到制度的四层防护 · 点击任意层级展开解释" type="概念模型" option={option} height={390} note="本图根据综述结论构建，属于概念性框架，不是实验测量或已验证的防护效果。各层需要共同作用，不能以单一措施替代系统治理。" onClick={(event) => { if (event.dataType === 'node') setSelected(event.dataIndex) }} controls={<div className="chart-tabs">{layers.map((layer, i) => <button key={layer.title} className={selected === i ? 'active' : ''} onClick={() => setSelected(i)}>{layer.title}</button>)}</div>}>
    <div className="evidence-detail"><span className="detail-tag">LAYER 0{selected + 1}</span><h4>{layers[selected].question}</h4><p>{layers[selected].detail}</p></div>
  </Frame>
})
