import { formIn } from './inflection.js'
import { cleanCue } from './subtitles.js'
import type { TargetLanguage } from './types.js'

/**
 * Where a word is spoken in real videos (YouGlish-style): the captions of YouTube videos are searched
 * for the word, and each hit is a line with its time, so the video can start a second before it.
 */
export interface Cue {
  /** Seconds from the start of the video. */
  start: number
  end: number
  text: string
}

export interface Clip {
  id: string
  title: string
  channel: string
  start: number
  end: number
  /** The caption line with the word in it, and the form it took ("décidé" for décider). */
  text: string
  form: string
  /** The line before and after, for context. */
  before?: string
  after?: string
  /** Automatic captions: they can misspell. */
  auto?: boolean
}

const ENTITY: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ' }
const decode = (s: string) => s.replace(/&(#?\w+);/g, (e, n: string) => ENTITY[n] ?? (n.startsWith('#') ? String.fromCodePoint(Number(n.slice(1))) : e))

/** YouTube's timed-text XML (format 3: <p t="ms" d="ms">…</p>) as lines with their times. */
export function parseTimedCues(xml: string): Cue[] {
  const cues: Cue[] = []
  for (const m of xml.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
    const t = Number(/\bt="(\d+)"/.exec(m[1])?.[1])
    const d = Number(/\bd="(\d+)"/.exec(m[1])?.[1])
    if (!Number.isFinite(t)) continue
    const text = cleanCue(decode(m[2].replace(/<[^>]+>/g, '')))
    if (!text) continue
    cues.push({ start: t / 1000, end: (t + (Number.isFinite(d) ? d : 2000)) / 1000, text })
  }
  return cues
}

/** The lines of a video that contain the word (in any form of it), at most `max`, each with its neighbours. */
export function findClips(cues: readonly Cue[], word: string, language: TargetLanguage, video: Pick<Clip, 'id' | 'title' | 'channel' | 'auto'>, max = 2): Clip[] {
  const out: Clip[] = []
  const seen = new Set<string>()
  for (let i = 0; i < cues.length && out.length < max; i++) {
    const text = cues[i].text
    const form = formIn(text, word, language)
    if (!form || seen.has(text) || text.length > 160) continue
    seen.add(text)
    out.push({ ...video, start: cues[i].start, end: cues[i].end, text, form, before: cues[i - 1]?.text, after: cues[i + 1]?.text })
  }
  return out
}

/** The player page for a clip: it starts a second early and stops a second late, with captions on in the language. */
export function embedUrl(clip: Pick<Clip, 'id' | 'start' | 'end'>, language: TargetLanguage): string {
  const start = Math.max(0, Math.floor(clip.start - 1))
  const end = Math.ceil(clip.end + 1)
  return `https://www.youtube-nocookie.com/embed/${clip.id}?start=${start}&end=${end}&autoplay=1&playsinline=1&rel=0&cc_load_policy=1&cc_lang_pref=${language}`
}

/** The line split around the word as found: [before, word, after]; the whole line when it is not found. */
export function splitAround(text: string, form: string): [string, string, string] {
  const i = text.indexOf(form)
  return i < 0 ? [text, '', ''] : [text.slice(0, i), form, text.slice(i + form.length)]
}

export interface YouglishHit {
  id: string
  start: number
  end: number
  text: string
  form: string
}

const JS_ESCAPES: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', "'": "'", '"': '"', '\\': '\\' }

function unescapeJsSingleQuoted(raw: string): string {
  return raw.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, esc: string) => {
    if (esc[0] === 'u' || esc[0] === 'x') return String.fromCharCode(parseInt(esc.slice(1), 16))
    return JS_ESCAPES[esc] ?? esc
  })
}

