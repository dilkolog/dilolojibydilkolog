// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../data/guide/lessonOf'
import { GuideReviewNudge } from './GuideReviewNudge'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  localStorage.clear()
})

async function mount(language: 'fr' | 'es' | 'en' = 'fr') {
  const onOpen = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<GuideReviewNudge language={language} onOpen={onOpen} />))
  await act(() => new Promise((r) => setTimeout(r, 30)))
  return { host, onOpen }
}

describe('GuideReviewNudge', () => {
  it('renders nothing when no guide lessons have been read', async () => {
    const { host } = await mount('fr')
    expect(host.querySelector('.habit-nudge')).toBeNull()
  })

  it('shows due lesson nudge, opens lesson on click, and postpones on dismiss', async () => {
    localStorage.setItem(
      'diloloji:guide-progress',
      JSON.stringify({
        subjonctif: { read: '2020-01-01', learned: '2020-01-01', step: 0 },
      }),
    )
    const { host, onOpen } = await mount('fr')
    const main = host.querySelector<HTMLButtonElement>('.habit-nudge-main')
    expect(main).not.toBeNull()
    expect(main?.textContent).toContain('Hatırlıyor musun?')
    expect(main?.textContent).toContain('Subjonctif')

    await act(async () => main!.click())
    expect(onOpen).toHaveBeenCalledWith('subjonctif')

    const dismiss = host.querySelector<HTMLButtonElement>('button[aria-label="Şimdi değil"]')!
    await act(async () => dismiss.click())
    expect(host.querySelector('.habit-nudge')).toBeNull()
    const saved = JSON.parse(localStorage.getItem('diloloji:guide-progress') ?? '{}') as Record<string, { reviewed?: string }>
    expect(saved.subjonctif?.reviewed).toBeTruthy()
  })
})
