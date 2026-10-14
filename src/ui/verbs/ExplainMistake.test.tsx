// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import es from '../../data/tenses/es.json'
import { addTenses } from '../../engine/tenses'
import '../../engine/conjugationData'
import { AiContext } from '../aiContext'

const asked = vi.fn(async () => ({ explanation: '“tienes” tú için; yo için “tengo”.', tip: 'Yo biçimi -go ile biter: tengo, pongo, salgo.' }))
vi.mock('../../ai', () => ({ explainConjugation: (...a: unknown[]) => asked(...(a as [])), AiError: class extends Error {} }))
const { ExplainMistake } = await import('./ExplainMistake')

beforeAll(() => addTenses('es', es as Record<string, unknown>))

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  asked.mockClear()
})

const render = (apiKey: string | null, typed: string) => {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() =>
    root!.render(
      <AiContext.Provider value={{ apiKey, setApiKey: async () => {} }}>
        <ExplainMistake language="es" verb="tener" tense="presente" person={0} typed={typed} />
      </AiContext.Provider>,
    ),
  )
  return host
}

describe('ExplainMistake', () => {
  it('shows nothing without an AI key or for an accent slip', () => {
    expect(render(null, 'tienes').textContent).toBe('')
    act(() => root?.unmount())
    expect(render('k', 'téngo').textContent).toBe('')
  })

  it('asks once on a tap and shows the explanation; the same mistake again is not asked again', async () => {
    const host = render('k', 'tienes')
    const btn = host.querySelector('button')!
    expect(btn.textContent).toContain('YZ hatamı açıklasın')
    expect(asked).not.toHaveBeenCalled()
    await act(async () => btn.click())
    expect(asked).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain('yo için “tengo”')
    expect(host.textContent).toContain('-go ile biter')
    act(() => root?.unmount())
    const again = render('k', 'tienes')
    expect(again.querySelector('button')).toBeNull()
    expect(again.textContent).toContain('tengo')
    expect(asked).toHaveBeenCalledTimes(1)
  })
})
