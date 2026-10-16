// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { WordGraph } from './WordGraph'
import type { VocabularyEntry, UserWordState } from '../engine/types'
import { decide, decision } from '../engine/__tests__/fixtures'
import { newWordState } from '../engine/review'

let root: ReturnType<typeof createRoot> | undefined

afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

async function mount(props: { vocabulary: readonly VocabularyEntry[]; states: readonly UserWordState[]; onOpen?: (id: string) => void }) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<WordGraph vocabulary={props.vocabulary as VocabularyEntry[]} states={props.states as UserWordState[]} onOpen={props.onOpen ?? (() => {})} />))
  return host
}

describe('WordGraph', () => {
  it('renders EmptyState when vocabulary is empty or has no connected nodes', async () => {
    const host = await mount({ vocabulary: [], states: [] })
    expect(host.textContent).toContain('Kelime ağın henüz boş')
  })

  it('renders SVG graph when vocabulary has connected nodes', async () => {
    const now = new Date()
    const states: UserWordState[] = [
      newWordState(decide, now),
      newWordState(decision, now),
    ]
    const host = await mount({ vocabulary: [decide, decision], states })
    expect(host.querySelector('svg.graph')).not.toBeNull()
  })
})
