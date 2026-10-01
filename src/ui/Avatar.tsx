import type { Profile } from '../data/db'
import { useMediaUrl } from './useMedia'

export function Avatar({ profile, size = 48 }: { profile: Profile; size?: number }) {
  const photo = useMediaUrl(profile.photoId)
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.52, background: photo ? undefined : profile.color }}
      aria-hidden
    >
      {photo ? <img src={photo} alt="" /> : profile.emoji}
    </span>
  )
}
