import { renderGlyph } from './glyphIcon'

export function Glyph({ emoji, size = 20, className, solid }: { emoji: string; size?: number; className?: string; solid?: boolean }) {
  const art = renderGlyph(emoji, { size, className, solid })
  return art ? <>{art}</> : <span className={className} aria-hidden>{emoji}</span>
}
