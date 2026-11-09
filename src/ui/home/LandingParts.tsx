import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { TargetLanguage } from '../../engine/types'
import { LANDING_STATS } from '../../data/landingStats'
import { CheckIcon, ChevronDownIcon, PauseIcon, PlayIcon, UndoIcon } from '../shared/icons'

/** The landing page's live pieces: a phone that plays a day, a text to tap, the forgetting curve to try, the levels to open. */

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export interface PhoneStep {
  src: string
  label: string
  alt: string
}

/** How long each screen of the phone stays, and how many times the day plays before it stops (decoration ends). */
const STEP_MS = 3400
const ROUNDS = 2

/**
 * The phone in the hero, playing through a day of the app: Today, a new word, the right answer, the summary. It plays
 * twice and stops on the first screen; the steps under it pick a screen (and stop it), the button pauses it. With
 * reduced motion it does not play by itself.
 */
export function PlayingPhone({ steps, children }: { steps: PhoneStep[]; children?: ReactNode }) {
  const [at, setAt] = useState(0)
  const [playing, setPlaying] = useState(() => !reducedMotion())
  const shown = useRef(0)

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      shown.current++
      if (shown.current >= steps.length * ROUNDS) {
        setAt(0)
        setPlaying(false)
        return
      }
      setAt((n) => (n + 1) % steps.length)
    }, STEP_MS)
    return () => clearInterval(timer)
  }, [playing, steps.length])

  const pick = (i: number) => {
    setPlaying(false)
    setAt(i)
  }
  const toggle = () => {
    if (!playing) shown.current = 0
    setPlaying(!playing)
  }

  return (
    <div className="lp-phone">
      <figure className="lp-shot">
        <div className="device-mockup">
          <div className="device-screen">
            {steps.map((s, i) => (
              <img
                key={s.src}
                className={i === at ? 'lp-frame-on' : undefined}
                src={s.src}
                alt={i === at ? s.alt : ''}
                aria-hidden={i === at ? undefined : true}
                width={560}
                height={1213}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            ))}
          </div>
        </div>
      </figure>
      {children}
      <div className="lp-phone-controls">
        <span className="lp-phone-caption" aria-hidden>
          {steps[at]!.label}
        </span>
        <div className="lp-steps-dots" role="group" aria-label="Uygulamadan bir gün">
          {steps.map((s, i) => (
            <button key={s.src} type="button" className="lp-dot" aria-pressed={i === at} aria-label={s.label} onClick={() => pick(i)}>
              <span className="lp-dot-mark" aria-hidden />
            </button>
          ))}
        </div>
        <button type="button" className="icon-btn icon-btn-sm lp-play" onClick={toggle} aria-label={playing ? 'Gösterimi durdur' : 'Gösterimi oynat'}>
          {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
        </button>
      </div>
    </div>
  )
}

/** A short text a visitor can read in the language picked: every word with a Turkish meaning can be tapped. */
interface Gloss {
  tr: string
  note?: string
}
const READINGS: Record<TargetLanguage, { text: string; glosses: Record<string, Gloss> }> = {
  fr: {
    text: 'Chaque matin, Léa prend un café près de la gare. Elle lit le journal et regarde les gens qui passent.',
    glosses: {
      chaque: { tr: 'her' },
      matin: { tr: 'sabah', note: 'le matin (eril)' },
      prend: { tr: 'alır', note: 'prendre (almak), il/elle' },
      café: { tr: 'kahve', note: 'le café (eril)' },
      près: { tr: 'yakın', note: 'près de: -in yakınında' },
      gare: { tr: 'istasyon', note: 'la gare (dişil)' },
      elle: { tr: 'o (kadın)' },
      lit: { tr: 'okur', note: 'lire (okumak), il/elle' },
      journal: { tr: 'gazete', note: 'le journal (eril)' },
      regarde: { tr: 'bakar, izler', note: 'regarder (bakmak), il/elle' },
      les: { tr: 'belirli artikel, çoğul' },
      gens: { tr: 'insanlar', note: 'les gens (çoğul)' },
      qui: { tr: '-an, -en (ki)', note: 'ilgi zamiri: özne' },
      passent: { tr: 'geçerler', note: 'passer (geçmek), ils/elles' },
    },
  },
  es: {
    text: 'Cada mañana, Lucía toma un café cerca de la estación. Lee el periódico y mira a la gente que pasa.',
    glosses: {
      cada: { tr: 'her' },
      mañana: { tr: 'sabah', note: 'la mañana; mañana tek başına “yarın” da demek' },
      toma: { tr: 'alır, içer', note: 'tomar (almak), él/ella' },
      café: { tr: 'kahve', note: 'el café (eril)' },
      cerca: { tr: 'yakın', note: 'cerca de: -in yakınında' },
      estación: { tr: 'istasyon', note: 'la estación (dişil)' },
      lee: { tr: 'okur', note: 'leer (okumak), él/ella' },
      periódico: { tr: 'gazete', note: 'el periódico (eril)' },
      mira: { tr: 'bakar, izler', note: 'mirar (bakmak), él/ella' },
      gente: { tr: 'insanlar', note: 'la gente: tekil gibi çekilir (la gente pasa)' },
      que: { tr: '-an, -en (ki)', note: 'ilgi zamiri' },
      pasa: { tr: 'geçer', note: 'pasar (geçmek), él/ella' },
    },
  },
  en: {
    text: 'Every morning, Leo buys a coffee near the station. He reads the newspaper and watches the people who walk by.',
    glosses: {
      every: { tr: 'her' },
      morning: { tr: 'sabah' },
      buys: { tr: 'satın alır', note: 'buy (bought, bought), he/she: -s' },
      coffee: { tr: 'kahve' },
      near: { tr: 'yakınında' },
      the: { tr: 'belirli artikel' },
      station: { tr: 'istasyon' },
      reads: { tr: 'okur', note: 'read (read, read), he/she: -s' },
      newspaper: { tr: 'gazete' },
      and: { tr: 've' },
      watches: { tr: 'izler', note: 'watch, he/she: -es' },
      people: { tr: 'insanlar', note: 'çoğul: the people are…' },
      who: { tr: '-an, -en (ki)', note: 'ilgi zamiri, kişiler için' },
      walk: { tr: 'yürümek', note: 'walk by: yanından geçmek' },
    },
  },
}

