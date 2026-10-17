import { accessFetch, APPROVAL_MESSAGE, isApprovalRefusal } from '../../data/access'
import { lyricLines, type LyricLine } from '../../engine/lyrics'
import type { TargetLanguage } from '../../engine/types'
import { LANGUAGE_NAME } from '../labels'

export interface Song {
  id: string
  title: string
  channel: string
  /** Automatic captions: they can misspell, and say so. */
  auto: boolean
  lines: LyricLine[]
}

/** A video's captions in this language as lyric lines with their times; or why there are none (said in words). */
export async function fetchSong(link: string, language: TargetLanguage): Promise<{ song: Song } | { note: string }> {
  try {
    const res = await accessFetch(`/api/youtube?v=${encodeURIComponent(link.trim())}&lang=${language}&cues=1`)
    const j = (await res.json()) as { id?: string; title?: string; channel?: string; auto?: boolean; cues?: { start: number; end: number; text: string }[]; error?: string; available?: string[] }
    if (!res.ok || !j.cues?.length || !j.id) {
      return {
        note:
          j.error === 'no captions'
            ? `Bu videoda ${LANGUAGE_NAME[language]} altyazı yok${j.available?.length ? ` (olanlar: ${j.available.join(', ')})` : ''}.`
            : isApprovalRefusal(j.error)
              ? APPROVAL_MESSAGE
              : j.error === 'bad request'
                ? 'Bağlantı bir YouTube videosu gibi görünmüyor.'
                : 'Altyazı alınamadı; YouTube şu an izin vermiyor olabilir. Başka bir video dene.',
      }
    }
    const lines = lyricLines(j.cues)
    if (lines.length < 4) return { note: 'Bu videonun altyazısı çok kısa; sözlü bir şarkı ya da konuşma seç.' }
    return { song: { id: j.id, title: j.title ?? 'Video', channel: j.channel ?? '', auto: !!j.auto, lines } }
  } catch {
    return { note: 'Altyazı alınamadı; internet bağlantını kontrol et.' }
  }
}

/** The player page: the whole video, or one line of it (a second early, a second late), with YouTube's own captions off. */
export function songEmbed(id: string, line?: { start: number; end: number }): string {
  const range = line ? `&start=${Math.max(0, Math.floor(line.start - 1))}&end=${Math.ceil(line.end + 1)}&autoplay=1` : ''
  return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&cc_load_policy=0${range}`
}
