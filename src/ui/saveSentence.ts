import { db, scheduler } from '../data/instance'
import { newSentence } from '../engine/sentences'
import type { TargetLanguage } from '../engine/types'

/** Saves a sentence met while reading (or sent from the browser extension). */
export async function saveSentence(input: { language: TargetLanguage; text: string; translation?: string; focus?: string; source?: string; note?: string }): Promise<boolean> {
  const all = await db.getSentences()
  const text = input.text.replace(/\s+/g, ' ').trim()
  if (!text || all.some((s) => s.language === input.language && s.text === text)) return false
  await db.saveSentence(newSentence({ ...input, text }, scheduler, new Date()))
  return true
}
