import { describe, expect, it } from 'vitest'
import type { GrammarLog } from '../../engine/grammar'
import { logsSaved, noteIn } from './logNote'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('noting answers in a practice log', () => {
  it('answers in quick succession all land: each is read after the one before it was saved', async () => {
    let stored: GrammarLog = {}
    const note = noteIn(
      async () => {
        await wait(5)
        return structuredClone(stored)
      },
      async (log) => {
        await wait(5)
        stored = log
      },
    )
    for (let i = 0; i < 6; i++) void note('q1', i % 2 === 0)
    await logsSaved()
    expect(stored.q1).toMatchObject({ ok: 3, wrong: 3 })
  })

  it('a failing save is dropped and does not stop the answers after it', async () => {
    let stored: GrammarLog = {}
    let fail = true
    const note = noteIn(
      async () => structuredClone(stored),
      async (log) => {
        if (fail) {
          fail = false
          throw new Error('storage full')
        }
        stored = log
      },
    )
    await note('a', true)
    await note('b', true)
    expect(stored.a).toBeUndefined()
    expect(stored.b).toMatchObject({ ok: 1 })
  })
})
