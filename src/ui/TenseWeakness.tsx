import { TENSE_GUIDE } from '../engine/tenseGuide'
import type { VocabularyEntry } from '../engine/types'
import { PlayIcon } from './icons'
import { DAYS, MIN_ANSWERS, useTenseStats, weakestTense } from './tenseStats'

/** Mistakes page: how each tense is going, the weakest one with a way to practise it. */
export function TenseWeakness({ language, vocabulary, onPractice }: { language: VocabularyEntry['language']; vocabulary: readonly VocabularyEntry[]; onPractice?: () => void }) {
  const stats = useTenseStats(language, vocabulary).filter((s) => s.correct + s.wrong > 0)
  if (language === 'en' || !stats.length) return null
  const weak = weakestTense(stats)
  const order = Object.keys(TENSE_GUIDE)
  const rows = [...stats].sort((a, b) => order.indexOf(a.tense) - order.indexOf(b.tense))
  return (
    <section className="section stack tense-weakness">
      <header className="field-head">
        <h2 className="section-title">Çekim: zamanlara göre</h2>
        {onPractice && (
          <button className="btn btn-sm btn-quiet" onClick={onPractice}>
            <PlayIcon size={14} /> Fiil laboratuvarı
          </button>
        )}
      </header>
      <p className="small muted">
        Son {DAYS} günün çekim cevapları.
        {weak
          ? ` En çok ${TENSE_GUIDE[weak.tense].name} zorluyor; antrenmanda bu zaman daha sık gelir.`
          : stats.some((s) => s.correct + s.wrong >= MIN_ANSWERS)
            ? ' Belirgin bir zayıf zaman yok.'
            : ` Bir zamanı değerlendirmek için en az ${MIN_ANSWERS} cevap gerekiyor.`}
      </p>
      <ul className="tense-bars">
        {rows.map((s) => {
          const n = s.correct + s.wrong
          const pct = Math.round((s.correct / n) * 100)
          return (
            <li key={s.tense} className={s === weak ? 'is-weak' : undefined}>
              <span className="tense-bar-name" lang={language}>
                {TENSE_GUIDE[s.tense].name}
              </span>
              <span className="tense-bar" role="img" aria-label={`%${pct} doğru`}>
                <span style={{ width: `${pct}%` }} />
              </span>
              <span className="tense-bar-num">
                {s.correct}/{n}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
