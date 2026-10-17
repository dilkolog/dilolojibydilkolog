import { useEffect, useState } from 'react'
import { hasPattern, ownExamples, type OwnExample, type OwnSource } from '../engine/lessonExamples'
import type { TargetLanguage } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { addedTime } from '../engine/types'
import { loadTenses } from '../data/tenseData'
import { lessonTense } from '../data/guide/lessonOf'
import type { TopicLesson } from '../data/guide/lessonTypes'

/** How many of each of the two piles of single sentences are read: the newest ones. */
const PILE = 300

/** The sources of the last lesson visit, kept for a little while: reading the library again for each lesson opened one after the other is wasted work. */
let recent: { db: KelimeDB; language: TargetLanguage; writes: number; at: number; sources: Promise<OwnSource[]> } | null = null
const KEEP_MS = 30_000

/** What the learner owns that a lesson can be shown in, newest first: the reading library, then the translated sentences, then the examples of their words. */
export function ownSources(db: KelimeDB, language: TargetLanguage): Promise<OwnSource[]> {
  // Any write to the learner's data (a text added, a word) since then: read again.
  if (recent && recent.db === db && recent.language === language && recent.writes === db.writes && Date.now() - recent.at < KEEP_MS) return recent.sources
  const sources = readSources(db, language)
  recent = { db, language, writes: db.writes, at: Date.now(), sources }
  // A failed read is not kept: the next lesson tries again.
  sources.catch(() => {
    if (recent?.sources === sources) recent = null
  })
  return sources
}

async function readSources(db: KelimeDB, language: TargetLanguage): Promise<OwnSource[]> {
  const library = (await db.getLibrary(language)).slice().sort((a, b) => addedTime(b) - addedTime(a))
  const out: OwnSource[] = library.map((t) => ({ title: t.title, text: t.text }))
  const memory = (await db.getTranslations()).filter((e) => e.from === language).slice(-PILE).reverse()
  if (memory.length) out.push({ title: 'Çeviri geçmişin', text: memory.map((e) => e.text).join('\n') })
  const words = await db.vocabulary.where('language').equals(language).toArray()
  const examples = words.flatMap((w) => w.senses.flatMap((s) => s.examples.map((x) => x.text).filter((t): t is string => !!t?.trim()))).slice(-PILE)
  if (examples.length) out.push({ title: 'Kelime örneklerin', text: examples.join('\n') })
  return out
}

/** Whether a lesson can show the learner's own sentences at all (it teaches a tense or a topic with a pattern). */
export const canShowOwn = (lesson: TopicLesson): boolean => (lesson.language !== 'en' && !!lessonTense(lesson)) || hasPattern(lesson.topic)

/** The learner's own sentences that show a lesson: null while they are looked for (or when the lesson cannot have any), else the few found. */
export function useOwnExamples(db: KelimeDB, lesson: TopicLesson): OwnExample[] | null {
  const [found, setFound] = useState<{ topic: string; list: OwnExample[] } | null>(null)
  useEffect(() => {
    if (!canShowOwn(lesson)) return
    let live = true
    void (async () => {
      if (lesson.language !== 'en') await loadTenses(lesson.language)
      // A beat after the lesson is on screen: the search reads the library and analyses text.
      await new Promise((r) => setTimeout(r, 0))
      const list = ownExamples(lesson.language, lesson.topic, lessonTense(lesson), await ownSources(db, lesson.language))
      if (live) setFound({ topic: lesson.topic, list })
    })().catch(() => live && setFound({ topic: lesson.topic, list: [] }))
    return () => {
      live = false
    }
  }, [db, lesson])
  return found && found.topic === lesson.topic ? found.list : null
}
