import cardUrl from '../assets/art/share-card.webp'
import levelUrl from '../assets/art/share-level.webp'
import streakUrl from '../assets/art/share-streak.webp'
import weekUrl from '../assets/art/share-week.webp'

export interface CardText {
  /** A small line above the title ("Yeni rozet"). */
  kicker: string
  title: string
  text?: string
  /** The picture: Monki with a trophy (badges, milestones), with a flame (a streak), on a podium (a level), with a ticked calendar (a week). */
  art?: CardArt
}

export type CardArt = 'trophy' | 'streak' | 'level' | 'week'

/** A text cut into lines that fit `maxWidth` (by `measure`), at most `maxLines`; a cut last line ends in "…". */
export function wrapLines(measure: (s: string) => number, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  const words = text.split(/\s+/).filter(Boolean)
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i]
    if (!line || measure(next) <= maxWidth) {
      line = next
      continue
    }
    lines.push(line)
    line = words[i]
    if (lines.length === maxLines - 1) {
      line = words.slice(i).join(' ')
      break
    }
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) lines.length = maxLines
  const last = lines.length - 1
  const used = lines.join(' ').split(/\s+/).length
  if (last >= 0 && (used < words.length || measure(lines[last]) > maxWidth)) {
    let cut = lines[last]
    while (cut.length > 1 && measure(`${cut}…`) > maxWidth) cut = cut.slice(0, -1).trimEnd()
    lines[last] = `${cut}…`
  }
  return lines
}

/** Each picture's size and where its text goes: the trophy card keeps its left part, the banners their left third. */
interface Layout {
  url: string
  width: number
  height: number
  x: number
  w: number
  kickerY: number
  titleY: number
  titleSize: number
  titleLines: number
  textSize: number
  textLines: number
}
const TROPHY: Layout = { url: cardUrl, width: 1200, height: 576, x: 715, w: 430, kickerY: 190, titleY: 262, titleSize: 54, titleLines: 3, textSize: 28, textLines: 4 }
const banner = (url: string): Layout => ({ url, width: 1200, height: 300, x: 420, w: 700, kickerY: 92, titleY: 150, titleSize: 46, titleLines: 1, textSize: 25, textLines: 2 })
const LAYOUT: Record<CardArt, Layout> = { trophy: TROPHY, streak: banner(streakUrl), level: banner(levelUrl), week: banner(weekUrl) }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('card image'))
    img.src = src
  })
}

/** The card as a PNG: Monki with a trophy on the left, the title and a line on the right. Null where there is no canvas. */
export async function renderShareCard(card: CardText): Promise<Blob | null> {
  if (typeof document === 'undefined') return null
  const L = LAYOUT[card.art ?? 'trophy']
  const canvas = document.createElement('canvas')
  canvas.width = L.width
  canvas.height = L.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  try {
    await Promise.all([document.fonts?.load(`700 ${L.titleSize}px Literata`), document.fonts?.load('500 26px Lexend')])
  } catch {
    // Fonts not there: the fallback faces draw instead.
  }
  // The banners' rounded corners are see-through: a warm ground under them.
  ctx.fillStyle = '#fdf6ea'
  ctx.fillRect(0, 0, L.width, L.height)
  ctx.drawImage(await loadImage(L.url), 0, 0, L.width, L.height)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#b45309'
  ctx.font = '600 24px Lexend, system-ui, sans-serif'
  ctx.fillText(card.kicker.toLocaleUpperCase('tr'), L.x, L.kickerY)
  ctx.fillStyle = '#3b2312'
  ctx.font = `700 ${L.titleSize}px Literata, Georgia, serif`
  const lineH = Math.round(L.titleSize * 1.22)
  const title = wrapLines((s) => ctx.measureText(s).width, card.title, L.w, L.titleLines)
  title.forEach((l, i) => ctx.fillText(l, L.x, L.titleY + i * lineH))
  const y = L.titleY + (title.length - 1) * lineH + Math.round(L.textSize * 1.7)
  if (card.text) {
    ctx.fillStyle = '#6b4f3a'
    ctx.font = `400 ${L.textSize}px Lexend, system-ui, sans-serif`
    wrapLines((s) => ctx.measureText(s).width, card.text, L.w, L.textLines).forEach((l, i) => ctx.fillText(l, L.x, y + i * Math.round(L.textSize * 1.45)))
  }
  ctx.fillStyle = '#b45309'
  ctx.font = '600 24px Lexend, system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('Diloloji', L.x + L.w, L.height - (L.height > 400 ? 56 : 26))
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

/**
 * Shares a card: the picture when the browser can share files, else the plain text. A closed share
 * sheet is not an error.
 */
export async function shareCard(card: CardText, fallbackText: string): Promise<void> {
  try {
    const blob = await renderShareCard(card).catch(() => null)
    if (blob) {
      const file = new File([blob], 'diloloji.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Diloloji', text: fallbackText })
        return
      }
    }
    await navigator.share({ title: 'Diloloji', text: fallbackText })
  } catch {
    // Share sheet closed; nothing to do.
  }
}
