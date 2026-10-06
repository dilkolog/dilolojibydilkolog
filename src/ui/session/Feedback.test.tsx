import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { decision } from '../../engine/__tests__/fixtures'
import type { Graded } from './shared'
import { Feedback } from './Feedback'

const show = (verdict: 'correct' | 'near' | 'wrong', confidence?: 'sure' | 'unsure') =>
  renderToStaticMarkup(
    <Feedback ev={{ verdict, correct: verdict === 'correct', expected: 'decision' } as unknown as Graded} confidence={confidence} entry={decision} continueRef={createRef()} onContinue={() => {}} />,
  )

describe('feedback after an answer', () => {
  it('meets a miss with a kind line and a sprout, and says the word comes back', () => {
    const html = show('wrong')
    expect(html).toContain('return-note')
    expect(html).toContain('birazdan bir kez daha')
    expect(html).toContain('class="plant')
  })

  it('keeps that for a plain miss: not for a right answer, a near one, or a confident error that has its own note', () => {
    expect(show('correct')).not.toContain('return-note')
    expect(show('near')).not.toContain('return-note')
    expect(show('wrong', 'sure')).not.toContain('return-note')
  })
})
