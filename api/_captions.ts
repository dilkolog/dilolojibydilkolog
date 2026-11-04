/**
 * A YouTube video's caption track, as timed-text XML, asked of YouTube's own player API the way its apps ask:
 * hand-made captions in the language first, automatic ones otherwise. Shared by /api/youtube (subtitles as
 * reading text) and /api/clips (where a word is spoken).
 *
 * YouTube often answers requests from cloud servers (this one runs on Cloudflare) as from a bot: no caption
 * list at all, or a track that comes back empty. Several of its app clients are tried in turn, and when none
 * gives captions the error says whether the video has none in that language or YouTube would not tell.
 */
interface Track {
  baseUrl: string
  languageCode: string
  kind?: string
}

interface Client {
  name: string
  context: Record<string, unknown>
  userAgent: string
  /** Embedded players say which page they sit on. */
  thirdParty?: boolean
}

export const CLIENTS: Client[] = [
  {
    name: 'ANDROID',
    context: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 34, hl: 'en' },
    userAgent: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
  },
  {
    name: 'IOS',
    context: { clientName: 'IOS', clientVersion: '20.10.4', deviceMake: 'Apple', deviceModel: 'iPhone16,2', osName: 'iPhone', osVersion: '18.3.2.22D82', hl: 'en' },
    userAgent: 'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)',
  },
  {
    name: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
    context: { clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0', hl: 'en' },
    userAgent: 'Mozilla/5.0 (PlayStation; PlayStation 5/2.26) AppleWebKit/605.1.15 (KHTML, like Gecko)',
    thirdParty: true,
  },
]

/** Each ask of YouTube may take this long; a few are made in turn. */
const ASK_MS = 6000

export interface Captions {
  xml: string
  auto: boolean
  title: string
  channel: string
}

/** What one client was told, for the log and the error (no video data, only YouTube's answer). */
export interface Tried {
  client: string
  status?: string
  reason?: string
  tracks: number
  empty?: boolean
}

export class CaptionError extends Error {
  detail: { status?: string; available?: string[]; tried?: Tried[] }
  constructor(message: 'no captions' | 'youtube blocked' | 'youtube unavailable', detail: { status?: string; available?: string[]; tried?: Tried[] } = {}) {
    super(message)
    this.detail = detail
  }
}

interface Player {
  playabilityStatus?: { status?: string; reason?: string }
  videoDetails?: { title?: string; author?: string }
  captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: Track[] } }
}

async function askPlayer(id: string, client: Client): Promise<Player | null> {
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': client.userAgent },
      body: JSON.stringify({
        context: { client: client.context, ...(client.thirdParty ? { thirdParty: { embedUrl: 'https://www.youtube.com/' } } : {}) },
        videoId: id,
        contentCheckOk: true,
        racyCheckOk: true,
      }),
      signal: AbortSignal.timeout(ASK_MS),
    })
    return res.ok ? ((await res.json()) as Player) : null
  } catch {
    return null
  }
}

async function trackXml(track: Track): Promise<string | null> {
  try {
    const res = await fetch(track.baseUrl, { signal: AbortSignal.timeout(ASK_MS) })
    if (!res.ok) return null
    const xml = await res.text()
    // An HTML page (a consent or "are you a bot" page) or nothing at all is no track.
    if (!xml.trim() || /^\s*<(?:!doctype\s+html|html)\b/i.test(xml)) return null
    return xml
  } catch {
    return null
  }
}

export async function fetchCaptions(id: string, lang: string, clients: readonly Client[] = CLIENTS): Promise<Captions> {
  const tried: Tried[] = []
  const available = new Set<string>()
  for (const client of clients) {
    const player = await askPlayer(id, client)
    if (!player) {
      tried.push({ client: client.name, tracks: 0, status: 'no answer' })
      continue
    }
    const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
    for (const t of tracks) available.add(t.languageCode)
    const note: Tried = { client: client.name, status: player.playabilityStatus?.status, reason: player.playabilityStatus?.reason?.slice(0, 120), tracks: tracks.length }
    tried.push(note)
    const mine = tracks.filter((t) => t.languageCode.slice(0, 2) === lang)
    const track = mine.find((t) => t.kind !== 'asr') ?? mine[0]
    if (!track) continue
    const xml = await trackXml(track)
    if (!xml) {
      note.empty = true
      continue
    }
    return { xml, auto: track.kind === 'asr', title: player.videoDetails?.title ?? 'YouTube', channel: player.videoDetails?.author ?? '' }
  }
  // Some client listed the video's tracks and none is in this language: the video really has none.
  if (available.size && !tried.some((t) => t.empty)) throw new CaptionError('no captions', { available: [...available], tried })
  console.warn('[captions]', JSON.stringify({ id, lang, tried }))
  throw new CaptionError('youtube blocked', { status: tried.find((t) => t.status && t.status !== 'OK')?.status, available: [...available], tried })
}
