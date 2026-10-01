/**
 * Picture search on Wikimedia Commons: free, no API key, freely licensed images, and CORS-enabled,
 * so the browser can fetch and store the chosen picture for offline use.
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

export async function searchImages(query: string, limit = 18): Promise<ImageResult[]> {
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

export async function fetchImage(url: string): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Görsel indirilemedi.')
  return res.blob()
}
