/**
 * "Panodaki kelimeyi ekle": a word copied elsewhere (a message, an article) offered on coming back to
 * the app. Only when the learner turned it on and the browser already granted clipboard reading, so
 * the app never triggers a paste prompt by itself. The text stays on the device; only a short hash of
 * the last word offered is kept, so the same copy isn't offered twice.
 */
const LAST_KEY = 'kelime-koc:clipboard-last'

/** The word or short phrase to offer, or null: letters only, at most 4 words, not already in the list. */
export function clipboardCandidate(text: string, lemmas: Iterable<string>): string | null {
  const word = text.trim().replace(/^["“«'‘]+|["”»'’.,;:!?]+$/g, '').trim()
  if (!word || word.length > 40 || word.split(/\s+/).length > 4) return null
  if (!/^[\p{L}][\p{L}'’ -]*$/u.test(word)) return null
  const key = normal(word)
  for (const l of lemmas) if (normal(l) === key) return null
  return word
}

const normal = (s: string) => s.toLocaleLowerCase('tr').normalize('NFC').replace(/\s+/g, ' ')

/** A short, non-reversible tag of a word (not the word itself). */
function tag(word: string): string {
  let h = 2166136261
  for (const ch of normal(word)) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619)
  return (h >>> 0).toString(36)
}

export function alreadyOffered(word: string): boolean {
  try {
    return localStorage.getItem(LAST_KEY) === tag(word)
  } catch {
    return false
  }
}

function markOffered(word: string) {
  try {
    localStorage.setItem(LAST_KEY, tag(word))
  } catch {
    // Offered again next time; harmless.
  }
}

/** Clipboard reading already allowed (Chromium); elsewhere the browser would ask on every read, so no. */
async function clipboardGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName })
    return status.state === 'granted'
  } catch {
    return false
  }
}

/** Asked from the settings switch (a tap): the browser shows its permission prompt here. */
export async function askClipboard(): Promise<boolean> {
  try {
    await navigator.clipboard.readText()
    return true
  } catch {
    return false
  }
}

/** What to offer now, if anything. */
export async function clipboardSuggestion(lemmas: Iterable<string>): Promise<string | null> {
  if (!(await clipboardGranted())) return null
  const text = await navigator.clipboard.readText().catch(() => '')
  const word = clipboardCandidate(text, lemmas)
  if (!word || alreadyOffered(word)) return null
  markOffered(word)
  return word
}

/** The browser can say clipboard reading is allowed for good (Chromium: Chrome, Edge, Android). */
export async function clipboardSupported(): Promise<boolean> {
  if (!navigator.clipboard?.readText) return false
  try {
    await navigator.permissions.query({ name: 'clipboard-read' as PermissionName })
    return true
  } catch {
    return false
  }
}
