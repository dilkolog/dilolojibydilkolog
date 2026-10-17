import { describe, expect, it } from 'vitest'
import { lessonFor } from './lessonOf'
import type { GuideLevel } from './lessonTypes'

interface PlacementQuestion {
  level: GuideLevel
  lesson: string
  prompt: string
  options: string[]
  answer: number
  why: string
}

interface PlacementFile {
  language: 'fr' | 'es' | 'en'
  source: string
  questions: PlacementQuestion[]
}

const FILES = import.meta.glob<PlacementFile>('./placement/*.json', { eager: true, import: 'default' })

const EXPECTED_DISTRIBUTION: Record<GuideLevel, number> = {
  A1: 6,
  A2: 6,
  B1: 7,
  B2: 6,
  C1: 5,
}

describe('guide placement test questions', () => {
  it('loads placement questions for fr, es, and en', () => {
    const langs = Object.values(FILES).map((f) => f.language)
    expect(langs.sort()).toEqual(['en', 'es', 'fr'])
  })

  it('each language has exactly 30 questions with the 6/6/7/6/5 distribution', () => {
    for (const [path, file] of Object.entries(FILES)) {
      expect(file.questions.length, `${path} should have exactly 30 questions`).toBe(30)
      const counts: Record<GuideLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 }
      for (const q of file.questions) {
        counts[q.level] = (counts[q.level] ?? 0) + 1
      }
      expect(counts, `${path} distribution`).toEqual(EXPECTED_DISTRIBUTION)
    }
  })

  it('questions are sorted strictly by level order (A1 -> A2 -> B1 -> B2 -> C1)', () => {
    const levelOrder: Record<GuideLevel, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 }
    for (const [path, file] of Object.entries(FILES)) {
      let lastOrder = 1
      for (const q of file.questions) {
        const order = levelOrder[q.level]
        expect(order, `${path} question out of level order: ${q.prompt}`).toBeGreaterThanOrEqual(lastOrder)
        lastOrder = order
      }
    }
  })

  it('every question references an existing lesson in that language and matches its level', () => {
    for (const [path, file] of Object.entries(FILES)) {
      for (const q of file.questions) {
        const lesson = lessonFor(file.language, q.lesson)
        expect(lesson, `${path} lesson not found: ${q.lesson} in ${file.language}`).toBeDefined()
        expect(
          q.level,
          `${path} question level (${q.level}) does not match lesson level (${lesson?.level}) for ${q.lesson}`
        ).toBe(lesson?.level)
      }
    }
  })

  it('every question is well-formed: prompt, 3-4 distinct options, valid answer index, non-empty why', () => {
    for (const [path, file] of Object.entries(FILES)) {
      expect(file.source).toBeTruthy()
      const seenPrompts = new Set<string>()
      for (const q of file.questions) {
        expect(q.prompt.trim()).not.toBe('')
        expect(seenPrompts.has(q.prompt), `${path} duplicate prompt: ${q.prompt}`).toBe(false)
        seenPrompts.add(q.prompt)

        expect(q.options.length, `${path} options count for "${q.prompt}"`).toBeGreaterThanOrEqual(3)
        expect(q.options.length, `${path} options count for "${q.prompt}"`).toBeLessThanOrEqual(4)

        const distinctOptions = new Set(q.options.map((o) => o.trim()))
        expect(distinctOptions.size, `${path} duplicate options in "${q.prompt}"`).toBe(q.options.length)

        expect(q.answer).toBeGreaterThanOrEqual(0)
        expect(q.answer).toBeLessThan(q.options.length)

        expect(q.why.trim()).not.toBe('')
      }
    }
  })
})
