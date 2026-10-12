/**
 * The little formatting a note or an extra field can carry: **bold**, _italic_ and ==highlight==
 * (they nest: **_both_**). Anything that is not a closed pair stays as typed, so a stray "_" or
 * "snake_case" is never eaten. Stored as plain text, shown through React nodes (never as HTML).
 */
export interface RichRun {
  text: string
  bold?: boolean
  italic?: boolean
  mark?: boolean
}

type Style = Pick<RichRun, 'bold' | 'italic' | 'mark'>

const OPEN = /\*\*(?=\S)|==(?=\S)|(?<![\w])_(?=[^\s_])/

/** The index of the closing mark for `open` at/after `from`, or -1. */
function closeOf(text: string, open: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    if (open === '_' ? text[i] === '_' && /\S/.test(text[i - 1] ?? ' ') && !/\w/.test(text[i + 1] ?? ' ') : text.startsWith(open, i) && /\S/.test(text[i - 1] ?? ' ')) return i
  }
  return -1
}

export function parseRich(text: string, style: Style = {}): RichRun[] {
  // Neighbours in the same style are one run (a mark that turned out to be plain text splits one).
  const out: RichRun[] = []
  for (const r of parse(text, style)) {
    const last = out[out.length - 1]
    if (last && !last.bold === !r.bold && !last.italic === !r.italic && !last.mark === !r.mark) last.text += r.text
    else out.push({ ...r })
  }
  return out
}

function parse(text: string, style: Style): RichRun[] {
  const runs: RichRun[] = []
  let rest = text
  const push = (t: string) => t && runs.push({ text: t, ...style })
  while (rest) {
    const m = OPEN.exec(rest)
    if (!m) {
      push(rest)
      break
    }
    const open = m[0]
    const end = closeOf(rest, open, m.index + open.length + 1)
    if (end < 0) {
      // Not closed: the mark is just text; look on after it.
      push(rest.slice(0, m.index + open.length))
      rest = rest.slice(m.index + open.length)
      continue
    }
    push(rest.slice(0, m.index))
    const inner = rest.slice(m.index + open.length, end)
    runs.push(...parse(inner, { ...style, ...(open === '**' ? { bold: true } : open === '==' ? { mark: true } : { italic: true }) }))
    rest = rest.slice(end + open.length)
  }
  return runs
}

/** The text without its marks (for search, speech and plain exports). */
export const richPlain = (text: string) => parseRich(text).map((r) => r.text).join('')

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The text as escaped HTML with <b>, <i> and <mark> (for the printable pages). */
export function richHtml(text: string): string {
  return parseRich(text)
    .map((r) => {
      let h = esc(r.text)
      if (r.mark) h = `<mark>${h}</mark>`
      if (r.italic) h = `<i>${h}</i>`
      if (r.bold) h = `<b>${h}</b>`
      return h
    })
    .join('')
}

/** `value` with the selection wrapped in `mark` (or the marks put in with the caret between when nothing is selected); unwrapped again if it already is. */
export function wrapSelection(value: string, start: number, end: number, mark: string): { value: string; start: number; end: number } {
  const before = value.slice(0, start)
  const picked = value.slice(start, end)
  const after = value.slice(end)
  if (picked.length >= mark.length * 2 && picked.startsWith(mark) && picked.endsWith(mark)) {
    const inner = picked.slice(mark.length, picked.length - mark.length)
    return { value: before + inner + after, start, end: start + inner.length }
  }
  if (before.endsWith(mark) && after.startsWith(mark)) {
    return { value: before.slice(0, before.length - mark.length) + picked + after.slice(mark.length), start: start - mark.length, end: end - mark.length }
  }
  return { value: before + mark + picked + mark + after, start: start + mark.length, end: end + mark.length }
}
