import { describe, expect, it } from 'vitest'
import { cleanQuestionLog, MAX_LOGGED, questionKey, rankByNeed, recordAnswers } from './guideQuestions'

const q = (prompt: string) => ({ prompt })
const items = [q('a'), q('b'), q('c'), q('d')]

describe('guide questions', () => {
  it('keys a question by language and prompt', () => {
    expect(questionKey('fr', 'a')).toBe(questionKey('fr', 'a'))
    expect(questionKey('fr', 'a')).not.toBe(questionKey('es', 'a'))
  })

  it('asks what was missed first, then what was never asked, then the longest ago answered right', () => {
    let log = recordAnswers({}, [{ key: questionKey('fr', 'a'), right: true }], '2026-10-01')
    log = recordAnswers(log, [{ key: questionKey('fr', 'b'), right: true }], '2026-10-10')
    log = recordAnswers(log, [{ key: questionKey('fr', 'c'), right: false }], '2026-10-12')
    expect(rankByNeed(items, log, 'fr').map((i) => i.prompt)).toEqual(['c', 'd', 'a', 'b'])
  })

  it('keeps the given order inside a group, so a shuffled list stays shuffled', () => {
    expect(rankByNeed([q('d'), q('b'), q('a')], {}, 'fr').map((i) => i.prompt)).toEqual(['d', 'b', 'a'])
  })

  it('counts the times asked and forgets a miss once it is answered right', () => {
    const key = questionKey('fr', 'a')
    let log = recordAnswers({}, [{ key, right: false }], '2026-10-01')
    log = recordAnswers(log, [{ key, right: true }], '2026-10-02')
    expect(log[key]).toEqual({ n: 2, lastWrong: false, day: '2026-10-02' })
  })

  it('remembers a limited number, dropping the oldest answers', () => {
    const answers = Array.from({ length: MAX_LOGGED + 5 }, (_, i) => ({ key: `k${i}`, right: true }))
    let log = recordAnswers({}, answers.slice(0, 5), '2026-01-01')
    log = recordAnswers(log, answers.slice(5), '2026-02-01')
    expect(Object.keys(log)).toHaveLength(MAX_LOGGED)
    expect(log.k0).toBeUndefined()
  })

  it('drops what is not shaped like a record', () => {
    expect(cleanQuestionLog({ x: { n: 1, lastWrong: true, day: '2026-10-01' }, y: 3, z: { n: 'a' } })).toEqual({ x: { n: 1, lastWrong: true, day: '2026-10-01' } })
    expect(cleanQuestionLog(null)).toEqual({})
  })
})
