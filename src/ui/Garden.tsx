import { useMemo, useState, type CSSProperties } from 'react'
import { isDifficult } from '../engine/difficult'
import { displayForm } from '../engine/exercises'
import { gardenSummary, growthStage, plantHealth, type GardenSummary } from '../engine/growth'
import { MASTERY_STAGES } from '../engine/mastery'
import type { UserWordState, VocabularyEntry } from '../engine/types'
import { scheduler } from '../data/instance'
import { STAGE_NAME } from './labels'
import { GardenSky } from './GardenSky'
import { Plant } from './Plant'
import { BoltIcon, DropIcon } from './icons'
import { POTS } from './drawnArt'

const BED_PREVIEW = 120
/** Only the first plants of a bed sway: a few hundred moving icons would cost more than they give. */
const LIVE_PER_BED = 24

// A new key (2026-10-14): the words screen now opens on the lists; the old one remembered "Tümü" for nearly everyone.
export const WORDS_VIEW_KEY = 'diloloji:words-view'
/** Set (for one visit) to open the garden already filtered to the hard words. */
export const GARDEN_HARD_KEY = 'kelime-koc:garden-hard'

/** Reads and clears the one-visit flag: the garden opens on the Zor filter once, not every time. */
function takeHardFlag(): boolean {
  try {
    const on = sessionStorage.getItem(GARDEN_HARD_KEY) === '1'
    sessionStorage.removeItem(GARDEN_HARD_KEY)
    return on
  } catch {
    return false
  }
}

