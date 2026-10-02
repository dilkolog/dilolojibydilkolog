import { useMemo, useState } from 'react'
import { FEEDS, type Article } from '../engine/news'
import { analyzeText, coverageZone } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'

const ZONE_LABEL = { easy: 'rahat', ideal: 'öğrenmeye ideal', hard: 'zorlayıcı', too_hard: 'çok zor' } as const

/**
 * Today's news in the target language, ranked by how readable each article is for the learner:
 * the ones in the 95–98% "ideal" band first.
 */
export function NewsPicker({
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
  const feeds = FEEDS.filter((f) => f.language === language)
  const [feed, setFeed] = useState(feeds[0]?.id)
  const [articles, setArticles] = useState<Article[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/news?feed=${encodeURIComponent(feed)}`)
      if (!res.ok) throw new Error(String(res.status))
      setArticles(((await res.json()) as { articles: Article[] }).articles)
    } catch {
      setError('Haberler alınamadı. İnternet bağlantını kontrol et ya da başka bir kaynak dene.')
    } finally {
      setBusy(false)
    }
  }

  const ranked = useMemo(() => {
    if (!articles) return []
    return articles
      .map((a) => {
        const r = analyzeText(`${a.title}\n\n${a.text}`, language, vocabulary, states, known)
        return { a, coverage: r.coverage, words: r.total }
      })
      .filter((x) => x.words >= 40)
      .sort((x, y) => {
        const score = (c: number) => (c >= 0.95 && c <= 0.98 ? 0 : Math.abs(c - 0.965))
        return score(x.coverage) - score(y.coverage)
      })
  }, [articles, language, vocabulary, states, known])

  if (!feeds.length) return null
  return (
    <section className="section stack">
      <h2 className="section-title">Sana göre haberler</h2>
      <p className="small muted">Günün haberleri, senin için ne kadar okunur olduklarına göre sıralı: önce bildiğin kelime oranı %95–98 olanlar.</p>
      <div className="choice-row">
        {feeds.map((f) => (
          <button key={f.id} className="chip chip-sm" aria-pressed={feed === f.id} onClick={() => (setFeed(f.id), setArticles(null))}>
            {f.name}
          </button>
        ))}
        <button className="btn btn-sm" onClick={load} disabled={busy}>
          {busy ? 'Yükleniyor…' : articles ? 'Yenile' : 'Haberleri getir'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {articles && ranked.length === 0 && !busy && <p className="small muted">Bu kaynaktan okunabilir metin alınamadı; başka bir kaynak dene.</p>}
      {ranked.length > 0 && (
        <ul className="library">
          {ranked.map(({ a, coverage, words }) => (
            <li key={a.link}>
              <button className="word-link library-open" onClick={() => onRead(a.title, `${a.title}\n\n${a.text}`)}>
                <strong>{a.title}</strong>
                <span className="small muted">
                  {a.source} · {words} kelime · %{Math.round(coverage * 1000) / 10} biliyorsun ({ZONE_LABEL[coverageZone(coverage)]})
                </span>
              </button>
              <a className="link small" href={a.link} target="_blank" rel="noreferrer">
                Kaynak
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
