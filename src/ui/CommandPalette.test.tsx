// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { CommandPalette } from './CommandPalette'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

async function search(text: string, onAddWord?: (w: string) => void) {
  const el = document.createElement('div')
  document.body.append(el)
  const root = createRoot(el)
  const commands = [{ id: 'game-conjugation', label: 'Çekim antrenmanı', group: 'Oyunlar', run: () => {} }]
  await act(async () => root.render(<CommandPalette commands={commands} vocabulary={[]} onOpenWord={() => {}} onAddWord={onAddWord} onClose={() => {}} />))
  const input = el.querySelector('input')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  return { el, labels: [...el.querySelectorAll('.palette-label')].map((x) => x.textContent), done: () => act(async () => root.unmount()) }
}

describe('command palette', () => {
  it('matches without accents or Turkish letters', async () => {
    const r = await search('cekim')
    expect(r.labels).toContain('Çekim antrenmanı')
    await r.done()
  })

  it('offers to add a word that is not in the list, last', async () => {
    let added = ''
    const r = await search('manger', (w) => (added = w))
    expect(r.labels.at(-1)).toBe('“manger” kelimesini ekle')
    await act(async () => r.el.querySelector<HTMLElement>('.palette-item:last-child')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })))
    expect(added).toBe('manger')
    await r.done()
  })
})
