import { describe, expect, it } from 'vitest'
import { blankMarks, blankParts, PTE_RULES, PTE_TASKS, pteProblems, pteWords, type PteFib } from './pte'
import pack from './pte/en.json'
import { loadPte } from './ptePack'

const fib = (extra: Partial<PteFib> = {}): PteFib => ({
  id: 'fib-x',
  text: 'Coffee is one of the most [[1]] drinks in the world, and many people [[2]] their day with a cup before they go to work or to school.',
  blanks: [
    { answer: 'popular', options: ['popular', 'famous', 'busy', 'lucky'] },
    { answer: 'start', options: ['start', 'open', 'begin with', 'make'] },
  ],
  level: 'B1',
  topic: 'food',
  tr: 'Kahve…',
  ...extra,
})

describe('the PTE pack in the app', () => {
  it('passes the check, has every task and says it is a placeholder', async () => {
    expect(pteProblems(pack)).toEqual([])
    for (const task of PTE_TASKS) expect(pack[task].length).toBeGreaterThan(0)
    expect(pack.placeholder).toMatch(/Yer tutucu/)
    const loaded = await loadPte('en')
    expect(loaded?.wfd.length).toBe(pack.wfd.length)
    expect(await loadPte('fr')).toBeNull()
  })
})

describe('the PTE content check', () => {
  it('a sound item has no problems', () => {
    expect(pteProblems({ fib: [fib()] })).toEqual([])
  })

  it('ids are unique across the tasks and safe as keys', () => {
    const wfd = { id: 'fib-x', text: 'The library closes early on Fridays in summer.', level: 'A2', topic: 'campus', tr: 'x' }
    expect(pteProblems({ wfd: [wfd], fib: [fib()] })).toEqual([expect.stringContaining('kimlik iki kez')])
    expect(pteProblems({ wfd: [{ ...wfd, id: 'a b' }] })[0]).toContain('kimlik')
  })

  it('lengths stay within the task’s range', () => {
    const [min, max] = PTE_RULES.wfd.words
    const short = { id: 'w', text: 'Too short.', level: 'A2', topic: 't', tr: 'x' }
    expect(pteProblems({ wfd: [short] })).toEqual([`wfd[0] w: 2 kelime; ${min}–${max} olmalı`])
    expect(pteProblems({ rs: [{ id: 'r', text: Array(40).fill('word').join(' '), level: 'A2', tr: 'x' }] })[0]).toContain('40 kelime')
  })

  it('blank marks match the blanks one to one and in order', () => {
    expect(pteProblems({ fib: [fib({ text: fib().text.replace('[[2]]', '[[3]]') })] })[0]).toContain('sırayla tutmuyor')
    expect(pteProblems({ fib: [fib({ blanks: fib().blanks.slice(0, 1) })] }).join()).toContain('sırayla tutmuyor')
  })

  it('every blank has its answer among four different choices', () => {
    const [one, two] = fib().blanks
    expect(pteProblems({ fib: [fib({ blanks: [{ ...one, answer: 'tea' }, two] })] })).toEqual(['fib[0] fib-x: 1. boşluğun cevabı seçeneklerin içinde değil'])
    expect(pteProblems({ fib: [fib({ blanks: [one, { ...two, options: ['start', 'open', 'make'] }] })] })[0]).toContain('4 seçenek')
    expect(pteProblems({ fib: [fib({ blanks: [one, { ...two, options: ['start', 'Start', 'open', 'make'] }] })] })[0]).toContain('iki kez')
  })

  it('a short question needs answers; a level, a Turkish line and (where asked) a topic', () => {
    const asq = { id: 'q', question: 'How many days are there in a week?', answers: [] as string[], level: 'A2', tr: 'x' }
    expect(pteProblems({ asq: [asq] })).toEqual(['asq[0] q: cevaplar (answers) boş'])
    expect(pteProblems({ asq: [{ ...asq, answers: ['seven'], level: 'Z9', tr: '' }] })).toEqual(['asq[0] q: seviye (level) A1–C2 değil', 'asq[0] q: Türkçesi (tr) yok'])
    expect(pteProblems({ ra: [{ id: 'r', text: 'x', level: 'A2', tr: 'x' }] }).join()).toContain('konu (topic) yok')
  })
})

describe('reading a paragraph with blanks', () => {
  it('counts words without the marks and cuts the text at them', () => {
    expect(pteWords('a [[1]] b, c.')).toBe(3)
    expect(blankMarks('x [[1]] y [[2]]')).toEqual([1, 2])
    expect(blankParts('A [[1]] b [[2]].')).toEqual([{ text: 'A ' }, { blank: 0 }, { text: ' b ' }, { blank: 1 }, { text: '.' }])
  })
})
