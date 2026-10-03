import { useMemo } from 'react'
import { displayForm } from '../engine/exercises'
import { gardenSummary, growthStage, plantHealth, type GardenSummary } from '../engine/growth'
import { MASTERY_STAGES } from '../engine/mastery'
import type { UserWordState, VocabularyEntry } from '../engine/types'
import { scheduler } from '../data/instance'
import { STAGE_NAME } from './labels'
import { Plant } from './Plant'

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

  return (
    <section className="stack" style={{ marginTop: '1rem' }}>
      <div className="garden-head card">
        <p>
          <strong>{summary.byStage[5]}</strong> çiçek açtı · <strong>{summary.byStage.slice(1, 5).reduce((a, b) => a + b, 0)}</strong> büyüyor ·{' '}
          <strong>{summary.byStage[0]}</strong> filiz · {summary.seeds} tohum
        </p>
        {water.length > 0 ? (
          <div className="row">
            <span className="small">
              {summary.wilting > 0 && `${summary.wilting} soluyor`}
              {summary.wilting > 0 && summary.thirsty > 0 && ', '}
              {summary.thirsty > 0 && `${summary.thirsty} susamış`}
            </span>
            <button className="btn btn-sm" onClick={() => onWater(water.slice(0, 20))}>
              💧 Bahçeyi sula ({Math.min(20, water.length)})
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
              {STAGE_NAME[MASTERY_STAGES[b.stage]]} <span className="muted">({b.words.length})</span>
            </h3>
            <ul className="bed-plants">
              {b.words.map((w) => (
                <li key={w.id}>
                  <button className="plant-tile" onClick={() => onOpen(w.id)} title={`${displayForm(w)}: ${w.senses[0].gloss}`}>
                    <Plant stage={b.stage} health={plantHealth(stateById.get(w.id), scheduler, now)} size={44} />
                    <span className="plant-name" lang={w.language}>
                      {w.lemma}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      {seeds.length > 0 && (
        <div className="bed">
          <h3 className="small bed-title">
            Tohumlar <span className="muted">({seeds.length}, henüz ekilmedi)</span>
          </h3>
          <ul className="bed-plants">
            {seeds.slice(0, 60).map((w) => (
              <li key={w.id}>
                <button className="plant-tile" onClick={() => onOpen(w.id)} title={w.senses[0].gloss}>
                  <Plant stage={-1} size={32} />
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
      <div className="row" style={{ gap: '0.5rem' }}>
        {dry > 0 && (
          <button className="btn btn-sm" onClick={onWater}>
            💧 Sula
          </button>
        )}
        <button className="btn btn-sm btn-quiet" onClick={onOpen}>
          Bahçeye git
        </button>
      </div>
    </section>
  )
}