/** Loose whole-word match when `formIn` does not recognize an irregular or multi-word form. */
function looseFormIn(text: string, word: string): string | undefined {
  const target = word.trim()
  if (!target) return undefined
  const lower = text.toLocaleLowerCase()
  const needle = target.toLocaleLowerCase()
  let from = 0
  while (from <= lower.length - needle.length) {
    const idx = lower.indexOf(needle, from)
    if (idx < 0) return undefined
    const before = idx > 0 ? lower[idx - 1] : ''
    const after = idx + needle.length < lower.length ? lower[idx + needle.length] : ''
    if (!/[\p{L}\p{N}-]/u.test(before) && !/[\p{L}\p{N}-]/u.test(after)) {
      return text.slice(idx, idx + target.length)
    }
    from = idx + 1
  }
  return undefined
}

/**
 * Extracts curated video caption clips from YouGlish's page payload (`params.jsonData = '...'`),
 * keeping up to `perVideo` clips per video and `max` overall, prioritizing strict `formIn` matches.
 */
export function parseYouglishClips(html: string, word: string, language: TargetLanguage, max = 12, perVideo = 2): YouglishHit[] {
  const m = html.match(/params\.jsonData\s*=\s*'((?:\\[\s\S]|[^'])*)'/)
  if (!m) return []
  let results: { vid?: string; start?: string | number; end?: string | number; display?: string; ban?: string; src?: string }[]
  try {
    const parsed = JSON.parse(unescapeJsSingleQuoted(m[1])) as { results?: typeof results }
    results = Array.isArray(parsed.results) ? parsed.results : []
  } catch {
    return []
  }
  const strict: YouglishHit[] = []
  const loose: YouglishHit[] = []
  const seenText = new Set<string>()
  const perVidCount = new Map<string, number>()

  for (const it of results) {
    if (!it || typeof it.vid !== 'string' || !/^[\w-]{11}$/.test(it.vid) || typeof it.display !== 'string') continue
    if (it.ban === '1' || (it.src && it.src !== 'YT')) continue
    const used = perVidCount.get(it.vid) ?? 0
    if (used >= perVideo) continue
    const text = cleanCue(decode(it.display))
    if (!text || text.length > 180 || seenText.has(text)) continue
    const start = Number(it.start)
    if (!Number.isFinite(start) || start < 0) continue
    const rawEnd = Number(it.end)
    const end = Math.max(start + 2, Number.isFinite(rawEnd) && rawEnd > start ? rawEnd + 1 : start + 4)

    const exact = formIn(text, word, language)
    if (exact) {
      seenText.add(text)
      perVidCount.set(it.vid, used + 1)
      strict.push({ id: it.vid, start, end, text, form: exact })
      if (strict.length >= max) break
      continue
    }
    const fallback = looseFormIn(text, word)
    if (fallback) {
      seenText.add(text)
      perVidCount.set(it.vid, used + 1)
      loose.push({ id: it.vid, start, end, text, form: fallback })
    }
  }
  return [...strict, ...loose].slice(0, max)
}

/** Extracts video items from YouTube's Innertube `/youtubei/v1/search` response tree. */
export function parseInnertubeSearch(data: unknown, max = 6): { id: string; title: string; channel: string }[] {
  const items: { id: string; title: string; channel: string }[] = []
  const seen = new Set<string>()
  const readRuns = (v: unknown): string => {
    if (!v || typeof v !== 'object') return ''
    const obj = v as { simpleText?: unknown; runs?: { text?: unknown }[] }
    if (typeof obj.simpleText === 'string') return obj.simpleText
    if (Array.isArray(obj.runs)) return obj.runs.map((r) => (typeof r?.text === 'string' ? r.text : '')).join('')
    return ''
  }
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object' || items.length >= max) return
    const rec = node as Record<string, unknown>
    const vr = rec.videoRenderer as Record<string, unknown> | undefined
    if (vr && typeof vr.videoId === 'string' && /^[\w-]{11}$/.test(vr.videoId) && !seen.has(vr.videoId)) {
      seen.add(vr.videoId)
      const title = readRuns(vr.title) || 'YouTube'
      const channel = readRuns(vr.ownerText) || readRuns(vr.longBylineText) || readRuns(vr.shortBylineText)
      items.push({ id: vr.videoId, title, channel })
      if (items.length >= max) return
    }
    for (const v of Object.values(rec)) walk(v)
  }
  walk(data)
  return items
}

