import { describe, expect, it } from 'vitest'
import { cleanLedger } from './xpLedger'
import {
  cleanPteLog,
  emptyPteLog,
  mergePteLogs,
  percent,
  pteAwardKey,
  pteRound,
  pteTaskSummary,
  pteVerdict,
  pteXp,
  recordPteItem,
  recordPteRound,
  scoreBlanks,
  scoreDictation,
  scoreReadAloud,
  scoreRepeat,
  scoreShortAnswer,
  scoreSpoken,
} from './pteScore'

const day = (d: number) => new Date(Date.UTC(2026, 10, d, 10))

describe('dictation: words written right of the sentence’s words', () => {
  const text = 'The library closes early on Fridays during the summer.'
  it('all of it, case and punctuation aside', () => {
    expect(scoreDictation('the library closes early on fridays during the summer', text)).toEqual({ got: 9, of: 9 })
  })
  it('a missed word and an extra one: only the sentence’s words count', () => {
    expect(scoreDictation('The library close early on Fridays in during the summer', text)).toEqual({ got: 8, of: 9 })
  })
  it('nothing written is nothing right', () => {
    expect(scoreDictation('  ', text)).toEqual({ got: 0, of: 9 })
  })
  it('order matters: the same words shuffled are not all right', () => {
    expect(scoreDictation('summer the during Fridays on early closes library The', text).got).toBeLessThanOrEqual(3)
  })
})

describe('repeat sentence: content 0–3, as the exam scores it', () => {
  const text = 'Could you tell me where the main office is?'
  it('every word in order is 3, words around the sentence do not count against it', () => {
    expect(scoreRepeat('could you tell me where the main office is', text)).toEqual({ got: 3, of: 3 })
    expect(scoreRepeat('um could you tell me where the main office is please', text)).toEqual({ got: 3, of: 3 })
  })
  it('a word put in, left out or replaced is 2 while at least half are in order', () => {
    expect(scoreRepeat('could you tell me where the big main office is', text)).toEqual({ got: 2, of: 3 })
    expect(scoreRepeat('could you tell me where the office is', text)).toEqual({ got: 2, of: 3 })
    expect(scoreRepeat('could you tell me where', text)).toEqual({ got: 2, of: 3 })
  })
  it('fewer than half is 1, none is 0', () => {
    expect(scoreRepeat('the office', text)).toEqual({ got: 1, of: 3 })
    expect(scoreRepeat('good morning', text)).toEqual({ got: 0, of: 3 })
    expect(scoreRepeat('', text)).toEqual({ got: 0, of: 3 })
  })
})

describe('read aloud: how much of the text was said', () => {
  it('recognised speech is compared word by word', () => {
    expect(scoreSpoken('could you tell me where the office is', 'Could you tell me where the main office is?')).toEqual({ got: 8, of: 9 })
  })
  it('read aloud takes the pronunciation check’s score when it ran, else the words', () => {
    expect(scoreReadAloud('Sleep is important.', { pronunciation: 87.4 })).toEqual({ got: 87, of: 100 })
    expect(scoreReadAloud('Sleep is important.', { pronunciation: 140 })).toEqual({ got: 100, of: 100 })
    expect(scoreReadAloud('Sleep is important.', { heard: 'sleep is important' })).toEqual({ got: 3, of: 3 })
    expect(scoreReadAloud('Sleep is important.', {})).toEqual({ got: 0, of: 3 })
  })
})

describe('fill in the blanks: a point a blank', () => {
  const blanks = [
    { answer: 'popular', options: ['popular', 'famous', 'busy', 'lucky'] },
    { answer: 'spread', options: ['spread', 'spent', 'stayed', 'sold'] },
    { answer: 'start', options: ['start', 'open', 'begin with', 'make'] },
  ]
  it('counts the blanks with their answer chosen; an empty one is wrong', () => {
    expect(scoreBlanks(['popular', 'spent', undefined], blanks)).toEqual({ got: 1, of: 3 })
    expect(scoreBlanks(['popular', 'spread', 'start'], blanks)).toEqual({ got: 3, of: 3 })
  })
})

describe('short question: one of the answers', () => {
  const item = { answers: ['seven', '7'] }
  it('case, an article, punctuation and spaces do not matter', () => {
    for (const a of ['Seven', ' seven. ', '7', 'the seven']) expect(scoreShortAnswer(a, item), a).toEqual({ got: 1, of: 1 })
  })
  it('said within a few words it still counts, as recognition hears a spoken answer', () => {
    for (const a of ['seven days', "it's seven", 'I think 7']) expect(scoreShortAnswer(a, item), a).toEqual({ got: 1, of: 1 })
    expect(scoreShortAnswer("it's a bedroom", { answers: ['bedroom', 'a bedroom'] })).toEqual({ got: 1, of: 1 })
  })
  it('anything else, a longer word holding it, or nothing, is wrong', () => {
    for (const a of ['six', '', 'seventeen', '77']) expect(scoreShortAnswer(a, item), a).toEqual({ got: 0, of: 1 })
  })
})

