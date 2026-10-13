import monkiAvatarUrl from '../assets/art/avatar-monki.webp'
import fox from '../assets/art/avatar-fox.webp'
import panda from '../assets/art/avatar-panda.webp'
import owl from '../assets/art/avatar-owl.webp'
import cat from '../assets/art/avatar-cat.webp'
import penguin from '../assets/art/avatar-penguin.webp'
import rabbit from '../assets/art/avatar-rabbit.webp'
import octopus from '../assets/art/avatar-octopus.webp'
import koala from '../assets/art/avatar-koala.webp'

/** The drawn avatar is stored as this emoji value; it shows the picture instead of a glyph. */
export const MONKI_AVATAR = 'monki'
export { monkiAvatarUrl }

/** Every drawn avatar by the value kept in `Profile.emoji`: Monki first, then the animals (each is a round picture with its own colour). */
export const DRAWN_AVATARS: Record<string, string> = { [MONKI_AVATAR]: monkiAvatarUrl, fox, panda, owl, cat, penguin, rabbit, octopus, koala }
export const DRAWN_AVATAR_IDS = Object.keys(DRAWN_AVATARS)
const NAMES: Record<string, string> = { monki: 'Monki', fox: 'Tilki', panda: 'Panda', owl: 'Baykuş', cat: 'Kedi', penguin: 'Penguen', rabbit: 'Tavşan', octopus: 'Ahtapot', koala: 'Koala' }
export const drawnAvatarName = (id: string): string => NAMES[id] ?? id
