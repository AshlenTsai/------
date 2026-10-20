import { Fragment, useEffect, useRef, useState } from 'react'
import manuscript from '../原始稿件/综述稿.md?raw'
import { Figure, DisclosureFigure, DefenseFigure, GovernanceFigures, type ResearchData } from './components/Charts'
import { IncidentSection } from './components/IncidentSection'
import { PolicySection } from './components/PolicySection'
import './App.css'

const chapterIds = ['introduction', 'incidents', 'companies', 'opinion', 'policy', 'conclusion']
const [body] = manuscript.replace(/\r/g, '').split('\n# 资料来源')
const articleTitle = body.split('\n')[0].replace(/^# /, '')
const chapterMeta = [...body.matchAll(/^## (.+)$/gm)].map((match, index) => ({ id: chapterIds[index], title: match[1].trim() }))
const sections = body.split(/^## /m).slice(1).map((section) => section.slice(section.indexOf('\n')).trim().split(/\n\s*\n/))
const companyBrands = [
  { prefix: 'OpenAI', logo: 'openai', name: 'OpenAI' },
  { prefix: 'Anthropic', logo: 'claude', name: 'Claude' },
  { prefix: 'Google', logo: 'gemini', name: 'Gemini' },
  { prefix: 'Meta', logo: 'meta', name: 'Meta' },
]

function ChatBackground() {
  const decoration = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = decoration.current!
    const main = element.parentElement!
    const article = main.querySelector<HTMLElement>('.article-wrap')!
    const chart = main.querySelector<HTMLElement>('#figure-04 .echart')!
    // 正文高度变化时，让两侧装饰保持与饼图对齐
    const update = () => {
      element.style.top = `${chart.getBoundingClientRect().top - main.getBoundingClientRect().top}px`
      element.style.height = `${chart.offsetHeight}px`
    }
    const observer = new ResizeObserver(update)
    observer.observe(main)
    observer.observe(article)
    update()
    return () => observer.disconnect()
  }, [])
  return <div ref={decoration} className="chat-background" aria-hidden="true">
    {['left', 'right'].map(side => <svg key={side} className={`chat-bubble chat-bubble-${side}`} viewBox="0 0 1024 1024" focusable="false">
      <path d="M511.971005 0.005999c-254.656744 0-461.082249 196.493309-461.082248 438.938271 0 148.159088 82.203069 332.283644 245.550398 397.180856l-48.750145 187.875874 382.436534-161.268707c197.31316-49.77096 342.932709-220.38097 342.932709-423.789023C973.063252 196.498308 766.633748 0.004999 511.971005 0.004999z m121.021018 511.78104V390.27811h121.815873v121.508929H632.992023z m-193.95377 0.047991V390.536063h121.195986v121.298967H439.038253z m-193.935774-0.047991V390.27811H366.196484v121.508929H245.102479z" fill="currentColor" />
    </svg>)}
  </div>
}

function App() {
  const [research, setResearch] = useState<ResearchData | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [active, setActive] = useState('introduction')
  const [progress, setProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    Promise.all(['opinion', 'cyber', 'governance', 'safety-assessments'].map((name) => fetch(`/data/${name}.json`).then((res) => {
      if (!res.ok) throw new Error(`数据读取失败：${name}`)
      return res.json()
    }))).then(([opinion, cyber, governance, safety]) => setResearch({ opinion, cyber, governance, safety })).catch(() => setLoadError(true))
  }, [])

  useEffect(() => {
    const update = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight
      setProgress(available > 0 ? Math.min(100, window.scrollY / available * 100) : 0)
      const anchorTop = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)
      const current = [...document.querySelectorAll<HTMLElement>('[data-chapter]')].filter((el) => el.getBoundingClientRect().top <= anchorTop + 2).at(-1)
      setActive(current?.id ?? chapterIds[0])
    }
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    update()
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [research])

  useEffect(() => {
    if (!research && !loadError) return
    // 图表加载会改变正文高度，布局完成后重新定位当前锚点
    const frame = requestAnimationFrame(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'start' }))
    return () => cancelAnimationFrame(frame)
  }, [research, loadError])

  const figuresAt = (chapter: number, paragraph: number) => {
    if (!research) return null
    if (chapter === 2 && paragraph === 3) return <><GovernanceFigures kind="companies" number="02" data={research.governance} /><DisclosureFigure data={research.safety} /></>
    if (chapter === 3 && paragraph === 1) return <Figure number="04" kind="pace" research={research} />
    if (chapter === 3 && paragraph === 5) return <Figure number="05" kind="opinion" research={research} />
    if (chapter === 5 && paragraph === 1) return <Figure number="08" kind="threat" research={research} />
    if (chapter === 5 && paragraph === 4) return <DefenseFigure />
    return null
  }

  return <>
    <header className="site-header">
      <a className="brand" href="#">{articleTitle}</a>
      <div className="header-right"><span className="course-label">工程伦理 · 专题研究</span><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>目录 ☰</button></div>
    </header>
    <div className="page-shell">
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="sidebar-top"><span className="eyebrow">IN THIS ESSAY</span><span className="sidebar-caption">阅读导航</span></div>
        <nav aria-label="文章目录">{chapterMeta.map((chapter) => <a key={chapter.id} href={`#${chapter.id}`} onClick={() => setMenuOpen(false)} className={active === chapter.id ? 'active' : ''} aria-current={active === chapter.id ? 'location' : undefined}><span className="nav-title">{chapter.title}</span><span className="nav-dot" /></a>)}</nav>
        <div className="sidebar-bottom"><span className="status-dot" /> 公开资料 · 可追溯数据<p>资料检索截至 2026.10.20</p><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><small>阅读进度 <b>{Math.round(progress)}%</b></small></div>
      </aside>
      <main>
        {research && <ChatBackground />}
        <div className="article-wrap">
          <h1 className="article-title">{articleTitle}</h1>
          {loadError && <div role="alert" className="data-error">图表数据未能加载。请检查网络连接后<button onClick={() => window.location.reload()}>重新加载</button>；下方仍可阅读完整稿件。</div>}
          {!research && !loadError && <p className="loading-message" role="status">正在加载公开研究数据…</p>}
          {chapterMeta.map((chapter, index) => <section key={chapter.id} className={`article-section section-${index}`}>
            <h2 id={chapter.id} data-chapter>{chapter.title}</h2>
            {index === 1 ? <IncidentSection paragraphs={sections[index]} /> : index === 4 && research ? <PolicySection paragraphs={sections[index]} data={research.governance} /> : sections[index]?.map((paragraph, p) => {
              const brand = index === 2 ? companyBrands.find(item => paragraph.startsWith(item.prefix)) : undefined
              const text = <p className="body-paragraph">{paragraph.replace(/\[\d+\]/g, '')}</p>
              return <Fragment key={p}>{brand ? <div className="company-paragraph">{text}<div className="company-logo"><img src={`/logos/${brand.logo}.svg`} alt={`${brand.name} 标识`} /></div></div> : text}{figuresAt(index, p)}</Fragment>
            })}
          </section>)}
        </div>
      </main>
    </div>
    {progress > 5 && <button className="back-top" aria-label="返回顶部" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>}
  </>
}

export default App
