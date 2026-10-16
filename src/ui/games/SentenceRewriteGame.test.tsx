// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'
import { SENTENCE_REWRITES } from '../../data/sentenceRewrites'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const { SentenceRewriteGame } = await import('./SentenceRewriteGame')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('sentence-rewrite')
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))))
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) =>
  [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root!.render(
      <SentenceRewriteGame
        language="en"
        recordKey="rewrite:en"
        onExit={() => {}}
      />,
    ),
  )
  await wait()
  return host
}

describe('SentenceRewriteGame', () => {
  it('displays the source sentence, requires keyword, and validates correct answer', async () => {
    const host = await mount()
    expect(host.textContent).toContain('Cümle Dönüşümü')

    await click(byText(host, 'Dönüşüme Başla'))
    expect(host.textContent).toContain('1 /')

    const keywordBadge = host.querySelector('.rewrite-keyword-badge')
    expect(keywordBadge).toBeTruthy()
    const kw = keywordBadge?.textContent?.trim()

    // Find active question
    const q = SENTENCE_REWRITES.find((s) => s.language === 'en' && s.keyword === kw)
    expect(q).toBeTruthy()

    // Type the correct answer
    const input = host.querySelector<HTMLInputElement>('input.rewrite-input')
    expect(input).toBeTruthy()

    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      set.call(input, q!.acceptedAnswers[0])
      input!.dispatchEvent(new Event('input', { bubbles: true }))
    })

    // Submit form
    await click(byText(host, 'Kontrol Et'))

    expect(host.textContent).toContain('Harika! Tam dönüşüm')
    expect(host.textContent).toContain(q!.explanation)

    // Check db log
    const log = await db.getSentenceRewriteLog()
    expect(log[q!.id]).toMatchObject({ ok: 1, wrong: 0 })
  })
})
