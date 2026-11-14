// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { RootBoundary } from './RootBoundary'

const reloadForNewVersion = vi.hoisted(() => vi.fn(() => true))
const reportError = vi.hoisted(() => vi.fn())
vi.mock('./chunkError', async (original) => ({ ...(await original<typeof import('./chunkError')>()), reloadForNewVersion }))
vi.mock('../../data/errorReport', () => ({ reportError }))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Boom(): never {
  throw new Error('render failed')
}

/** What Safari says when a file of the version before a deploy is asked for (the site answers with its page). */
function GoneChunk(): never {
  throw new TypeError("'text/html' is not a valid JavaScript MIME type.")
}

describe('RootBoundary', () => {
  it('shows a way out instead of a blank page when something outside any screen breaks', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const el = document.createElement('div')
    document.body.append(el)
    const root = createRoot(el)
    act(() => root.render(<RootBoundary><Boom /></RootBoundary>))
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Uygulama açılamadı')
    expect([...el.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Sayfayı yenile', 'Yedeği indir'])
    // The error's own words are on the screen (a screenshot then tells the owner what broke), and it is reported.
    expect(el.querySelector('.screen-error-detail')?.textContent).toBe('render failed')
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), 'root')
    expect(reloadForNewVersion).not.toHaveBeenCalled()
    act(() => root.unmount())
    el.remove()
    vi.restoreAllMocks()
  })
  it('picks up the new version when a part outside any screen is gone after a deploy, and does not report it', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    reportError.mockClear()
    reloadForNewVersion.mockClear()
    const el = document.createElement('div')
    document.body.append(el)
    const root = createRoot(el)
    act(() => root.render(<RootBoundary><GoneChunk /></RootBoundary>))
    expect(reloadForNewVersion).toHaveBeenCalledTimes(1)
    expect(reportError).not.toHaveBeenCalled()
    // If the reload could not happen (tried a moment ago), the text says what it is instead of "unexpected error".
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('yeni bir sürümü yüklendi')
    expect(el.querySelector('.screen-error-detail')).toBeNull()
    act(() => root.unmount())
    el.remove()
    vi.restoreAllMocks()
  })
  it('renders the app when nothing is wrong', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const root = createRoot(el)
    act(() => root.render(<RootBoundary><p>ok</p></RootBoundary>))
    expect(el.textContent).toBe('ok')
    act(() => root.unmount())
    el.remove()
  })
})
