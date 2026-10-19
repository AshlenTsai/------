import { Fragment, useEffect, useState } from 'react'
import manuscript from '../原始稿件/综述稿.md?raw'
import { Figure, DefenseFigure, GovernanceFigures, type ResearchData } from './components/Charts'
import './App.css'

const chapterIds = ['introduction', 'incidents', 'companies', 'opinion', 'policy', 'conclusion']
const [body, bibliography = ''] = manuscript.replace(/\r/g, '').split('\n# 资料来源')
const articleTitle = body.split('\n')[0].replace(/^# /, '')
const chapterMeta = [...body.matchAll(/^## (.+)$/gm)].map((match, index) => ({ id: chapterIds[index], title: match[1].trim() }))
const sections = body.split(/^## /m).slice(1).map((section) => section.slice(section.indexOf('\n')).trim().split(/\n\s*\n/))
const references = [...bibliography.matchAll(/^\[(\d+)\] (.+?)\s*\n\[([^\]]+)\]\(([^)]+)\)/gm)].map((match) => ({ id: match[1], title: match[2], name: match[3], url: match[4].replace(/[?&]utm_source=[^&)]*/g, '') }))

function CitationText({ text }: { text: string }) {
  return <>{text.split(/(\[\d+\])/).map((part, i) => /^\[\d+\]$/.test(part) ? <a className="citation" href={`#ref-${part.slice(1, -1)}`} key={i} title={references.find((ref) => ref.id === part.slice(1, -1))?.title}>{part}</a> : part)}</>
}

function BoundaryArt() {
  return <div className="boundary-art" aria-label="AI 安全研究主题" role="img">
    <div className="art-orbit orbit-outer" /><div className="art-orbit orbit-inner" />
    <span className="art-face">🤗</span>
    <span className="art-chip chip-model">🧠 模型能力</span>
    <span className="art-chip chip-security">🛡️ 安全边界</span>
    <span className="art-chip chip-governance">🌐 公共治理</span>
  </div>
}

function App() {
  const [research, setResearch] = useState<ResearchData | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [active, setActive] = useState('introduction')
  const [progress, setProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    Promise.all(['opinion', 'cyber', 'governance'].map((name) => fetch(`/data/${name}.json`).then((res) => {
      if (!res.ok) throw new Error(`数据读取失败：${name}`)
      return res.json()
    }))).then(([opinion, cyber, governance]) => setResearch({ opinion, cyber, governance })).catch(() => setLoadError(true))
  }, [])

  useEffect(() => {
    const update = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight
      setProgress(available > 0 ? Math.min(100, window.scrollY / available * 100) : 0)
      const current = [...document.querySelectorAll<HTMLElement>('[data-chapter]')].filter((el) => el.getBoundingClientRect().top < 190).at(-1)
      if (current) setActive(current.id)
    }
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [research])

  const figuresAt = (chapter: number, paragraph: number) => {
    if (!research) return null
    if (chapter === 1 && paragraph === 1) return <Figure number="01" kind="capability" research={research} />
    if (chapter === 1 && paragraph === 7) return <GovernanceFigures kind="events" number="02" data={research.governance} />
    if (chapter === 2 && paragraph === 3) return <><GovernanceFigures kind="companies" number="03" data={research.governance} /><Figure number="04" kind="disclosure" research={research} /></>
    if (chapter === 3 && paragraph === 1) return <Figure number="05" kind="pace" research={research} />
    if (chapter === 3 && paragraph === 5) return <Figure number="06" kind="opinion" research={research} />
    if (chapter === 4 && paragraph === 5) return <><GovernanceFigures kind="policies" number="07" data={research.governance} /><GovernanceFigures kind="comparison" number="08" data={research.governance} /></>
    if (chapter === 5 && paragraph === 1) return <Figure number="09" kind="threat" research={research} />
    if (chapter === 5 && paragraph === 4) return <DefenseFigure />
    return null
  }

  return <>
    <div className="reading-progress" style={{ width: `${progress}%` }} />
    <header className="site-header">
      <a className="brand" href="#" aria-label="返回首页"><span className="brand-symbol" aria-hidden="true">🤗</span><span>边界<span className="brand-divider">/</span><span className="brand-en">The Boundary</span></span></a>
      <div className="header-right"><span className="course-label">工程伦理 · 专题研究</span><a href="#sources" className="header-link">参考文献 <span>↗</span></a><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>目录 ☰</button></div>
    </header>
    <div className="page-shell">
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="sidebar-top"><span className="eyebrow">IN THIS ESSAY</span><span className="sidebar-caption">阅读导航</span></div>
        <nav aria-label="文章目录">{chapterMeta.map((chapter) => <a key={chapter.id} href={`#${chapter.id}`} onClick={() => setMenuOpen(false)} className={active === chapter.id ? 'active' : ''}><span className="nav-title">{chapter.title}</span><span className="nav-dot" /></a>)}</nav>
        <div className="sidebar-rule" />
        <a className="sidebar-secondary" href="#sources">↗ <span>参考文献</span><span className="count">29</span></a>
        <div className="sidebar-bottom"><span className="status-dot" /> 公开资料 · 可追溯数据<p>资料检索截至 2026.10.20</p><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><small>阅读进度 <b>{Math.round(progress)}%</b></small></div>
      </aside>
      <main>
        <section className="hero">
          <div className="hero-topline"><span className="issue-tag"><span /> AI SAFETY & GOVERNANCE</span><span className="edition">RESEARCH ESSAY / 2026</span></div>
          <div className="hero-main"><div className="hero-copy"><h1>{articleTitle}</h1><p className="hero-description">一次关于能力跃迁、企业责任与公共治理的观察。<br className="desktop-break" />在人工智能开始行动的时代，重新思考安全的尺度。</p><a className="read-button" href="#introduction">开始阅读 <span>↓</span></a></div><BoundaryArt /></div>
          <div className="hero-meta"><span><i>◷</i> 约 25 分钟阅读</span><span><i>▤</i> 5 个研究章节</span><span><i>▥</i> 10 组交互图表</span><span className="meta-date">2026 年 10 月 · 工程伦理课设</span></div>
        </section>
        <div className="article-wrap">
          <div className="editor-note"><span>阅读提示</span><p>正文保留原稿的论述与引文。交互图表依据公开原始资料重绘，统计口径与核验说明附于各图下方。</p></div>
          {loadError && <div role="alert" className="data-error">图表数据未能加载。请检查网络连接后<button onClick={() => window.location.reload()}>重新加载</button>；下方仍可阅读完整稿件。</div>}
          {!research && !loadError && <p className="loading-message" role="status">正在加载公开研究数据…</p>}
          {chapterMeta.map((chapter, index) => <section key={chapter.id} id={chapter.id} className={`article-section section-${index}`} data-chapter>
            <h2>{chapter.title}</h2>
            {sections[index]?.map((paragraph, p) => <Fragment key={p}><p className="body-paragraph"><CitationText text={paragraph} /></p>{figuresAt(index, p)}</Fragment>)}
          </section>)}
          <section id="sources" className="sources-section" data-chapter>
            <h2>参考文献</h2>
            <ol className="reference-list">{references.map((ref) => <li id={`ref-${ref.id}`} key={ref.id}><span>[{ref.id}]</span><a href={ref.url} target="_blank" rel="noreferrer">{ref.title}<small>{ref.name} ↗</small></a></li>)}</ol>
          </section>
          <footer className="page-footer"><a className="brand" href="#"><span className="brand-symbol" aria-hidden="true">🤗</span>边界 <span className="brand-en">The Boundary</span></a><p>技术向前，思考也应如此。</p><small>工程伦理课设 · 2026<span>基于公开资料的研究性呈现</span></small></footer>
        </div>
      </main>
    </div>
    {progress > 5 && <button className="back-top" aria-label="返回顶部" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>}
  </>
}

export default App
