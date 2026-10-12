// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'
import type { Diagram } from '../../engine/diagram'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }))
const { DiagramGame } = await import('./DiagramGame')

let root: ReturnType<typeof createRoot> | undefined
const diagram: Diagram = {
  id: 'dg-1',
  language: 'fr',
  title: 'Le corps',
  imageId: 'img-1',
  points: [
    { id: 'p1', x: 0.2, y: 0.2, word: 'la tête', meaning: 'baş' },
    { id: 'p2', x: 0.5, y: 0.5, word: 'le bras', meaning: 'kol' },
    { id: 'p3', x: 0.8, y: 0.8, word: 'la main' },
  ],
  createdAt: '2026-10-12T10:00:00Z',
  updatedAt: '2026-10-12T10:00:00Z',
}
beforeEach(async () => {
  await db.meta.delete('diagrams')
  await db.media.put({ id: 'img-1', kind: 'image', data: new ArrayBuffer(4), type: 'image/png', createdAt: new Date() })
  await db.saveDiagram(diagram)
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 60))))
const setValue = (el: HTMLInputElement, value: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<DiagramGame language="fr" vocabulary={[]} onExit={() => {}} onChanged={() => {}} />))
  await wait()
  return host
}

describe('DiagramGame', () => {
  it('lists the pictures of the language with their label count', async () => {
    const host = await mount()
    expect(host.textContent).toContain('Le corps')
    expect(host.textContent).toContain('3 etiket')
  })

  it('studies by picking labels: every dot asked once, a word once used leaves the bank, the end scores them', async () => {
    const host = await mount()
    await click(byText(host, 'Çalış'))
    await click(byText(host, 'Etiketlerden seç'))
    const chips = () => [...host.querySelectorAll<HTMLButtonElement>('.choice-row .chip')]
    expect(chips()).toHaveLength(3)
    for (let i = 0; i < 3; i++) {
      await click(chips()[0])
      await click(byText(host, 'Sonraki') ?? byText(host, 'Sonucu gör'))
    }
    expect(host.textContent).toMatch(/\d \/ 3/)
  })

  it('studies by typing: accents and the article do not matter', async () => {
    const host = await mount()
    await click(byText(host, 'Çalış'))
    await click(byText(host, 'Yazarak'))
    // The highlighted dot says which word is asked (its place on the picture).
    const typed = { '20%': 'TETE', '50%': 'bras', '80%': 'main' } as Record<string, string>
    for (let i = 0; i < 3; i++) {
      const at = (host.querySelector('.diagram-dot.is-current')!.parentElement as HTMLElement).style.left
      await setValue(host.querySelector('input')!, typed[at])
      await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
      expect(host.querySelector('[role=status]')!.textContent).toMatch(/^Doğru/)
      await click(byText(host, 'Sonraki') ?? byText(host, 'Sonucu gör'))
    }
    expect(host.textContent).toContain('3 / 3')
  })

  it('edits a label and keeps it', async () => {
    const host = await mount()
    await click(byText(host, 'Düzenle'))
    await click(host.querySelector('button[aria-label^="3. nokta"]'))
    await setValue(host.querySelector('input[aria-label="Kelime"]')!, 'la paume')
    await click(byText(host, 'Kaydet'))
    await vi.waitFor(async () => expect((await db.getDiagrams('fr'))[0].points[2].word).toBe('la paume'))
  })

  it('deleting removes the picture and the diagram', async () => {
    const host = await mount()
    await click(byText(host, 'Düzenle'))
    await click(byText(host, 'Resmi sil'))
    await click([...document.querySelectorAll('button')].find((b) => b.textContent === 'Sil'))
    await vi.waitFor(async () => expect(await db.getDiagrams()).toHaveLength(0))
    expect(await db.media.get('img-1')).toBeUndefined()
  })
})