const SPLIT = /([\p{L}’']+)/u

export function LiveReading({ language, onAdd }: { language: TargetLanguage; onAdd: () => void }) {
  const { text, glosses } = READINGS[language]
  const [picked, setPicked] = useState<string | null>(null)
  // A new language, a new text: nothing picked in it yet.
  useEffect(() => setPicked(null), [language])
  const gloss = picked ? glosses[picked.toLowerCase()] : undefined
  return (
    <div className="lp-live">
      <p className="lp-live-hint small">Dene: bir kelimeye dokun.</p>
      <p className="lp-live-text" lang={language}>
        {text.split(SPLIT).map((part, i) => {
          const key = part.toLowerCase()
          if (!glosses[key]) return <span key={i}>{part}</span>
          return (
            <button key={i} type="button" className="lp-word" aria-pressed={picked === part} onClick={() => setPicked(part)}>
              {part}
            </button>
          )
        })}
      </p>
      <div className="lp-live-card" aria-live="polite">
        {gloss && picked ? (
          <>
            <span className="lp-live-word" lang={language}>
              {picked}
            </span>
            <span className="lp-live-tr">{gloss.tr}</span>
            {gloss.note && <span className="small muted">{gloss.note}</span>}
            <button type="button" className="btn btn-quiet btn-sm lp-live-add" onClick={onAdd}>
              Kelimelerime ekle
            </button>
          </>
        ) : (
          <span className="small muted">Anlamı burada çıkar; uygulamada tek dokunuşla kelimelerine eklersin.</span>
        )}
      </div>
    </div>
  )
}

/**
 * The forgetting curve to try: without reviews memory falls fast; each "review" lifts it back up and it then falls
 * slower. The dashed line is always there for comparison.
 */
const CURVES = [
  'M16 24 C 40 96, 90 128, 304 136',
  'M16 24 C 32 62, 46 80, 60 86 L60 24 C 110 76, 190 108, 304 120',
  'M16 24 C 32 62, 46 80, 60 86 L60 24 C 84 50, 104 64, 124 70 L124 24 C 170 60, 240 86, 304 96',
  'M16 24 C 32 62, 46 80, 60 86 L60 24 C 84 50, 104 64, 124 70 L124 24 C 156 42, 182 52, 206 56 L206 24 C 246 34, 280 41, 304 45',
]
const REVIEWS = [
  { x: 60, label: '1. gün' },
  { x: 124, label: '4. gün' },
  { x: 206, label: '2 hafta' },
]
const SAYS = [
  'Tekrar etmeden hatırlama hızla düşer.',
  'İlk tekrar: kelime yeniden aklında, ve bu sefer daha yavaş unutulur.',
  'İkinci tekrar: aradaki süre uzar, hatırlama daha uzun kalır.',
  'Üçüncü tekrar: kelime artık haftalarca aklında. Diloloji her tekrarı tam zamanında sorar.',
]

export function MemoryCurve() {
  const [reviews, setReviews] = useState(0)
  const done = reviews >= REVIEWS.length
  return (
    <figure className="lp-curve">
      <svg viewBox="0 0 320 172" role="img" aria-label={SAYS[reviews]}>
        <line className="lp-curve-axis" x1="16" y1="140" x2="308" y2="140" />
        <line className="lp-curve-axis" x1="16" y1="16" x2="16" y2="140" />
        <path className="lp-curve-forget" d={CURVES[0]} />
        <path key={reviews} className="lp-curve-learn" d={CURVES[reviews]} />
        {REVIEWS.slice(0, reviews).map((r) => (
          <circle key={r.x} className="lp-curve-dot" cx={r.x} cy={24} r={4.5} />
        ))}
        {REVIEWS.map((r) => (
          <text key={r.x} className="lp-curve-label" x={r.x} y="158" textAnchor="middle">
            {r.label}
          </text>
        ))}
        <text className="lp-curve-label" x="300" y="158" textAnchor="end">
          2 ay
        </text>
      </svg>
      <figcaption className="lp-curve-foot">
        <p className="lp-curve-says small" aria-live="polite">
          {SAYS[reviews]}
        </p>
        <div className="lp-curve-actions">
          {done ? (
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setReviews(0)}>
              <UndoIcon size={16} /> Baştan
            </button>
          ) : (
            <button type="button" className="btn btn-sm" onClick={() => setReviews(reviews + 1)}>
              <CheckIcon size={16} /> {REVIEWS[reviews]!.label} tekrar et
            </button>
          )}
          <span className="lp-curve-key small">
            <span>
              <i className="lp-key-learn" aria-hidden /> Diloloji ile
            </span>
            <span>
              <i className="lp-key-forget" aria-hidden /> Tekrar etmeden
            </span>
          </span>
        </div>
      </figcaption>
    </figure>
  )
}

/** The three level bands, each opening to what is in it: lessons, the first few on the path, one example. */
export function LevelBands({ language, bands }: { language: TargetLanguage; bands: { id: 'A' | 'B' | 'C'; art: string; levels: string; name: string; text: string }[] }) {
  const stats = LANDING_STATS[language]
  return (
    <ul className="lp-bands">
      {bands.map((b) => {
        const band = stats.bands[b.id]
        return (
          <li key={b.id}>
            <details className="card lp-band">
              <summary>
                <img className="lp-art" src={b.art} alt="" loading="lazy" decoding="async" draggable={false} />
                <span className="lp-band-levels">{b.levels}</span>
                <span className="section-title lp-band-name">{b.name}</span>
                <span className="small muted lp-band-text">{b.text}</span>
                <span className="lp-band-open small">
                  {band.lessons} ders <ChevronDownIcon size={16} />
                </span>
              </summary>
              <div className="lp-band-more">
                <p className="small lp-band-label">Yoldaki ilk dersler</p>
                <ul className="lp-band-titles small">
                  {band.titles.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <p className="small lp-band-label">Bir örnek</p>
                <p className="lp-band-example">
                  <span lang={language}>{band.example.text}</span>
                  <span className="small muted">{band.example.tr}</span>
                </p>
              </div>
            </details>
          </li>
        )
      })}
    </ul>
  )
}

const fmt = (n: number) => n.toLocaleString('tr-TR')

/** What each language has, counted from the app's content: tabs for the three languages (they pick the page's language). */
export function LanguageFacts({ language, names, onPick }: { language: TargetLanguage; names: Record<TargetLanguage, string>; onPick: (l: TargetLanguage) => void }) {
  const s = LANDING_STATS[language]
  const facts: [number, string][] = [
    [s.lessons, 'Rehber dersi (A1–C1)'],
    [s.grammar, 'dilbilgisi sorusu'],
    [s.dialogues, 'gündelik diyalog'],
    [s.exam, 'sınav tarzı okuma metni'],
    [s.storybooks, 'resimli kolay hikâye'],
    [s.audiobooks, 'sesli kitap bölümü'],
    [s.traps, 'Türkçeden gelen tuzak kelime'],
    [s.verbs, language === 'en' ? 'düzensiz fiil ve phrasal verb' : 'bütün zamanlarıyla çekimli fiil'],
  ]
  return (
    <div className="lp-facts-box">
      <div className="segmented lp-facts-tabs" role="group" aria-label="Dil">
        {(['fr', 'es', 'en'] as TargetLanguage[]).map((l) => (
          <button key={l} type="button" className="segmented-btn" aria-pressed={l === language} onClick={() => onPick(l)}>
            {names[l]}
          </button>
        ))}
      </div>
      <ul className="lp-facts-grid">
        {facts.map(([n, label]) => (
          <li key={label}>
            <strong>{fmt(n)}</strong>
            <span className="small muted">{label}</span>
          </li>
        ))}
      </ul>
      <p className="small muted lp-facts-note">Sayılar uygulamadaki içerikten sayılır; yeni içerik geldikçe artar.</p>
    </div>
  )
}

/**
 * On a phone, once the hero's button has scrolled away: a thin bar at the bottom with the way in, gone again when the
 * last section (with its own button) comes into view.
 */
export function StickyStart({ label, onStart, after, before }: { label: string; onStart: () => void; after: RefObject<HTMLElement | null>; before: RefObject<HTMLElement | null> }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      const a = after.current?.getBoundingClientRect()
      const b = before.current?.getBoundingClientRect()
      setShown(!!a && a.bottom < 0 && (!b || b.top > window.innerHeight))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [after, before])
  if (!shown) return null
  return (
    <div className="lp-sticky">
      <button type="button" className="btn btn-block" onClick={onStart}>
        {label}
      </button>
    </div>
  )
}
