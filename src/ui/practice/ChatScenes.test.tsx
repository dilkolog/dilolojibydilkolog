// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { KelimeDB } from '../../data/db'
import { loadExamTasks } from '../../data/examTasks'
import { AiContext } from '../aiContext'
import { ProduceScreen } from './Produce'

describe('Yaz & konuş → Sohbet: the role-play scenes', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('are picture cards (the scenes that were Monki’s have their drawing), one chosen at a time', async () => {
    const db = new KelimeDB('test-chat-scenes')
    await act(async () => {
      root.render(
        <AiContext.Provider value={{ apiKey: 'sk-test', needsApproval: false }}>
          <ProduceScreen db={db} language="fr" vocabulary={[]} states={[]} onChanged={() => {}} onOpenSettings={() => {}} />
        </AiContext.Provider>,
      )
    })
    act(() => [...container.querySelectorAll<HTMLButtonElement>('[role=tab]')].find((b) => b.textContent?.startsWith('Sohbet'))!.click())
    const scenes = () => [...container.querySelectorAll<HTMLButtonElement>('.chat-scene')]
    expect(scenes().map((b) => b.textContent)).toEqual([
      'Kafede sipariş vermek',
      'Otelde oda ayırtmak',
      'Sokakta yol tarifi almak',
      'Alışveriş yapmak',
      'Doktora derdini anlatmak',
      'İş görüşmesi',
      'Arkadaşla hafta sonu planı yapmak',
      'Bir dizi ya da film üzerine sohbet',
    ])
    expect(scenes().filter((b) => b.querySelector('img'))).toHaveLength(6)
    expect(scenes().filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent)).toEqual(['Kafede sipariş vermek'])
    act(() => scenes()[4]!.click())
    expect(scenes().filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent)).toEqual(['Doktora derdini anlatmak'])
    // What the screen asked for while the test ran (its journal, the exam tasks, the scene's best score) must have
    // answered before the test ends: an answer that arrives after the DOM is gone sets state without a window, and
    // the whole run fails on the unhandled error. The same reads, asked after the screen's, come back after them.
    await act(async () => {
      await Promise.all([db.getJournal('fr'), db.getMissions(), loadExamTasks('fr')])
    })
  })
})
