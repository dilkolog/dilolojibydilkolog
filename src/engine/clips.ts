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
