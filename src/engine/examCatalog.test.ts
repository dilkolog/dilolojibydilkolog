import { describe, expect, it } from 'vitest'
import { examFamilies, examContent, passageResult, pickExam, taskResult } from './examCatalog'
import type { ExamPassage } from './examReading'
import type { ExamTask } from './examTasks'
import fr from '../data/examReading/fr.json'
import es from '../data/examReading/es.json'
import en from '../data/examReading/en.json'
import frTasks from '../data/examTasks/fr.json'
import esTasks from '../data/examTasks/es.json'
import enTasks from '../data/examTasks/en.json'

const passages = [fr, es, en].flatMap((f) => f.passages) as ExamPassage[]
const tasks = [frTasks, esTasks, enTasks].flatMap((f) => f.tasks) as ExamTask[]

const passage = (over: Partial<ExamPassage>): ExamPassage => ({ id: 'x', language: 'fr', exam: 'DELF', level: 'B1', title: 't', text: 'a b c', tr: '', questions: [{ prompt: 'q', options: ['a', 'b'], answer: 0, why: '' }], ...over })
const task = (over: Partial<ExamTask>): ExamTask => ({ id: 'w', language: 'fr', exam: 'DELF', level: 'B1', kind: 'Mektup', title: 't', instruction: '', tr: '', min: 80, max: 120, checklist: [], phrases: [], ...over })

describe('the exams of a language', () => {
  it('come from the content: each language its own, the one with the most content first', () => {
    expect(examFamilies('fr', passages, tasks).map((f) => f.exam)).toEqual(['DELF', 'DALF'])
    expect(examFamilies('es', passages, tasks).map((f) => f.exam)).toEqual(['DELE'])
    expect(examFamilies('en', passages, tasks).map((f) => f.exam)).toEqual(['Cambridge', 'IELTS'])
  })
  it('have only the levels with content, in order', () => {
    const fam = examFamilies('fr', [passage({ level: 'C1' }), passage({ level: 'A2' })], [task({ level: 'B1' })])
    expect(fam).toEqual([{ exam: 'DELF', levels: ['A2', 'B1', 'C1'], count: 3 }])
    expect(examFamilies('en', passages, tasks).find((f) => f.exam === 'IELTS')?.levels).toEqual(['B1', 'B2', 'C1'])
    expect(examFamilies('fr', passages, tasks).find((f) => f.exam === 'DALF')?.levels).toEqual(['C1'])
  })
  it('split an exam and level into its reading sets and writing tasks', () => {
    const c = examContent('fr', 'DELF', 'B1', passages, tasks)
    expect(c.passages.length).toBe(7)
    expect(c.tasks.length).toBe(6)
    expect([...c.passages, ...c.tasks].every((x) => x.language === 'fr' && x.exam === 'DELF' && x.level === 'B1')).toBe(true)
  })
})

describe('the remembered choice', () => {
  const fam = examFamilies('fr', passages, tasks)
  it('is kept when it fits, and falls back to the first exam or level when it does not', () => {
    expect(pickExam(fam, { exam: 'DELF', level: 'B2' })).toEqual({ exam: 'DELF', level: 'B2' })
    expect(pickExam(fam, { exam: 'DALF', level: 'A2' })).toEqual({ exam: 'DALF', level: 'C1' })
    expect(pickExam(fam, { exam: 'DELE', level: 'B1' })).toEqual({ exam: 'DELF', level: 'B1' })
    expect(pickExam(fam, { exam: 'DELE', level: 'C2' })).toEqual({ exam: 'DELF', level: 'A2' })
    expect(pickExam(fam, {})).toEqual({ exam: 'DELF', level: 'A2' })
    expect(pickExam([], {})).toBeNull()
  })
})

describe('results', () => {
  it('a set: the share right the last time and the latest date; nothing when never done', () => {
    const p = passage({ id: 'p', questions: [0, 1].map(() => ({ prompt: 'q', options: ['a', 'b'], answer: 0, why: '' })) })
    expect(passageResult(p, {})).toBeUndefined()
    const r = passageResult(p, { 'p|1': { ok: 1, wrong: 0, last: '2026-11-10T10:00:00.000Z', streak: 1 }, 'p|2': { ok: 0, wrong: 1, last: '2026-11-12T10:00:00.000Z', streak: 0 } })
    expect(r).toEqual({ share: 0.5, at: '2026-11-12T10:00:00.000Z' })
  })
  it('a writing task: the latest journal entry written for it, with its corrections when reviewed', () => {
    const journal = [
      { id: '1', task: 'w', at: '2026-11-01T10:00:00.000Z' },
      { id: '2', task: 'w', at: '2026-11-05T10:00:00.000Z', review: { mistakes: [1, 2] } },
      { id: '3', at: '2026-11-09T10:00:00.000Z' },
    ]
    expect(taskResult('w', journal)).toEqual({ at: '2026-11-05T10:00:00.000Z', corrections: 2 })
    expect(taskResult('other', journal)).toBeUndefined()
  })
})
