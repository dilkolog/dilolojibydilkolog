import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { decision } from '../../engine/__tests__/fixtures'
import type { Graded } from './shared'
import { Feedback } from './Feedback'
import { AiContext } from '../aiContext'

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

  it('offers Monki after a miss, with a YZ key only', () => {
    const withKey = (verdict: 'correct' | 'wrong') =>
      renderToStaticMarkup(
        <AiContext.Provider value={{ apiKey: 'sk', setApiKey: async () => {} }}>
          <Feedback ev={{ verdict, correct: verdict === 'correct', expected: 'decision' } as unknown as Graded} entry={decision} continueRef={createRef()} onContinue={() => {}} />
        </AiContext.Provider>,
      )
    expect(withKey('wrong')).toContain('Monki açıklasın')
    expect(withKey('correct')).not.toContain('Monki açıklasın')
    expect(show('wrong')).not.toContain('Monki')
  })

  it('cheers a fifth right answer in a row with its own title and picture', () => {
    const at = (combo: number) =>
      renderToStaticMarkup(<Feedback ev={{ verdict: 'correct', correct: true, expected: 'decision' } as unknown as Graded} combo={combo} entry={decision} continueRef={createRef()} onContinue={() => {}} />)
    expect(at(5)).toContain('5 doğru üst üste!')
    expect(at(5)).toContain('react-combo')
    expect(at(4)).not.toContain('üst üste')
  })
  it('offers starting a stubborn word over, only when asked to', () => {
    const wrong = { verdict: 'wrong', correct: false, expected: 'decision' } as unknown as Graded
    const html = (relearn: boolean) => renderToStaticMarkup(<Feedback ev={wrong} entry={decision} continueRef={createRef()} onContinue={() => {}} relearn={relearn} onRelearn={() => {}} />)
    expect(html(true)).toContain('Baştan öğren')
    expect(html(false)).not.toContain('Baştan öğren')
  })
})
