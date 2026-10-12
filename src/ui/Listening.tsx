import { clock, forgetPosition, resumeAt, savedPosition, savePosition } from './audioResume'
import { accessFetch, APPROVAL_MESSAGE } from '../data/access'
import { cachedAudio } from '../data/audioCache'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PODCASTS, type Episode } from '../engine/podcasts'
import { analyzeText, coverageLine } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'


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
      const res = await accessFetch(`/api/listen?source=${encodeURIComponent(source)}`)
      if (res.status === 403) {
        setError(APPROVAL_MESSAGE)
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      setEpisodes(((await res.json()) as { episodes: Episode[] }).episodes)
    } catch {
      setError('Bölümler alınamadı. İnternet bağlantını kontrol et ya da başka bir kaynak dene.')
    } finally {
      setBusy(false)
    }
  }

  const rated = useMemo(
    () => (episodes ?? []).map((e) => ({ e, cov: analyzeText(e.text, language, vocabulary, states, known), words: e.text.split(/\s+/).length })),
    [episodes, language, vocabulary, states, known],
  )

  if (!sources.length) return null
  const name = sources.find((s) => s.id === source)?.name ?? ''
  return (
    <section className="section stack">
      <h2 className="section-title">Dinle</h2>
      <p className="small muted">Öğrenenler için programlar, tam metniyle: önce dinle, sonra oku.</p>
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
          {rated.map(({ e, cov, words }) => (
            <li key={e.link || e.title}>
              <button className="word-link library-open" onClick={() => onOpen(e, name)}>
                <strong>{e.title}</strong>
                <span className="small muted">
                  {e.date ? `${new Date(e.date).toLocaleDateString('tr-TR')} · ` : ''}~{Math.max(1, Math.round(words / 150))} dk · {coverageLine(cov)}
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

const ROUNDS = [
  { hidden: true, title: '1. tur: sadece dinle', hint: 'Metne bakmadan dinle; ne kadarını anladığını yokla.' },
  { hidden: false, title: '2. tur: metinle dinle', hint: 'Bu kez metni takip et; anlamadığın yerlerde kelimeleri işaretle.' },
  { hidden: true, title: '3. tur: yine metinsiz', hint: 'Son kez metinsiz: artık çok daha fazlasını duyacaksın.' },
] as const

/**
 * The episode's audio above its text, with speed choice and a three-round guide: without text,
 * with text, without again. Captions help understanding and word learning most in that order
 * (Winke, Gass & Sydorenko 2010; Montero Perez et al. 2014), and repeated listening adds up.
 */
export function AudioPanel({
  src,
  hidden,
  onHidden,
  onTime,
  onDuration,
  seekRef,
  rangeRef,
  follow,
  still = false,
  resumeKey,
}: {
  src: string
  hidden: boolean
  onHidden: (hidden: boolean) => void
  /** The playing time, a few times a second (the reader lights the sentence heard). */
  onTime?: (seconds: number) => void
  onDuration?: (seconds: number) => void
  /** Set to a function that jumps to a time and plays (a sentence's start). */
  seekRef?: { current: ((seconds: number) => void) | null }
  /** Set to a function that plays one stretch and stops (dictation: one sentence), slower on request. */
  rangeRef?: { current: ((from: number, to: number, slow?: boolean) => Promise<void>) | null }
  /** How the text follows the audio: exactly (timed subtitles) or approximately; none when it can't. */
  follow?: 'exact' | 'approx' | null
  /** Not pinned to the top while scrolling (dictation needs the space below it). */
  still?: boolean
  /** Where this recording was left is kept under this key, and picked up again on the next visit. */
  resumeKey?: string
}) {
  const audio = useRef<HTMLAudioElement>(null)
  // A copy kept on the device (Çevrimdışı dinle) plays instead of the link, unless playing has begun already.
  const [local, setLocal] = useState<string>()
  useEffect(() => {
    let live = true
    void cachedAudio(src).then((url) => {
      const a = audio.current
      if (live && url && a && a.paused && a.currentTime === 0) setLocal(url)
    })
    return () => {
      live = false
    }
  }, [src])
  const panel = useRef<HTMLElement>(null)
  const [tipsOpen, setTipsOpen] = useState(false)
  // The audio could not be loaded (a dead link, no connection): said, instead of a player that does nothing.
  const [failed, setFailed] = useState(false)
  // Picked up where it was left: said, with the way back to the start.
  const [resumed, setResumed] = useState<number | null>(null)
  const lastSaved = useRef(0)
  // The panel's height, for what else is pinned under it (the word card beside the text) and for
  // keeping a sentence scrolled into view clear of it.
  useEffect(() => {
    const el = panel.current
    if (!el || still || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const set = () => root.style.setProperty('--audio-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--audio-h')
    }
  }, [still])
  useEffect(() => {
    if (!seekRef) return
    seekRef.current = (seconds: number) => {
      const a = audio.current
      if (!a) return
      a.currentTime = Math.max(0, seconds - 0.15)
      void a.play().catch(() => {})
    }
    return () => {
      seekRef.current = null
    }
  }, [seekRef])
  const [rate, setRate] = useState(1)
  const rateRef = useRef(rate)
  rateRef.current = rate
  useEffect(() => {
    if (!rangeRef) return
    let frame = 0
    let finish: (() => void) | null = null
    rangeRef.current = (from: number, to: number, slow = false) =>
      new Promise<void>((resolve) => {
        const a = audio.current
        if (!a) return resolve()
        // A stretch still playing ends here: the new one takes over.
        cancelAnimationFrame(frame)
        finish?.()
        finish = resolve
        const done = () => {
          a.playbackRate = rateRef.current
          finish = null
          resolve()
        }
        a.playbackRate = slow ? 0.75 : rateRef.current
        a.currentTime = Math.max(0, from - 0.1)
        // Watched every frame (timeupdate comes only a few times a second): stop right at the end.
        const watch = () => {
          if (a.paused) return done()
          if (a.currentTime >= to - 0.05) {
            a.pause()
            return done()
          }
          frame = requestAnimationFrame(watch)
        }
        void a
          .play()
          .then(() => (frame = requestAnimationFrame(watch)))
          .catch(done)
      })
    return () => {
      cancelAnimationFrame(frame)
      finish?.()
      rangeRef.current = null
    }
  }, [rangeRef])
  const [round, setRound] = useState<number | null>(hidden ? 0 : null)
  useEffect(() => {
    if (audio.current) audio.current.playbackRate = rate
  }, [rate])

  const goTo = (r: number | null) => {
    setRound(r)
    if (r === null) return onHidden(false)
    onHidden(ROUNDS[r].hidden)
    // Each round starts the episode from the top.
    if (audio.current) {
      audio.current.currentTime = 0
      void audio.current.play().catch(() => {})
    }
  }

  return (
    <section ref={panel} className={`card stack audio-panel${still ? ' is-still' : ''}`}>
      {round !== null && (
        <div className="listen-rounds">
          <strong>{ROUNDS[round].title}</strong>
          <span className="small muted">
            {round + 1}/{ROUNDS.length}
          </span>
          {round < ROUNDS.length - 1 ? (
            <button className="btn btn-sm" onClick={() => goTo(round + 1)}>
              {ROUNDS[round + 1].title.replace(/^\d\. tur: /, 'Sonraki tur: ')}
            </button>
          ) : (
            <button className="btn btn-sm" onClick={() => goTo(null)}>
              Bitti: metni aç, kelimeleri çalış
            </button>
          )}
        </div>
      )}
      <audio
        ref={audio}
        src={local ?? src}
        controls
        preload="metadata"
        className="audio-player"
        onTimeUpdate={(e) => {
          const a = e.currentTarget
          onTime?.(a.currentTime)
          // Kept every few seconds; near the end it is let go (heard).
          if (resumeKey && Math.abs(a.currentTime - lastSaved.current) >= 3) {
            lastSaved.current = a.currentTime
            if (Number.isFinite(a.duration) && a.currentTime > a.duration - 12) forgetPosition(resumeKey)
            else savePosition(resumeKey, a.currentTime)
          }
        }}
        onLoadedMetadata={(e) => {
          setFailed(false)
          onDuration?.(e.currentTarget.duration)
          const at = resumeKey ? resumeAt(savedPosition(resumeKey), e.currentTarget.duration) : null
          if (at !== null) {
            e.currentTarget.currentTime = at
            lastSaved.current = at
            setResumed(at)
          }
        }}
        onError={() => setFailed(true)}
      />
      {resumed !== null && resumeKey && (
        <p className="small muted" role="status">
          Kaldığın yerden devam ediyor ({clock(resumed)}).{' '}
          <button
            type="button"
            className="link small"
            onClick={() => {
              if (audio.current) audio.current.currentTime = 0
              forgetPosition(resumeKey)
              setResumed(null)
            }}
          >
            Baştan başla
          </button>
        </p>
      )}
      {failed && (
        <p className="note" role="status">
          Ses yüklenemedi: bağlantı bozuk olabilir ya da internet yok. Metni yine de okuyabilirsin; bağlantı gelince sayfayı yenile.
        </p>
      )}
      <div className="row">
        <div className="choice-row" role="group" aria-label="Hız">
          {RATES.map((r) => (
            <button key={r} className="chip chip-sm" aria-pressed={rate === r} onClick={() => setRate(r)}>
              {r === 1 ? 'Normal' : `${r}×`}
            </button>
          ))}
        </div>
        {round === null ? (
          <button className="link small" onClick={() => goTo(0)}>
            Üç turla dinle
          </button>
        ) : (
          <button className="link small" onClick={() => goTo(null)}>
            Turları bırak
          </button>
        )}
        {(follow || round !== null) && (
          <button type="button" className="link small" aria-expanded={tipsOpen} onClick={() => setTipsOpen((o) => !o)}>
            İpuçları
          </button>
        )}
      </div>
      {tipsOpen && (follow || round !== null) && (
        <div className="stack gap-2 audio-tips">
          {round !== null && <p className="small muted">{ROUNDS[round].hint}</p>}
          {follow && (
            <p className="small muted">
              {follow === 'exact' ? 'Dinlerken duyduğun cümle metinde aydınlanır.' : 'Dinlerken duyduğun cümle metinde aydınlanır (yaklaşık: bu kaynağın zaman bilgisi yok).'} Bir
              kelimeye dokunup “Bu cümleden dinle” ile oraya atlayabilirsin.
              {follow === 'approx' && ' Takip öne ya da arkaya kaçarsa: duyduğun cümlenin bir kelimesine dokunup “Şu an bu cümle okunuyor” de.'}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
