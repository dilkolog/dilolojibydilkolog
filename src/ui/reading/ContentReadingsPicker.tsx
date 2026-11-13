import { useEffect, useMemo, useState } from 'react'
import { beginnerRank, loadManifest, readingPage, readingShards } from '../../data/content'
import { CONTENT_LEVELS, type ContentLanguage, type ContentLevel, type ContentManifest, type PublishedReading } from '../../engine/contentTypes'
import { analyzeText, coverageLine, foundationSize, isStarterText, STARTER_WORDS } from '../../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../../engine/types'
import { GENRE_TR, THEME_TR } from '../../data/contentNames'
import { Select } from '../shared/Select'
import { SourceTitle } from './SourceTitle'


/**
 * Diloloji's own texts (docs/ICERIK-FABRIKASI.md): written for the app, A1–C1, each with its Turkish and its
 * questions. The manifest says which levels have texts; a level's files are fetched one at a time when chosen.
 */

export function ContentReadingsPicker({
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
  onRead: (text: PublishedReading) => void
}) {
  const [manifest, setManifest] = useState<ContentManifest | null>(null)
  const [level, setLevel] = useState<ContentLevel | null>(null)
  const [items, setItems] = useState<PublishedReading[]>([])
  const [pages, setPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [theme, setTheme] = useState<string>('all')
  const [genre, setGenre] = useState<string>('all')

  useEffect(() => {
    let live = true
    setManifest(null)
    setLevel(null)
    void loadManifest(language).then((m) => {
      if (!live || !m) return
      setManifest(m)
      setLevel(CONTENT_LEVELS.find((l) => readingShards(m, l).length) ?? null)
    })
    return () => {
      live = false
    }
  }, [language])

  useEffect(() => {
    if (!manifest || !level) return
    let live = true
    setItems([])
    setPages(0)
    setTheme('all')
    setGenre('all')
    setFailed(false)
    setLoading(true)
    readingPage(language as ContentLanguage, manifest, level, 0)
      .then((r) => live && (setItems(r), setPages(1)))
      .catch(() => live && setFailed(true))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [manifest, level, language])

  const more = async () => {
    if (!manifest || !level) return
    setLoading(true)
    setFailed(false)
    try {
      const next = await readingPage(language as ContentLanguage, manifest, level, pages)
      setItems((old) => [...old, ...next])
      setPages((p) => p + 1)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  const shown = useMemo(() => items.filter((r) => (theme === 'all' || r.theme === theme) && (genre === 'all' || r.genre === genre)), [items, theme, genre])
  const rated = useMemo(
    () =>
      shown.map((r) => {
        const text = r.paragraphs.join('\n\n')
        return { r, words: text.split(/\s+/).filter(Boolean).length, cov: analyzeText(text, language, vocabulary, states, known) }
      }),
    [shown, language, vocabulary, states, known],
  )

  const foundation = foundationSize(language, vocabulary, states, known)
  // A beginner sees the first-step series first, in its order, then the starter texts; the rest keep their order.
  const ordered = foundation < STARTER_WORDS ? [...rated].sort((a, b) => beginnerRank(a.r) - beginnerRank(b.r)) : rated

  if (!manifest || !manifest.counts.reading.total) return null
  const themes = [...new Set(items.map((r) => r.theme))].sort()
  const genres = [...new Set(items.map((r) => r.genre))].sort()
  const total = level ? readingShards(manifest, level).length : 0

  return (
    <section className="section stack content-readings" aria-label="Diloloji metinleri">
      <SourceTitle kind="storybook">Diloloji metinleri</SourceTitle>
      <p className="small muted">Bu uygulama için yazılmış seviyeli metinler. Her birinin Türkçesi ve okuduktan sonra soruları var.</p>
      <div className="choice-row" role="group" aria-label="Metin seviyesi">
        {CONTENT_LEVELS.map((l) => {
          const count = manifest.counts.reading.byLevel[l] ?? 0
          if (!count) return null
          return (
            <button key={l} type="button" className="chip chip-sm" aria-pressed={level === l} onClick={() => setLevel(l)}>
              {l} ({count})
            </button>
          )
        })}
      </div>
      {(themes.length > 1 || genres.length > 1) && (
        <div className="row content-filters">
          {themes.length > 1 && (
            <Select
              label="Konu"
              value={theme}
              onChange={setTheme}
              options={[{ value: 'all', label: 'Bütün konular' }, ...themes.map((t) => ({ value: t, label: THEME_TR[t] ?? t }))]}
            />
          )}
          {genres.length > 1 && (
            <Select label="Tür" value={genre} onChange={setGenre} options={[{ value: 'all', label: 'Bütün türler' }, ...genres.map((g) => ({ value: g, label: GENRE_TR[g] ?? g }))]} />
          )}
        </div>
      )}
      {failed && <p className="small note">Metinler getirilemedi; internet gerekiyor. Daha önce açtığın metinler kütüphanende duruyor.</p>}
      {loading && !items.length && <p className="small muted">Metinler yükleniyor…</p>}
      <ul className="library">
        {ordered.map(({ r, words, cov }) => (
          <li key={r.id}>
            <button type="button" className="word-link library-open" onClick={() => onRead(r)}>
              <div className="row justify-between items-baseline gap-2">
                <strong lang={language}>{r.title}</strong>
                <span className="badge badge-sm">{r.level}</span>
              </div>
              <span className="small muted">
                {THEME_TR[r.theme] ?? r.theme} · {GENRE_TR[r.genre] ?? r.genre} · {words} kelime · {coverageLine(cov, { starter: isStarterText(r.level, foundation) })}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {pages < total && !loading && (
        <div className="row">
          <button type="button" className="btn btn-sm btn-quiet" onClick={() => void more()}>
            Daha çok metin
          </button>
        </div>
      )}
    </section>
  )
}
