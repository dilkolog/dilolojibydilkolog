import { useMemo, useState } from 'react'
import { AiError, enrichWords, wordInfoToInput } from '../ai'
import { createEntry } from '../data/wordInput'
import type { KelimeDB } from '../data/db'
import { fillMissing, needsFill } from '../engine/wordSuggest'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { useAi } from './aiContext'
import { WandIcon } from './icons'
import { changeWordsWithUndo } from './undo'

/** Words per request (one request per batch keeps cost and time low). */
const BATCH = 15

/**
 * One button for the blanks across the whole list: words without an example sentence, nouns
 * without a gender, words without a part of speech. The AI fills only what is empty, a batch at a
 * time, and "Geri al" brings every word back as it was.
 */
export function FillMissingBar({ db, vocabulary, onChanged }: { db: KelimeDB; vocabulary: VocabularyEntry[]; onChanged: () => void }) {
  const { apiKey, needsApproval } = useAi()
  const todo = useMemo(() => needsFill(vocabulary), [vocabulary])
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  if (!todo.length) return null

  const run = async () => {
    if (!apiKey) return
    setMessage(null)
    const ids = todo.map((e) => e.id)
    let filled = 0
    let stopped = ''
    try {
      await changeWordsWithUndo(
        ids,
        `${todo.length} kelimenin eksikleri YZ ile tamamlandı`,
        async () => {
          const byLanguage = new Map<TargetLanguage, VocabularyEntry[]>()
          for (const e of todo) byLanguage.set(e.language, [...(byLanguage.get(e.language) ?? []), e])
          let done = 0
          for (const [language, entries] of byLanguage) {
            for (let b = 0; b < entries.length; b += BATCH) {
              const batch = entries.slice(b, b + BATCH)
              setBusy(`YZ dolduruyor… ${Math.min(done + batch.length, todo.length)}/${todo.length}`)
              try {
                const info = await enrichWords(
                  apiKey,
                  language,
                  batch.map((e) => ({ word: e.lemma, context: e.senses[0]?.examples[0]?.text })),
                )
                for (const e of batch) {
                  const card = info.get(e.lemma.toLocaleLowerCase())
                  if (!card) continue
                  // Read fresh: an edit made while waiting is kept.
                  const current = ((await db.vocabulary.get(e.id)) as VocabularyEntry | undefined) ?? e
                  const next = fillMissing(current, createEntry(wordInfoToInput(card), language, new Date(), 'import'))
                  if (next) {
                    await db.vocabulary.put(next)
                    filled++
                  }
                }
              } catch (err) {
                stopped = err instanceof AiError ? err.message : 'YZ şu an cevap vermedi.'
                return
              }
              done += batch.length
            }
          }
        },
        onChanged,
      )
    } finally {
      setBusy('')
    }
    setMessage(stopped ? { ok: false, text: `${filled} kelime dolduruldu; sonra durdu: ${stopped}` } : { ok: true, text: `${filled} kelimenin eksikleri tamamlandı. Yanlış gördüğün olursa “Geri al” ile hepsini eski hâline getirebilirsin.` })
  }

  return (
    <section className="card stack fill-missing" aria-label="Eksikleri tamamla">
      <div className="row justify-between">
        <span>
          <strong>{todo.length} kelimede eksik var</strong>
          <span className="small muted"> örnek cümle, isim cinsiyeti ya da tür</span>
        </span>
        <button type="button" className="btn btn-sm" onClick={run} disabled={!apiKey || !!busy} title={apiKey ? undefined : needsApproval ? 'YZ özellikleri onay bekliyor' : 'Ayarlar → YZ yardımcısı bölümünden anahtarını gir'}>
          <WandIcon size={14} /> {busy || 'Eksikleri YZ ile tamamla'}
        </button>
      </div>
      {!apiKey && <p className="small muted">{needsApproval ? 'YZ özellikleri hesabının onaylanmasını bekliyor.' : 'Bunun için Ayarlar → YZ yardımcısı bölümünde bir anahtar gerekiyor.'}</p>}
      {message && (
        <p className={message.ok ? 'small' : 'error'} role="status">
          {message.text}
        </p>
      )}
    </section>
  )
}
