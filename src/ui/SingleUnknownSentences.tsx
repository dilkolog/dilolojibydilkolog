import type { ReadingAnalysis } from '../engine/reading'
import type { TargetLanguage } from '../engine/types'
import { highlight } from './readingHelpers'
import { MessageIcon } from './icons'

/** Sentences with one unknown word: the best place to meet it (i+1). */
export function SingleUnknownSentences({ analysis, language, onAdd, onKeep }: { analysis: ReadingAnalysis; language: TargetLanguage; onAdd: (word: string, sentence: string) => void; onKeep: (sentence: string, word: string) => void }) {
  return (
    <section className="section stack">
      <h2 className="section-title">Tek bilinmeyenli cümleler</h2>
      <p className="small muted">
        Yalnızca bir kelimesini bilmediğin cümleler: yeni bir kelimeyi öğrenmenin en verimli bağlamı (i+1). Kelimeyi bu cümleyle birlikte ekle.
      </p>
      <ul className="plain stack gap-2">
        {analysis.iPlusOne.slice(0, 12).map((x) => (
          <li key={x.key} className="row justify-between nowrap items-start">
            <span className="sentence-sm" lang={language}>
              {highlight(x.sentence, x.word)}
            </span>
            <span className="row gap-xs nowrap">
              <button className="btn btn-quiet" onClick={() => onAdd(x.word.toLocaleLowerCase(language), x.sentence)}>
                Ekle
              </button>
              <button className="btn btn-quiet" onClick={() => onKeep(x.sentence, x.word)} aria-label="Cümleyi kaydet" title="Cümleyi kaydet">
                <MessageIcon size={16} />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
