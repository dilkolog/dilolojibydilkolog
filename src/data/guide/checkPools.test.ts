import { describe, expect, it } from 'vitest'
import { CHECK_POOL_FILES, extraChecks } from './checkPools'
import { checkFor, checkPool, lessonsOf } from './lessonOf'

/**
 * The pool of a lesson's check: its own three questions and the extra ones of `checks/*.json`. Round 15 of
 * docs/ANTIGRAVITY-GOREVLER.md grows every lesson's pool; `POOL_REQUIRED` is what each lesson must have, raised to the
 * target (10) once the questions have all arrived.
 */
const POOL_REQUIRED = 15

const LANGUAGES = ['fr', 'es', 'en'] as const

describe('check pools', () => {
  it('every file names a language, a source and lessons that exist in that language', () => {
    for (const [path, file] of CHECK_POOL_FILES) {
      expect(LANGUAGES, path).toContain(file.language)
      expect(path.split('/').pop()!.startsWith(`${file.language}-`), `${path}: the file name starts with its language`).toBe(true)
      expect(file.source?.trim(), `${path}: source`).toBeTruthy()
      const topics = new Set(lessonsOf(file.language).map((l) => l.topic))
      for (const topic of Object.keys(file.lessons)) expect(topics.has(topic), `${path}: no lesson "${topic}" in ${file.language}`).toBe(true)
    }
  })

  it('every extra question is well-formed: 3–4 different options, one right, a reason, a prompt not asked twice in its lesson', () => {
    for (const language of LANGUAGES) {
      for (const lesson of lessonsOf(language)) {
        const prompts = new Set<string>()
        for (const c of [...(lesson.check ?? []), ...extraChecks(language, lesson.topic)]) {
          const where = `${language}/${lesson.topic}: ${c.prompt}`
          expect(c.prompt?.trim(), where).toBeTruthy()
          expect(c.options.length, `${where}: options`).toBeGreaterThanOrEqual(3)
          expect(c.options.length, `${where}: options`).toBeLessThanOrEqual(4)
          expect(new Set(c.options.map((o) => o.trim().toLowerCase())).size, `${where}: options differ`).toBe(c.options.length)
          expect(Number.isInteger(c.answer) && c.answer >= 0 && c.answer < c.options.length, `${where}: answer`).toBe(true)
          expect(c.why?.trim(), `${where}: why`).toBeTruthy()
          expect(prompts.has(c.prompt), `${where}: asked twice`).toBe(false)
          prompts.add(c.prompt)
        }
      }
    }
  })

  it('a lesson has at least the required pool', () => {
    const short: string[] = []
    for (const language of LANGUAGES) for (const l of lessonsOf(language)) if (checkPool(l).length < POOL_REQUIRED) short.push(`${language}/${l.topic} (${checkPool(l).length})`)
    expect(short).toEqual([])
  })

  it('draws three of the pool, in a new order each time, with the answer following its option', () => {
    const lesson = lessonsOf('fr')[0]
    const pool = checkPool(lesson)
    const drawn = checkFor(lesson, () => 0.3)
    expect(drawn).toHaveLength(3)
    for (const item of drawn) {
      const source = pool.find((p) => p.prompt === item.prompt)!
      expect(item.options[item.answer]).toBe(source.options[source.answer])
      expect([...item.options].sort()).toEqual([...source.options].sort())
    }
    // Over many draws every option order of a question appears more than once (a review is not the same as the last one).
    const orders = new Set<string>()
    for (let i = 0; i < 40; i++) orders.add(checkFor(lesson).map((c) => c.options.join('|')).join('/'))
    expect(orders.size).toBeGreaterThan(5)
  })

  it('a question whose option points at the others ("hepsi doğru") keeps its order', () => {
    const lesson = { ...lessonsOf('fr')[0], topic: 'no_extra_questions_here', check: [
      { prompt: 'a', options: ['bir', 'iki', 'Hepsi doğru'], answer: 2, why: 'x' },
      { prompt: 'b', options: ['bir', 'iki', 'Hepsi doğru'], answer: 2, why: 'x' },
      { prompt: 'c', options: ['bir', 'iki', 'Hepsi doğru'], answer: 2, why: 'x' },
    ] }
    for (let i = 0; i < 10; i++) for (const c of checkFor(lesson)) expect(c.options).toEqual(['bir', 'iki', 'Hepsi doğru'])
  })
})
