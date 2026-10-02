import { useEffect, useMemo, useRef, useState } from 'react'
import { PODCASTS, type Episode } from '../engine/podcasts'
import { analyzeText, coverageZone } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'

const ZONE_LABEL = { easy: 'rahat', ideal: 'öğrenmeye ideal', hard: 'zorlayıcı', too_hard: 'çok zor' } as const

/**
 * Programmes for learners with audio and full text. Listen first, then read what you heard:
 * the text opens in reading mode with its coverage, so unknown words can be marked and added.
 */
export function ListeningPicker({
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
  onOpen: (episode: Episode, source: string) => void
}) {
  const sources = PODCASTS.filter((p) => p.language === language)
  const [source, setSource] = useState(sources[0]?.id)
  const [episodes, setEpisodes] = useState<Episode[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/listen?source=${encodeURIComponent(source)}`)
      if (!res.ok) throw new Error(String(res.status))
      setEpisodes(((await res.json()) as { episodes: Episode[] }).episodes)
    } catch {
      setError('Bölümler alınamadı. İnternet bağlantını kontrol et ya da başka bir kaynak dene.')
    } finally {
      setBusy(false)
    }
  }

  const rated = useMemo(
    () => (episodes ?? []).map((e) => ({ e, coverage: analyzeText(e.text, language, vocabulary, states, known).coverage, words: e.text.split(/\s+/).length })),
    [episodes, language, vocabulary, states, known],
  )

  if (!sources.length) return null
  const name = sources.find((s) => s.id === source)?.name ?? ''
  return (
    <section className="section stack">
      <h2 className="section-title">🎧 Dinle</h2>
      <p className="small muted">Öğrenenler için hazırlanmış programlar, tam metniyle. Önce dinle, sonra duyduğunu oku: bilmediğin kelimeleri işaretleyip eklersin.</p>
      <div className="choice-row">
        {sources.map((s) => (
          <button key={s.id} className="chip chip-sm" aria-pressed={source === s.id} onClick={() => (setSource(s.id), setEpisodes(null))}>
            {s.name}
          </button>
        ))}
        <button className="btn btn-sm" onClick={load} disabled={busy}>
          {busy ? 'Yükleniyor…' : episodes ? 'Yenile' : 'Bölümleri getir'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {episodes && !rated.length && !busy && <p className="small muted">Bu kaynaktan bölüm alınamadı; başka bir kaynak dene.</p>}
      {rated.length > 0 && (
        <ul className="library">
          {rated.map(({ e, coverage, words }) => (
            <li key={e.link || e.title}>
              <button className="word-link library-open" onClick={() => onOpen(e, name)}>
                <strong>{e.title}</strong>
                <span className="small muted">
                  {e.date ? `${new Date(e.date).toLocaleDateString('tr-TR')} · ` : ''}~{Math.max(1, Math.round(words / 150))} dk · %{Math.round(coverage * 1000) / 10} biliyorsun ({ZONE_LABEL[coverageZone(coverage)]})
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const RATES = [0.75, 0.9, 1]

/** The episode's audio above its text, with speed choice and a listen-first mode. */
export function AudioPanel({ src, hidden, onToggleHidden }: { src: string; hidden: boolean; onToggleHidden: () => void }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [rate, setRate] = useState(1)
  useEffect(() => {
    if (audio.current) audio.current.playbackRate = rate
  }, [rate])
  return (
    <section className="card stack audio-panel">
      <audio ref={audio} src={src} controls preload="none" className="audio-player" />
      <div className="row">
        <div className="choice-row" role="group" aria-label="Hız">
          {RATES.map((r) => (
            <button key={r} className="chip chip-sm" aria-pressed={rate === r} onClick={() => setRate(r)}>
              {r === 1 ? 'Normal' : `${r}×`}
            </button>
          ))}
        </div>
        <button className="link small" onClick={onToggleHidden}>
          {hidden ? 'Metni göster' : 'Metni gizle (önce sadece dinle)'}
        </button>
      </div>
    </section>
  )
}
