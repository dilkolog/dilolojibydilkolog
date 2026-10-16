/**
 * Picture search on Wikimedia Commons, Openverse, and optional Pixabay HD:
 * free, CORS-enabled, and optimized for clean, relevant language-learning flashcards.
 * Commons handles encyclopedic subjects, Openverse everyday photos, and Pixabay
 * delivers crystal-clear studio photos and illustrations when an API key is configured.
 */
export interface ImageResult {
  thumbUrl: string
  title: string
  /** "Author, licence (Provider)". */
  credit: string
}

export const PIXABAY_KEY_STORAGE = 'diloloji:pixabay-key'

export function getPixabayKey(): string | null {
  try {
    return localStorage.getItem(PIXABAY_KEY_STORAGE)?.trim() || null
  } catch {
    return null
  }
}

export function setPixabayKey(key: string | null): void {
  try {
    if (key && key.trim()) {
      localStorage.setItem(PIXABAY_KEY_STORAGE, key.trim())
    } else {
      localStorage.removeItem(PIXABAY_KEY_STORAGE)
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/** Queries Pixabay for high-definition stock photos and vectors. */
export async function searchPixabay(query: string, apiKey: string, limit = 18): Promise<ImageResult[]> {
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    image_type: 'photo',
    safesearch: 'true',
    per_page: String(Math.min(limit, 30)),
  })
  const res = await fetch(`https://pixabay.com/api/?${params}`)
  if (!res.ok) throw new Error(`Pixabay araması başarısız oldu (${res.status}).`)
  const data = (await res.json()) as { hits?: { webformatURL?: string; previewURL?: string; tags?: string; user?: string }[] }
  return (data.hits ?? []).flatMap((h) => {
    const url = h.webformatURL || h.previewURL
    if (!url) return []
    return [{
      thumbUrl: url,
      title: h.tags || query,
      credit: `${h.user || 'Pixabay'} (Pixabay)`,
    }]
  })
}

const API = 'https://commons.wikimedia.org/w/api.php'

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

interface CommonsPage {
  title: string
  index: number
  imageinfo?: { thumburl?: string; extmetadata?: { Artist?: { value: string }; LicenseShortName?: { value: string } } }[]
}

const NOISY_TITLE_PATTERN = /\b(band|album|song|single|rock band|festival|popkomm|roskilde|census|gravestone|cemetery|grave|tomb|stamp|coin|postage|signature|patent|specimen|manuscript|smith \^ nephew|smith & nephew)\b/i

async function searchCommons(query: string, limit: number): Promise<ImageResult[]> {
  const cleanQ = query.replace(/[^\p{L}\p{N}\s_-]/gu, '').trim()
  const excludedKeywords = '-band -album -song -portrait -census -map -stamp -coin -patent -document -specimen -sign'
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: `${cleanQ} ${excludedKeywords} filetype:bitmap`,
    gsrlimit: String(Math.min(limit * 2, 40)),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiextmetadatafilter: 'Artist|LicenseShortName',
    iiurlwidth: '480',
  })
  const res = await fetch(`${API}?${params}`)
  if (!res.ok) throw new Error(`Görsel araması başarısız oldu (${res.status}).`)
  const data = (await res.json()) as { query?: { pages?: Record<string, CommonsPage> } }
  
  const queryLower = query.toLowerCase()
  return Object.values(data.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .flatMap((p) => {
      const info = p.imageinfo?.[0]
      if (!info?.thumburl) return []
      const cleanTitle = p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '')
      // Discard noisy titles unless the user explicitly searched for that term
      if (NOISY_TITLE_PATTERN.test(cleanTitle) && !queryLower.includes('band') && !queryLower.includes('stamp') && !queryLower.includes('coin')) {
        return []
      }
      const artist = stripHtml(info.extmetadata?.Artist?.value ?? '')
      const license = info.extmetadata?.LicenseShortName?.value ?? ''
      return [{
        thumbUrl: info.thumburl,
        title: cleanTitle,
        credit: [artist, license].filter(Boolean).join(', ') + ' (Wikimedia Commons)',
      }]
    })
    .slice(0, limit)
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

/**
 * Searches image providers. If Pixabay API key is configured, Pixabay is prioritized.
 * Otherwise, Wikimedia Commons and Openverse are interleaved with smart noise filtering.
 */
export async function searchImages(query: string, limit = 18): Promise<ImageResult[]> {
  const pixabayKey = getPixabayKey()
  if (pixabayKey) {
    try {
      const pixResults = await searchPixabay(query, pixabayKey, limit)
      if (pixResults.length > 0) return pixResults
    } catch {
      // Fallback to commons and openverse if Pixabay query fails or rate-limits
    }
  }

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
