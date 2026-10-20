import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { disableMail, enableMail, getMail, mailAvailable, refreshMail, reportMailState, setMailWeekly } from './emailReminders'
import type { PushState } from './pushReminders'

const state: PushState = { studiedToday: true, streak: 4, plan: 'DELF', restWeekdays: [0], vacation: null, due: 7, week: '5 gün · 312 cevap (%86 doğru)', hour: 20 }
let calls: { url: string; body: Record<string, unknown> }[] = []
let reply: (body: Record<string, unknown>) => Response = () => Response.json({ state: 'pending' })

beforeEach(async () => {
  calls = []
  reply = () => Response.json({ state: 'pending' })
  await db.meta.delete('reminderEmail')
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const body = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {}
    calls.push({ url, body })
    return url.includes('mail=status') ? Response.json({ available: true }) : reply(body)
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('mail reminders on the device', () => {
  it('asks the server whether mail is available', async () => {
    expect(await mailAvailable()).toBe(true)
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline')
    })
    expect(await mailAvailable()).toBe(false)
  })

  it('registers an address with the day and the week figures (the server checks their shape), without the plan, and remembers it as pending', async () => {
    expect(await enableMail(' ali@example.com ', state)).toBe('pending')
    expect(calls[0].body).toMatchObject({ action: 'email', email: 'ali@example.com', streak: 4, due: 7, hour: 20, resend: false, week: '5 gün · 312 cevap (%86 doğru)', weeklyMail: true })
    expect(JSON.stringify(calls[0].body)).not.toContain('DELF')
    expect(await getMail()).toEqual({ email: 'ali@example.com', state: 'pending' })
  })

  it('the weekly summary can be turned off, and every later report keeps it off', async () => {
    await enableMail('ali@example.com', state)
    await setMailWeekly(false, state)
    expect(calls.at(-1)!.body).toMatchObject({ update: true, weeklyMail: false })
    expect((await getMail())?.weekly).toBe(false)
    await reportMailState(state)
    expect(calls.at(-1)!.body).toMatchObject({ update: true, weeklyMail: false })
    await setMailWeekly(true, state)
    expect(calls.at(-1)!.body).toMatchObject({ weeklyMail: true })
  })

  it('says why in words: approval, taken address, bad address', async () => {
    reply = () => Response.json({ error: 'approval_required' }, { status: 403 })
    await expect(enableMail('a@b.co', state)).rejects.toThrow('onayladığı hesaplara')
    reply = () => Response.json({ error: 'taken' }, { status: 409 })
    await expect(enableMail('a@b.co', state)).rejects.toThrow('başka bir hesapta')
    reply = () => Response.json({ error: 'bad email' }, { status: 400 })
    await expect(enableMail('a@b.co', state)).rejects.toThrow('geçerli')
    expect(await getMail()).toBeNull()
  })

  it('follows the confirmation, and forgets an address that was taken off by the mail’s own link', async () => {
    await enableMail('ali@example.com', state)
    reply = () => Response.json({ state: 'on' })
    expect(await refreshMail()).toEqual({ email: 'ali@example.com', state: 'on' })
    reply = () => Response.json({ state: 'none' })
    expect(await refreshMail()).toBeNull()
    expect(await getMail()).toBeNull()
  })

  it('reports the day only for a registered address, and removing it clears it here', async () => {
    await reportMailState(state)
    expect(calls).toEqual([])
    await enableMail('ali@example.com', state)
    calls = []
    await reportMailState(state)
    expect(calls[0].body).toMatchObject({ action: 'email', update: true, email: 'ali@example.com' })
    reply = () => new Response(null, { status: 204 })
    await disableMail()
    expect(calls.at(-1)!.body).toMatchObject({ action: 'email-remove' })
    expect(await getMail()).toBeNull()
  })
})
