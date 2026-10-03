/**
 * Picture search on Wikimedia Commons and Openverse (openly licensed images from Flickr, museums
 * and others): free, no API key, and CORS-enabled, so the browser can fetch and store the chosen
 * picture for offline use. Commons is strong on encyclopedic subjects, Openverse on everyday
 * photos; results from both are interleaved.
 */
export interface ImageResult {
  thumbUrl: string
  title: string
  /** "Author, licence (Wikimedia Commons)". */
  credit: string
}

const API = 'https://commons.wikimedia.org/w/api.php'

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

interface CommonsPage {
  title: string
  index: number
  imageinfo?: { thumburl?: string; extmetadata?: { Artist?: { value: string }; LicenseShortName?: { value: string } } }[]
}

async function searchCommons(query: string, limit: number): Promise<ImageResult[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: `${query} filetype:bitmap`,
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiextmetadatafilter: 'Artist|LicenseShortName',
    iiurlwidth: '480',
  })
  const res = await fetch(`${API}?${params}`)
  if (!res.ok) throw new Error(`Görsel araması başarısız oldu (${res.status}).`)
  const data = (await res.json()) as { query?: { pages?: Record<string, CommonsPage> } }
  return Object.values(data.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .flatMap((p) => {
      const info = p.imageinfo?.[0]
      if (!info?.thumburl) return []
      const artist = stripHtml(info.extmetadata?.Artist?.value ?? '')
      const license = info.extmetadata?.LicenseShortName?.value ?? ''
      return [{
        thumbUrl: info.thumburl,
        title: p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
        credit: [artist, license].filter(Boolean).join(', ') + ' (Wikimedia Commons)',
      }]
    })
}

const OPENVERSE = 'https://api.openverse.org/v1/images/'

interface OpenversePhoto {
  id: string
  title?: string
  creator?: string
  license: string
  license_version?: string
  thumbnail?: string
  provider?: string
}

/** Openverse allows anonymous use (20 searches a minute); its thumbnails are served with CORS. */
async function searchOpenverse(query: string, limit: number): Promise<ImageResult[]> {
  const params = new URLSearchParams({ q: query, page_size: String(Math.min(limit, 20)), mature: 'false' })
  const res = await fetch(`${OPENVERSE}?${params}`)
  if (!res.ok) throw new Error(`Görsel araması başarısız oldu (${res.status}).`)
  const data = (await res.json()) as { results?: OpenversePhoto[] }
  return (data.results ?? []).flatMap((p) => {
    if (!p.thumbnail) return []
    const license = p.license === 'cc0' || p.license === 'pdm' ? p.license.toUpperCase() : `CC ${p.license.toUpperCase()} ${p.license_version ?? ''}`.trim()
    return [{ thumbUrl: p.thumbnail, title: p.title ?? query, credit: [p.creator, license].filter(Boolean).join(', ') + ` (Openverse${p.provider ? ` · ${p.provider}` : ''})` }]
  })
}

/** Both sources at once, alternating; one failing (offline, rate limit) leaves the other. */
export async function searchImages(query: string, limit = 18): Promise<ImageResult[]> {
  const half = Math.ceil(limit / 2)
  const [commons, openverse] = await Promise.allSettled([searchCommons(query, half), searchOpenverse(query, half)])
  if (commons.status === 'rejected' && openverse.status === 'rejected') throw commons.reason
  const a = commons.status === 'fulfilled' ? commons.value : []
  const b = openverse.status === 'fulfilled' ? openverse.value : []
  const out: ImageResult[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) out.push(...(b[i] ? [b[i]] : []), ...(a[i] ? [a[i]] : []))
  return out.slice(0, limit)
}

export async function fetchImage(url: string): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Görsel indirilemedi.')
  return res.blob()
}
