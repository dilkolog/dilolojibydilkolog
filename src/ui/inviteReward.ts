import { db } from '../data/instance'
import { localDate } from '../engine/progress'
import { INVITED_AWARD_KEY, INVITED_XP, INVITE_XP, MAX_INVITE_REWARDS, inviteAwardKey } from '../engine/xpLedger'

/**
 * The points for an invite, written into the XP ledger once each (see engine/xpLedger). The one who invited gets
 * INVITE_XP for each friend whose "joined" message arrives, for the first MAX_INVITE_REWARDS friends only: the
 * message comes from an account that was made, and accounts are cheap, so the points are small and capped.
 * Returns the points earned now (0 when the friend was counted before or the cap is reached).
 */
export async function rewardInviter(friendCodes: readonly string[], today = localDate(new Date())): Promise<number> {
  const ledger = await db.getXpLedger()
  let have = Object.keys(ledger).filter((k) => k.startsWith('invite|') && k !== INVITED_AWARD_KEY).length
  const awards: { key: string; day: string; xp: number }[] = []
  for (const code of new Set(friendCodes)) {
    const key = inviteAwardKey(code)
    if (ledger[key] || have >= MAX_INVITE_REWARDS) continue
    awards.push({ key, day: today, xp: INVITE_XP })
    have++
  }
  if (awards.length) await db.awardXp(awards)
  return awards.length * INVITE_XP
}

/** For the one who came in by an invite link: a little, once ever. True when it was given now. */
export async function rewardInvited(today = localDate(new Date())): Promise<boolean> {
  return db.awardXp([{ key: INVITED_AWARD_KEY, day: today, xp: INVITED_XP }])
}