/** All words as one garden, in beds by growth stage; dry plants are watered with a review. */
export function GardenView({ vocabulary, states, onOpen, onWater }: { vocabulary: VocabularyEntry[]; states: UserWordState[]; onOpen: (id: string) => void; onWater: (entries: VocabularyEntry[]) => void }) {
  // "Now" moves on whenever the words change (after a review), not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [states])
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const summary = useMemo(() => gardenSummary(vocabulary, states, scheduler, now), [vocabulary, states, now])
  const byId = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary])
  // Words marked hard glow in the garden; the filter shows only those (and goes away when none is left).
  const hard = useMemo(() => vocabulary.filter(isDifficult), [vocabulary])
  const [hardOnly, setHardOnly] = useState(takeHardFlag)
  const showHardOnly = hardOnly && hard.length > 0
  const shown = showHardOnly ? hard : vocabulary
  const beds = [...MASTERY_STAGES.keys()].reverse().map((stage) => ({ stage, words: shown.filter((v) => growthStage(stateById.get(v.id)) === stage) }))
  const seeds = shown.filter((v) => !stateById.has(v.id))
  const dry = summary.toWater.map((id) => byId.get(id)!).filter(Boolean)
  // A bed shows its first plants; a big one opens fully on request (thousands of tiles are slow).
  const [open, setOpen] = useState<Set<number>>(new Set())
  // Watering: rain falls over the garden for a moment, then the review of those plants begins.
  const [raining, setRaining] = useState(false)
  const water = (entries: VocabularyEntry[]) => {
    if (raining) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onWater(entries)
    setRaining(true)
    setTimeout(() => onWater(entries), 1100)
  }

  return (
    <section className="stack mt-4 garden-view">
      {raining && <Rain />}
      <div className="garden-head card">
        <GardenSky now={now} flowers={summary.byStage[5]} growing={summary.byStage.slice(1, 5).reduce((a, b) => a + b, 0)} />
        <GardenBar
          parts={[
            { key: 'flower', label: 'çiçek açtı', n: summary.byStage[5] },
            { key: 'growing', label: 'büyüyor', n: summary.byStage.slice(1, 5).reduce((a, b) => a + b, 0) },
            { key: 'sprout', label: 'filiz', n: summary.byStage[0] },
            { key: 'seed', label: 'tohum', n: summary.seeds },
          ]}
        />
        {dry.length > 0 ? (
          <div className="row garden-status-bar">
            <span className="small garden-status-text">
              <span className="garden-status-icon" aria-hidden>💧</span>
              <span>
                {summary.wilting > 0 && `${summary.wilting} soluyor`}
                {summary.wilting > 0 && summary.thirsty > 0 && ', '}
                {summary.thirsty > 0 && `${summary.thirsty} susamış`}
              </span>
            </span>
            <span className="row gap-2">
              {dry.length > 5 && (
                <button className="btn btn-sm btn-quiet" onClick={() => water(dry.slice(0, 5))} disabled={raining}>
                  Hızlı sula (5)
                </button>
              )}
              <button className="btn btn-sm" onClick={() => water(dry.slice(0, 20))} disabled={raining}>
                <DropIcon size={16} /> Bahçeyi sula ({Math.min(20, dry.length)})
              </button>
            </span>
          </div>
        ) : (
          <div className="garden-status-note">
            <span className="garden-status-icon" aria-hidden>🌿</span>
            <p className="small">Bütün bitkilerin canlı. Bir sonraki tekrarlar zamanı gelince bahçe yine su isteyecek.</p>
          </div>
        )}
        {hard.length > 0 && (
          <div className="row garden-hard-row">
            <div className="choice-row" role="group" aria-label="Bahçede göster">
              <button type="button" className="chip chip-sm" aria-pressed={!showHardOnly} onClick={() => setHardOnly(false)}>
                Hepsi
              </button>
              <button type="button" className="chip chip-sm" aria-pressed={showHardOnly} onClick={() => setHardOnly(true)}>
                <BoltIcon size={14} className="inline-icon" />
                Zor ({hard.length})
              </button>
            </div>
            {showHardOnly && (
              <button className="btn btn-sm" onClick={() => onWater(hard)}>
                <BoltIcon size={16} /> Zor kelimeleri çalış ({hard.length})
              </button>
            )}
          </div>
        )}
      </div>
      {beds
        .filter((b) => b.words.length)
        .map((b) => (
          <div key={b.stage} className="bed">
            <h2 className="bed-title">
              <span className="bed-title-plant" aria-hidden>
                <Plant stage={b.stage} size={24} />
              </span>
              <span className="bed-title-name">{STAGE_NAME[MASTERY_STAGES[b.stage]]}</span>
              <span className="bed-count">{b.words.length}</span>
            </h2>
            <ul className="bed-plants">
              {(open.has(b.stage) ? b.words : b.words.slice(0, BED_PREVIEW)).map((w, i) => {
                const health = plantHealth(stateById.get(w.id), scheduler, now)
                return (
                <li key={w.id} style={{ '--i': Math.min(i, 40) } as CSSProperties}>
                  <button className={`plant-tile is-${health}${w.difficult ? ` is-hard${i < LIVE_PER_BED ? ' is-pulse' : ''}` : ''}`} onClick={() => onOpen(w.id)} title={`${displayForm(w)}: ${w.senses[0].gloss}${health !== 'fresh' ? ' · su istiyor' : ''}${w.difficult ? ' · zor işaretli' : ''}`}>
                    <span className="plant-art-bed" aria-hidden>
                      <Plant stage={b.stage} health={health} size={48} live={i < LIVE_PER_BED} phase={i} />
                      {health !== 'fresh' && <DropIcon size={14} solid className="plant-drop" />}
                      {w.difficult && <BoltIcon size={14} solid className="plant-hard-mark" />}
                    </span>
                    <span className="plant-name" lang={w.language}>
                      {w.lemma}
                    </span>
                  </button>
                </li>
                )
              })}
            </ul>
            {b.words.length > BED_PREVIEW && !open.has(b.stage) && (
              <button type="button" className="link small" onClick={() => setOpen((o) => new Set(o).add(b.stage))}>
                {b.words.length - BED_PREVIEW} bitki daha göster
              </button>
            )}
          </div>
        ))}
      {seeds.length > 0 && (
        <div className="bed bed-seeds">
          <h2 className="bed-title">
            <span className="bed-title-plant" aria-hidden>
              <Plant stage={-1} size={24} />
            </span>
            <span className="bed-title-name">Tohumlar</span>
            <span className="bed-count">{seeds.length}</span>
            <span className="bed-subnote muted">henüz ekilmedi</span>
          </h2>
          <ul className="bed-plants">
            {seeds.slice(0, 60).map((w, i) => (
              <li key={w.id} style={{ '--i': Math.min(i, 40) } as CSSProperties}>
                <button className={`plant-tile is-seed${w.difficult ? ` is-hard${i < LIVE_PER_BED ? ' is-pulse' : ''}` : ''}`} onClick={() => onOpen(w.id)} title={`${w.senses[0].gloss}${w.difficult ? ' · zor işaretli' : ''}`}>
                  <span className="plant-art-bed" aria-hidden>
                    <Plant stage={-1} size={40} />
                    {w.difficult && <BoltIcon size={14} solid className="plant-hard-mark" />}
                  </span>
                  <span className="plant-name" lang={w.language}>
                    {w.lemma}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** Rain over the whole garden: drops of different length and speed, for a little over a second. */
function Rain() {
  const drops = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ x: (i * 97) % 100, d: ((i * 53) % 40) / 100, h: 10 + ((i * 7) % 12), s: 0.55 + ((i * 11) % 30) / 100 })), [])
  return (
    <div className="garden-rain" aria-hidden>
      {drops.map((d, i) => (
        <i key={i} style={{ left: `${d.x}%`, height: `${d.h}px`, animationDelay: `${d.d}s`, animationDuration: `${d.s}s` }} />
      ))}
    </div>
  )
}

/** The garden in one line: how many words are at each stage, as a bar with its own legend. */
function GardenBar({ parts }: { parts: { key: string; label: string; n: number }[] }) {
  const total = parts.reduce((a, p) => a + p.n, 0)
  if (!total) return null
  return (
    <div className="garden-bar-wrap">
      <div className="garden-bar" role="img" aria-label={parts.map((p) => `${p.n} ${p.label}`).join(', ')}>
        {parts
          .filter((p) => p.n)
          .map((p, k) => (
            <span key={p.key} className={`garden-bar-seg is-${p.key}`} style={{ flexGrow: p.n, '--k': k } as CSSProperties} />
          ))}
      </div>
      <ul className="garden-legend">
        {parts.map((p) => (
          <li key={p.key} className={p.n ? undefined : 'is-zero'}>
            <span className={`garden-key is-${p.key}`} aria-hidden />
            <strong>{p.n}</strong> {p.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Home-screen summary of the garden with a shortcut to water it. */
export function GardenCard({
  summary,
  onWater,
  onOpen,
  hardCount = 0,
  onPracticeHard,
  onOpenHard,
}: {
  summary: GardenSummary
  onWater: () => void
  onOpen: () => void
  /** Words marked hard, a practice of just those, and the garden opened on them. */
  hardCount?: number
  onPracticeHard?: () => void
  onOpenHard?: () => void
}) {
  const growing = summary.byStage.reduce((a, b) => a + b, 0)
  if (!growing) return null
  const dry = summary.wilting + summary.thirsty
  const cardStages = [5, 4, 3, 2, 1, 0].filter((s) => summary.byStage[s] > 0).slice(0, 4).reverse()
  const thirst = summary.wilting ? 'wilting' : summary.thirsty ? 'thirsty' : 'fresh'
  return (
    <section className="habit card garden-card">
      <span className={`garden-card-pots is-${thirst}`} aria-hidden>
        {/* The garden as it is: up to four of the stages it has, young to old, drawn pots on one shelf; a drop when some are thirsty. */}
        {cardStages.map((stage, i) => (
          <img key={stage} className="garden-pot" src={POTS[stage]} alt="" draggable={false} style={{ '--i': i } as CSSProperties} />
        ))}
        {dry > 0 && (
          <span className="garden-drop">
            <DropIcon size={14} solid />
          </span>
        )}
      </span>
      <div className="stack garden-card-text">
        <strong>Bahçen</strong>
        <span className="garden-stats small">
          <span>
            <b>{summary.byStage[5]}</b> çiçek
          </span>
          <span>
            <b>{growing - summary.byStage[5]}</b> büyüyen
          </span>
          {dry > 0 ? (
            <span className="is-dry">
              <b>{dry}</b> su istiyor
            </span>
          ) : (
            <span>Hepsi canlı</span>
          )}
        </span>
        {hardCount > 0 && (
          <button type="button" className="garden-hard-line" onClick={onOpenHard} title="Bahçede zor kelimeleri göster">
            <BoltIcon size={14} solid /> {hardCount} zor kelime
          </button>
        )}
      </div>
      <div className="row gap-2">
        {hardCount > 0 && onPracticeHard && (
          <button className="btn btn-sm" onClick={onPracticeHard}>
            <BoltIcon size={16} /> Zorları çalış
          </button>
        )}
        {dry > 0 && (
          <button className="btn btn-sm" onClick={onWater}>
            <DropIcon size={16} /> Sula
          </button>
        )}
        <button className="btn btn-sm btn-quiet" onClick={onOpen}>
          Bahçeye git
        </button>
      </div>
    </section>
  )
}
