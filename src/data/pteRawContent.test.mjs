import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
// The validator and the five task files live in content/raw/pte (kept out of vitest's own search: content/** holds no
// app tests); this file runs their checks with the rest of the suite, so CI keeps them.
import { validateTask, validateFiles, words } from '../../content/raw/pte/validate.mjs'
const load = kind => JSON.parse(readFileSync(new URL(`../../content/raw/pte/${kind}.json`, import.meta.url), 'utf8'))

describe('PTE raw content validation', () => {
  it('the five complete files meet their schema, count, balance and length requirements', () => {
    const result = validateFiles()
    expect(result.errors).toEqual([])
    expect(Object.values(result.report).reduce((n, r) => n + r.count, 0)).toBe(580)
  })
  it('duplicate identifiers, unexpected fields and out-of-range sentences fail', () => {
    const row = load('wfd')[0]
    expect(validateTask('wfd', [row, row]).join()).toMatch(/duplicate id/)
    expect(validateTask('wfd', [{ ...row, topicName: 'extra' }]).join()).toMatch(/unexpected/)
    expect(validateTask('wfd', [{ ...row, text: 'Too short.' }]).join()).toMatch(/word count/)
  })
  it('questions are valid repetition sentences, but two sentences are not', () => {
    expect(validateTask('rs', [load('rs')[0]])).toEqual([])
    expect(validateTask('rs', [{ ...load('rs')[0], text: 'Please sit down now. We will start soon.' }]).join()).toMatch(/one sentence/)
  })
  it('missing answers, repeated options and incorrectly numbered blanks fail', () => {
    const row = load('fib')[0]
    const absent = structuredClone(row)
    absent.blanks[0].answer = 'wrong'
    expect(validateTask('fib', [absent]).join()).toMatch(/answer must appear/)
    const repeated = structuredClone(row)
    repeated.blanks[0].options[1] = repeated.blanks[0].options[0]
    expect(validateTask('fib', [repeated]).join()).toMatch(/duplicate options/)
    expect(validateTask('fib', [{ ...row, text: row.text.replace('[[2]]', '[[1]]') }]).join()).toMatch(/markers/)
  })
  it('short answers have one to three words and read-aloud paragraphs have two to three sentences', () => {
    expect(validateTask('asq', [{ ...load('asq')[0], answers: ['far too many answer words'] }]).join()).toMatch(/1–3 words/)
    expect(validateTask('ra', [{ ...load('ra')[0], text: 'A single sentence ' + 'word '.repeat(35) + 'ends.' }]).join()).toMatch(/two or three sentences/)
    expect(words('a one-word answer')).toBe(3)
  })

  it('research revision accepts five blanks, rejects B2 and the gap between FIB length bands', () => {
    const row = load('fib')[0]
    const five = structuredClone(row)
    five.text = five.text.replace(/family\.$/, '[[5]].')
    five.blanks.push({ answer: 'family', options: ['family', 'school', 'work', 'town'] })
    expect(validateTask('fib', [five])).toEqual([])
    expect(validateTask('fib', [{ ...row, text: row.text + ' word'.repeat(100 - words(row.text)) }]).join()).toMatch(/60–90 or 120–180/)
    expect(validateTask('wfd', [{ ...load('wfd')[0], level: 'B2' }]).join()).toMatch(/invalid level/)
  })

  it('the approved first twenty items of every task remain byte-equivalent as JSON values', async () => {
    const { createHash } = await import('node:crypto')
    const hashes = {
      wfd: '002aa6d12eb7d8993edf0b89660f2dacf3c3b475766d4a93172accb2120b1ec9',
      rs: '895dec591fa734d806de1855d13f43a86dbf2bf6a12b640e2f1f57dc77dc77fe',
      ra: 'b07c983c4bf5e0101acac9b9d6eea3c9a457fd2cc6b790375c52ed9035055aaa',
      fib: '7c387abfd4a5e42695cf20bd06eee58d5f123f18368edc188fac2aae8bae736f',
      asq: 'd5ba0deb02164ea22004a1e16f89c6c30873c7c9dc5454636e813e516efc1370',
    }
    for (const [kind, expected] of Object.entries(hashes)) {
      expect(createHash('sha256').update(JSON.stringify(load(kind).slice(0, 20))).digest('hex'), kind).toBe(expected)
    }
  })
})
