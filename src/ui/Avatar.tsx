import type { Profile } from '../data/db'
import { useMediaUrl } from './useMedia'
import { DRAWN_AVATARS } from './avatarArt'

export function Avatar({ profile, size = 48 }: { profile: Profile; size?: number }) {
  const photo = useMediaUrl(profile.photoId)
  const drawn = DRAWN_AVATARS[profile.emoji]
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.52, background: photo || drawn ? undefined : profile.color }}
      aria-hidden
    >
      {photo ? <img src={photo} alt="" /> : drawn ? <img src={drawn} alt="" /> : profile.emoji}
    </span>
  )
}
