// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { ListPage } from './ListPage'
import { KelimeDB } from '../../data/db'
import { createEntry } from '../../data/wordInput'
import { newWordState } from '../../engine/review'
import type { WordList } from '../../engine/types'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const db = new KelimeDB('list-reset-ui')
let root: ReturnType<typeof createRoot> | undefined
afterEach(async () => { act(() => root?.unmount()); document.body.innerHTML = ''; await db.delete() })

it('offers learning reset separately from deletion, explains what stays, and waits for confirmation', async () => {
  await db.open()
  const list: WordList = { id: 'advanced', language: 'es', name: 'AVANZADO', levels: [], createdAt: '', updatedAt: '' }
  const entry = { ...createEntry({ word: 'viajar', meaning: 'seyahat etmek' }, 'es', new Date()), listId: list.id }
  const state = newWordState(entry, new Date())
  await db.vocabulary.put(entry)
  await db.wordStates.put(state)
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const changed = vi.fn()
  await act(async () => root!.render(<ListPage db={db} language="es" list={list} lists={[list]} vocabulary={[entry]} states={[state]} onFocus={vi.fn()} onListsChanged={changed} onOpen={vi.fn()} onStudy={vi.fn()} onAdd={vi.fn()} onBack={vi.fn()}><span>Words</span></ListPage>))
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Liste işlemleri"]')!.click())
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((b) => b.textContent?.includes('Öğrenmeyi sıfırla'))!.click())
  const dialog = document.querySelector('[role="alertdialog"]')!
  expect(dialog.textContent).toContain('Kelimeler, anlamlar, notlar ve seviyeler korunur')
  expect(await db.wordStates.get(entry.id)).toBeDefined()
  await act(async () => [...dialog.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Öğrenmeyi sıfırla')!.click())
  for (let i = 0; i < 50 && !changed.mock.calls.length; i++) await act(async () => new Promise((r) => setTimeout(r, 20)))
  expect(changed).toHaveBeenCalledTimes(1)
  expect(await db.wordStates.get(entry.id)).toBeUndefined()
  expect(await db.vocabulary.get(entry.id)).toEqual(entry)
})
