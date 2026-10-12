import { accessFetch, APPROVAL_MESSAGE } from '../data/access'
import { useEffect, useMemo, useState } from 'react'
import { FEEDS, type Article } from '../engine/news'
import { analyzeText, coverageLine, topicKeys, topicOverlap } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'


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
  onRead: (title: string, text: string, extra?: { audio?: string; source?: string }) => void
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
      const res = await accessFetch(`/api/news?feed=${encodeURIComponent(feed)}`)
      if (res.status === 403) {
        setError(APPROVAL_MESSAGE)
        return
      }
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
        return { a, coverage: r.coverage, cov: r, words: r.total }
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
      <p className="small muted">Günün haberleri, en rahat okuyacakların önce.</p>
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
          {ranked.map(({ a, cov, words }) => (
            <li key={a.link}>
              <button className="word-link library-open" onClick={() => onRead(a.title, `${a.title}\n\n${a.text}`, { audio: a.audio, source: a.link })}>
                <strong>{a.title}</strong>
                <span className="small muted">
                  {a.source} {a.audio && <>· sesli </>}· {words} kelime · {coverageLine(cov)}
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

/**
 * Narrow reading: after a text, news on the same topic (from this language's feeds), ranked by
 * shared topic words. Reading around one topic recycles its vocabulary (Krashen 2004; Kang 2015).
 */
export function SameTopic({
  text,
  language,
  vocabulary,
  states,
  known,
  onRead,
}: {
  text: string
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  known: ReadonlySet<string>
  onRead: (title: string, text: string) => void
}) {
  const [items, setItems] = useState<{ a: Article; score: number; shared: number; coverage: number }[] | null>(null)
  useEffect(() => {
    let live = true
    const keys = topicKeys(text, language)
    if (keys.length < 5 || !navigator.onLine) return setItems([])
    void Promise.all(
      FEEDS.filter((f) => f.language === language).map((f) =>
        accessFetch(`/api/news?feed=${encodeURIComponent(f.id)}`)
          .then((r) => (r.ok ? (r.json() as Promise<{ articles: Article[] }>) : { articles: [] }))
          .then((j) => j.articles)
          .catch(() => [] as Article[]),
      ),
    ).then((lists) => {
      if (!live) return
      const ranked = lists
        .flat()
        .filter((a) => a.text.split(/\s+/).length >= 80 && !text.startsWith(a.title))
        .map((a) => {
          const o = topicOverlap(keys, `${a.title}\n${a.text}`, language)
          return { a, score: o.score, shared: o.shared.length, coverage: analyzeText(a.text, language, vocabulary, states, known).coverage }
        })
        .filter((x) => x.score >= 0.2)
        .sort((x, y) => y.score - x.score)
        .slice(0, 3)
      setItems(ranked)
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, language])
  if (!items?.length) return null
  return (
    <section className="card stack">
      <h2 className="section-title">Aynı konuda oku</h2>
      <p className="small muted">Aynı konuda okumak, yeni kelimelerin kısa sürede tekrar karşına çıkmasını sağlar; ikinci metin ilkinden kolay gelir.</p>
      <ul className="library">
        {items.map(({ a, shared, coverage }) => (
          <li key={a.link}>
            <button className="word-link library-open" onClick={() => onRead(a.title, `${a.title}\n\n${a.text}`)}>
              <strong>{a.title}</strong>
              <span className="small muted">
                {a.source} · {shared} ortak konu kelimesi · %{Math.round(coverage * 1000) / 10} biliyorsun
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
