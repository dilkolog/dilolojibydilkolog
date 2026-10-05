import { useEffect, useMemo, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { frequencyWords } from '../data/frequency'
import { frequencyCoverage } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'

/**
 * Coverage of the language's most frequent words, band by band. The first thousands carry most
 * of every text, so this says more about real-world understanding than a raw word count.
 */
export function FrequencyCoverageCard({ db, language, vocabulary, states }: { db: KelimeDB; language: TargetLanguage; vocabulary: VocabularyEntry[]; states: UserWordState[] }) {
  const [list, setList] = useState<string[] | null>(null)
  const [known, setKnown] = useState<Set<string> | null>(null)
  useEffect(() => {
    void Promise.all([frequencyWords(language), db.getKnownWords(language)]).then(([l, k]) => {
      setList(l)
      setKnown(k)
    })
  }, [db, language])
  const bands = useMemo(() => (list && known ? frequencyCoverage(list, language, vocabulary, states, known) : null), [list, known, language, vocabulary, states])
  if (!bands) return null
  const next = bands.find((b) => b.known / b.total < 0.95)
  const pct = (n: number, d: number) => Math.round((n / Math.max(1, d)) * 100)
  return (
    <section className="section stack">
      <h2 className="section-title">En sık kelimelerden ne kadarını biliyorsun</h2>
      <p className="small muted">
        Bir dilin en sık birkaç bin kelimesi her metnin büyük kısmını oluşturur; rahat okumak için ilk katmanların %95'ini bilmek gerekir (Nation 2006).
        Kelimeler kök olarak sayılır; okurken işaretlediklerin, listende öğrendiklerin ve artikel, edat gibi temel kelimeler (le, de, et…) bilinen sayılır. Bu yüzden
        hiç kelime öğrenmeden de yüzde sıfırdan başlamaz.
      </p>
      <ul className="band-list">
        {bands.map((b) => (
          <li key={b.max}>
            <span className="band-label">İlk {b.max.toLocaleString('tr-TR')}</span>
            <span className="band-bar" role="img" aria-label={`%${pct(b.known, b.total)} biliyorsun, %${pct(b.learning, b.total)} öğreniyorsun`}>
              <span className="bb-known" style={{ width: `${(b.known / b.total) * 100}%` }} />
              <span className="bb-learning" style={{ width: `${(b.learning / b.total) * 100}%` }} />
            </span>
            <span className="band-pct">%{pct(b.known, b.total)}</span>
          </li>
        ))}
      </ul>
      <p className="small muted band-legend">
        <span className="bb-key bb-known" /> biliyorsun <span className="bb-key bb-learning" /> listende, öğreniyorsun
      </p>
      {next && (
        <p className="small">
          Sıradaki hedefin: ilk {next.max.toLocaleString('tr-TR')} kelimede %95 (şu an %{pct(next.known, next.total)}; {Math.max(0, Math.ceil(next.total * 0.95) - next.known).toLocaleString('tr-TR')} kelime
          kaldı). Eksik olanları Kelimeler → "Eksik sık kelimeler"de görebilirsin.
        </p>
      )}
    </section>
  )
}
