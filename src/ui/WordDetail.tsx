import { useMemo, useState } from 'react'
import { displayForm } from '../engine/exercises'
import { masteryStage, skillScores } from '../engine/mastery'
import { openMistakes } from '../engine/mistakes'
import { nextReviewAt } from '../engine/review'
import type { Scheduler } from '../engine/scheduler'
import { unlockedSkills } from '../engine/selection'
import { SKILLS, type Mistake, type UserWordState, type VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { wordKeys } from '../data/wordInput'
import { ERROR_NAME, POS_NAME, SKILL_NAME, STAGE_NAME } from './labels'
import { relativeTime } from './format'
import { canSpeak, speak } from './speech'
import { WordForm } from './Words'

interface Props {
  db: KelimeDB
  entry: VocabularyEntry
  vocabulary: VocabularyEntry[]
  state?: UserWordState
  mistakes: Mistake[]
  scheduler: Scheduler
  onChanged: () => void
  onBack: () => void
}

/** Everything known about one word: its relations, how well each skill is held, its mistakes. */
export function WordDetail({ db, entry, vocabulary, state, mistakes, scheduler, onChanged, onBack }: Props) {
  const [editing, setEditing] = useState(false)
  const others = useMemo(() => wordKeys(vocabulary.filter((v) => v.id !== entry.id)), [vocabulary, entry.id])
  const byId = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary])
  const sense = entry.senses[0]
  const open = openMistakes(mistakes, entry.id)
  const now = new Date()
  const scores = state ? skillScores(state, scheduler, now) : undefined
  const unlocked = new Set(unlockedSkills(state, entry))
  const next = state && nextReviewAt(state)
  const confusables = entry.relations.filter((r) => r.type === 'confusable').map((r) => byId.get(r.targetId))

  const remove = async () => {
    if (!confirm(`"${entry.lemma}" ve bu kelimedeki ilerlemen silinecek. Devam edilsin mi?`)) return
    await db.deleteWord(entry.id)
    onChanged()
    onBack()
  }

  if (editing) {
    return (
      <div className="stack">
        <button className="link" onClick={() => setEditing(false)}>
          Kelimeye dön
        </button>
        <h1 className="greeting">Düzenle: {displayForm(entry)}</h1>
        <WordForm
          db={db}
          language={entry.language}
          existing={others}
          entry={entry}
          onSaved={() => {
            onChanged()
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div>
      <button className="link" onClick={onBack}>
        Kelimelere dön
      </button>

      <section className="section stack" style={{ marginTop: '1.5rem' }}>
        <div className="row">
          <h1 className="word">{displayForm(entry)}</h1>
          {canSpeak() && (
            <button className="speak" onClick={() => speak(displayForm(entry), entry.language)} aria-label="Sesli dinle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
              </svg>
            </button>
          )}
        </div>
        <p className="gloss">{[sense.gloss, ...(sense.altGlosses ?? [])].join(', ')}</p>
        <p className="small muted">
          {[
            entry.partOfSpeech !== 'other' && POS_NAME[entry.partOfSpeech],
            entry.cefr,
            state ? STAGE_NAME[masteryStage(state)] : 'Henüz çalışılmadı',
            next && `sıradaki tekrar ${relativeTime(next)}`,
          ]
            .filter(Boolean)
            .join(', ')}
        </p>
        <div className="row">
          <button className="btn btn-quiet" onClick={() => setEditing(true)}>
            Düzenle
          </button>
          <button className="btn btn-danger" onClick={remove}>
            Sil
          </button>
        </div>
      </section>

      {(entry.alternativeForms?.length ?? 0) > 0 && (
        <section className="section stack">
          <h2 className="section-title">Kabul edilen diğer yazımlar</h2>
          <div className="row">
            {entry.alternativeForms!.map((f) => (
              <span key={f} className="pill" style={{ fontSize: 'var(--t-sm)' }}>
                {f}{' '}
                <button
                  className="link small"
                  aria-label={`${f} kaldır`}
                  onClick={async () => {
                    await db.vocabulary.put({ ...entry, alternativeForms: entry.alternativeForms!.filter((x) => x !== f) })
                    onChanged()
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      {sense.examples.length > 0 && (
        <section className="section stack">
          <h2 className="section-title">Örnekler</h2>
          {sense.examples.map((ex) => (
            <div key={ex.text}>
              <p className="sentence">{ex.text}</p>
              {ex.translation && <p className="sentence-tr">{ex.translation}</p>}
            </div>
          ))}
        </section>
      )}

      {(entry.collocations.length > 0 || entry.wordFamily.length > 0 || confusables.length > 0) && (
        <section className="section stack">
          <h2 className="section-title">İlişkiler</h2>
          {entry.collocations.length > 0 && (
            <div>
              <h3 className="field"><label>Kalıplar</label></h3>
              <ul className="plain">
                {entry.collocations.map((c) => (
                  <li key={c.phrase}>
                    <span className="target">{c.phrase}</span> {c.translation && <span className="muted">{c.translation}</span>}
                    {c.wrongVariants?.length ? <span className="small muted"> Yanlış: {c.wrongVariants.join(', ')}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {entry.wordFamily.length > 0 && (
            <div>
              <h3 className="field"><label>Kelime ailesi</label></h3>
              <ul className="plain">
                {entry.wordFamily.map((m) => (
                  <li key={m.lemma}>
                    <span className="target">{m.lemma}</span> <span className="muted">{POS_NAME[m.partOfSpeech]}, {m.gloss}</span>
                    {m.morphology && <span className="small muted"> ({m.morphology})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {confusables.length > 0 && (
            <div>
              <h3 className="field"><label>Karıştırılan</label></h3>
              <ul className="plain">
                {entry.relations
                  .filter((r) => r.type === 'confusable')
                  .map((r) => {
                    const other = byId.get(r.targetId)
                    return (
                      <li key={r.targetId}>
                        <span className="target">{other ? displayForm(other) : r.targetId.split(':')[1]}</span>{' '}
                        <span className="muted">{other ? other.senses[0].gloss : 'listende yok'}</span>
                      </li>
                    )
                  })}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="section stack">
        <h2 className="section-title">Beceriler</h2>
        <div className="bars">
          {SKILLS.map((s) => (
            <div className="bar-row" key={s}>
              <span>{SKILL_NAME[s]}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${scores?.[s] ?? 0}%` }} />
              </div>
              <span className="bar-value">
                {state?.skills[s] ? `%${scores![s]}` : unlocked.has(s) ? 'sırada' : 'kilitli'}
              </span>
            </div>
          ))}
        </div>
        <p className="small muted">
          Beceriler sırayla açılır: önce tanıma, sonra dinleme ve hatırlama, en son kalıplar ve üretme.
          {sense.examples.length === 0 && ' Üretme alıştırmaları için örnek cümle ekle.'}
        </p>
      </section>

      {open.length > 0 && (
        <section className="section stack">
          <h2 className="section-title">Açık hatalar</h2>
          <ul className="plain">
            {open.map((m) => (
              <li key={m.id}>
                <span className="strike">{m.given}</span> → <span className="target">{m.expected}</span>{' '}
                <span className="small muted">
                  {ERROR_NAME[m.errorType]}, {m.count} kez
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
