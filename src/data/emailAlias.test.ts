import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GMAIL_HOSTS, normalizeEmail, PLUS_ONLY_HOSTS, sameMailbox } from './emailAlias'

describe('one mailbox, one account', () => {
  it('Gmail ignores dots, +tags and the googlemail spelling', () => {
    for (const a of ['a.b.c@gmail.com', 'abc+shop@gmail.com', 'A.B.C+x+y@GoogleMail.com', ' abc@gmail.com ']) expect(normalizeEmail(a)).toBe('abc@gmail.com')
  })

  it('other providers ignore only the +tag, and a dot still counts there', () => {
    expect(normalizeEmail('ali+bir@outlook.com')).toBe('ali@outlook.com')
    expect(normalizeEmail('a.li@outlook.com')).toBe('a.li@outlook.com')
    expect(normalizeEmail('ali+x@icloud.com')).toBe('ali@icloud.com')
  })

  it('leaves every other address alone, a +tag included', () => {
    expect(normalizeEmail('a.b+c@sirket.com.tr')).toBe('a.b+c@sirket.com.tr')
  })

  it('does not trip over odd input', () => {
    expect(normalizeEmail('')).toBe('')
    expect(normalizeEmail('nonsense')).toBe('nonsense')
    expect(normalizeEmail('@gmail.com')).toBe('@gmail.com')
    expect(normalizeEmail('a@b@gmail.com')).toBe('a@b@gmail.com')
  })

  it('tells a different spelling of one mailbox from the very same address and from another person', () => {
    expect(sameMailbox('ali.veli@gmail.com', 'aliveli+2@gmail.com')).toBe(true)
    expect(sameMailbox('ali@gmail.com', 'ALI@gmail.com')).toBe(false)
    expect(sameMailbox('ali@gmail.com', 'veli@gmail.com')).toBe(false)
  })

  it('the migration holds the same hosts as these rules', () => {
    const sql = readFileSync(new URL('../../supabase/migrations/0008_email_aliases.sql', import.meta.url), 'utf8')
    for (const h of [...GMAIL_HOSTS, ...PLUS_ONLY_HOSTS]) expect(sql).toContain(`'${h}'`)
    expect(sql).toContain('alias_email')
  })
})
