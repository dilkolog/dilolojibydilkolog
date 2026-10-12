// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { createEntry } from '../data/wordInput'
import type { VocabularyEntry } from '../engine/types'
import { WordMedia } from './WordMedia'

let root: ReturnType<typeof createRoot> | undefined
let entry: VocabularyEntry
beforeEach(async () => {
  entry = createEntry({ word: 'la maison', meaning: 'ev' }, 'fr', new Date())
  await db.vocabulary.clear()
  await db.vocabulary.put(entry)
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const setValue = (el: HTMLInputElement | HTMLTextAreaElement, value: string) =>
  act(async () => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
const blur = (el: HTMLElement) => act(async () => el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<WordMedia entry={entry} onChanged={vi.fn()} />))
  return host
}

describe('WordMedia: extra fields and note formatting', () => {
  it('adds an extra field, saves it when left, keeps a half-filled one, and drops an empty one', async () => {
    const host = await mount()
    await click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Ek alan ekle'))
    await setValue(host.querySelector<HTMLInputElement>('input[aria-label="Ek alan 1 adı"]')!, 'Zıt anlam')
    await setValue(host.querySelector<HTMLInputElement>('input[aria-label="Ek alan 1 metni"]')!, 'dışarısı')
    await blur(host.querySelector('input[aria-label="Ek alan 1 metni"]')!)
    await vi.waitFor(async () => expect((await db.vocabulary.get(entry.id))!.extras).toEqual([{ label: 'Zıt anlam', text: 'dışarısı' }]))
  })

  it('the format buttons wrap the selected note text in the marks', async () => {
    const host = await mount()
    const note = host.querySelector<HTMLTextAreaElement>('#w-notes')!
    await setValue(note, 'a band on')
    note.setSelectionRange(2, 6)
    await click(host.querySelector('button[aria-label="Kalın"]'))
    expect(host.querySelector<HTMLTextAreaElement>('#w-notes')!.value).toBe('a **band** on')
  })
})
