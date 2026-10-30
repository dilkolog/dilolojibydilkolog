// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { ProgressVerdictCard } from './ProgressVerdictCard'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ProgressVerdictCard', () => {
  it('says the verdict and does what it suggests', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const onGo = vi.fn()
    await act(async () => root.render(<ProgressVerdictCard verdict={{ text: 'Üretmen geride.', action: { label: 'Yaz & konuş', go: { screen: 'produce' } } }} onGo={onGo} />))
    expect(host.querySelector('.progress-verdict-text')?.textContent).toBe('Üretmen geride.')
    await act(async () => (host.querySelector('.progress-verdict-go') as HTMLButtonElement).click())
    expect(onGo).toHaveBeenCalledWith({ screen: 'produce' })
    await act(async () => root.render(<ProgressVerdictCard verdict={{ text: 'Birkaç gün çalıştıkça…' }} onGo={onGo} />))
    expect(host.querySelector('.progress-verdict-go')).toBeNull()
    act(() => root.unmount())
  })
})
