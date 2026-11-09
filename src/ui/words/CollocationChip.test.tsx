// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { CollocationChip } from './CollocationChip'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

async function mount(language: 'fr' | 'es' | 'en', lemma: string) {
  const host = document.createElement('ul')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<CollocationChip language={language} lemma={lemma} />))
  return host
}

describe('CollocationChip', () => {
  it('names what the word goes with, with an example in the title', async () => {
    const host = await mount('fr', 'décider')
    const chip = host.querySelector('li')!
    expect(chip.firstChild?.textContent).toBe('décider de + infinitif')
    // The example is for screen readers and touch users too, not only the title.
    expect(chip.querySelector('.sr-only')?.textContent).toContain('Il a décidé de partir plus tôt.')
    expect(chip.getAttribute('title')).toContain('Il a décidé de partir plus tôt.')
  })

  it('shows nothing for a word that goes with nothing in the list', async () => {
    const host = await mount('es', 'gato')
    expect(host.querySelector('li')).toBeNull()
  })
})
