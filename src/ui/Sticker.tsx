import { STICKER } from './drawnArt'

export type StickerName = keyof typeof STICKER

/** One of Monki's stickers, for a moment that deserves a face (a day done, a pause, a wait); decorative, so no alt text. */
export function Sticker({ name, size = 26, className }: { name: StickerName; size?: number; className?: string }) {
  return <img className={className ? `sticker ${className}` : 'sticker'} src={STICKER[name]} alt="" width={size} height={size} style={{ height: size, width: 'auto' }} draggable={false} />
}
