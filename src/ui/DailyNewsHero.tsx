import { useEffect, useMemo, useState } from 'react'
import { accessFetch } from '../data/access'
import type { KelimeDB, ReadingText } from '../data/db'
import { FEEDS, type Article } from '../engine/news'
import { analyzeText, coverageLine } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { PlayIcon, RadioIcon, SparkleIcon } from './icons'
import heroMicroNews from '../assets/art/hero-micro-news.webp'

const PRIMARY_FEED: Record<TargetLanguage, string> = {
  fr: 'rfi-facile',
  en: 'voa-learning',
  es: 'voa-es-news',
}

interface CachedNews {
  savedAt: number
  articles: Article[]
}

function getCacheKey(lang: TargetLanguage) {
  return `diloloji:daily-news-cache:${lang}`
}

function loadCachedNews(lang: TargetLanguage): CachedNews | null {
  try {
    const raw = localStorage.getItem(getCacheKey(lang))
    if (!raw) return null
    return JSON.parse(raw) as CachedNews
  } catch {
    return null
  }
}

function saveCachedNews(lang: TargetLanguage, articles: Article[]) {
  try {
    const payload: CachedNews = { savedAt: Date.now(), articles }
    localStorage.setItem(getCacheKey(lang), JSON.stringify(payload))
  } catch {
    // Ignore storage quota errors
  }
}

function formatHoursAgo(timestamp: number): string {
  const diffHours = Math.max(0, Math.round((Date.now() - timestamp) / (1000 * 60 * 60)))
  if (diffHours === 0) return 'az önce'
  if (diffHours < 24) return `${diffHours} sa. önce`
  const days = Math.round(diffHours / 24)
  return `${days} gün önce`
}

/**
 * Daily 2-minute micro news showcase at the top of the Reading screen:
 * surfaces today's recommended learner news bulletin (RFI / VOA) with audio, text,
 * offline caching, bulletin item switching, and direct library persistence.
 */
export function DailyNewsHero({
  db,
  language,
  vocabulary,
  states,
  known,
  onOpen,
}: {
  db?: KelimeDB
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
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cachedTime, setCachedTime] = useState<number | null>(null)

  useEffect(() => {
    let live = true
    setBusy(true)
    setFailed(false)
    setSelectedIndex(0)

    accessFetch(`/api/news?feed=${encodeURIComponent(feedId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<{ articles: Article[] }>
      })
      .then((data) => {
        if (!live) return
        const valid = data.articles?.filter((a) => a.text?.length > 80) ?? []
        setArticles(valid)
        setCachedTime(null)
        if (valid.length > 0) {
          saveCachedNews(language, valid)
        }
      })
      .catch(() => {
        if (!live) return
        // Try fallback to offline cached articles
        const cached = loadCachedNews(language)
        if (cached && cached.articles.length > 0) {
          setArticles(cached.articles)
          setCachedTime(cached.savedAt)
          setFailed(false)
        } else {
          setFailed(true)
        }
      })
      .finally(() => {
        if (live) setBusy(false)
      })
    return () => {
      live = false
    }
  }, [feedId, language])

  const scoredArticles = useMemo(() => {
    if (!articles?.length) return []
    // Rank articles by readable vocabulary coverage
    const scored = articles.map((a) => {
      const full = `${a.title}\n\n${a.text}`
      const cov = analyzeText(full, language, vocabulary, states, known)
      const words = full.split(/\s+/).length
      return { a, cov, words, coverage: cov.coverage }
    })
    scored.sort((x, y) => y.coverage - x.coverage)
    return scored
  }, [articles, language, vocabulary, states, known])

  const top = scoredArticles[selectedIndex] ?? scoredArticles[0] ?? null

  if (!feedInfo || (failed && !top)) return null

  const startArticle = async (a: Article) => {
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
    if (db) {
      try {
        await db.saveText(item)
      } catch {
        // Fallback gracefully if database fails
      }
    }
    onOpen(item)
  }

  return (
    <section className="card daily-news-hero" aria-label="Günün Mikro Haberi">
      <div className="daily-news-head">
        <span className="daily-news-tag">
          <RadioIcon size={16} className="inline-icon daily-news-pulse" /> Günün 2 Dakikalık Haberi
        </span>
        <div className="daily-news-head-end">
          {cachedTime && (
            <span className="pill pill-sm daily-news-cached-badge" title="İnternetsiz ortamda son indirilen bülten sunuluyor">
              📶 Çevrimdışı kayıt ({formatHoursAgo(cachedTime)})
            </span>
          )}
          <span className="small muted daily-news-source">{feedInfo.name}</span>
        </div>
      </div>

      {busy && !top && (
        <div className="daily-news-loading small muted">
          <span>Günün güncel bülteni taranıyor…</span>
        </div>
      )}

      {top && (
        <div className="daily-news-layout">
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
              {scoredArticles.length > 1 && (
                <span className="pill pill-sm muted" title="Bülten sırası">
                  {selectedIndex + 1} / {scoredArticles.length}
                </span>
              )}
            </div>

            {scoredArticles.length > 1 && (
              <div className="daily-news-selector" role="tablist" aria-label="Günün diğer bülten maddeleri">
                <span className="small muted daily-news-selector-label">Diğer bülten maddeleri:</span>
                <div className="daily-news-selector-chips">
                  {scoredArticles.map((item, idx) => {
                    const isCurrent = idx === selectedIndex
                    return (
                      <button
                        key={item.a.link || item.a.title}
                        type="button"
                        role="tab"
                        aria-selected={isCurrent}
                        className={`chip daily-news-chip ${isCurrent ? 'is-active' : ''}`}
                        onClick={() => setSelectedIndex(idx)}
                        title={item.a.title}
                      >
                        <span className="daily-news-chip-num">{idx + 1}</span>
                        <span className="daily-news-chip-title">{item.a.title.slice(0, 24)}…</span>
                        <span className="small muted daily-news-chip-pct">%{Math.round(item.coverage * 100)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

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
          <img className="daily-news-art" src={heroMicroNews} alt="" width={76} height={76} draggable={false} />
        </div>
      )}
    </section>
  )
}
