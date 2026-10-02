import { parseTimedText, youtubeId } from '../src/engine/subtitles.js'

/**
 * GET /api/youtube?v=<link or id>&lang=fr: a video's subtitles as reading text. Asks YouTube's
 * own player API (as its Android app does) for the caption tracks: hand-made subtitles in the
 * language first, automatic ones otherwise.
 */
interface Track {
  baseUrl: string
  languageCode: string
  kind?: string
  name?: { runs?: { text: string }[]; simpleText?: string }
}

const CLIENT = { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 34, hl: 'en' }

export async function GET(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams
  const id = youtubeId(q.get('v') ?? '')
  const lang = (q.get('lang') ?? '').slice(0, 2)
  if (!id || !/^(en|fr|es)$/.test(lang)) return Response.json({ error: 'bad request' }, { status: 400 })
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': `com.google.android.youtube/${CLIENT.clientVersion} (Linux; U; Android 14) gzip` },
      body: JSON.stringify({ context: { client: CLIENT }, videoId: id }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return Response.json({ error: 'youtube unavailable' }, { status: 502 })
    const player = (await res.json()) as {
      playabilityStatus?: { status?: string }
      videoDetails?: { title?: string; author?: string }
      captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: Track[] } }
    }
    const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
    const mine = tracks.filter((t) => t.languageCode.slice(0, 2) === lang)
    const track = mine.find((t) => t.kind !== 'asr') ?? mine[0]
    if (!track) {
      return Response.json(
        { error: 'no captions', status: player.playabilityStatus?.status, available: [...new Set(tracks.map((t) => t.languageCode))] },
        { status: 404 },
      )
    }
    const xml = await (await fetch(track.baseUrl, { signal: AbortSignal.timeout(8000) })).text()
    const text = parseTimedText(xml)
    if (!text) return Response.json({ error: 'empty captions' }, { status: 502 })
    return Response.json(
      { id, title: player.videoDetails?.title ?? 'YouTube', channel: player.videoDetails?.author ?? '', auto: track.kind === 'asr', text },
      { headers: { 'cache-control': 'public, s-maxage=86400' } },
    )
  } catch {
    return Response.json({ error: 'youtube unavailable' }, { status: 502 })
  }
}
