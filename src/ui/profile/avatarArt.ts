import monkiAvatarUrl from '../../assets/art/avatar-monki.webp'
import fox from '../../assets/art/avatar-fox.webp'
import panda from '../../assets/art/avatar-panda.webp'
import owl from '../../assets/art/avatar-owl.webp'
import cat from '../../assets/art/avatar-cat.webp'
import penguin from '../../assets/art/avatar-penguin.webp'
import rabbit from '../../assets/art/avatar-rabbit.webp'
import octopus from '../../assets/art/avatar-octopus.webp'
import koala from '../../assets/art/avatar-koala.webp'
import dog from '../../assets/art/avatar-dog.webp'
import bear from '../../assets/art/avatar-bear.webp'
import frog from '../../assets/art/avatar-frog.webp'
import lion from '../../assets/art/avatar-lion.webp'
import deer from '../../assets/art/avatar-deer.webp'
import tiger from '../../assets/art/avatar-tiger.webp'
import redPanda from '../../assets/art/avatar-red-panda.webp'
import otter from '../../assets/art/avatar-otter.webp'
import capybara from '../../assets/art/avatar-capybara.webp'
import hedgehog from '../../assets/art/avatar-hedgehog.webp'
import raccoon from '../../assets/art/avatar-raccoon.webp'
import sloth from '../../assets/art/avatar-sloth.webp'
import squirrel from '../../assets/art/avatar-squirrel.webp'
import elephant from '../../assets/art/avatar-elephant.webp'
import parrot from '../../assets/art/avatar-parrot.webp'
import whale from '../../assets/art/avatar-whale.webp'
import seal from '../../assets/art/avatar-seal.webp'
import axolotl from '../../assets/art/avatar-axolotl.webp'
import turtle from '../../assets/art/avatar-turtle.webp'
import bee from '../../assets/art/avatar-bee.webp'

// The earned avatars that are not Monki: round portraits of the arena's monsters and the stat pictures
// (the whole figures stay where they are used elsewhere, the arena and the stats).
import avatarBossBlob from '../../assets/art/avatar-boss-blob.webp'
import avatarBossGhost from '../../assets/art/avatar-boss-ghost.webp'
import avatarBossSlime from '../../assets/art/avatar-boss-slime.webp'
import avatarBossDino from '../../assets/art/avatar-boss-dino.webp'
import avatarBossOctopus from '../../assets/art/avatar-boss-octopus.webp'
import avatarBossYeti from '../../assets/art/avatar-boss-yeti.webp'
import avatarBossChronos from '../../assets/art/avatar-boss-chronos.webp'
import avatarBossDragon from '../../assets/art/avatar-boss-dragon.webp'
import avatarBossGolem from '../../assets/art/avatar-boss-golem.webp'
import avatarStatSprout from '../../assets/art/avatar-stat-sprout.webp'
import avatarStatStar from '../../assets/art/avatar-stat-star.webp'
import avatarStatBook from '../../assets/art/avatar-stat-book.webp'

import monkiWave from '../../assets/art/monki-wave.webp'
import monkiScarf from '../../assets/art/monki-lvl-1.webp'
import monkiStudent from '../../assets/art/monki-lvl-2.webp'
import monkiExplorer from '../../assets/art/monki-lvl-3.webp'
import monkiGraduate from '../../assets/art/monki-lvl-4.webp'
import monkiKing from '../../assets/art/monki-lvl-5.webp'
import monkiThink from '../../assets/art/monki-think.webp'
import monkiHang from '../../assets/art/monki-hang.webp'
import monkiSleep from '../../assets/art/monki-sleep.webp'
import monkiCheer from '../../assets/art/monki-cheer.webp'

import stickerCoffee from '../../assets/art/sticker-coffee.webp'
import stickerMusic from '../../assets/art/sticker-music.webp'
import stickerThumbs from '../../assets/art/sticker-thumbs.webp'
import stickerParty from '../../assets/art/sticker-party.webp'
import stickerRead from '../../assets/art/sticker-read.webp'


/** The drawn avatar is stored as this emoji value; it shows the picture instead of a glyph. */
export const MONKI_AVATAR = 'monki'
export { monkiAvatarUrl }

/**
 * The avatars everyone has, as offered on the profile: the animals, each a round portrait with its own colour
 * (avatar-koleksiyonu-01, 2026-11-12: the 14 animals redrawn and 14 new ones). Monki is not offered any more: it is
 * the app's mascot, and a profile that chose it keeps it (LEGACY below).
 */
