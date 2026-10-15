import { describe, expect, it } from 'vitest'
import { grammarExercises } from '../grammar'
import { TOPIC_NAME } from '../../engine/grammar'
import type { TargetLanguage } from '../../engine/types'
import { TOPIC_LESSONS } from './lessons'
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
    }
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
