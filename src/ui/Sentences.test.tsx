// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, scheduler } from '../data/instance'
import { newSentence } from '../engine/sentences'
import { SentencesGame } from './Sentences'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root
let host: HTMLDivElement
const mount = async () => {
  await act(async () => root.render(<SentencesGame language="fr" onExit={() => {}} />))
  await act(async () => void (await new Promise((r) => setTimeout(r, 60))))
}

beforeEach(async () => {
  await db.meta.delete('sentences')
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('the sentence cards screen', () => {
  it('shows the coming week: what falls due, a bar a day, and the total', async () => {
    const now = new Date()
    for (const [i, text] of ['Je mange.', 'Tu dors.', 'Il parle.'].entries()) {
      const s = newSentence({ language: 'fr', text }, scheduler, now)
      // The first is due today, the others in two days.
      const due = new Date(now)
      due.setDate(due.getDate() + (i === 0 ? 0 : 2))
      due.setHours(23, 0, 0, 0)
      await db.saveSentence({ ...s, card: { ...s.card, due } })
    }
    await mount()
    const week = host.querySelector('.sentence-week')!
    expect(week.textContent).toContain('Önümüzdeki 7 günde 3 cümlenin vadesi geliyor.')
    expect(week.querySelectorAll('.time-day')).toHaveLength(7)
    expect(week.querySelector('[role=img]')?.getAttribute('aria-label')).toMatch(/^bugün 1, .*, .* 2/)
  })

  it('has no week without sentences, and says so when none falls due', async () => {
    await mount()
    expect(host.querySelector('.sentence-week')).toBeNull()
    const s = newSentence({ language: 'fr', text: 'Je mange.' }, scheduler, new Date())
    const far = new Date()
    far.setDate(far.getDate() + 30)
    await db.saveSentence({ ...s, card: { ...s.card, due: far } })
    await act(async () => root.unmount())
    root = createRoot(host)
    await mount()
    expect(host.querySelector('.sentence-week')?.textContent).toContain('vadesi gelen cümle yok')
  })
})
