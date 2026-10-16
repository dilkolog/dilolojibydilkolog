/**
 * A YouTube video's caption track, as timed-text XML: asked of YouTube's own player API (as its Android
 * app does): hand-made captions in the language first, automatic ones otherwise. Shared by
 * /api/youtube (subtitles as reading text) and /api/clips (where a word is spoken).
 */
interface Track {
  baseUrl: string
  languageCode: string
  kind?: string
}

const CLIENT = { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 34, hl: 'en' }

export interface Captions {
  xml: string
  auto: boolean
  title: string
  channel: string
}

export class CaptionError extends Error {
  detail: { status?: string; available?: string[] }
  constructor(message: 'no captions' | 'youtube unavailable', detail: { status?: string; available?: string[] } = {}) {
    super(message)
    this.detail = detail
  }
}

export async function fetchCaptions(id: string, lang: string): Promise<Captions> {
  const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': `com.google.android.youtube/${CLIENT.clientVersion} (Linux; U; Android 14) gzip` },
    body: JSON.stringify({ context: { client: CLIENT }, videoId: id }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new CaptionError('youtube unavailable')
  const player = (await res.json()) as {
    playabilityStatus?: { status?: string }
    videoDetails?: { title?: string; author?: string }
    captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: Track[] } }
  }
  const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
  const mine = tracks.filter((t) => t.languageCode.slice(0, 2) === lang)
  const track = mine.find((t) => t.kind !== 'asr') ?? mine[0]
  if (!track) throw new CaptionError('no captions', { status: player.playabilityStatus?.status, available: [...new Set(tracks.map((t) => t.languageCode))] })
  const trackRes = await fetch(track.baseUrl, {
    headers: { 'user-agent': `com.google.android.youtube/${CLIENT.clientVersion} (Linux; U; Android 14) gzip` },
    signal: AbortSignal.timeout(8000),
  })
  if (!trackRes.ok) throw new CaptionError('youtube unavailable')
  const xml = await trackRes.text()
  if (/^\s*<(?:!doctype\s+html|html)\b/i.test(xml)) throw new CaptionError('youtube unavailable')
  return { xml, auto: track.kind === 'asr', title: player.videoDetails?.title ?? 'YouTube', channel: player.videoDetails?.author ?? '' }
}
