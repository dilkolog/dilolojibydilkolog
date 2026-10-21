// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReadSentence } from '../engine/reading'
import { posKey } from '../engine/deduction'
import { ReaderParagraph, type ReaderParagraphProps } from './ReaderParagraph'

const sentences: ReadSentence[] = [
  {
    text: 'Le chat dort.',
    tokens: [
      { text: 'Le', key: 'le', status: 'known' },
      { text: ' ' },
      { text: 'chat', key: 'chat', status: 'unseen' },
      { text: ' ' },
      { text: 'dort', key: 'dort', status: 'learning', entryId: 'fr:dormir' },
      { text: '.' },
    ],
  },
  { text: 'Il rêve.', tokens: [{ text: 'Il', key: 'il', status: 'known' }, { text: ' ' }, { text: 'rêve', key: 'rêve', status: 'unseen' }, { text: '.' }] },
]

const empty: ReadonlySet<string> = new Set()

describe('ReaderParagraph', () => {
  let rootEl: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let props: ReaderParagraphProps

  beforeEach(() => {
    rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    root = createRoot(rootEl)
    props = {
      index: 2,
      sentences,
      start: 5,
      heard: null,
      flash: null,
      multi: empty,
      looks: new Map(),
      multiMode: false,
      skipped: empty,
      masks: empty,
      revealed: empty,
      shade: () => 'lv-a',
      turkish: false,
      language: 'fr',
      onPick: vi.fn(),
      onToggleMulti: vi.fn(),
    }
  })

  afterEach(() => {
    act(() => root.unmount())
    rootEl.remove()
  })

  const render = (p: ReaderParagraphProps) => act(() => root.render(<ReaderParagraph {...p} />))
  const word = (key: string) => rootEl.querySelector<HTMLElement>(`[data-key="${key}"]`)!

  it('numbers sentences in the whole text and lights the heard, flashed and picked ones', () => {
    render({ ...props, heard: 6, litAt: '2.0', selectedKey: 'chat' })
    const spans = rootEl.querySelectorAll('[data-s]')
    expect([...spans].map((s) => s.getAttribute('data-s'))).toEqual(['5', '6'])
    expect(spans[0].className).toBe('rs is-lit')
    expect(spans[1].className).toBe('rs is-heard')
    expect(word('chat').className).toContain('is-selected')
    expect(word('dort').className).toBe('rw rw-learning lv-a')
  })

  it('picks a word with its sentence and place; ⌘-click collects it instead', () => {
    render(props)
    act(() => word('chat').click())
    expect(props.onPick).toHaveBeenCalledWith(sentences[0].tokens[2], 'Le chat dort.', '2.0', false)
    act(() => word('rêve').dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey: true })))
    expect(props.onToggleMulti).toHaveBeenCalledWith('rêve')
  })

  it('hides a masked word until revealed', () => {
    render({ ...props, masks: new Set([posKey(2, 1, 2)]) })
    expect(word('rêve').textContent).toBe('[ ? ]')
    act(() => word('rêve').click())
    expect(props.onPick).toHaveBeenCalledWith(sentences[1].tokens[2], 'Il rêve.', '2.1', true)
    render({ ...props, masks: new Set([posKey(2, 1, 2)]), revealed: new Set(['rêve']) })
    expect(word('rêve').textContent).toBe('rêve')
  })

  it('marks the words a friend in the reading club looked up, with who', () => {
    render({ ...props, looks: new Map([['chat', ['Veli', 'Ayşe']]]) })
    const chat = rootEl.querySelector('[data-key="chat"]')!
    expect(chat.classList.contains('rw-friend')).toBe(true)
    expect(chat.getAttribute('title')).toBe('Veli, Ayşe bu kelimeye baktı')
    expect(rootEl.querySelector('[data-key="rêve"]')!.classList.contains('rw-friend')).toBe(false)
  })

  it('does not render again when its props stay equal', () => {
    const shade = vi.fn(() => 'lv-a')
    render({ ...props, shade })
    const calls = shade.mock.calls.length
    render({ ...props, shade })
    expect(shade.mock.calls.length).toBe(calls)
    render({ ...props, shade, heard: 5 })
    expect(shade.mock.calls.length).toBeGreaterThan(calls)
  })
})
