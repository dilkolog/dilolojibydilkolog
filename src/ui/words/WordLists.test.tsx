// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { WordListsView } from './WordLists'
import { UNLISTED } from '../../engine/lists'
import { SAMPLE_WORDS } from '../../data/seed'
import type { WordList } from '../../engine/types'
import type { KelimeDB } from '../../data/db'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

it('shows an accessible tile for the 30 words missing from the named lists', async () => {
  const el = document.createElement('div')
  document.body.append(el)
  const root = createRoot(el)
  const onOpenList = vi.fn()
  const list: WordList = { id: 'advanced', name: 'AVANZADO', language: 'es', levels: [], createdAt: '', updatedAt: '' }
  const samples = SAMPLE_WORDS.es
  const listed = samples.slice(0, 17).map((w, i) => ({ ...w, id: `own-${i}`, source: 'user' as const, listId: list.id }))
  try {
    await act(async () => root.render(
      <WordListsView db={{} as KelimeDB} language="es" lists={[list]} vocabulary={[...listed, ...samples]} states={[]} onListsChanged={vi.fn()} onOpenList={onOpenList} collabIds={new Set()} />,
    ))
    const unlisted = el.querySelector<HTMLButtonElement>('.wl-tile-unlisted')!
    expect(unlisted).not.toBeNull()
    expect(unlisted.textContent).toContain('30 kelime hiçbir listede değil')
    expect(el.querySelector('.wl-tile:not(.wl-tile-unlisted)')?.textContent).toContain('17 kelime')
    act(() => unlisted.click())
    expect(onOpenList).toHaveBeenCalledWith(UNLISTED)
  } finally {
    act(() => root.unmount())
    el.remove()
  }
})
