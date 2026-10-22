import { parseTimedCues } from '../src/engine/clips.js'
import { parseTimedText, youtubeId } from '../src/engine/subtitles.js'
import { CaptionError, fetchCaptions } from './_captions.js'
import { requireApproved } from './_account.js'
import { overLimit, tooMany } from './_rate.js'
import { dailyQuotaReached, overDaily } from './_quota.js'
import { fromApp } from './_origin.js'

/**
 * GET /api/youtube?v=<link or id>&lang=fr: a video's subtitles as reading text (hand-made subtitles in
 * the language first, automatic ones otherwise; see _captions.ts). With `cues=1` the lines come with their
 * times too (to sing along with a song's captions).
 */
export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return Response.json({ error: 'forbidden' }, { status: 403 })
  const denied = await requireApproved(request)
  if (denied) return denied
  // Each call fetches from other sites: a brake per address, and a daily allowance per account.
  if (overLimit(request, 'youtube', 10)) return tooMany()
  if (await overDaily(request, 'youtube')) return dailyQuotaReached()
  const q = new URL(request.url).searchParams
  const id = youtubeId(q.get('v') ?? '')
  const lang = (q.get('lang') ?? '').slice(0, 2)
  if (!id || !/^(en|fr|es)$/.test(lang)) return Response.json({ error: 'bad request' }, { status: 400 })
  try {
    const captions = await fetchCaptions(id, lang)
    const text = parseTimedText(captions.xml)
    if (!text) return Response.json({ error: 'empty captions' }, { status: 502 })
    const cues = q.get('cues') === '1' ? parseTimedCues(captions.xml).map((c) => ({ start: Math.round(c.start * 10) / 10, end: Math.round(c.end * 10) / 10, text: c.text })) : undefined
    return Response.json(
      { id, title: captions.title, channel: captions.channel, auto: captions.auto, text, ...(cues ? { cues } : {}) },
      { headers: { 'cache-control': 'private, max-age=86400' } },
    )
  } catch (e) {
    if (e instanceof CaptionError && e.message === 'no captions') return Response.json({ error: 'no captions', ...e.detail }, { status: 404 })
    return Response.json({ error: 'youtube unavailable' }, { status: 502 })
  }
}
