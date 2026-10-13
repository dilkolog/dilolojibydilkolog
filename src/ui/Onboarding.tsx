import { useEffect, useRef, useState } from 'react'
import onbGoal from '../assets/art/onb-goal.webp'
import onbMap from '../assets/art/onb-map.webp'
import onbPlant from '../assets/art/onb-plant.webp'
import langEn from '../assets/art/lang-en.webp'
import langEs from '../assets/art/lang-es.webp'
import langFr from '../assets/art/lang-fr.webp'

import { TARGET_LANGUAGES, type TargetLanguage } from '../engine/types'

import { DEFAULT_SETTINGS, type Settings } from '../data/db'

import { BrandMark, CalendarIcon, CheckIcon, FlowerIcon, PlusIcon } from './icons'
import { HELLO, LANGUAGE_NAME } from './labels'
import { POTS } from './drawnArt'

const MINUTE_OPTIONS = [5, 10, 15, 20, 30]

/** Monki dressed for each language's welcome. */
const LANG_ART: Record<TargetLanguage, string> = { en: langEn, es: langEs, fr: langFr }

function Chips<T extends string | number>({
  options,
  value,
  onChange,
  label,
  format = String,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  label: string
  format?: (v: T) => string
}) {
  return (
    <div className="seg-group" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" role="radio" className="seg-btn" aria-checked={o === value} onClick={() => onChange(o)}>
          {format(o)}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------

// On a phone a focused field opens the keyboard and scrolls past the welcome.
const FINE_POINTER = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches

const NEW_WORD_OPTIONS = [3, 5, 8, 12]
const STEP_TITLES = ['Hoş geldin', 'Dil', 'Hedef', 'Hazır'] as const
const LAST_STEP = STEP_TITLES.length - 1

/** First run, one question at a time: welcome, language, goal, then ready. The hero keeps the chosen language's colour throughout. */
export function Onboarding({ onDone }: { onDone: (s: Settings) => void }) {
  const [step, setStep] = useState(0)
  const [language, setLanguage] = useState<TargetLanguage>('en')
  const [minutes, setMinutes] = useState(DEFAULT_SETTINGS.dailyMinutes)
  const [perDay, setPerDay] = useState(DEFAULT_SETTINGS.newWordsPerDay)
  const [name, setName] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)
  // A new step starts at its heading: the screen reader says where it is, and a phone's page is back at the top.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    heading.current?.focus({ preventScroll: true })
    window.scrollTo?.({ top: 0 })
  }, [step])
  const next = () => setStep((n) => Math.min(LAST_STEP, n + 1))
  const back = () => setStep((n) => Math.max(0, n - 1))
  const finish = () =>
    onDone({ ...DEFAULT_SETTINGS, activeLanguage: language, dailyMinutes: minutes, newWordsPerDay: perDay, profile: { ...DEFAULT_SETTINGS.profile, name: name.trim() } })
  const who = name.trim()
  return (
    <div className={`onboarding stack is-step-${step}`} data-lang={language}>
      {/* The chosen language colours the welcome, and says hello in its own words. */}
      <section className="onboarding-hero">
        <span className="hero-hello" aria-hidden lang={language}>
          {HELLO[language]}
        </span>
        <div className="brand onboarding-brand">
          <span className="brand-mark" aria-hidden>
            <BrandMark />
          </span>{' '}
          Diloloji
        </div>
        {step === 0 && (
          <>
            <h1 className="onboarding-title" ref={heading} tabIndex={-1}>
              Kelimeleri gerçekten kullanabileceğin şekilde öğren
            </h1>
            <p className="onboarding-sub">Her gün sana özel kısa bir çalışma hazırlar, unutmak üzere olduğun kelimeleri tam zamanında geri getirir.</p>
            {/* A word's life in three plants: a seed, a sprout, a flower, growing in turn. */}
            <div className="onboarding-garden" aria-hidden>
              {POTS.map((src, i) => (
                <span className="og-plant" key={i}>
                  <img className="og-pot" src={src} alt="" draggable={false} style={{ height: `${3 + i * 0.7}rem` }} />
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      <nav className="ob-progress" aria-label="İlerleme">
        <ol>
          {STEP_TITLES.map((t, i) => (
            <li key={t} className={i === step ? 'is-now' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="ob-dot" aria-hidden>
                {i < step ? <CheckIcon size={14} /> : i + 1}
              </span>
              <span className="ob-label">{t}</span>
            </li>
          ))}
        </ol>
      </nav>

      <section className="card stack onboarding-form ob-step" key={step}>
        {step === 0 && (
          <>
            <img className="ob-art" src={onbMap} alt="" draggable={false} />
            <button type="button" className="btn btn-lg btn-block" onClick={next}>
              Başlayalım
            </button>
            <ol className="onboarding-steps" aria-label="Nasıl çalışır">
              <li>
                <span className="step-icon" aria-hidden>
                  <PlusIcon size={20} />
                </span>
                <strong>Kelimelerini ekle</strong>
                <span className="small muted">Okuduğun, duyduğun, öğrenmek istediğin kelimeler: her biri bir tohum.</span>
              </li>
              <li>
                <span className="step-icon" aria-hidden>
                  <CalendarIcon size={20} />
                </span>
                <strong>Her gün kısa tekrar</strong>
                <span className="small muted">Unutmak üzere olduklarını tam zamanında sorar; birkaç dakika yeter.</span>
              </li>
              <li>
                <span className="step-icon" aria-hidden>
                  <FlowerIcon size={20} />
                </span>
                <strong>Kelimeler çiçek açar</strong>
                <span className="small muted">Tanımaktan cümlede kullanmaya: bildiklerin bahçende büyür.</span>
              </li>
            </ol>
          </>
        )}

        {step === 1 && (
          <div className="stack gap-2">
            <h2 className="section-title ob-heading" ref={heading} tabIndex={-1}>
              Hangi dille başlayalım?
            </h2>
            <div className="lang-cards" role="group" aria-label="Dil">
              {TARGET_LANGUAGES.map((l) => (
                <button key={l} type="button" className="lang-card" aria-pressed={l === language} data-lang={l} onClick={() => setLanguage(l)}>
                  <img className="lang-card-art" src={LANG_ART[l]} alt="" draggable={false} />
                  <span className="hello">{HELLO[l]}</span>
                  <span className="muted">{LANGUAGE_NAME[l]}</span>
                  {l === language && (
                    <span className="lang-card-check" aria-hidden>
                      <CheckIcon size={16} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="small muted">Diğer dilleri sonra üstteki düğmelerden açabilirsin.</p>
          </div>
        )}

        {step === 2 && (
          <div className="stack gap-4">
            <img className="ob-art" src={onbGoal} alt="" draggable={false} />
            <h2 className="section-title ob-heading" ref={heading} tabIndex={-1}>
              Günlük hedefini seç
            </h2>
            <label className="field">
              <span className="section-title">Adın ne? <span className="muted small">(isteğe bağlı)</span></span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Adın" autoFocus={FINE_POINTER} />
            </label>
            <div className="field">
              <span className="section-title">Günde kaç dakika?</span>
              <Chips label="Günlük süre" options={MINUTE_OPTIONS} value={minutes} onChange={setMinutes} format={(m) => `${m} dk`} />
            </div>
            <div className="field">
              <span className="section-title">Günde kaç yeni kelime?</span>
              <Chips label="Günlük yeni kelime" options={NEW_WORD_OPTIONS} value={perDay} onChange={setPerDay} />
              <p className="small muted">Yenilerin yanında, unutmak üzere olduğun kelimelerin tekrarı da gelir. İkisini de sonra Ayarlar’dan değiştirebilirsin.</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack gap-3 ob-ready">
            <img className="ob-art" src={onbPlant} alt="" draggable={false} />
            <h2 className="section-title ob-heading" ref={heading} tabIndex={-1}>
              {who ? `Hazırsın, ${who}!` : 'Hazırsın!'}
            </h2>
            <ul className="ob-recap">
              <li>
                <span className="muted">Dil</span>
                <strong>{LANGUAGE_NAME[language]}</strong>
              </li>
              <li>
                <span className="muted">Günlük süre</span>
                <strong>{minutes} dk</strong>
              </li>
              <li>
                <span className="muted">Yeni kelime</span>
                <strong>günde {perDay}</strong>
              </li>
            </ul>
            <p className="small muted">Sıradaki ekranda kelimelerini ekleyebilir ya da denemek için hazır örnek kelimeleri yükleyebilirsin.</p>
          </div>
        )}

        {step > 0 && (
          <div className="ob-actions">
            <button type="button" className="btn btn-quiet" onClick={back}>
              Geri
            </button>
            {step < LAST_STEP ? (
              <button type="button" className="btn btn-lg" onClick={next}>
                Devam
              </button>
            ) : (
              <button type="button" className="btn btn-lg" onClick={finish}>
                {LANGUAGE_NAME[language]} ile başlayalım
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
