import type { Clip } from '../engine/clips'
import type { TargetLanguage } from '../engine/types'
import { accessFetch } from './access'

/**
 * Where a word is spoken in YouTube videos, from /api/clips (api/clips.ts). A search uses part of a daily
 * quota, so the answer is kept on the device for a week: asking again is free.
 */
export type ClipsProblem = 'nokey' | 'quota' | 'unavailable' | 'approval'

export class ClipsError extends Error {
  problem: ClipsProblem
  constructor(problem: ClipsProblem) {
    super(problem)
    this.problem = problem
  }
}

const WEEK = 7 * 24 * 3600 * 1000
const keyOf = (word: string, language: TargetLanguage) => `kelime-koc:clips:${language}:${word.toLocaleLowerCase(language)}`

function cached(key: string, now: number): Clip[] | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as { at: number; clips: Clip[] } | null
    return saved && Array.isArray(saved.clips) && saved.clips.length > 0 && now - saved.at < WEEK ? saved.clips : undefined
  } catch {
    return undefined
  }
}

export async function fetchClips(word: string, language: TargetLanguage, now = Date.now(), fresh = false): Promise<Clip[]> {
  const key = keyOf(word, language)
  if (!fresh) {
    const saved = cached(key, now)
    if (saved) return saved
  }
  let res: Response
  try {
    res = await accessFetch(`/api/clips?q=${encodeURIComponent(word)}&lang=${language}`)
  } catch {
    throw new ClipsError('unavailable')
  }
  if (res.status === 403) throw new ClipsError('approval')
  if (res.status === 501) throw new ClipsError('nokey')
  if (res.status === 429) throw new ClipsError('quota')
  if (!res.ok) throw new ClipsError('unavailable')
  const { clips } = (await res.json()) as { clips: Clip[] }
  if (clips.length > 0) {
    try {
      localStorage.setItem(key, JSON.stringify({ at: now, clips }))
    } catch {
      // Not kept; the next look asks again.
    }
  }
  return clips
}
