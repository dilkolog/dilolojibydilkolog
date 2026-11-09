// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { SessionResumeCard } from './SessionResumeCard'
import { db } from '../../data/instance'
import { draftKey, draftRecord, writeSessionDraft } from '../../data/sessionDraft'
import { startSession } from '../../engine/session'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: ReturnType<typeof createRoot> | undefined
afterEach(async () => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  await db.meta.delete(draftKey('fr'))
})

it('offers resuming a pending learning group independently of the daily plan', async () => {
  const session = startSession([{ entryId: 'fr:chat', kind: 'exercise', reason: 'practice', skill: 'recall', exerciseType: 'typed_translation', learningFollowUp: true }])
  await writeSessionDraft(db, draftRecord('fr', 17, session))
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const onResume = vi.fn()
  await act(async () => root!.render(<SessionResumeCard language="fr" onResume={onResume} />))
  for (let i = 0; i < 50 && !host.querySelector('button'); i++) await act(async () => new Promise((r) => setTimeout(r, 20)))
  expect(host.textContent).toContain('1 kelimenin öğrenme adımları')
  act(() => host.querySelector<HTMLButtonElement>('button')!.click())
  expect(onResume).toHaveBeenCalledTimes(1)
})
