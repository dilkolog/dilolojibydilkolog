import monkiAvatarUrl from '../assets/art/avatar-monki.webp'
import fox from '../assets/art/avatar-fox.webp'
import panda from '../assets/art/avatar-panda.webp'
import owl from '../assets/art/avatar-owl.webp'
import cat from '../assets/art/avatar-cat.webp'
import penguin from '../assets/art/avatar-penguin.webp'
import rabbit from '../assets/art/avatar-rabbit.webp'
import octopus from '../assets/art/avatar-octopus.webp'
import koala from '../assets/art/avatar-koala.webp'
import monkiScarf from '../assets/art/monki-lvl-1.webp'
import monkiStudent from '../assets/art/monki-lvl-2.webp'
import monkiExplorer from '../assets/art/monki-lvl-3.webp'
import monkiGraduate from '../assets/art/monki-lvl-4.webp'
import monkiKing from '../assets/art/monki-lvl-5.webp'
import bossBlob from '../assets/art/boss-blob.webp'
import bossSlime from '../assets/art/boss-slime.webp'
import bossGhost from '../assets/art/boss-ghost.webp'
import bossDino from '../assets/art/boss-dino.webp'
import bossOctopus from '../assets/art/boss-octopus.webp'
import bossYeti from '../assets/art/boss-yeti.webp'
import bossDragon from '../assets/art/boss-dragon.webp'
import bossGolem from '../assets/art/boss-golem.webp'

/** The drawn avatar is stored as this emoji value; it shows the picture instead of a glyph. */
export const MONKI_AVATAR = 'monki'
export { monkiAvatarUrl }

/** The avatars everyone has: Monki first, then the animals (each is a round picture with its own colour). */
const FREE: Record<string, string> = { [MONKI_AVATAR]: monkiAvatarUrl, fox, panda, owl, cat, penguin, rabbit, octopus, koala }
export const DRAWN_AVATAR_IDS = Object.keys(FREE)

/** What opens an earned avatar: a level, a longest streak, bosses beaten or words settled ("Oturdu"). */
export type AvatarStat = 'level' | 'longestStreak' | 'bossesDefeated' | 'mastered'

export interface EarnedAvatar {
  id: string
  art: string
  name: string
  stat: AvatarStat
  goal: number
}

/**
 * Avatars to earn, in the order they open for most learners: Monki in the outfits of the levels, and the
 * arena's monsters. Whole figures (not round pictures): they stand on the profile's colour.
 */
export const EARNED_AVATARS: EarnedAvatar[] = [
  { id: 'monki-scarf', art: monkiScarf, name: 'Atkılı Monki', stat: 'level', goal: 3 },
  { id: 'boss-blob', art: bossBlob, name: 'Mor canavar', stat: 'bossesDefeated', goal: 1 },
  { id: 'monki-student', art: monkiStudent, name: 'Öğrenci Monki', stat: 'level', goal: 5 },
  { id: 'boss-ghost', art: bossGhost, name: 'Hayalet', stat: 'longestStreak', goal: 7 },
  { id: 'boss-slime', art: bossSlime, name: 'Jöle', stat: 'bossesDefeated', goal: 3 },
  { id: 'monki-explorer', art: monkiExplorer, name: 'Kâşif Monki', stat: 'level', goal: 8 },
  { id: 'boss-octopus', art: bossOctopus, name: 'Kral ahtapot', stat: 'longestStreak', goal: 14 },
  { id: 'boss-dino', art: bossDino, name: 'Dino', stat: 'mastered', goal: 50 },
  { id: 'monki-graduate', art: monkiGraduate, name: 'Mezun Monki', stat: 'level', goal: 15 },
  { id: 'boss-yeti', art: bossYeti, name: 'Yeti', stat: 'bossesDefeated', goal: 10 },
  { id: 'boss-dragon', art: bossDragon, name: 'Ejderha', stat: 'longestStreak', goal: 30 },
  { id: 'boss-golem', art: bossGolem, name: 'Taş dev', stat: 'mastered', goal: 200 },
  { id: 'monki-king', art: monkiKing, name: 'Kral Monki', stat: 'level', goal: 25 },
]
const EARNED_BY_ID = new Map(EARNED_AVATARS.map((a) => [a.id, a]))

/** Every drawn avatar by the value kept in `Profile.emoji`, the free ones and the ones to earn. */
export const DRAWN_AVATARS: Record<string, string> = { ...FREE, ...Object.fromEntries(EARNED_AVATARS.map((a) => [a.id, a.art])) }
/** A whole figure (an earned avatar) rather than a round picture. */
export const isFigureAvatar = (id: string): boolean => EARNED_BY_ID.has(id)

/** What it takes, in words: "Seviye 8", "7 günlük seri", "3 boss", "50 kelime Oturdu". */
export function avatarNeed(a: Pick<EarnedAvatar, 'stat' | 'goal'>): string {
  if (a.stat === 'level') return `Seviye ${a.goal}`
  if (a.stat === 'longestStreak') return `${a.goal} günlük seri`
  if (a.stat === 'bossesDefeated') return a.goal === 1 ? 'İlk boss' : `${a.goal} boss yen`
  return `${a.goal} kelime "Oturdu"`
}

const NAMES: Record<string, string> = { monki: 'Monki', fox: 'Tilki', panda: 'Panda', owl: 'Baykuş', cat: 'Kedi', penguin: 'Penguen', rabbit: 'Tavşan', octopus: 'Ahtapot', koala: 'Koala' }
export const drawnAvatarName = (id: string): string => NAMES[id] ?? EARNED_BY_ID.get(id)?.name ?? id
