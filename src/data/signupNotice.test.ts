import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetQuota, type QuotaStore } from '../../api/_quota'
import { MAX_A_DAY, noticeSignup, signupMail } from '../../api/_signupNotice'

function memory(): QuotaStore {
  const files = new Map<string, string>()
  return { read: async (p) => files.get(p) ?? null, write: async (p, v) => void files.set(p, JSON.stringify(v)) }
}

const NOON = Date.parse('2026-10-22T12:00:00Z')
const person = { email: 'ali@example.com', name: 'Ali <b>', username: 'ali_42' }

describe('the owner hears of new people', () => {
  let sent: { to: string[]; subject: string; html: string }[]
  beforeEach(() => {
    resetQuota()
    sent = []
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('OWNER_EMAIL', 'owner@example.com')
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      sent.push(...(JSON.parse(String(init.body)) as typeof sent))
      return Response.json({ data: [] })
    })
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('mails the owner with the person\'s name, @name and address, escaped', async () => {
    expect(await noticeSignup(person, memory(), NOON)).toBe('sent')
    expect(sent).toHaveLength(1)
    expect(sent[0].to).toEqual(['owner@example.com'])
    expect(sent[0].subject).toBe('Diloloji: yeni hesap (@ali_42)')
    expect(sent[0].html).toContain('ali@example.com')
    expect(sent[0].html).toContain('Ali &lt;b&gt;')
    expect(sent[0].html).not.toContain('Ali <b>')
  })

  it('at most a day\'s worth; the last one says so; a new day starts again', async () => {
    const store = memory()
    for (let i = 0; i < MAX_A_DAY; i++) expect(await noticeSignup(person, store, NOON + i)).toBe('sent')
    expect(await noticeSignup(person, store, NOON + 100)).toBe('capped')
    expect(sent).toHaveLength(MAX_A_DAY)
    expect(sent.at(-1)!.subject).toContain('bugünün son bildirimi')
    expect(await noticeSignup(person, store, NOON + 24 * 3600_000)).toBe('sent')
  })

  it('is off without an owner address or a mail key, and never throws', async () => {
    vi.stubEnv('OWNER_EMAIL', '')
    expect(await noticeSignup(person, memory(), NOON)).toBe('off')
    vi.stubEnv('ERROR_DIGEST_TO', 'digest@example.com')
    expect(await noticeSignup(person, memory(), NOON)).toBe('sent')
    expect(sent.at(-1)!.to).toEqual(['digest@example.com'])
    vi.stubGlobal('fetch', async () => Promise.reject(new Error('down')))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(['failed', 'sent']).toContain(await noticeSignup(person, memory(), NOON))
  })

  it('the mail without an @name uses the name', () => {
    const mail = signupMail('o@example.com', { email: 'x@example.com', name: 'Ayşe' }, 3, NOON)
    expect(mail.subject).toBe('Diloloji: yeni hesap (Ayşe)')
    expect(mail.text).toContain('3. yeni hesap')
  })
})
