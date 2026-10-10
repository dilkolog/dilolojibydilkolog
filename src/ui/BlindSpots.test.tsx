// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { grammarExercises } from '../data/grammar'
import { BlindSpotsCard } from './BlindSpots'

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await Promise.all(['grammar', 'pairs', 'traps', 'reflex', 'earMisses', 'lab:fr'].map((k) => db.meta.delete(k)))
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 60))))
async function mount(errors: Parameters<typeof BlindSpotsCard>[0]['errors'], onRepair = vi.fn()) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<BlindSpotsCard language="fr" errors={errors} onRepair={onRepair} />))
  await wait()
  return { host, onRepair }
}

describe('BlindSpotsCard', () => {
  it('is not there while the data says nothing', async () => {
    expect((await mount({})).host.innerHTML).toBe('')
  })

  it('lists findings from the mistakes and the grammar log, each with a button to its practice', async () => {
    const topic = grammarExercises('fr')[0].topic
    const log = Object.fromEntries(grammarExercises('fr').filter((e) => e.topic === topic).map((e) => [e.id, { ok: 0, wrong: 3, last: '2026-10-10T10:00:00Z' }]))
    await db.saveGrammarLog(log)
    const { host, onRepair } = await mount({ gender: 12, typo: 6 })
    expect(host.textContent).toContain('Kör nokta röntgeni')
    expect(host.textContent).toContain('cinsiyetinde')
    expect(host.textContent).toContain('sorularında zorlanıyorsun')
    const buttons = [...host.querySelectorAll('button')]
    expect(buttons).toHaveLength(2)
    await act(async () => buttons.find((b) => b.textContent?.includes('Cinsiyet kuralları'))!.click())
    expect(onRepair).toHaveBeenCalledWith('gender')
  })
})
