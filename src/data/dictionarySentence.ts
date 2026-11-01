import type { KelimeDB } from './db'
import type { VocabularyEntry } from '../engine/types'
import { addExample } from './wordInput'

/** Preserve edits made since the card opened; the user's sentence is saved as personal. */
export async function saveDictionarySentence(db: KelimeDB, candidate: VocabularyEntry, text: string): Promise<void> {
  if (!text.trim() || text.length > 2000) throw new Error('Cümlen 1–2000 karakter arasında olmalı.')
  await db.transaction('rw', db.vocabulary, async () => {
    const latest = (await db.vocabulary.get(candidate.id)) ?? candidate
    const next = addExample(latest, text.trim(), '', true)
    if (!next.senses[0].examples.at(-1)?.form) throw new Error('Cümlede bu kelimeyi veya çekimli biçimini kullanmalısın.')
    await db.vocabulary.put(next)
  })
}
