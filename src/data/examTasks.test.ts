import { describe, expect, it } from 'vitest'
import { countWords, lengthState } from '../engine/examTasks'
import { loadExamTasks } from './examTasks'

describe('exam-style writing tasks', () => {
  it('each language has tasks at A2, B1 and B2 with sound lengths and a checklist', async () => {
    for (const language of ['fr', 'es', 'en'] as const) {
      const tasks = await loadExamTasks(language)
      expect(tasks.length, language).toBeGreaterThanOrEqual(8)
      expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length)
      expect(new Set(tasks.map((t) => t.level))).toEqual(new Set(['A2', 'B1', 'B2']))
      for (const t of tasks) {
        expect(t.id.startsWith(`${language}-`), t.id).toBe(true)
        expect(t.language, t.id).toBe(language)
        for (const k of ['exam', 'kind', 'title', 'instruction', 'tr'] as const) expect(t[k].trim(), `${t.id}.${k}`).not.toBe('')
        expect(t.min, t.id).toBeGreaterThanOrEqual(40)
        expect(t.max, t.id).toBeGreaterThan(t.min)
        expect(t.checklist.length, t.id).toBeGreaterThanOrEqual(3)
        expect(t.phrases.length, t.id).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('counts words and tells where a text stands against the length asked', () => {
    expect(countWords('  ')).toBe(0)
    expect(countWords('Salut Marie,  ça va ?')).toBe(4)
    expect(lengthState(59, 60, 80)).toBe('short')
    expect(lengthState(60, 60, 80)).toBe('in')
    expect(lengthState(80, 60, 80)).toBe('in')
    expect(lengthState(81, 60, 80)).toBe('long')
  })
})
