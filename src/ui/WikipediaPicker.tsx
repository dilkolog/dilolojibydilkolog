import { useState } from 'react'
import { analyzeText, coverageZone } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { fetchArticle, searchWikipedia, type WikiResult, type WikiSite } from '../data/wikipedia'
import { GlobeIcon, SearchIcon, ShuffleIcon } from './icons'

const ZONE_LABEL = { easy: 'rahat', ideal: 'öğrenmeye ideal', hard: 'zorlayıcı', too_hard: 'çok zor' } as const

/**
 * Reading about any topic from Wikipedia, in search order, each with how much of it the learner
 * already knows. English uses Simple English Wikipedia, written for learners.
 */
export function WikipediaPicker({
  language,
  vocabulary,
  states,
  known,
  onRead,
}: {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  known: ReadonlySet<string>
  onRead: (title: string, text: string) => void
}) {
  const site: WikiSite = language === 'en' ? 'simple' : language
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<(WikiResult & { coverage: number })[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const search = async (q: string) => {
    setBusy('search')
    setError('')
    try {
      const found = await searchWikipedia(q, site)
      setResults(found.map((r) => ({ ...r, coverage: analyzeText(r.intro, language, vocabulary, states, known).coverage })))
    } catch {
      setError('Wikipedia’ya ulaşılamadı; internet bağlantını kontrol et.')
    } finally {
      setBusy(null)
    }
  }

  const read = async (title: string) => {
    setBusy(title)
    setError('')
    try {
      onRead(title, `${title}\n\n${await fetchArticle(title, site)}`)
    } catch {
      setError('Makale getirilemedi; başka birini dene.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="section stack">
      <h2 className="section-title">Wikipedia’dan oku</h2>
      <p className="small muted">İlgini çeken bir konu yaz: {language === 'en' ? 'öğrenenler için yazılmış Basit İngilizce Wikipedia’dan' : 'Wikipedia’dan'} makaleler; her birinde ne kadarını bildiğin yazar.</p>
      <form
        className="row nowrap wiki-search"
        onSubmit={(e) => {
          e.preventDefault()
          if (query.trim()) void search(query)
        }}
      >
        <label className="search grow">
          <SearchIcon size={16} />
          <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={{ en: 'ör. coffee, Paris', fr: 'ör. café, Paris', es: 'ej. café, Madrid' }[language]} aria-label="Konu" lang={language} />
        </label>
        <button className="btn btn-sm" type="submit" disabled={!query.trim() || busy === 'search'}>
          {busy === 'search' ? 'Aranıyor…' : 'Ara'}
        </button>
        <button className="btn btn-sm btn-quiet" type="button" onClick={() => void search('')} disabled={busy === 'search'} title="Rastgele makaleler">
          <ShuffleIcon size={15} />
        </button>
      </form>
      {error && <p className="error small">{error}</p>}
      {results && results.length === 0 && !busy && <p className="small muted">Bu konuda okunabilir bir makale bulunamadı; başka bir kelime dene.</p>}
      {results && results.length > 0 && (
        <ul className="library">
          {results.map((r) => (
              <li key={r.title}>
                <button className="word-link library-open" onClick={() => void read(r.title)} disabled={!!busy}>
                  <strong lang={language}>{busy === r.title ? `${r.title} · getiriliyor…` : r.title}</strong>
                  <span className="small muted">
                    %{Math.round(r.coverage * 1000) / 10} biliyorsun ({ZONE_LABEL[coverageZone(r.coverage)]})
                  </span>
                </button>
                <a className="link small" href={`https://${site}.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`} target="_blank" rel="noreferrer">
                  <GlobeIcon size={14} />
                </a>
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}
