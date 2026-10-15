import type { Profile } from '../data/db'
import { useMediaUrl } from './useMedia'
import { DRAWN_AVATARS, isFigureAvatar } from './avatarArt'

export function Avatar({ profile, size = 48 }: { profile: Profile; size?: number }) {
  const photo = useMediaUrl(profile.photoId)
  const drawn = DRAWN_AVATARS[profile.emoji]
  // An earned avatar is a whole figure: it stands on the profile's colour, softened, instead of filling the circle.
  const figure = !photo && !!drawn && isFigureAvatar(profile.emoji)
  return (
    <span
      className={`avatar${figure ? ' avatar-figure' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.52, background: figure ? `color-mix(in srgb, ${profile.color} 22%, var(--surface))` : photo || drawn ? undefined : profile.color }}
      aria-hidden
    >
      {photo ? <img src={photo} alt="" /> : drawn ? <img src={drawn} alt="" /> : profile.emoji}
    </span>
  )
}
