// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'
import { RichText } from './RichText'

it('shows bold, italic and highlight as elements and never as HTML', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => root.render(<RichText text={'a **b** _c_ ==d== <img src=x onerror=alert(1)>'} />))
  expect(host.querySelector('strong')!.textContent).toBe('b')
  expect(host.querySelector('em')!.textContent).toBe('c')
  expect(host.querySelector('mark')!.textContent).toBe('d')
  expect(host.querySelector('img')).toBeNull()
  expect(host.textContent).toContain('<img src=x onerror=alert(1)>')
  act(() => root.unmount())
})
