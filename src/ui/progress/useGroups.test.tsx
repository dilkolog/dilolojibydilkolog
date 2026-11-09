// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGroups } from './useGroups'

function TestComponent({
  ids,
  starting,
  storageKey,
  onHook,
}: {
  ids: readonly string[]
  starting: readonly string[]
  storageKey?: string
  onHook: (hook: ReturnType<typeof useGroups>) => void
}) {
  const hook = useGroups(ids, starting, storageKey)
  onHook(hook)
  return null
}

describe('useGroups', () => {
  const ids = ['g-1', 'g-2', 'g-3']
  const starting = ['g-1']

  beforeEach(() => {
    localStorage.clear()
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList)
  })

  it('initializes with all groups on wide screens when no saved state exists', () => {
    window.matchMedia = (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList)

    let hook!: ReturnType<typeof useGroups>
    const el = document.createElement('div')
    const root = createRoot(el)

    act(() => {
      root.render(<TestComponent ids={ids} starting={starting} onHook={(h) => (hook = h)} />)
    })

    expect(hook.isOpen('g-1')).toBe(true)
    expect(hook.isOpen('g-2')).toBe(true)
    expect(hook.isOpen('g-3')).toBe(true)

    act(() => root.unmount())
  })

  it('initializes with starting groups on narrow screens when no saved state exists', () => {
    let hook!: ReturnType<typeof useGroups>
    const el = document.createElement('div')
    const root = createRoot(el)

    act(() => {
      root.render(<TestComponent ids={ids} starting={starting} onHook={(h) => (hook = h)} />)
    })

    expect(hook.isOpen('g-1')).toBe(true)
    expect(hook.isOpen('g-2')).toBe(false)
    expect(hook.isOpen('g-3')).toBe(false)

    act(() => root.unmount())
  })

  it('toggles a group and updates open state', () => {
    let hook!: ReturnType<typeof useGroups>
    const el = document.createElement('div')
    const root = createRoot(el)

    act(() => {
      root.render(<TestComponent ids={ids} starting={starting} onHook={(h) => (hook = h)} />)
    })

    expect(hook.isOpen('g-2')).toBe(false)

    act(() => {
      hook.toggle('g-2')
    })
    expect(hook.isOpen('g-2')).toBe(true)

    act(() => {
      hook.toggle('g-2')
    })
    expect(hook.isOpen('g-2')).toBe(false)

    act(() => root.unmount())
  })

  it('opens a group without closing others', () => {
    let hook!: ReturnType<typeof useGroups>
    const el = document.createElement('div')
    const root = createRoot(el)

    act(() => {
      root.render(<TestComponent ids={ids} starting={starting} onHook={(h) => (hook = h)} />)
    })

    act(() => {
      hook.open('g-3')
    })
    expect(hook.isOpen('g-1')).toBe(true)
    expect(hook.isOpen('g-3')).toBe(true)

    act(() => root.unmount())
  })

  it('persists choices to localStorage when storageKey is provided', () => {
    const key = 'test-groups'
    let hook!: ReturnType<typeof useGroups>
    const el = document.createElement('div')
    const root = createRoot(el)

    act(() => {
      root.render(<TestComponent ids={ids} starting={starting} storageKey={key} onHook={(h) => (hook = h)} />)
    })

    act(() => {
      hook.toggle('g-2')
    })

    const stored = JSON.parse(localStorage.getItem(key)!)
    expect(stored).toContain('g-1')
    expect(stored).toContain('g-2')

    act(() => root.unmount())
  })

  it('restores choices from localStorage on initial render', () => {
    const key = 'test-groups'
    localStorage.setItem(key, JSON.stringify(['g-2', 'g-3']))

    let hook!: ReturnType<typeof useGroups>
    const el = document.createElement('div')
    const root = createRoot(el)

    act(() => {
      root.render(<TestComponent ids={ids} starting={starting} storageKey={key} onHook={(h) => (hook = h)} />)
    })

    expect(hook.isOpen('g-1')).toBe(false)
    expect(hook.isOpen('g-2')).toBe(true)
    expect(hook.isOpen('g-3')).toBe(true)

    act(() => root.unmount())
  })

  it('handles corrupted localStorage gracefully by falling back to default', () => {
    const key = 'test-groups'
    localStorage.setItem(key, 'not-valid-json')

    let hook!: ReturnType<typeof useGroups>
    const el = document.createElement('div')
    const root = createRoot(el)

    act(() => {
      root.render(<TestComponent ids={ids} starting={starting} storageKey={key} onHook={(h) => (hook = h)} />)
    })

    expect(hook.isOpen('g-1')).toBe(true)
    expect(hook.isOpen('g-2')).toBe(false)

    act(() => root.unmount())
  })
})
