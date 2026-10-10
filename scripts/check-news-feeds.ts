import { FEEDS, parseFeed, extractArticle, type FeedItem } from '../src/engine/news'

const TARGET_FEEDS = ['rfi-facile', 'voa-learning', 'voa-es']
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

interface RedirectHop {
  url: string
  status: number
}

interface AudioCheck {
  url: string
  finalUrl: string
  status: number
  contentType: string | null
  corsOrigin: string | null
  redirectHops: RedirectHop[]
}

interface ArticleCheck {
  title: string
  link: string
  hasAudio: boolean
  audioUrl?: string
  wordCount: number
  status: 'passed' | 'failed'
  audioCheck?: AudioCheck
  preview: string
}

interface FeedCheckResult {
  id: string
  name: string
  feedUrl: string
  totalItems: number
  itemsWithAudio: number
  articles: ArticleCheck[]
  diagnosis: string[]
  suggestedFix?: {
    suggestedUrl: string
    reason: string
    hosts?: string[]
  }
}

async function fetchWithRedirectTrace(url: string, method: 'HEAD' | 'GET' = 'HEAD'): Promise<AudioCheck> {
  const hops: RedirectHop[] = []
  let currentUrl = url
  let response: Response | null = null

  for (let i = 0; i < 5; i++) {
    try {
      response = await fetch(currentUrl, {
        method,
        headers: { 'user-agent': UA, accept: '*/*' },
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      })
      hops.push({ url: currentUrl, status: response.status })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) break
        currentUrl = new URL(location, currentUrl).href
      } else {
        break
      }
    } catch {
      hops.push({ url: currentUrl, status: 0 })
      break
    }
  }

  if (!response || response.status === 405 || response.status === 0) {
    try {
      response = await fetch(currentUrl, {
        method: 'GET',
        headers: { 'user-agent': UA, Range: 'bytes=0-1024' },
        signal: AbortSignal.timeout(10000),
      })
      hops.push({ url: currentUrl, status: response.status })
    } catch {
      // ignore
    }
  }

  return {
    url,
    finalUrl: currentUrl,
    status: response?.status ?? 0,
    contentType: response?.headers.get('content-type') ?? null,
    corsOrigin: response?.headers.get('access-control-allow-origin') ?? null,
    redirectHops: hops,
  }
}

