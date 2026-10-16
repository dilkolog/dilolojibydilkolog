import { useEffect, useMemo, useState } from 'react'
import { accessFetch } from '../data/access'
import type { ReadingText } from '../data/db'
import { FEEDS, type Article } from '../engine/news'
import { analyzeText, coverageLine } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { PlayIcon, RadioIcon, SparkleIcon } from './icons'

const PRIMARY_FEED: Record<TargetLanguage, string> = {
  fr: 'rfi-facile',
  en: 'voa-learning',
  es: 'voa-es-news',
}

/**
 * Daily 2-minute micro news showcase at the top of the Reading screen:
 * surfaces today's recommended learner news bulletin (RFI / VOA) with audio and text.
 */
export function DailyNewsHero({
  language,
  vocabulary,
  states,
  known,
  onOpen,
}: {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  known: ReadonlySet<string>
  onOpen: (item: ReadingText) => void
}) {
  const feedId = PRIMARY_FEED[language]
  const feedInfo = FEEDS.find((f) => f.id === feedId)
  const [articles, setArticles] = useState<Article[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    setBusy(true)
    setFailed(false)
    accessFetch(`/api/news?feed=${encodeURIComponent(feedId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<{ articles: Article[] }>
      })
      .then((data) => {
        if (!live) return
        setArticles(data.articles?.filter((a) => a.text?.length > 80) ?? [])
      })
      .catch(() => {
        if (!live) return
        setFailed(true)
      })
      .finally(() => {
        if (live) setBusy(false)
      })
    return () => {
      live = false
    }
  }, [feedId])

  const top = useMemo(() => {
    if (!articles?.length) return null
    // Pick the latest article with highest readable coverage
    const scored = articles.map((a) => {
      const full = `${a.title}\n\n${a.text}`
      const cov = analyzeText(full, language, vocabulary, states, known)
      const words = full.split(/\s+/).length
      return { a, cov, words, coverage: cov.coverage }
    })
    scored.sort((x, y) => y.coverage - x.coverage)
    return scored[0] ?? null
  }, [articles, language, vocabulary, states, known])

  if (!feedInfo || failed) return null

  const startArticle = (a: Article) => {
    const item: ReadingText = {
      id: crypto.randomUUID(),
      language,
      title: a.title,
      text: `${a.title}\n\n${a.text}`,
      audio: a.audio,
      source: a.link,
      addedAt: new Date().toISOString(),
      history: [],
    }
    onOpen(item)
  }

  return (
    <section className="card daily-news-hero" aria-label="Günün Mikro Haberi">
      <div className="daily-news-head">
        <span className="daily-news-tag">
          <RadioIcon size={16} className="inline-icon daily-news-pulse" /> Günün 2 Dakikalık Haberi
        </span>
        <span className="small muted daily-news-source">{feedInfo.name}</span>
      </div>

      {busy && !top && (
        <div className="daily-news-loading small muted">
          <span>Günün güncel bülteni taranıyor…</span>
        </div>
      )}

      {top && (
        <div className="daily-news-body">
          <h3 className="daily-news-title">{top.a.title}</h3>
          <p className="daily-news-teaser small muted">
            {top.a.description?.slice(0, 160) || top.a.text.slice(0, 160)}…
          </p>
          <div className="daily-news-meta small">
            {top.a.audio && (
              <span className="pill pill-sm is-audio">
                🎧 Sesli dinleme
              </span>
            )}
            <span className="pill pill-sm">
              ~{Math.max(1, Math.round(top.words / 140))} dk
            </span>
            <span className="pill pill-sm is-coverage" title="Kelimelerin ne kadarını biliyorsun">
              <SparkleIcon size={12} className="inline-icon" /> {coverageLine(top.cov)}
            </span>
          </div>
          <div className="daily-news-action">
            <button
              type="button"
              className="btn btn-primary daily-news-btn"
              onClick={() => startArticle(top.a)}
            >
              <PlayIcon size={16} className="inline-icon" /> Dinle ve Oku
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
