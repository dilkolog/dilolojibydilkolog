import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/instance'
import { cleanLedger } from '../engine/xpLedger'
import { rewardInvited, rewardInviter } from './inviteReward'

const DAY = '2026-10-20'
const codes = (n: number) => Array.from({ length: n }, (_, i) => `ABCDEFG${'23456789'[i]}`)

beforeEach(async () => {
  await db.meta.delete('xpLedger')
})

describe('the points for an invite', () => {
  it('the one who invited earns once for each friend, never twice for the same one', async () => {
    expect(await rewardInviter(['ABCD2345'], DAY)).toBe(30)
    expect(await rewardInviter(['ABCD2345'], DAY)).toBe(0)
    expect(await rewardInviter(['ABCD2345', 'WXYZ6789'], DAY)).toBe(30)
    expect(Object.keys(await db.getXpLedger()).sort()).toEqual(['invite|ABCD2345', 'invite|WXYZ6789'])
  })

  it('stops at the first five friends: accounts are cheap, so the points are capped', async () => {
    expect(await rewardInviter(codes(8), DAY)).toBe(5 * 30)
    expect(await rewardInviter(['ZZZZ2222'], DAY)).toBe(0)
  })

  it('the one who came in by an invite gets a little, once ever, and it does not count against the inviter cap', async () => {
    expect(await rewardInvited(DAY)).toBe(true)
    expect(await rewardInvited(DAY)).toBe(false)
    expect(await rewardInviter(codes(5), DAY)).toBe(5 * 30)
  })

  it('the ledger keeps these keys through a backup clean-up, and drops a made-up one', () => {
    const ledger = cleanLedger({ 'invite|ABCD2345': { day: DAY, xp: 30 }, 'invite|in': { day: DAY, xp: 20 }, 'invite|../x': { day: DAY, xp: 30 } })
    expect(Object.keys(ledger).sort()).toEqual(['invite|ABCD2345', 'invite|in'])
  })
})