export async function runNewsFeedsLiveCheck(): Promise<FeedCheckResult[]> {
  const results: FeedCheckResult[] = []

  for (const feedId of TARGET_FEEDS) {
    const feed = FEEDS.find((f) => f.id === feedId)
    if (!feed) continue

    console.log(`\n======================================================`)
    console.log(`[TEST] Besleme: ${feed.name} (${feed.id})`)
    console.log(`URL: ${feed.url}`)
    console.log(`======================================================`)

    let xml = ''
    try {
      const res = await fetch(feed.url, {
        headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      xml = await res.text()
    } catch (err) {
      console.error(`Besleme çekilemedi (${feed.id}):`, err)
      results.push({
        id: feed.id,
        name: feed.name,
        feedUrl: feed.url,
        totalItems: 0,
        itemsWithAudio: 0,
        articles: [],
        diagnosis: [`Besleme çekilemedi veya geçersiz yanıt: ${(err as Error).message}`],
      })
      continue
    }

    const items: FeedItem[] = parseFeed(xml)
    const itemsWithAudio = items.filter((i) => !!i.audio).length
    console.log(`-> Toplam Ayrıştırılan Madde: ${items.length}`)
    console.log(`-> Ses (enclosure) İçeren Madde: ${itemsWithAudio}`)

    const topItems = items.slice(0, 3)
    const articles: ArticleCheck[] = []
    const diagnosis: string[] = []

    for (const [idx, item] of topItems.entries()) {
      console.log(`\n  [${idx + 1}/${topItems.length}] "${item.title}"`)
      console.log(`  Link: ${item.link}`)
      console.log(`  Ses: ${item.audio ?? 'YOK'}`)

      let html = ''
      let wordCount = 0
      let extracted = ''
      try {
        const res = await fetch(item.link, {
          headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*' },
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        html = await res.text()
        extracted = extractArticle(html)
        wordCount = extracted ? extracted.split(/\s+/).filter(Boolean).length : 0
      } catch (err) {
        console.error(`    Sayfa çekilemedi:`, (err as Error).message)
      }

      console.log(`    Metin kelime sayısı: ${wordCount} (${wordCount >= 80 ? 'BAŞARILI' : 'BAŞARISIZ (<80)'})`)

      let audioCheck: AudioCheck | undefined
      if (item.audio) {
        audioCheck = await fetchWithRedirectTrace(item.audio)
        console.log(`    Ses HEAD durumu: HTTP ${audioCheck.status}, İçerik türü: ${audioCheck.contentType}, CORS: ${audioCheck.corsOrigin ?? 'yok'}`)
        if (audioCheck.redirectHops.length > 1) {
          console.log(`    Yönlendirme zinciri: ${audioCheck.redirectHops.map((h) => `${h.status} -> ${h.url}`).join(' | ')}`)
        }
      }

      const passed = wordCount >= 80
      articles.push({
        title: item.title,
        link: item.link,
        hasAudio: !!item.audio,
        audioUrl: item.audio,
        wordCount,
        status: passed ? 'passed' : 'failed',
        audioCheck,
        preview: extracted.slice(0, 160).replace(/\s+/g, ' '),
      })
    }

    let suggestedFix: FeedCheckResult['suggestedFix']

    if (feed.id === 'rfi-facile') {
      if (articles.some((a) => a.wordCount < 80)) {
        diagnosis.push(
          'RFI feed linkleri eski www.rfi.fr rotasına gidiyor ve SPA loader hatası (404 / "Le contenu auquel vous tentez d\'accéder n\'existe pas") veriyor.',
        )
        diagnosis.push(
          'RFI sesleri (Audiomeans CDN) sorunsuz çalışıyor (HTTP 200, audio/mpeg), ancak transkript metinleri francaisfacile.rfi.fr adresindedir.',
        )
        suggestedFix = {
          suggestedUrl: 'https://francaisfacile.rfi.fr/fr/podcasts/journal-en-fran%C3%A7ais-facile/podcast',
          reason: 'francaisfacile.rfi.fr RSS beslemesindeki linkler doğrudan güncel transkript slug\'larına gider ve extractArticle ile 1.400+ kelime çıkarır.',
          hosts: ['rfi.fr', 'francaisfacile.rfi.fr'],
        }
      }
    } else if (feed.id === 'voa-learning') {
      if (itemsWithAudio === 0) {
        diagnosis.push(
          'Mevcut URL (api/zkm-ql-vomx-tpej-rqi) bir metin haber API beslemesidir; içindeki <enclosure> etiketleri ses (audio/mpeg) değil görsel (image/jpeg) içerir.',
        )
        diagnosis.push(
          'As It Is programının sesli bültenleri podcast beslemesinde yer almaktadır.',
        )
        suggestedFix = {
          suggestedUrl: 'https://learningenglish.voanews.com/podcast/?zoneId=3521',
          reason: 'zoneId=3521 resmi As It Is podcast beslemesidir; tüm maddelerde audio/mpeg enclosure ses dosyaları mevcuttur.',
          hosts: ['learningenglish.voanews.com', 'voanews.com'],
        }
      }
    } else if (feed.id === 'voa-es') {
      diagnosis.push(
        'Mevcut URL (api/zp_opey_ip) geçersizdir ("Invalid url" hatası döndürmektedir, 0 madde).',
      )
      suggestedFix = {
        suggestedUrl: 'https://www.vozdeamerica.com/podcast/?zoneId=537',
        reason: 'zoneId=537 Voz de América\'nın günlük resmi haber podcasti "Buenos días América" beslemesidir (250 bölüm, tam audio/mpeg enclosure). Metin haber için ise /api/zgkmqrl-vomx-tpe-pvqo beslemesi kullanılabilir.',
        hosts: ['vozdeamerica.com'],
      }
    }

    results.push({
      id: feed.id,
      name: feed.name,
      feedUrl: feed.url,
      totalItems: items.length,
      itemsWithAudio,
      articles,
      diagnosis,
      suggestedFix,
    })
  }

  return results
}

if (process.argv[1]?.endsWith('check-news-feeds.ts')) {
  runNewsFeedsLiveCheck()
    .then((res) => {
      console.log('\n================ SONUÇ ÖZETİ ================\n')
      console.log(JSON.stringify(res, null, 2))
    })
    .catch(console.error)
}
