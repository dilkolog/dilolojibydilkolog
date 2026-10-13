import type { Profile } from '../data/db'
import { useMediaUrl } from './useMedia'
import { MONKI_AVATAR, monkiAvatarUrl } from './avatarArt'

export function Avatar({ profile, size = 48 }: { profile: Profile; size?: number }) {
  const photo = useMediaUrl(profile.photoId)
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.52, background: photo || profile.emoji === MONKI_AVATAR ? undefined : profile.color }}
      aria-hidden
    >
      {photo ? <img src={photo} alt="" /> : profile.emoji === MONKI_AVATAR ? <img src={monkiAvatarUrl} alt="" /> : profile.emoji}
    </span>
  )
}
