import { useEffect, useMemo, useRef, useState } from 'react'
import { db, scheduler } from '../data/instance'
import { ruleFor } from '../engine/genderRules'
import { newWordState, processAttempt } from '../engine/review'
import { createRng, shuffle } from '../engine/rng'
import type { UserWordState, VocabularyEntry } from '../engine/types'
import { articleQuestion } from './articleQuestion'
import { genderRuleText, LANGUAGE_NAME } from './labels'
import { sfx } from './sounds'

const ROUND = 20

/**
 * Gender drill: noun after noun, choose the article. Fast, focused retrieval of the one fact
 * that is hardest to keep for French and Spanish nouns. Words being learned count as real
 * reviews of their gender skill (and slips go to the mistake bank); others are practice.
 */
export function ArticleDrill({ language, vocabulary, states, onExit, onChanged }: { language: 'fr' | 'es'; vocabulary: VocabularyEntry[]; states: UserWordState[]; onExit: () => void; onChanged: () => void }) {
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const nouns = useMemo(() => vocabulary.filter((e) => e.language === language && articleQuestion(e)), [vocabulary, language])
  const missing = useMemo(() => vocabulary.filter((e) => e.language === language && e.partOfSpeech === 'noun' && !articleQuestion(e)).length, [vocabulary, language])
  const [round, setRound] = useState<VocabularyEntry[] | null>(null)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [wrong, setWrong] = useState<VocabularyEntry[]>([])
  const shownAt = useRef(0)

  const start = () => {
    // Weakest gender memory first, never-asked next, then a random rest.
    const now = new Date()
    const r = (e: VocabularyEntry) => {
      const card = stateById.get(e.id)?.skills.gender
      return card ? scheduler.retrievability(card, now) : stateById.has(e.id) ? -1 : 2
    }
    const sorted = shuffle(nouns, createRng(Date.now())).sort((a, b) => r(a) - r(b))
    setRound(sorted.slice(0, ROUND))
    setIndex(0)
    setWrong([])
    setAnswer(null)
  }

  const noun = round?.[index]
  const q = noun ? articleQuestion(noun) : null
  useEffect(() => {
    shownAt.current = performance.now()
  }, [noun])

  const choose = async (option: string) => {
    if (!noun || !q || answer) return
    setAnswer(option)
    const ok = option === q.answer
    if (ok) sfx.correct()
    else {
      sfx.wrong()
      setWrong((w) => [...w, noun])
    }
    const state = stateById.get(noun.id)
    const bank = await db.mistakes.where('entryId').equals(noun.id).toArray()
    const result = processAttempt(
      state ?? newWordState(noun, new Date()),
      {
        exerciseType: 'article_choice',
        verdict: ok ? 'correct' : 'wrong',
        errorType: ok ? undefined : 'gender',
        given: option,
        expected: q.answer,
        responseMs: performance.now() - shownAt.current,
        hintsUsed: 0,
        maxHints: 0,
        at: new Date(),
        mode: state ? 'normal' : 'practice',
      },
      bank,
      scheduler,
    )
    if (state) await db.saveReview(result)
    else await db.events.add(result.event)
    if (ok) setTimeout(next, 450)
  }

  const next = () => {
    setAnswer(null)
    setIndex((i) => i + 1)
  }

  useEffect(() => {
    if (!q) return
    const onKey = (e: KeyboardEvent) => {
      if (answer && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        next()
      } else if (!answer && (e.key === '1' || e.key === 'ArrowLeft')) void choose(q.options[0])
      else if (!answer && (e.key === '2' || e.key === 'ArrowRight')) void choose(q.options[1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (round && index >= round.length) onChanged()
  }, [round, index, onChanged])

  if (!round) {
    return (
      <div className="stack">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        <h1 className="greeting">Artikel antrenmanı</h1>
        <p className="greeting-sub">
          {LANGUAGE_NAME[language]} isimlerinin artikelini sırayla sorar: {language === 'fr' ? 'le mi la mı (ünlüyle başlayanlarda un mu une mi)' : 'el mi la mı'}. Kelimeyi
          eklerken yazdığın artikelden cinsiyet kendiliğinden ayrılır. Öğrendiğin kelimelerde gerçek tekrar sayılır, en çok karıştırdıkların önce gelir.
        </p>
        <button className="btn btn-lg" disabled={!nouns.length} onClick={start}>
          {nouns.length ? `${Math.min(ROUND, nouns.length)} isimle başla` : 'Artikeli belli isim yok'}
        </button>
        <p className="small muted">
          {nouns.length} ismin artikeli biliniyor.
          {missing > 0 && ` ${missing} isimde cinsiyet eksik ("l'" ya da artikelsiz yazılmış); internet varken sözlükten tamamlanır, kalanları Kelimeler → Liste sağlığı'ndan seçebilirsin.`}
        </p>
        <p className="small muted kbd">
          <kbd>1</kbd>/<kbd>←</kbd> ilk seçenek · <kbd>2</kbd>/<kbd>→</kbd> ikinci · <kbd>Enter</kbd> devam
        </p>
      </div>
    )
  }

  if (!noun || !q) {
    return (
      <div className="stack">
        <h1 className="greeting">Bitti</h1>
        <p className="greeting-sub">
          {round.length} isimden {round.length - wrong.length} tanesini bildin.
        </p>
        {wrong.length > 0 && (
          <section className="card stack">
            <strong>Bunlara dikkat</strong>
            <ul className="plain">
              {wrong.map((e) => {
                const r = ruleFor(e)
                return (
                  <li key={e.id} lang={language}>
                    <strong>
                      {articleQuestion(e)!.answer} {e.lemma}
                    </strong>{' '}
                    <span className="small muted">
                      {e.senses[0].gloss}
                      {r ? ` · ${genderRuleText(r, `${articleQuestion(e)!.answer} ${e.lemma}`)}` : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        <div className="row">
          <button className="btn" onClick={start}>
            Bir tur daha
          </button>
          <button className="btn btn-quiet" onClick={onExit}>
            Oyunlara dön
          </button>
        </div>
      </div>
    )
  }

  const rule = answer && answer !== q.answer ? ruleFor(noun) : undefined
  return (
    <div className="stack article-drill">
      <div className="row justify-between">
        <button className="link" onClick={onExit}>
          ← Bitir
        </button>
        <span className="small muted">
          {index + 1} / {round.length}
        </span>
      </div>
      <div className="article-card">
        <strong className="article-noun" lang={language}>
          {noun.lemma}
        </strong>
        <span className="small muted">{noun.senses[0].gloss}</span>
      </div>
      <div className="article-options">
        {q.options.map((o) => (
          <button
            key={o}
            className={`btn btn-lg${answer ? (o === q.answer ? ' btn-ok' : o === answer ? ' btn-bad' : ' btn-quiet') : ' btn-quiet'}`}
            onClick={() => choose(o)}
            disabled={!!answer}
            lang={language}
          >
            {o}
          </button>
        ))}
      </div>
      {answer && answer !== q.answer && (
        <section className="card stack">
          <p lang={language}>
            Doğrusu: <strong>{q.answer} {noun.lemma}</strong>
          </p>
          {rule && <p className="small">{genderRuleText(rule, `${q.answer} ${noun.lemma}`)}</p>}
          <div>
            <button className="btn" onClick={next} autoFocus>
              Devam
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
