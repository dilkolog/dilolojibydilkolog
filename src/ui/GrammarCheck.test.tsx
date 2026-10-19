// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { GrammarCheck } from './GrammarCheck'

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('writingErrors')
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

const match = (offset: number, length: number, ruleId: string, category: string, replacement: string, issueType = 'grammar') => ({
  offset,
  length,
  message: 'm',
  replacements: [{ value: replacement }],
  rule: { id: ruleId, issueType, category: { id: category } },
})

describe('GrammarCheck and the writing error notebook', () => {
  it('adds what a check finds to the notebook and says so', async () => {
    const text = 'la problème est grand'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ matches: [match(0, 11, 'AGREEMENT_DET', 'GRAMMAR', 'le problème')] }) }))
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<GrammarCheck text={text} language="fr" onChange={() => undefined} />))
    await act(async () => (host.querySelector('button') as HTMLButtonElement).click())
    await act(async () => void (await new Promise((r) => setTimeout(r, 80))))
    expect(host.textContent).toContain('Yazı hata defterine işlendi')
    expect(host.textContent).toContain('Uyum (cinsiyet, sayı, özne-fiil) ×1')
    expect((await db.getWritingLog()).fr?.agreement).toMatchObject({ n: 1, samples: [{ wrong: 'la problème', fix: 'le problème' }] })
  })

  it('does not write when the check finds nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ matches: [] }) }))
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<GrammarCheck text="le problème est grand" language="fr" onChange={() => undefined} />))
    await act(async () => (host.querySelector('button') as HTMLButtonElement).click())
    await act(async () => void (await new Promise((r) => setTimeout(r, 80))))
    expect(host.textContent).toContain('Hata bulunmadı')
    expect(host.textContent).not.toContain('Yazı hata defterine')
  })
})
