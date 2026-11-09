import { useRef, useState, type ReactNode } from 'react'
import { CATALOG_LEVELS, grammarCatalog, grammarSearchKey, matchesGrammarLevel, type GrammarLevelFilter } from '../../data/grammarCatalog'
import { topicName, type GrammarExercise, type TopicStat } from '../../engine/grammar'
import type { TargetLanguage } from '../../engine/types'
import { BookIcon, ChevronRightIcon, SearchIcon } from '../shared/icons'

export function GrammarCatalog({ language, exercises, stats, category, topic, level, onLevel, onCategory, onTopic, children }: {
  language: TargetLanguage
  exercises: readonly GrammarExercise[]
  stats: readonly TopicStat[]
  category?: string
  topic?: string
  level: GrammarLevelFilter
  onLevel: (level: GrammarLevelFilter) => void
  onCategory: (id?: string) => void
  onTopic: (id: string) => void
  children: ReactNode
}) {
  const [query, setQuery] = useState('')
  const [availability, setAvailability] = useState<'all' | 'ready'>('all')
  const selection = useRef<HTMLElement>(null)
  const showSelection = () => requestAnimationFrame(() => selection.current?.scrollIntoView?.({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }))
  const selectCategory = (id?: string) => { onCategory(id); showSelection() }
  const catalog = grammarCatalog(language)
  const counts = new Map<string, number>()
  for (const e of exercises) if (matchesGrammarLevel(e.level, level)) counts.set(e.topic, (counts.get(e.topic) ?? 0) + 1)
  const progress = new Map(stats.map((s) => [s.topic, s]))
  const terms = grammarSearchKey(query).split(/\s+/).filter(Boolean)
  const shown = catalog.filter((c) => !category || category === c.id).map((c) => ({
    ...c,
    topics: c.topics.filter((t) => (matchesGrammarLevel(t.level, level) || counts.has(t.id)) && (availability === 'all' || counts.has(t.id)) && terms.every((term) => grammarSearchKey(`${c.title} ${c.description} ${t.title} ${t.description} ${topicName(t.id)}`).includes(term))),
  })).filter((c) => c.topics.length > 0)
  const selected = catalog.flatMap((c) => c.topics).find((t) => t.id === topic)
  const selectedCategory = catalog.find((c) => c.id === category)
  const total = catalog.reduce((n, c) => n + c.topics.length, 0)
  const ready = catalog.reduce((n, c) => n + c.topics.filter((t) => exercises.some((e) => e.topic === t.id)).length, 0)
  const listView = !!category || !!terms.length || level !== 'all' || availability !== 'all'

  return <div className="grammar-catalog">
    <div className="grammar-catalog-toolbar">
      <label className="grammar-catalog-search"><SearchIcon size={18} /><input className="input" type="search" aria-label="Dilbilgisi konusu ara" placeholder="Konu veya kalıp ara…" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label className="grammar-catalog-filter"><span className="small muted">Seviye</span><select className="input" value={level} onChange={(e) => onLevel(e.target.value as GrammarLevelFilter)}><option value="all">Tüm seviyeler</option><option value="B2-C1">B2 ve C1</option>{CATALOG_LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label>
      <label className="grammar-catalog-filter"><span className="small muted">İçerik</span><select className="input" value={availability} onChange={(e) => setAvailability(e.target.value as 'all' | 'ready')}><option value="all">Tüm konular</option><option value="ready">Hazır konular</option></select></label>
    </div>

    <section ref={selection} className="grammar-selection card" aria-label="Seçili çalışma">
      <div className="grammar-selection-copy" aria-live="polite"><span className="eyebrow">{selected ? `Konu · ${selected.level}` : selectedCategory ? 'Kategori turu' : 'Karışık tur'}</span><h2 className="section-title">{selected?.title ?? selectedCategory?.title ?? 'Tüm konulardan karışık çalış'}</h2><p className="small muted">{selected?.description ?? selectedCategory?.description ?? 'Hazır sorular arasından, henüz denemediklerin ve zorlandıkların önce gelir.'}</p></div>
      <div className="grammar-selection-actions">{children}</div>
    </section>

    <div className="grammar-catalog-heading">
      <div>{category ? <button className="link" onClick={() => { selectCategory(undefined); setQuery('') }}>← Tüm kategoriler</button> : <h2 className="section-title">Dilbilgisi konuları</h2>}<p className="small muted">{selectedCategory ? selectedCategory.title : `${catalog.length} kategori · ${total} konu · ${ready} konuda alıştırma hazır`}</p></div>
      {(category || topic || query || level !== 'all' || availability !== 'all') && <button className="btn btn-quiet btn-sm" onClick={() => { selectCategory(undefined); setQuery(''); onLevel('all'); setAvailability('all') }}>Seçimi temizle</button>}
    </div>

    {!shown.length && <div className="note" role="status">Bu arama ve filtrelerle eşleşen konu yok. Başka bir sözcük deneyebilir veya seçimi temizleyebilirsin.</div>}
    {!listView ? <div className="grammar-category-grid">{shown.map((c, i) => {
      const withQuestions = c.topics.filter((t) => counts.has(t.id)).length
      return <button className="grammar-category card" key={c.id} onClick={() => selectCategory(c.id)}>
        <span className="grammar-category-mark" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><div><h3 className="section-title">{c.title}</h3><p className="small muted">{c.description}</p><span className="grammar-category-meta small">{c.topics.length} konu · {withQuestions} alıştırmalı</span></div><ChevronRightIcon size={18} />
      </button>
    })}</div> : <div className="grammar-topic-groups">{shown.map((c) => <section className="grammar-topic-group card" key={c.id} aria-label={c.title}>
      <div className="grammar-topic-group-title"><BookIcon size={20} /><h3 className="section-title">{c.title}</h3><span className="small muted">{c.topics.length} konu</span></div>
      <div className="grammar-topic-list">{c.topics.map((t) => {
        const count = counts.get(t.id) ?? 0
        const s = progress.get(t.id)
        return <button className="grammar-topic" key={t.id} aria-pressed={topic === t.id} onClick={() => { onTopic(t.id); showSelection() }}>
          <span className="grammar-topic-level">{t.level}</span><span className="grammar-topic-copy"><strong>{t.title}</strong><span className="small muted">{t.description}</span></span><span className="grammar-topic-meta"><span className={count ? 'grammar-ready' : 'muted'}>{count ? `${count} soru` : exercises.some((e) => e.topic === t.id) ? 'Bu seviyede soru yok' : 'Yakında'}</span>{s && s.answered > 0 && <span className="small muted">%{Math.round(s.accuracy * 100)} doğruluk</span>}</span><ChevronRightIcon size={16} />
        </button>
      })}</div>
    </section>)}</div>}
    <p className="small muted grammar-catalog-note">A1–C2 konu haritası. “Yakında” başlıkları henüz soru içermez; içerikler eklendikçe aynı başlıktan çalışılabilir.</p>
  </div>
}
