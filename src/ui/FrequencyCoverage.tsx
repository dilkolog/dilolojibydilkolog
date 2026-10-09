import { useEffect, useMemo, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { frequencyWords } from '../data/frequency'
import { frequencyCoverage } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { levelCoverage } from '../engine/cefrLevels'
import { useCefr } from './useCefr'

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
  const cefr = useCefr(language)
  // By textbook level (French, Spanish) or by frequency band; the level view first when there is one.
  const [view, setView] = useState<'level' | 'frequency'>('level')
  const bands = useMemo(() => (list && known ? frequencyCoverage(list, language, vocabulary, states, known) : null), [list, known, language, vocabulary, states])
  const levels = useMemo(() => (cefr && known ? levelCoverage(cefr, language, vocabulary, states, known) : null), [cefr, known, language, vocabulary, states])
  if (!bands) return null
  const byLevel = view === 'level' && !!levels?.length
  const rows: Row[] = byLevel
    ? levels!.map((l) => ({ key: l.level, label: `${l.level} (${l.total.toLocaleString('tr-TR')})`, ...l }))
    : bands.map((b) => ({ key: String(b.max), label: `İlk ${b.max.toLocaleString('tr-TR')}`, ...b }))
  const goal = byLevel ? LEVEL_GOAL : 0.95
  const next = rows.find((r) => r.known / r.total < goal)
  const pct = (n: number, d: number) => Math.round((n / Math.max(1, d)) * 100)
  const left = next ? Math.max(0, Math.ceil(next.total * goal) - next.known).toLocaleString('tr-TR') : ''
  return (
    <section className="section stack">
      <h2 className="section-title">{byLevel ? 'Seviyelerin kelimelerinden ne kadarını biliyorsun' : 'En sık kelimelerden ne kadarını biliyorsun'}</h2>
      {!!levels?.length && (
        <div className="segmented" role="group" aria-label="Görünüm">
          <button type="button" className="segmented-btn" aria-pressed={byLevel} onClick={() => setView('level')}>
            Seviyeye göre
          </button>
          <button type="button" className="segmented-btn" aria-pressed={!byLevel} onClick={() => setView('frequency')}>
            Sıklığa göre
          </button>
        </div>
      )}
      <p className="small muted">
        {byLevel ? (
          <>
            Her seviye, ders kitaplarında ve kolay okuma metinlerinde o seviyede kullanılmaya başlanan kelimeler (FLELex/ELELex).{' '}
          </>
        ) : (
          <>Bir dilin en sık birkaç bin kelimesi her metnin büyük kısmını oluşturur; rahat okumak için ilk katmanların %95'ini bilmek gerekir (Nation 2006). </>
        )}
        Kelimeler kök olarak sayılır; okurken işaretlediklerin, listende öğrendiklerin ve artikel, edat gibi temel kelimeler (le, de, et…) bilinen sayılır. Bu yüzden
        hiç kelime öğrenmeden de yüzde sıfırdan başlamaz.
      </p>
      <ul className="band-list">
        {rows.map((b) => (
          <li key={b.key}>
            <span className="band-label">{b.label}</span>
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
          {byLevel
            ? `Sıradaki hedefin: ${next.key} kelimelerinde %${Math.round(goal * 100)} (şu an %${pct(next.known, next.total)}; ${left} kelime kaldı). Eksik olanları Kelimeler → "Eksik sık kelimeler" → ${next.key}'de görebilirsin.`
            : `Sıradaki hedefin: ilk ${Number(next.key).toLocaleString('tr-TR')} kelimede %95 (şu an %${pct(next.known, next.total)}; ${left} kelime kaldı). Eksik olanları Kelimeler → "Eksik sık kelimeler"de görebilirsin.`}
        </p>
      )}
    </section>
  )
}

interface Row {
  key: string
  label: string
  total: number
  known: number
  learning: number
}

/** A level's words to know before calling it done: most of them, not every rare one. */
const LEVEL_GOAL = 0.9
