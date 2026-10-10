import { GUESS_LABEL, recordGuess, type GuessRating as Rating } from '../engine/deduction'
import type { TargetLanguage } from '../engine/types'
import { db } from '../data/instance'

/** One at a time: ratings in quick succession must not overwrite each other's log. */
let writing: Promise<unknown> = Promise.resolve()
const note = (language: TargetLanguage, rating: Rating) => {
  writing = writing.then(async () => db.saveDeductionLog(recordGuess(await db.getDeductionLog(), language, rating))).catch(() => undefined)
  return writing
}

const OPTIONS: { rating: Rating; hint: string }[] = [
  { rating: 'exact', hint: 'Anlamını doğru çıkarmıştım' },
  { rating: 'close', hint: 'Yakındım ama tam değil' },
  { rating: 'surprised', hint: 'Başka bir şey bekliyordum' },
]

/**
 * After a hidden word is opened: how close the guess from the sentence was. Only the learner can
 * say; the answer is kept as a count and costs nothing to skip.
 */
export function GuessRating({ word, language, onDone }: { word: string; language: TargetLanguage; onDone: () => void }) {
  return (
    <section className="card stack guess-rating" aria-label="Tahmin">
      <p>
        <strong lang={language}>{word}</strong>: tahminin ne kadar yakındı?
      </p>
      <div className="row">
        {OPTIONS.map((o) => (
          <button
            key={o.rating}
            type="button"
            className="btn btn-sm btn-quiet"
            title={o.hint}
            onClick={() => {
              void note(language, o.rating)
              onDone()
            }}
          >
            {GUESS_LABEL[o.rating]}
          </button>
        ))}
        <button type="button" className="link small" onClick={onDone}>
          Geç
        </button>
      </div>
    </section>
  )
}