const FREE: Record<string, string> = {
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
  'red-panda': redPanda,
  otter,
  capybara,
  hedgehog,
  raccoon,
  sloth,
  squirrel,
  elephant,
  parrot,
  whale,
  seal,
  axolotl,
  turtle,
  bee,
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
 * Avatars to earn, as offered on the profile, in the order they open for most learners: the arena's monsters and the
 * stat pictures, as round portraits. Ids, goals and names are those they always had (a profile that chose one keeps it).
 */
export const EARNED_AVATARS: EarnedAvatar[] = [
  { id: 'boss-blob', art: avatarBossBlob, name: 'Mor canavar', stat: 'bossesDefeated', goal: 1 },
  { id: 'stat-sprout', art: avatarStatSprout, name: 'Zihin Fidanı', stat: 'mastered', goal: 10 },
  { id: 'boss-ghost', art: avatarBossGhost, name: 'Hayalet', stat: 'longestStreak', goal: 7 },
  { id: 'boss-slime', art: avatarBossSlime, name: 'Jöle', stat: 'bossesDefeated', goal: 3 },
  { id: 'stat-star', art: avatarStatStar, name: 'Altın Yıldız', stat: 'longestStreak', goal: 10 },
  { id: 'boss-octopus', art: avatarBossOctopus, name: 'Kral ahtapot', stat: 'longestStreak', goal: 14 },
  { id: 'boss-dino', art: avatarBossDino, name: 'Dino', stat: 'mastered', goal: 50 },
  { id: 'boss-yeti', art: avatarBossYeti, name: 'Yeti', stat: 'bossesDefeated', goal: 10 },
  { id: 'boss-chronos', art: avatarBossChronos, name: 'Zaman Bükücü Kronos', stat: 'bossesDefeated', goal: 15 },
  { id: 'boss-dragon', art: avatarBossDragon, name: 'Ejderha', stat: 'longestStreak', goal: 30 },
  { id: 'boss-golem', art: avatarBossGolem, name: 'Taş dev', stat: 'mastered', goal: 200 },
  { id: 'stat-book', art: avatarStatBook, name: 'Büyülü Kitap', stat: 'mastered', goal: 300 },
]
const EARNED_BY_ID = new Map(EARNED_AVATARS.map((a) => [a.id, a]))

/**
 * Monki and the Monki figures that were avatars before (the round Monki, and the outfits earned by level, streak,
 * bosses and settled words). No longer offered, but a profile that chose one keeps showing it, unchanged, until
 * another is picked: the stored value is never rewritten.
 */
const LEGACY_FIGURES: { id: string; art: string; name: string }[] = [
  { id: 'monki-wave', art: monkiWave, name: 'Selamlayan Monki' },
  { id: 'sticker-coffee', art: stickerCoffee, name: 'Kahve Molası Monki' },
  { id: 'monki-scarf', art: monkiScarf, name: 'Atkılı Monki' },
  { id: 'monki-student', art: monkiStudent, name: 'Öğrenci Monki' },
  { id: 'monki-explorer', art: monkiExplorer, name: 'Kâşif Monki' },
  { id: 'monki-think', art: monkiThink, name: 'Düşünür Monki' },
  { id: 'sticker-music', art: stickerMusic, name: 'Müzisyen Monki' },
  { id: 'sticker-thumbs', art: stickerThumbs, name: 'Süper Monki' },
  { id: 'monki-hang', art: monkiHang, name: 'Akrobat Monki' },
  { id: 'sticker-party', art: stickerParty, name: 'Parti Monki' },
  { id: 'monki-graduate', art: monkiGraduate, name: 'Mezun Monki' },
  { id: 'monki-sleep', art: monkiSleep, name: 'Uykucu Monki' },
  { id: 'sticker-read', art: stickerRead, name: 'Kitap Kurdu Monki' },
  { id: 'monki-king', art: monkiKing, name: 'Kral Monki' },
  { id: 'monki-cheer', art: monkiCheer, name: 'Kutlayan Monki' },
]
const LEGACY_BY_ID = new Map(LEGACY_FIGURES.map((a) => [a.id, a]))
/** Values kept on old profiles that are shown but no longer offered (`LEGACY_FIGURES` and the round Monki). */
export const LEGACY_AVATAR_IDS = [MONKI_AVATAR, ...LEGACY_FIGURES.map((a) => a.id)]

/** Every drawn avatar by the value kept in `Profile.emoji`: the offered ones and the legacy Monki ones. */
export const DRAWN_AVATARS: Record<string, string> = {
  ...FREE,
  ...Object.fromEntries(EARNED_AVATARS.map((a) => [a.id, a.art])),
  [MONKI_AVATAR]: monkiAvatarUrl,
  ...Object.fromEntries(LEGACY_FIGURES.map((a) => [a.id, a.art])),
}
/** A whole figure (a legacy Monki outfit) rather than a round picture: it stands on the profile's colour. */
export const isFigureAvatar = (id: string): boolean => LEGACY_BY_ID.has(id)

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
  'red-panda': 'Kızıl panda',
  otter: 'Su samuru',
  capybara: 'Kapibara',
  hedgehog: 'Kirpi',
  raccoon: 'Rakun',
  sloth: 'Tembel hayvan',
  squirrel: 'Sincap',
  elephant: 'Fil',
  parrot: 'Papağan',
  whale: 'Balina',
  seal: 'Fok',
  axolotl: 'Aksolotl',
  turtle: 'Kaplumbağa',
  bee: 'Arı',
}
export const drawnAvatarName = (id: string): string => NAMES[id] ?? EARNED_BY_ID.get(id)?.name ?? LEGACY_BY_ID.get(id)?.name ?? id
