import { parseTimedText, youtubeId } from '../src/engine/subtitles.js'
import { CaptionError, fetchCaptions } from './_captions.js'
import { requireApproved } from './_account.js'
import { fromApp } from './_origin.js'

/**
 * GET /api/youtube?v=<link or id>&lang=fr: a video's subtitles as reading text (hand-made subtitles in
 * the language first, automatic ones otherwise; see _captions.ts).
 */
export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const denied = await requireApproved(request)
  if (denied) return denied
  const q = new URL(request.url).searchParams
  const id = youtubeId(q.get('v') ?? '')
  const lang = (q.get('lang') ?? '').slice(0, 2)
  if (!id || !/^(en|fr|es)$/.test(lang)) return Response.json({ error: 'bad request' }, { status: 400 })
  try {
    const captions = await fetchCaptions(id, lang)
    const text = parseTimedText(captions.xml)
    if (!text) return Response.json({ error: 'empty captions' }, { status: 502 })
    return Response.json(
      { id, title: captions.title, channel: captions.channel, auto: captions.auto, text },
      { headers: { 'cache-control': 'private, max-age=86400' } },
    )
  } catch (e) {
    if (e instanceof CaptionError && e.message === 'no captions') return Response.json({ error: 'no captions', ...e.detail }, { status: 404 })
    return Response.json({ error: 'youtube unavailable' }, { status: 502 })
  }
}
