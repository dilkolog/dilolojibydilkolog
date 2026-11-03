import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { TargetLanguage } from '../engine/types'
import { dialogues } from './dialogues'
import { examPassages } from './examReading'
import { grammarExercises } from './grammar'
import { TOPIC_LESSONS, type GuideLevel } from './guide/lessons'
import { pathOrder } from './guide/path'
import { trapWords } from './traps'
import audiobooksEn from './audiobooks/en.json'
import audiobooksEs from './audiobooks/es.json'
import audiobooksFr from './audiobooks/fr.json'
import storybooksEn from './storybooks/en.json'
import storybooksEs from './storybooks/es.json'
import storybooksFr from './storybooks/fr.json'
import tensesEs from './tenses/es.json'
import tensesFr from './tenses/fr.json'
import irregular from './englishVerbs/irregular.json'
import phrasal from './englishVerbs/phrasal.json'
import type { LandingStats } from './landingStats'

/**
 * The landing page's numbers (lessons per level, dialogues, verbs…) come from the app's own content, never typed by
 * hand: this test counts them again and fails when landingStats.json is out of date.
 *   WRITE_LANDING_STATS=1 npx vitest run src/data/landingStats.test.ts
 */
const LANGS: TargetLanguage[] = ['fr', 'es', 'en']
const BANDS: { id: 'A' | 'B' | 'C'; levels: GuideLevel[] }[] = [
  { id: 'A', levels: ['A1', 'A2'] },
  { id: 'B', levels: ['B1', 'B2'] },
  { id: 'C', levels: ['C1'] },
]
const AUDIOBOOKS = { fr: audiobooksFr, es: audiobooksEs, en: audiobooksEn } as Record<TargetLanguage, unknown[]>
const STORYBOOKS = { fr: storybooksFr, es: storybooksEs, en: storybooksEn } as Record<TargetLanguage, unknown[]>

function count(): LandingStats {
  const out = {} as LandingStats
  for (const language of LANGS) {
    const lessons = pathOrder(TOPIC_LESSONS.filter((l) => l.language === language))
    const levels = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 } as Record<GuideLevel, number>
    for (const l of lessons) levels[l.level]++
    const bands = Object.fromEntries(
      BANDS.map((b) => {
        const inBand = lessons.filter((l) => b.levels.includes(l.level))
        const example = inBand.find((l) => l.examples.length)?.examples[0] ?? { text: '', tr: '' }
        return [b.id, { lessons: inBand.length, titles: inBand.slice(0, 4).map((l) => l.title), example: { text: example.text, tr: example.tr } }]
      }),
    ) as LandingStats['fr']['bands']
    out[language] = {
      lessons: lessons.length,
      levels,
      bands,
      grammar: grammarExercises(language).length,
      dialogues: dialogues.filter((d) => d.language === language).length,
      exam: examPassages.filter((p) => p.language === language).length,
      audiobooks: AUDIOBOOKS[language].length,
      storybooks: STORYBOOKS[language].length,
      traps: trapWords.filter((t) => t.language === language).length,
      verbs: language === 'fr' ? Object.keys(tensesFr).length : language === 'es' ? Object.keys(tensesEs).length : irregular.verbs.length + phrasal.verbs.length,
    }
  }
  return out
}

const FILE = join(__dirname, 'landingStats.json')

describe('landing page numbers', () => {
  it('are the app content counted again', () => {
    const now = count()
    if (process.env.WRITE_LANDING_STATS) writeFileSync(FILE, `${JSON.stringify(now, null, 2)}\n`)
    expect(JSON.parse(readFileSync(FILE, 'utf8'))).toEqual(now)
  })

  it('give every level band some lessons and an example sentence', () => {
    for (const language of LANGS) {
      for (const band of Object.values(count()[language].bands)) {
        expect(band.lessons).toBeGreaterThan(0)
        expect(band.example.text).not.toBe('')
      }
    }
  })
})
