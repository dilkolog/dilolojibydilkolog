// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { captureInvite, cleanCode, cleanName, clearInvite, inviteLink, pendingInvite, pendingInviteInfo } from './invite'

beforeEach(() => {
  localStorage.clear()
  history.replaceState(null, '', '/')
})

describe('cleanCode', () => {
  it('reads a friend code however it was typed', () => {
    expect(cleanCode('ABCD-2345')).toBe('ABCD2345')
    expect(cleanCode(' abcd 2345 ')).toBe('ABCD2345')
  })
  it('refuses what cannot be a code', () => {
    expect(cleanCode('ABCD234')).toBeNull() // too short
    expect(cleanCode('ABCD0OIL')).toBeNull() // letters the codes never use
    expect(cleanCode('<script>')).toBeNull()
    expect(cleanCode(null)).toBeNull()
  })
})

describe('cleanName', () => {
  it('trims and removes dangerous characters', () => {
    expect(cleanName('  Ali Aydın  ')).toBe('Ali Aydın')
    expect(cleanName('<script>Ayşe</script>')).toBe('scriptAyşe/script')
    expect(cleanName('“Can”')).toBe('Can')
    // A right-to-left override would show the name turned around.
    expect(cleanName('Ay\u202Eşe')).toBe('Ayşe')
    expect(cleanName(null)).toBeNull()
    expect(cleanName('')).toBeNull()
  })
})

describe('invite link', () => {
  it('is the site with the code', () => {
    expect(inviteLink('ABCD2345', 'https://diloloji.com')).toBe('https://diloloji.com/?davet=ABCD2345')
  })

  it('includes the inviter name when supplied', () => {
    expect(inviteLink('ABCD2345', 'https://diloloji.com', 'Ali Aydın')).toBe('https://diloloji.com/?davet=ABCD2345&kimden=Ali%20Ayd%C4%B1n')
  })

  it('is taken off the address and kept, the rest of the address staying', () => {
    history.replaceState(null, '', '/?davet=abcd-2345&kimden=Ali&go=quick#x')
    expect(captureInvite()).toBe('ABCD2345')
    expect(location.search).toBe('?go=quick')
    expect(location.hash).toBe('#x')
    expect(pendingInvite()).toBe('ABCD2345')
    expect(pendingInviteInfo()).toEqual({ code: 'ABCD2345', name: 'Ali' })
  })

  it('is taken off the address even when the code is no good, and keeps nothing', () => {
    history.replaceState(null, '', '/?davet=nope')
    expect(captureInvite()).toBeNull()
    expect(location.search).toBe('')
    expect(pendingInvite()).toBeNull()
  })

  it('does nothing for an address without one, and leaves an earlier one alone', () => {
    history.replaceState(null, '', '/?davet=ABCD2345')
    captureInvite()
    history.replaceState(null, '', '/')
    expect(captureInvite()).toBeNull()
    expect(pendingInvite()).toBe('ABCD2345')
  })

  it('is let go after two weeks and when cleared', () => {
    history.replaceState(null, '', '/?davet=ABCD2345')
    const t0 = Date.parse('2026-10-19T12:00:00Z')
    captureInvite(t0)
    expect(pendingInvite(t0 + 13 * 86_400_000)).toBe('ABCD2345')
    expect(pendingInvite(t0 + 15 * 86_400_000)).toBeNull()
    clearInvite()
    expect(pendingInvite(t0)).toBeNull()
  })

  it('survives a broken stored value', () => {
    localStorage.setItem('diloloji:invite-in', '{nope')
    expect(pendingInvite()).toBeNull()
    localStorage.setItem('diloloji:invite-in', JSON.stringify({ code: 'ABCD2345', at: 'yesterday' }))
    expect(pendingInvite()).toBeNull()
  })
})
