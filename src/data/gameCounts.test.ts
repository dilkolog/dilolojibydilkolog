import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { TargetLanguage } from '../engine/types'
import { COLLOCATION_DRILLS } from './collocationDrill'
import { CONFUSABLE_RULES } from './confusableRules'
import { dialogues } from './dialogues'
import { irregularVerbs, phrasalVerbs } from './englishVerbs'
import { examPassages } from './examReading'
import { flowItems } from './flow'
import { grammarExercises } from './grammar'
import { registerItems } from './register'
import { SENTENCE_REWRITES } from './sentenceRewrites'
import { SPOT_ERRORS } from './spotErrors'
import { trapWords } from './traps'

/**
 * The Games cards' numbers (gameCounts.json) come from the games' own content: counted again here, and the test fails
 * when the file is out of date (after adding content):
 *   WRITE_GAME_COUNTS=1 npx vitest run src/data/gameCounts.test.ts
 */
const LANGS: TargetLanguage[] = ['fr', 'es', 'en']
const FILE = join(__dirname, 'gameCounts.json')

function count(language: TargetLanguage) {
  const of = <T extends { language: string }>(items: T[]) => items.filter((i) => i.language === language).length
  return {
    dialogues: of(dialogues),
    grammar: grammarExercises(language).length,
    spotErrors: of(SPOT_ERRORS),
    rewrites: of(SENTENCE_REWRITES),
    collocations: of(COLLOCATION_DRILLS),
    traps: of(trapWords),
    confusables: of(CONFUSABLE_RULES),
    register: of(registerItems),
    flow: of(flowItems),
    exam: of(examPassages),
    ...(language === 'en' ? { irregularVerbs: irregularVerbs.length, phrasalVerbs: phrasalVerbs.length } : {}),
  }
}

describe('the Games cards count what the games hold', () => {
  it('gameCounts.json matches the content', () => {
    const now = Object.fromEntries(LANGS.map((l) => [l, count(l)]))
    if (process.env.WRITE_GAME_COUNTS) writeFileSync(FILE, `${JSON.stringify(now, null, 2)}\n`)
    expect(JSON.parse(readFileSync(FILE, 'utf8'))).toEqual(now)
  })
})
