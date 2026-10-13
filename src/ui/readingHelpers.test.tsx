// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { decision } from '../engine/__tests__/fixtures'
import { analyzeText } from '../engine/reading'
import { openTokensOf, shadeFor } from './readingHelpers'
import { useMultiSelect } from './useMultiSelect'

describe('reader helpers', () => {
  it('shades a word by how far along it is: new strongest, unknown ones too', () => {
    const shade = shadeFor([])
    expect(shade(undefined)).toBe('lv-a')
    expect(shade('en:decision')).toBe('lv-a')
  })

  it('lists the words still open in reading order, once each', () => {
    const analysis = analyzeText('The decision matters. The decision is final, unlike this zorglub.', 'en', [decision], [], new Set(), new Set())
    const open = openTokensOf(analysis)
    const keys = open.map((o) => o.token.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(open.every((o) => o.token.status === 'unseen')).toBe(true)
    expect(open.map((o) => o.token.text)).toContain('zorglub')
    expect(openTokensOf(null)).toEqual([])
  })
})

describe('useMultiSelect', () => {
  it('marks the picked words as known in one go, then clears the picks', async () => {
    const db = { addKnownWords: vi.fn(async () => {}), setIgnored: vi.fn(async () => {}) }
    const known: Set<string>[] = []
    const seen: { api?: ReturnType<typeof useMultiSelect> } = {}
    const api = () => seen.api!
    function Probe() {
      const value = useMultiSelect({
        db: db as never,
        language: 'fr',
        setKnown: ((f: (k: Set<string>) => Set<string>) => known.push(f(new Set(['x'])))) as never,
        setSkipped: (() => {}) as never,
        setIgnored: (() => {}) as never,
      })
      useEffect(() => {
        seen.api = value
      })
      return null
    }
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(<Probe />))
    act(() => api().toggleMulti('a'))
    act(() => api().toggleMulti('b'))
    act(() => api().toggleMulti('a'))
    expect([...api().multi]).toEqual(['b'])
    await act(async () => api().markMulti('known'))
    expect(db.addKnownWords).toHaveBeenCalledWith('fr', ['b'])
    expect([...known[0]].sort()).toEqual(['b', 'x'])
    expect(api().multi.size).toBe(0)
    act(() => root.unmount())
  })
})
