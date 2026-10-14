import { listCover } from './drawnArt'
import { useMediaUrl } from './useMedia'
import type { WordList } from '../engine/types'

/**
 * A list's picture: the learner's own photo when they chose one, else the drawing its name calls
 * for (Seyahat → the suitcase), else nothing (the caller shows the initial).
 */
export function ListCover({ list, hero = false }: { list: Pick<WordList, 'name' | 'coverId'>; hero?: boolean }) {
  const photo = useMediaUrl(list.coverId)
  const drawn = listCover(list.name)
  const size = hero ? 72 : 40
  if (photo) return <img className={`wl-photo${hero ? ' wl-hero-cover' : ''}`} src={photo} alt="" width={size} height={size} />
  if (drawn && !list.coverId) return <img className={`wl-cover${hero ? ' wl-hero-cover' : ''}`} src={drawn} alt="" width={size} height={size} />
  return null
}
