import '../lazy.css'
import { useEffect, useState } from 'react'
import { readingKey } from '../engine/reading'
import { createRng } from '../engine/rng'
import { TARGET_LANGUAGES, type TargetLanguage } from '../engine/types'
import { BAND_SIZE, buildVocabTest, scoreVocabTest, type TestItem, type VocabResult } from '../engine/vocabTest'
import type { KelimeDB, VocabTestRecord } from '../data/db'
import { frequencyWords } from '../data/frequency'
import { LANGUAGE_NAME } from './labels'

type Answer = 'yes' | 'no' | 'skip'

/**
 * Vocabulary size test: about 75 quick yes/no decisions. Real words the learner knows also join
 * the known-word set used by reading mode.
 */
export function VocabTestScreen({ db, language, onDone }: { db: KelimeDB; language: TargetLanguage; onDone: () => void }) {
  const [items, setItems] = useState<TestItem[] | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [result, setResult] = useState<{ score: VocabResult; previous?: VocabTestRecord } | null>(null)

  useEffect(() => {
    const others = TARGET_LANGUAGES.filter((l) => l !== language)
    Promise.all([frequencyWords(language), ...others.map(frequencyWords)]).then(([list, ...rest]) =>
      setItems(buildVocabTest(list, createRng(Date.now()), rest.flat())),
    )
  }, [language])

  const index = answers.length
  const item = items?.[index]

  const answer = async (a: Answer) => {
    if (!items || !item || result) return
    const next = [...answers, a]
    setAnswers(next)
    if (next.length < items.length) return
    const known = new Set(items.filter((_, i) => next[i] === 'yes').map((x) => x.word))
    const skipped = new Set(items.filter((_, i) => next[i] === 'skip').map((x) => x.word))
    const score = scoreVocabTest(items, known, skipped)
    const previous = (await db.getVocabTests()).filter((r) => r.language === language).at(-1)
    await db.addVocabTest({ language, at: new Date().toISOString(), ...score })
    // Real words marked as known count as known in reading mode too.
    await db.addKnownWords(
      language,
      items.filter((x, i) => x.band !== undefined && next[i] === 'yes').map((x) => readingKey(x.word, language)),
    )
    setResult({ score, previous })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'j') answer('yes')
      else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'f') answer('no')
      else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'i') answer('skip')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!items) return null

  if (result) {
    const { score, previous } = result
    const diff = previous ? score.estimate - previous.estimate : 0
    return (
      <div className="stack">
        <h1 className="greeting">Kelime dağarcığı</h1>
        <div className="hero-stat card">
          <span className="hero-number">≈ {score.estimate.toLocaleString('tr-TR')}</span>
          <span>
            <strong>{LANGUAGE_NAME[language]} kelime</strong>
            <br />
            <span className="small muted">
              En sık 20.000 kelimeden bildiğin tahmini sayı.
              {previous && ` Önceki testten ${diff >= 0 ? '+' : ''}${diff.toLocaleString('tr-TR')}.`}
            </span>
          </span>
        </div>
        <section className="section stack">
          <h2 className="section-title">Sıklık bandına göre</h2>
          <div className="band-bars" role="img" aria-label="Her 2000 kelimelik bantta bildiğin oran">
            {score.bands.map((b, i) => (
              <div className="band-row" key={i}>
                <span className="small muted">
                  {(i * BAND_SIZE + 1).toLocaleString('tr-TR')}–{((i + 1) * BAND_SIZE).toLocaleString('tr-TR')}
                </span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${b * 100}%` }} />
                </div>
                <span className="small">%{Math.round(b * 100)}</span>
              </div>
            ))}
          </div>
          <p className="small muted">
            Uydurma kelimelerde "biliyorum" oranın: %{Math.round(score.falseAlarms * 100)}
            {score.falseAlarms > 0 ? '; tahmin buna göre aşağı düzeltildi.' : '; tahmin düzeltme gerektirmedi.'} Bildiğin gerçek kelimeler okuma modunda da bilinen
            sayılacak. Testi birkaç haftada bir tekrarlamak ilerlemeni gösterir.
          </p>
        </section>
        <div className="row">
          <button className="btn btn-lg" onClick={onDone} autoFocus>
            Tamam
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="stack vocab-test">
      <div className="row justify-between">
        <h1 className="greeting">Kelime dağarcığı testi</h1>
        <button className="link small" onClick={onDone}>
          Vazgeç
        </button>
      </div>
      <p className="small muted">
        Anlamını bildiğin kelimelere "Biliyorum" de. Bazıları uydurma; onlara da biliyorum dersen tahmin düşer, o yüzden emin değilsen "Bilmiyorum". Özel isim ya
        da başka dilden bir kelimeyse atla.
      </p>
      <div className="progress" role="progressbar" aria-label="Testin ilerlemesi" aria-valuenow={index} aria-valuemin={0} aria-valuemax={items.length}>
        <div style={{ width: `${(index / items.length) * 100}%` }} />
      </div>
      {item && (
        <>
          <p className="vt-word" lang={language}>
            {item.word}
          </p>
          <div className="vt-actions">
            <button className="btn btn-lg btn-quiet" onClick={() => answer('no')}>
              ← Bilmiyorum
            </button>
            <button className="btn btn-lg" onClick={() => answer('yes')}>
              Biliyorum →
            </button>
          </div>
          <button className="link small" style={{ justifySelf: 'center' }} onClick={() => answer('skip')}>
            İsim / başka dil, atla (↓)
          </button>
          <p className="small muted text-center">
            {index + 1} / {items.length} · Klavye: ← bilmiyorum, → biliyorum
          </p>
        </>
      )}
    </div>
  )
}
