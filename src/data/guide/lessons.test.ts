import { describe, expect, it } from 'vitest'
import { grammarExercises } from '../grammar'
import { TOPIC_NAME } from '../../engine/grammar'
import type { TargetLanguage } from '../../engine/types'
import { TOPIC_LESSONS } from './lessons'
import { checkFor, englishTenseLessons, lessonFor } from './lessonOf'
import { RESOURCES, SHARED_RESOURCES } from './resources'

const LANGUAGES: TargetLanguage[] = ['fr', 'es', 'en']

describe('guide lessons', () => {
  it('teaches every grammar topic the questions ask, sentence rewrites aside', () => {
    for (const language of LANGUAGES) {
      const asked = new Set(grammarExercises(language).map((e) => e.topic).filter((t) => !t.startsWith('rewrite_')))
      const taught = new Set(TOPIC_LESSONS.filter((l) => l.language === language).map((l) => l.topic))
      expect([...asked].filter((t) => !taught.has(t)), language).toEqual([])
    }
  })

  it('has basics in every language and only known topics otherwise', () => {
    for (const language of LANGUAGES) {
      const own = TOPIC_LESSONS.filter((l) => l.language === language)
      expect(own.filter((l) => l.topic.startsWith(`basics_${language}_`)).length, language).toBeGreaterThanOrEqual(5)
      for (const l of own) if (!l.topic.startsWith('basics_')) expect(TOPIC_NAME[l.topic], l.topic).toBeTruthy()
    }
  })

  it('is complete and unique', () => {
    const ids = TOPIC_LESSONS.map((l) => `${l.language}|${l.topic}`)
    expect(new Set(ids).size).toBe(ids.length)
    for (const l of TOPIC_LESSONS) {
      expect(['A1', 'A2', 'B1', 'B2', 'C1'], l.topic).toContain(l.level)
      expect(l.title.trim() && l.summary.trim(), l.topic).toBeTruthy()
      expect(l.rules.length, l.topic).toBeGreaterThanOrEqual(3)
      expect(l.examples.length, l.topic).toBeGreaterThanOrEqual(3)
      for (const x of l.examples) expect(x.text.trim() && x.tr.trim(), l.topic).toBeTruthy()
      for (const s of [...l.rules, ...l.watch]) expect(s.trim(), l.topic).not.toBe('')
      if (l.table) {
        expect(l.table.head.length, `${l.topic} table head`).toBeGreaterThanOrEqual(2)
        expect(l.table.rows.length, `${l.topic} table rows`).toBeGreaterThanOrEqual(2)
        for (const h of l.table.head) expect(h.trim(), `${l.topic} table header`).not.toBe('')
        for (const row of l.table.rows) {
          expect(row.length, `${l.topic} table row length`).toBe(l.table.head.length)
          for (const cell of row) expect(cell.trim(), `${l.topic} table cell`).not.toBe('')
        }
      }
    }
    expect(TOPIC_LESSONS.filter((l) => l.table).length).toBeGreaterThanOrEqual(60)
  })
})

describe('lesson checks', () => {
  it('have three or four different options and exactly one right answer', () => {
    for (const l of TOPIC_LESSONS) {
      expect(l.check?.length, l.topic).toBeGreaterThanOrEqual(3)
      for (const c of l.check ?? []) {
        expect(c.prompt.trim() && c.why.trim(), l.topic).toBeTruthy()
        expect(c.options.length, `${l.topic}: ${c.prompt}`).toBeGreaterThanOrEqual(3)
        expect(c.options.length, `${l.topic}: ${c.prompt}`).toBeLessThanOrEqual(4)
        expect(new Set(c.options.map((o) => o.trim().toLocaleLowerCase())).size, `${l.topic}: ${c.prompt}`).toBe(c.options.length)
        expect(Number.isInteger(c.answer) && c.answer >= 0 && c.answer < c.options.length, `${l.topic}: ${c.prompt}`).toBe(true)
      }
    }
  })

  it('every basic lesson can be checked, and a lesson practises only a known topic of its language', () => {
    for (const l of TOPIC_LESSONS) {
      if (l.topic.startsWith('basics_')) expect(checkFor(l).length, l.topic).toBeGreaterThanOrEqual(2)
      if (l.practice) expect(grammarExercises(l.language).some((e) => e.topic === l.practice), `${l.topic} → ${l.practice}`).toBe(true)
    }
  })

  it('a lesson without its own check asks the choice questions of its topic', () => {
    const subj = TOPIC_LESSONS.find((l) => l.topic === 'subjonctif')!
    const items = checkFor({ ...subj, check: undefined }, () => 0.3)
    expect(items.length).toBe(3)
    for (const c of items) expect(c.options[c.answer]).toBeTruthy()
  })

  it('English tense lessons come in the order they are learnt, and a mistake finds its lesson', () => {
    const tenses = englishTenseLessons().map((l) => l.topic)
    expect(tenses[0]).toBe('basics_en_present_simple')
    expect(tenses).toContain('present_perfect')
    expect(tenses.indexOf('basics_en_past_simple')).toBeLessThan(tenses.indexOf('basics_en_past_perfect'))
    expect(lessonFor('fr', 'subjonctif')?.topic).toBe('subjonctif')
    expect(lessonFor('fr', 'nothing_like_this')).toBeUndefined()
  })
})

describe('guide resources', () => {
  it('links only to https pages, each once per language', () => {
    for (const language of LANGUAGES) {
      const list = [...RESOURCES[language], ...SHARED_RESOURCES]
      expect(list.length).toBeGreaterThan(5)
      for (const r of list) expect(r.url, r.name).toMatch(/^https:\/\/[^\s]+$/)
      expect(new Set(list.map((r) => r.url)).size).toBe(list.length)
    }
  })
})
