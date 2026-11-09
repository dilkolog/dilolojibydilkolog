// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { TrapChip } from './TrapChip'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})
async function mount(language: 'fr' | 'es' | 'en', lemma: string) {
  const host = document.createElement('ul')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<TrapChip language={language} lemma={lemma} />))
  return host
}

describe('TrapChip', () => {
  it('warns on a false friend: not this, but that', async () => {
    const host = await mount('fr', 'actuellement')
    expect(host.textContent).toContain('Tuzak kelime')
    expect(host.textContent).toContain('“aslında” değil, “şu anda”')
    expect(host.querySelector('li')?.getAttribute('title')).toContain('actually')
  })
  it('is not there for an ordinary word', async () => {
    expect((await mount('fr', 'maison')).innerHTML).toBe('')
  })
})
