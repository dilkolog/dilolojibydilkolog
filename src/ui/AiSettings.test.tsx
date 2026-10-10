// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../data/db'
import { AccessContext, type AccessState } from './accessContext'
import { AiContext } from './aiContext'
import { AiSettings } from './AiSettings'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

async function mount(access: AccessState['status'], key: string | null, needsApproval: boolean) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root!.render(
      <AccessContext.Provider value={{ status: access, approved: access === 'approved', refresh: async () => {} }}>
        <AiContext.Provider value={{ apiKey: key, needsApproval, setApiKey: async () => {} }}>
          <AiSettings settings={DEFAULT_SETTINGS} onChange={() => {}} />
        </AiContext.Provider>
      </AccessContext.Provider>,
    ),
  )
  await act(async () => void (await new Promise((r) => setTimeout(r, 30))))
  return host
}

describe('AiSettings and the owner\'s approval', () => {
  it('asks a signed-out visitor to sign up first, and offers no key field', async () => {
    const host = await mount('signedOut', null, true)
    expect(host.textContent).toContain('onayladığı hesaplara açık')
    expect(host.textContent).toContain('hesap oluştur')
    expect(host.querySelector('input')).toBeNull()
  })

  it('says a waiting account waits, and a turned-down one was not approved', async () => {
    expect((await mount('pending', null, true)).textContent).toContain('onay bekliyor')
    act(() => root?.unmount())
    expect((await mount('rejected', null, true)).textContent).toContain('onaylanmadı')
  })

  it('an approved account sees the key form as before', async () => {
    const host = await mount('approved', null, false)
    expect(host.textContent).not.toContain('onayladığı hesaplara açık')
    expect(host.querySelector('input')).not.toBeNull()
  })
})
