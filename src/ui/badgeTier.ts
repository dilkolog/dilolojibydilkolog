import { medalTier, type AchievementState, type MedalTier } from '../engine/gamification'

export const TIER_NAME: Record<MedalTier, string> = { bronze: 'Bronz', silver: 'Gümüş', gold: 'Altın', special: 'Özel' }

/** Smaller medals first, so a session that earned several ends on its best. */
const RANK: Record<MedalTier, number> = { bronze: 0, silver: 1, special: 2, gold: 3 }
export const byTier = (a: AchievementState, b: AchievementState) => RANK[medalTier(a)] - RANK[medalTier(b)]