describe('the record of what was done', () => {
  it('keeps each item’s last answer, its tries and each task’s last round', () => {
    let log = recordPteItem(emptyPteLog(), 'wfd', 'wfd-001', { got: 5, of: 9 }, day(1))
    log = recordPteItem(log, 'wfd', 'wfd-001', { got: 9, of: 9 }, day(2))
    expect(log.items['wfd:wfd-001']).toEqual({ got: 9, of: 9, at: day(2).toISOString(), tries: 2 })
    // A round is the mean of its items' shares: a read aloud out of 100 weighs as much as a short question out of 1.
    log = recordPteRound(log, 'ra', [{ got: 80, of: 100 }, { got: 0, of: 1 }], day(2))
    expect(log.rounds.ra).toMatchObject({ got: 0.8, of: 2, items: 2 })
    expect(percent(log.rounds.ra!)).toBe(40)
  })

  it('a task’s card: items done and the last round', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(pteTaskSummary('asq', items, emptyPteLog())).toEqual({ done: 0, total: 3 })
    let log = recordPteItem(emptyPteLog(), 'asq', 'b', { got: 1, of: 1 }, day(3))
    log = recordPteItem(log, 'wfd', 'a', { got: 1, of: 1 }, day(3))
    log = recordPteRound(log, 'asq', [{ got: 1, of: 1 }, { got: 0, of: 1 }], day(3))
    expect(pteTaskSummary('asq', items, log)).toEqual({ done: 1, total: 3, last: 50, at: day(3).toISOString() })
  })

  it('a round takes the never-done items first, then the ones done longest ago', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    let log = recordPteItem(emptyPteLog(), 'rs', 'a', { got: 1, of: 1 }, day(5))
    log = recordPteItem(log, 'rs', 'c', { got: 1, of: 1 }, day(4))
    expect(pteRound('rs', items, log, 3).map((i) => i.id)).toEqual(['b', 'd', 'c'])
    expect(pteRound('rs', items, emptyPteLog(), 10)).toHaveLength(4)
  })

  it('two devices: the later answer, the larger count of tries, the later round', () => {
    const a = recordPteRound(recordPteItem(emptyPteLog(), 'fib', 'x', { got: 1, of: 4 }, day(1)), 'fib', [{ got: 1, of: 4 }], day(1))
    let b = recordPteItem(emptyPteLog(), 'fib', 'x', { got: 4, of: 4 }, day(2))
    b = recordPteItem(b, 'fib', 'x', { got: 3, of: 4 }, day(3))
    b = recordPteRound(b, 'fib', [{ got: 3, of: 4 }], day(3))
    const merged = mergePteLogs(a, b)
    expect(merged.items['fib:x']).toEqual({ got: 3, of: 4, at: day(3).toISOString(), tries: 2 })
    expect(merged.rounds.fib?.at).toBe(day(3).toISOString())
    expect(mergePteLogs(b, a)).toEqual(merged)
    expect(mergePteLogs(undefined, undefined)).toEqual(emptyPteLog())
  })

  it('a damaged record is dropped', () => {
    const log = cleanPteLog({ items: { 'wfd:a': { got: 2, of: 1, at: 'x' }, 'zzz:b': { got: 1, of: 1, at: 'x' }, 'rs:c': { got: 1, of: 2, at: day(1).toISOString() } }, rounds: { nope: { got: 1, of: 1, at: 'x' } } })
    expect(Object.keys(log.items)).toEqual(['rs:c'])
    expect(log.items['rs:c'].tries).toBe(1)
    expect(log.rounds).toEqual({})
    expect(cleanPteLog(null)).toEqual(emptyPteLog())
  })
})

describe('XP: the free-practice rule, once an item a day', () => {
  it('a right answer earns a share of its exercise, a wrong one nothing', () => {
    expect(pteVerdict({ got: 9, of: 10 })).toBe('correct')
    expect(pteVerdict({ got: 5, of: 10 })).toBe('near')
    expect(pteVerdict({ got: 4, of: 10 })).toBe('wrong')
    expect(pteXp('wfd', { got: 9, of: 9 })).toBe(4)
    expect(pteXp('wfd', { got: 5, of: 9 })).toBe(2)
    expect(pteXp('asq', { got: 0, of: 1 })).toBe(0)
    for (const t of ['rs', 'ra', 'fib', 'asq'] as const) expect(pteXp(t, { got: 1, of: 1 })).toBeGreaterThan(0)
  })
  it('the award key is one the ledger keeps', () => {
    const key = pteAwardKey('fib', 'fib-001', '2026-11-14')
    expect(cleanLedger({ [key]: { day: '2026-11-14', xp: 4 } })).toEqual({ [key]: { day: '2026-11-14', xp: 4 } })
  })
})
