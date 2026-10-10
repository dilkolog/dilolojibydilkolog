import { useState } from 'react'
import { AiError, personalSentences, type PersonalSentence } from '../ai'
import type { KelimeDB } from '../data/db'
import { addExample, MAX_EXAMPLES, WordInputError } from '../data/wordInput'
import type { VocabularyEntry } from '../engine/types'
import { useAi } from './aiContext'
import { SparkleIcon } from './icons'
import { interestsOf } from './personalInterests'

/**
 * "Sentences about you": three sentences with the word set in the learner's own interests, to take
 * into the word's examples one by one (nothing is added unasked). Needs an AI key.
 */
export function PersonalSentences({ db, entry, onChanged }: { db: KelimeDB; entry: VocabularyEntry; onChanged: () => void }) {
  const { apiKey } = useAi()
  const [items, setItems] = useState<PersonalSentence[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  // The entry changes as sentences are added: keep working on the latest.
  const [current, setCurrent] = useState(entry)
  if (!apiKey || entry.senses[0].examples.length >= MAX_EXAMPLES) return null
  const latest = entry.senses[0].examples.length >= current.senses[0].examples.length ? entry : current

  const ask = async () => {
    setBusy(true)
    setError('')
    try {
      const mine = interestsOf(await db.getSettings())
      setInterests(mine)
      setItems(
        await personalSentences(apiKey, {
          language: entry.language,
          word: entry.article ? `${entry.article} ${entry.lemma}` : entry.lemma,
          meaning: entry.senses[0].gloss,
          interests: mine,
          existing: latest.senses[0].examples.map((e) => e.text),
        }),
      )
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Cümleler hazırlanamadı.')
    } finally {
      setBusy(false)
    }
  }

  const take = async (s: PersonalSentence) => {
    setError('')
    try {
      const next = addExample((await db.vocabulary.get(entry.id)) ?? latest, s.text, s.translation)
      await db.vocabulary.put(next)
      setCurrent(next)
      setItems((all) => (all ?? []).filter((x) => x !== s))
      onChanged()
    } catch (e) {
      setError(e instanceof WordInputError ? e.message : 'Cümle eklenemedi.')
    }
  }

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="ai-suggest" onClick={ask} disabled={busy}>
          <SparkleIcon size={14} className="icon-star" />
          {busy ? 'Yazılıyor…' : 'Bana özel cümleler'}
        </button>
      </div>
      {items && (
        <div className="stack card">
          <p className="small muted">{interests.length ? `İlgi alanlarına göre (${interests.join(', ')}). Beğendiğini ekle.` : 'Profilinde ilgi alanı yok, günlük hayattan cümleler yazıldı. Beğendiğini ekle.'}</p>
          {items.length === 0 && <p className="small muted">Hepsi eklendi. İstersen yeniden iste.</p>}
          <ul className="example-list">
            {items.map((s) => (
              <li key={s.text}>
                <div>
                  <p className="sentence" lang={entry.language}>
                    {s.text.replace(/\*/g, '')}
                  </p>
                  {s.translation && <p className="sentence-tr">{s.translation}</p>}
                </div>
                <button type="button" className="btn btn-sm btn-quiet" onClick={() => void take(s)}>
                  Ekle
                </button>
              </li>
            ))}
          </ul>
          <div className="row">
            <button type="button" className="link small" onClick={ask} disabled={busy}>
              Başka cümleler iste
            </button>
            <button type="button" className="link small" onClick={() => setItems(null)}>
              Kapat
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
