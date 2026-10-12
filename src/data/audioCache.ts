import { mediaBlob } from './db'
import { db } from './instance'
import { md5 } from './wordInfo'

/**
 * Native-speaker recordings (Wiktionary/Commons) kept on the device after the first play or an
 * offline-pack download, so words keep their real voice without internet. Like cached TTS,
 * they can be fetched again, so they stay out of backups and sync.
 */

export const cacheKey = (url: string) => `aud:${md5(url).slice(0, 24)}`

/** Media that can be re-created (cached TTS and recordings): left out of backup and sync. */
export const isCacheMedia = (id: string) => id.startsWith('tts:') || id.startsWith('aud:')

const urls = new Map<string, string>()

/** Already loaded into memory: playable straight away (keeps Safari's tap-to-play chain). */
export const readyAudio = (url: string) => urls.get(url)

/** The local copy's object URL, if there is one. */
export async function cachedAudio(url: string): Promise<string | undefined> {
  const ready = urls.get(url)
  if (ready) return ready
  const row = await db.media.get(cacheKey(url))
  if (!row) return undefined
  const local = URL.createObjectURL(mediaBlob(row))
  urls.set(url, local)
  return local
}

/** Downloads and keeps a recording; false when it can't (offline, or the host forbids it). */
export async function cacheAudio(url: string): Promise<boolean> {
  if (await db.media.get(cacheKey(url))) return true
  try {
    const res = await fetch(url)
    if (!res.ok) return false
    const data = await res.arrayBuffer()
    await db.media.put({ id: cacheKey(url), kind: 'audio', data, type: res.headers.get('content-type') ?? 'audio/mpeg', createdAt: new Date() })
    return true
  } catch {
    return false
  }
}

/** Whether a local copy of this recording is kept. */
export async function hasCachedAudio(url: string): Promise<boolean> {
  try {
    return !!(await db.media.get(cacheKey(url)))
  } catch {
    return false
  }
}

/** Takes the local copy away (a library text's audio the learner no longer wants on the device). */
export async function uncacheAudio(url: string): Promise<void> {
  const local = urls.get(url)
  if (local) URL.revokeObjectURL(local)
  urls.delete(url)
  try {
    await db.media.delete(cacheKey(url))
  } catch {
    // Nothing kept, nothing to take away.
  }
}

/**
 * Downloads a long recording (an episode, an audiobook chapter) with its progress (0–1, or null when the
 * size is not told) and keeps it for offline listening. False when it can't: offline, or the host forbids it.
 */
export async function cacheAudioWithProgress(url: string, onProgress?: (share: number | null) => void): Promise<boolean> {
  if (await hasCachedAudio(url)) return true
  try {
    const res = await fetch(url)
    if (!res.ok || !res.body) return false
    const total = Number(res.headers.get('content-length')) || 0
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let got = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      got += value.length
      onProgress?.(total ? Math.min(1, got / total) : null)
    }
    const data = new Uint8Array(got)
    let at = 0
    for (const c of chunks) {
      data.set(c, at)
      at += c.length
    }
    await db.media.put({ id: cacheKey(url), kind: 'audio', data: data.buffer, type: res.headers.get('content-type') ?? 'audio/mpeg', createdAt: new Date() })
    onProgress?.(1)
    return true
  } catch {
    return false
  }
}

/** Loads local copies into memory ahead of a session. */
export function warmAudio(urlsToWarm: readonly (string | undefined)[]) {
  for (const u of urlsToWarm) if (u) void cachedAudio(u)
}
