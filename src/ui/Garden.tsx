import { useMemo, useState } from 'react'
import { displayForm } from '../engine/exercises'
import { gardenSummary, growthStage, plantHealth, type GardenSummary } from '../engine/growth'
import { MASTERY_STAGES } from '../engine/mastery'
import type { UserWordState, VocabularyEntry } from '../engine/types'
import { scheduler } from '../data/instance'
import { STAGE_NAME } from './labels'
import { Plant } from './Plant'
import { DropIcon } from './icons'

const BED_PREVIEW = 120

export const WORDS_VIEW_KEY = 'kelime-koc:words-view'

/** All words as one garden, in beds by growth stage; dry plants are watered with a review. */
export function GardenView({ vocabulary, states, onOpen, onWater }: { vocabulary: VocabularyEntry[]; states: UserWordState[]; onOpen: (id: string) => void; onWater: (entries: VocabularyEntry[]) => void }) {
  // "Now" moves on whenever the words change (after a review), not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [states])
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const summary = useMemo(() => gardenSummary(vocabulary, states, scheduler, now), [vocabulary, states, now])
  const byId = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary])
  const beds = [...MASTERY_STAGES.keys()].reverse().map((stage) => ({ stage, words: vocabulary.filter((v) => growthStage(stateById.get(v.id)) === stage) }))
  const seeds = vocabulary.filter((v) => !stateById.has(v.id))
  const water = summary.toWater.map((id) => byId.get(id)!).filter(Boolean)
  // A bed shows its first plants; a big one opens fully on request (thousands of tiles are slow).
  const [open, setOpen] = useState<Set<number>>(new Set())

  return (
    <section className="stack mt-4">
      <div className="garden-head card">
        <GardenBar
          parts={[
            { key: 'flower', label: 'çiçek açtı', n: summary.byStage[5] },
            { key: 'growing', label: 'büyüyor', n: summary.byStage.slice(1, 5).reduce((a, b) => a + b, 0) },
            { key: 'sprout', label: 'filiz', n: summary.byStage[0] },
            { key: 'seed', label: 'tohum', n: summary.seeds },
          ]}
        />
        {water.length > 0 ? (
          <div className="row">
            <span className="small">
              {summary.wilting > 0 && `${summary.wilting} soluyor`}
              {summary.wilting > 0 && summary.thirsty > 0 && ', '}
              {summary.thirsty > 0 && `${summary.thirsty} susamış`}
            </span>
            <button className="btn btn-sm" onClick={() => onWater(water.slice(0, 20))}>
              <DropIcon size={16} /> Bahçeyi sula ({Math.min(20, water.length)})
            </button>
          </div>
        ) : (
          <p className="small muted">Bütün bitkilerin canlı. Bir sonraki tekrarlar zamanı gelince bahçe yine su isteyecek.</p>
        )}
      </div>
      {beds
        .filter((b) => b.words.length)
        .map((b) => (
          <div key={b.stage} className="bed">
            <h3 className="small bed-title">
              <span className="bed-title-plant" aria-hidden>
                <Plant stage={b.stage} size={26} />
              </span>
              {STAGE_NAME[MASTERY_STAGES[b.stage]]} <span className="bed-count">{b.words.length}</span>
            </h3>
            <ul className="bed-plants">
              {(open.has(b.stage) ? b.words : b.words.slice(0, BED_PREVIEW)).map((w) => {
                const health = plantHealth(stateById.get(w.id), scheduler, now)
                return (
                <li key={w.id}>
                  <button className={`plant-tile is-${health}`} onClick={() => onOpen(w.id)} title={`${displayForm(w)}: ${w.senses[0].gloss}${health !== 'fresh' ? ' · su istiyor' : ''}`}>
                    <Plant stage={b.stage} health={health} size={52} />
                    {health !== 'fresh' && <DropIcon size={14} solid className="plant-drop" />}
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
        <div className="bed">
          <h3 className="small bed-title">
            <span className="bed-title-plant" aria-hidden>
              <Plant stage={-1} size={26} />
            </span>
            Tohumlar <span className="bed-count">{seeds.length}</span> <span className="muted">henüz ekilmedi</span>
          </h3>
          <ul className="bed-plants">
            {seeds.slice(0, 60).map((w) => (
              <li key={w.id}>
                <button className="plant-tile" onClick={() => onOpen(w.id)} title={w.senses[0].gloss}>
                  <Plant stage={-1} size={44} />
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

/** The garden in one line: how many words are at each stage, as a bar with its own legend. */
function GardenBar({ parts }: { parts: { key: string; label: string; n: number }[] }) {
  const total = parts.reduce((a, p) => a + p.n, 0)
  if (!total) return null
  return (
    <div className="garden-bar-wrap">
      <div className="garden-bar" role="img" aria-label={parts.map((p) => `${p.n} ${p.label}`).join(', ')}>
        {parts
          .filter((p) => p.n)
          .map((p) => (
            <span key={p.key} className={`garden-bar-seg is-${p.key}`} style={{ flexGrow: p.n }} />
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
export function GardenCard({ summary, onWater, onOpen }: { summary: GardenSummary; onWater: () => void; onOpen: () => void }) {
  const growing = summary.byStage.reduce((a, b) => a + b, 0)
  if (!growing) return null
  const dry = summary.wilting + summary.thirsty
  return (
    <section className="habit card garden-card">
      <span className="garden-card-plants" aria-hidden>
        <Plant stage={5} size={34} />
        <Plant stage={3} health={summary.wilting ? 'wilting' : 'fresh'} size={34} />
        <Plant stage={1} size={34} />
      </span>
      <div className="stack">
        <strong>Bahçen</strong>
        <span className="small muted">
          {summary.byStage[5]} çiçek, {growing - summary.byStage[5]} büyüyen bitki.
          {dry > 0 ? ` ${dry} tanesi su istiyor.` : ' Hepsi canlı.'}
        </span>
      </div>
      <div className="row gap-2">
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
