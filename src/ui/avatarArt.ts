import monkiAvatarUrl from '../assets/art/avatar-monki.webp'
import fox from '../assets/art/avatar-fox.webp'
import panda from '../assets/art/avatar-panda.webp'
import owl from '../assets/art/avatar-owl.webp'
import cat from '../assets/art/avatar-cat.webp'
import penguin from '../assets/art/avatar-penguin.webp'
import rabbit from '../assets/art/avatar-rabbit.webp'
import octopus from '../assets/art/avatar-octopus.webp'
import koala from '../assets/art/avatar-koala.webp'
import dog from '../assets/art/avatar-dog.webp'
import bear from '../assets/art/avatar-bear.webp'
import frog from '../assets/art/avatar-frog.webp'
import lion from '../assets/art/avatar-lion.webp'
import deer from '../assets/art/avatar-deer.webp'
import tiger from '../assets/art/avatar-tiger.webp'

import monkiWave from '../assets/art/monki-wave.webp'
import monkiScarf from '../assets/art/monki-lvl-1.webp'
import monkiStudent from '../assets/art/monki-lvl-2.webp'
import monkiExplorer from '../assets/art/monki-lvl-3.webp'
import monkiGraduate from '../assets/art/monki-lvl-4.webp'
import monkiKing from '../assets/art/monki-lvl-5.webp'
import monkiThink from '../assets/art/monki-think.webp'
import monkiHang from '../assets/art/monki-hang.webp'
import monkiSleep from '../assets/art/monki-sleep.webp'
import monkiCheer from '../assets/art/monki-cheer.webp'

import stickerCoffee from '../assets/art/sticker-coffee.webp'
import stickerMusic from '../assets/art/sticker-music.webp'
import stickerThumbs from '../assets/art/sticker-thumbs.webp'
import stickerParty from '../assets/art/sticker-party.webp'
import stickerRead from '../assets/art/sticker-read.webp'

import statSprout from '../assets/art/stat-sprout.webp'
import statStar from '../assets/art/stat-star.webp'
import statBook from '../assets/art/stat-book.webp'

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
const FREE: Record<string, string> = {
  [MONKI_AVATAR]: monkiAvatarUrl,
  fox,
  panda,
  owl,
  cat,
  penguin,
  rabbit,
  octopus,
  koala,
  dog,
  bear,
  frog,
  lion,
  deer,
  tiger,
}
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
  { id: 'monki-wave', art: monkiWave, name: 'Selamlayan Monki', stat: 'level', goal: 2 },
  { id: 'sticker-coffee', art: stickerCoffee, name: 'Kahve Molası Monki', stat: 'longestStreak', goal: 3 },
  { id: 'monki-scarf', art: monkiScarf, name: 'Atkılı Monki', stat: 'level', goal: 3 },
  { id: 'boss-blob', art: bossBlob, name: 'Mor canavar', stat: 'bossesDefeated', goal: 1 },
  { id: 'stat-sprout', art: statSprout, name: 'Zihin Fidanı', stat: 'mastered', goal: 10 },
  { id: 'monki-student', art: monkiStudent, name: 'Öğrenci Monki', stat: 'level', goal: 5 },
  { id: 'boss-ghost', art: bossGhost, name: 'Hayalet', stat: 'longestStreak', goal: 7 },
  { id: 'boss-slime', art: bossSlime, name: 'Jöle', stat: 'bossesDefeated', goal: 3 },
  { id: 'stat-star', art: statStar, name: 'Altın Yıldız', stat: 'longestStreak', goal: 10 },
  { id: 'monki-explorer', art: monkiExplorer, name: 'Kâşif Monki', stat: 'level', goal: 8 },
  { id: 'monki-think', art: monkiThink, name: 'Düşünür Monki', stat: 'mastered', goal: 25 },
  { id: 'sticker-music', art: stickerMusic, name: 'Müzisyen Monki', stat: 'bossesDefeated', goal: 5 },
  { id: 'sticker-thumbs', art: stickerThumbs, name: 'Süper Monki', stat: 'level', goal: 10 },
  { id: 'boss-octopus', art: bossOctopus, name: 'Kral ahtapot', stat: 'longestStreak', goal: 14 },
  { id: 'monki-hang', art: monkiHang, name: 'Akrobat Monki', stat: 'bossesDefeated', goal: 7 },
  { id: 'sticker-party', art: stickerParty, name: 'Parti Monki', stat: 'longestStreak', goal: 21 },
  { id: 'boss-dino', art: bossDino, name: 'Dino', stat: 'mastered', goal: 50 },
  { id: 'monki-graduate', art: monkiGraduate, name: 'Mezun Monki', stat: 'level', goal: 15 },
  { id: 'boss-yeti', art: bossYeti, name: 'Yeti', stat: 'bossesDefeated', goal: 10 },
  { id: 'monki-sleep', art: monkiSleep, name: 'Uykucu Monki', stat: 'level', goal: 20 },
  { id: 'boss-dragon', art: bossDragon, name: 'Ejderha', stat: 'longestStreak', goal: 30 },
  { id: 'sticker-read', art: stickerRead, name: 'Kitap Kurdu Monki', stat: 'mastered', goal: 100 },
  { id: 'monki-king', art: monkiKing, name: 'Kral Monki', stat: 'level', goal: 25 },
  { id: 'monki-cheer', art: monkiCheer, name: 'Kutlayan Monki', stat: 'longestStreak', goal: 50 },
  { id: 'boss-golem', art: bossGolem, name: 'Taş dev', stat: 'mastered', goal: 200 },
  { id: 'stat-book', art: statBook, name: 'Büyülü Kitap', stat: 'mastered', goal: 300 },
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

const NAMES: Record<string, string> = {
  monki: 'Monki',
  fox: 'Tilki',
  panda: 'Panda',
  owl: 'Baykuş',
  cat: 'Kedi',
  penguin: 'Penguen',
  rabbit: 'Tavşan',
  octopus: 'Ahtapot',
  koala: 'Koala',
  dog: 'Köpek',
  bear: 'Ayı',
  frog: 'Kurbağa',
  lion: 'Aslan',
  deer: 'Geyik',
  tiger: 'Kaplan',
}
export const drawnAvatarName = (id: string): string => NAMES[id] ?? EARNED_BY_ID.get(id)?.name ?? id
