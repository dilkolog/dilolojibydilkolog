import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { blankMarks, blankParts, PTE_RULES, PTE_TASKS, pteMixWarnings, pteProblems, pteWords, type PteFib } from './pte'
import pack from './pte/en.json'
import { loadPte } from './ptePack'

// A sound paragraph (the pack's first) to break one thing at a time.
const fib = (extra: Partial<PteFib> = {}): PteFib => ({ ...(pack.fib[0] as PteFib), id: 'fib-x', ...extra })
const blanks = () => fib().blanks
const withBlank = (k: number, b: Partial<PteFib['blanks'][number]>) => fib({ blanks: blanks().map((x, i) => (i === k ? { ...x, ...b } : x)) })

describe('the PTE pack in the app', () => {
  it('passes the check and the brief’s mix, has every task, and is what content/raw/pte builds to', async () => {
    expect(pteProblems(pack)).toEqual([])
    expect(pteMixWarnings(pack)).toEqual([])
    expect((pack as { placeholder?: string }).placeholder).toBeUndefined()
    // Built from the raw content (node scripts/build-pte.mjs): the same items, in the same order.
    for (const task of PTE_TASKS) {
      const raw = JSON.parse(readFileSync(`content/raw/pte/${task}.json`, 'utf8')) as { id: string }[]
      expect(pack[task].map((i) => i.id), task).toEqual(raw.map((i) => i.id))
    }
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
    const wfd = { id: 'fib-x', text: 'The library closes early on Fridays in the summer.', level: 'A2', topic: 'campus', tr: 'x' }
    expect(pteProblems({ wfd: [wfd], fib: [fib()] })).toEqual([expect.stringContaining('kimlik iki kez')])
    expect(pteProblems({ wfd: [{ ...wfd, id: 'a b' }] })[0]).toContain('kimlik')
  })

  it('lengths stay within the task’s range', () => {
    const [min, max] = PTE_RULES.wfd.words
    const short = { id: 'w', text: 'Too short.', level: 'A2', topic: 't', tr: 'x' }
    expect(pteProblems({ wfd: [short] })).toEqual([`wfd[0] w: 2 kelime; ${min}–${max} olmalı`])
    expect(pteProblems({ rs: [{ id: 'r', text: Array(40).fill('word').join(' '), level: 'A2', tr: 'x' }] })[0]).toContain('40 kelime')
    // A paragraph is short (60–90) or long (120–180): 100 words is neither.
    expect(pteProblems({ fib: [fib({ text: `${fib().text} ${Array(100 - pteWords(fib().text)).fill('word').join(' ')}` })] })).toEqual(['fib[0] fib-x: 100 kelime; 60–90 ya da 120–180 olmalı'])
  })

  it('blank marks match the blanks one to one and in order, four or five of them', () => {
    expect(pteProblems({ fib: [fib({ text: fib().text.replace('[[2]]', '[[7]]') })] })[0]).toContain('sırayla tutmuyor')
    const three = pteProblems({ fib: [fib({ blanks: blanks().slice(0, 3) })] }).join()
    expect(three).toContain('3 boşluk; 4–5 olmalı')
    expect(three).toContain('sırayla tutmuyor')
  })

  it('every blank has its answer among four different choices', () => {
    expect(pteProblems({ fib: [withBlank(0, { answer: 'tea' })] })).toEqual(['fib[0] fib-x: 1. boşluğun cevabı seçeneklerin içinde değil'])
    expect(pteProblems({ fib: [withBlank(1, { options: blanks()[1].options.slice(0, 3) })] })[0]).toContain('2. boşlukta 4 seçenek')
    expect(pteProblems({ fib: [withBlank(1, { options: [blanks()[1].answer, blanks()[1].answer.toUpperCase(), 'x', 'y'] })] })[0]).toContain('iki kez')
  })

  it('a short question needs answers; a level, a Turkish line and (where asked) a topic', () => {
    const asq = { id: 'q', question: 'How many days are there in a week?', answers: [] as string[], level: 'A2', tr: 'x' }
    expect(pteProblems({ asq: [asq] })).toEqual(['asq[0] q: cevaplar (answers) boş'])
    expect(pteProblems({ asq: [{ ...asq, answers: ['seven'], level: 'B2', tr: '' }] })).toEqual(['asq[0] q: seviye (level) A1, A2, B1 değil', 'asq[0] q: Türkçesi (tr) yok'])
    expect(pteProblems({ ra: [{ id: 'r', text: 'x', level: 'A2', tr: 'x' }] }).join()).toContain('konu (topic) yok')
  })
})

describe('the brief’s mix', () => {
  it('warns when a level’s share is more than 10 points off, or the paragraphs are mostly of one length', () => {
    const items = (level: string, n: number) => Array.from({ length: n }, () => ({ level }))
    expect(pteMixWarnings({ asq: [...items('A1', 2), ...items('A2', 5), ...items('B1', 3)] })).toEqual([])
    expect(pteMixWarnings({ asq: [...items('A2', 10)] })).toEqual(['A1: %0 (hedef %20)', 'A2: %100 (hedef %50)', 'B1: %0 (hedef %30)'])
    const short = { level: 'A2', text: pack.fib[0].text }
    expect(pteMixWarnings({ fib: [short, short, short, short], asq: [...items('A1', 1), ...items('B1', 2)] }).at(-1)).toContain('kısa')
  })
})

describe('reading a paragraph with blanks', () => {
  it('counts a blank as a word and cuts the text at the marks', () => {
    expect(pteWords('a [[1]] b, c.')).toBe(4)
    expect(blankMarks('x [[1]] y [[2]]')).toEqual([1, 2])
    expect(blankParts('A [[1]] b [[2]].')).toEqual([{ text: 'A ' }, { blank: 0 }, { text: ' b ' }, { blank: 1 }, { text: '.' }])
  })
})
