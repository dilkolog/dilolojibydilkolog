import cardUrl from '../assets/art/share-card.webp'

export interface CardText {
  /** A small line above the title ("Yeni rozet"). */
  kicker: string
  title: string
  text?: string
}

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

const SIZE = { width: 1200, height: 576 }
/** Where the drawing ends and the text may start (the picture keeps the left of the card). */
const TEXT_X = 715
const TEXT_W = 430

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
  const canvas = document.createElement('canvas')
  canvas.width = SIZE.width
  canvas.height = SIZE.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  try {
    await Promise.all([document.fonts?.load('700 52px Literata'), document.fonts?.load('500 26px Lexend')])
  } catch {
    // Fonts not there: the fallback faces draw instead.
  }
  ctx.drawImage(await loadImage(cardUrl), 0, 0, SIZE.width, SIZE.height)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#b45309'
  ctx.font = '600 26px Lexend, system-ui, sans-serif'
  ctx.fillText(card.kicker.toLocaleUpperCase('tr'), TEXT_X, 190)
  ctx.fillStyle = '#3b2312'
  ctx.font = '700 54px Literata, Georgia, serif'
  const title = wrapLines((s) => ctx.measureText(s).width, card.title, TEXT_W, 3)
  title.forEach((l, i) => ctx.fillText(l, TEXT_X, 262 + i * 66))
  let y = 262 + title.length * 66 + 8
  if (card.text) {
    ctx.fillStyle = '#6b4f3a'
    ctx.font = '400 28px Lexend, system-ui, sans-serif'
    wrapLines((s) => ctx.measureText(s).width, card.text, TEXT_W, 4).forEach((l, i) => ctx.fillText(l, TEXT_X, y + i * 40))
    y += 4 * 40
  }
  ctx.fillStyle = '#b45309'
  ctx.font = '600 26px Lexend, system-ui, sans-serif'
  ctx.fillText('Diloloji', TEXT_X, SIZE.height - 56)
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
