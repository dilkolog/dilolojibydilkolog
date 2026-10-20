// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shadowKey } from '../engine/shadowScores'

let enabled = true
const scores = [72, 81]
vi.mock('./pronunciation', () => ({
  azureEnabled: () => enabled,
  assessPronunciation: vi.fn(async () => ({ score: scores.shift() ?? 0 })),
}))
// The real controls need a microphone: this stand-in hands over a recording on a click.
vi.mock('./Shadow', () => ({
  ShadowControls: ({ onRecorded }: { onRecorded?: (b: Blob | null) => void }) => (
    <button type="button" onClick={() => onRecorded?.(new Blob(['x']))}>
      kayıt yap
    </button>
  ),
}))
const { TextShadow } = await import('./TextShadow')

let root: ReturnType<typeof createRoot> | undefined
const SENTENCE = 'Je voudrais un café noir'
beforeEach(() => {
  enabled = true
  localStorage.clear()
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
const mount = async () => {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<TextShadow sentences={[SENTENCE]} language="fr" voice="device" hear={async () => {}} onClose={() => {}} />))
  return host
}

describe('shadowing with a score', () => {
  it('scores a recording and compares it with the same sentence a week earlier', async () => {
    const week = new Date(Date.now() - 8 * 86_400_000).toISOString()
    localStorage.setItem('diloloji:shadow-scores', JSON.stringify({ [shadowKey('fr', SENTENCE)]: [{ at: week, score: 60 }] }))
    const host = await mount()
    expect(host.textContent).toContain('8 gün önce söylemiştin: %60')
    expect(button(host, 'Puanla')).toBeUndefined()
    await click(button(host, 'kayıt yap'))
    await click(button(host, 'Puanla'))
    await vi.waitFor(() => expect(host.textContent).toContain('Puanın: %72'))
    expect(host.textContent).toContain('Aynı cümle 8 gün önce: %60. Şimdi %72: 12 puan yükseldin.')
    expect(JSON.parse(localStorage.getItem('diloloji:shadow-scores')!)[shadowKey('fr', SENTENCE)]).toHaveLength(2)
  })

  it('offers no score without a pronunciation key', async () => {
    enabled = false
    const host = await mount()
    await click(button(host, 'kayıt yap'))
    expect(button(host, 'Puanla')).toBeUndefined()
  })
})
