// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PasswordInput } from './PasswordInput'

describe('PasswordInput', () => {
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
  const eyes = () => [...container.querySelectorAll<HTMLButtonElement>('button.password-toggle')]
  const types = () => [...container.querySelectorAll('input')].map((i) => i.type)

  it('hides the password and shows it with the eye button inside the field', async () => {
    await act(async () => root.render(<PasswordInput value="gizli" onChange={() => undefined} autoComplete="current-password" />))
    expect(types()).toEqual(['password'])
    expect(eyes()[0]!.getAttribute('aria-label')).toBe('Şifreyi göster')
    expect(eyes()[0]!.getAttribute('aria-pressed')).toBe('false')
    await act(async () => eyes()[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(types()).toEqual(['text'])
    expect(eyes()[0]!.getAttribute('aria-label')).toBe('Şifreyi gizle')
    expect(eyes()[0]!.getAttribute('aria-pressed')).toBe('true')
  })

  it('two fields can share one switch', async () => {
    const Two = () => {
      const [shown, setShown] = useState(false)
      return (
        <>
          <PasswordInput value="a" onChange={() => undefined} autoComplete="new-password" shown={shown} onShownChange={setShown} />
          <PasswordInput value="a" onChange={() => undefined} autoComplete="new-password" shown={shown} onShownChange={setShown} />
        </>
      )
    }
    await act(async () => root.render(<Two />))
    await act(async () => eyes()[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(types()).toEqual(['text', 'text'])
  })
})
