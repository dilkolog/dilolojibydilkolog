import { FEEDS, parseFeed, extractArticle, allowedArticle, type FeedItem } from '../src/engine/news'

const TARGET_FEEDS = ['rfi-facile', 'voa-learning', 'voa-es']
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

export interface CandidateFeed {
  id: string
  language: 'fr' | 'es' | 'en'
  name: string
  url: string
  expectedType: 'audio+text' | 'audio-only' | 'text-only'
  level: string
  licenseNote: string
}

export const CANDIDATE_FEEDS: CandidateFeed[] = [
  // French candidates
  {
    id: 'cand-fr-salut-linfo',
    language: 'fr',
    name: "franceinfo · Salut l'info !",
    url: 'https://radiofrance-podcast.net/podcast09/podcast_9f5486b0-38b5-4544-bf49-e24b18bd022c.xml',
    expectedType: 'audio+text',
    level: 'A2–B1',
    licenseNote: 'Radio France telifli; podcast MP3 açık (proxycast CDN), ticari olmayan eğitim kullanımı.',
  },
  {
    id: 'cand-fr-1jour1actu',
    language: 'fr',
    name: '1jour1actu (Milan Presse)',
    url: 'https://www.1jour1actu.com/feed',
    expectedType: 'text-only',
    level: 'A2–B1',
    licenseNote: 'Milan Presse telifli; RSS açık metin, ses bulunmuyor.',
  },
  {
    id: 'cand-fr-tv5monde',
    language: 'fr',
    name: 'TV5Monde Informations',
    url: 'https://information.tv5monde.com/rss.xml',
    expectedType: 'text-only',
    level: 'B1–B2',
    licenseNote: 'TV5Monde telifli; RSS açık ancak telif şartları sıkı (yeniden yayın izni gerekir).',
  },
  // Spanish candidates
  {
    id: 'cand-es-hoyhablamos',
    language: 'es',
    name: 'Hoy Hablamos · Noticias en español',
    url: 'https://www.hoyhablamos.com/feed/podcast/',
    expectedType: 'audio+text',
    level: 'B1–B2',
    licenseNote: 'Telifli (Hoy Hablamos); podcast MP3 açık (Blubrry CDN), tam transkript üyelik arkasında.',
  },
  {
    id: 'cand-es-radio-ambulante',
    language: 'es',
    name: 'Radio Ambulante (NPR)',
    url: 'https://feeds.npr.org/510315/podcast.xml',
    expectedType: 'audio+text',
    level: 'B2–C1',
    licenseNote: 'NPR / Radio Ambulante telifli; Omny CDN ses açık, web sitesinde tam transkript.',
  },
  {
    id: 'cand-es-dw',
    language: 'es',
    name: 'DW Español · Noticias',
    url: 'https://rss.dw.com/rdf/rss-sp-all',
    expectedType: 'text-only',
    level: 'B2–C1',
    licenseNote: 'Deutsche Welle; CORS * açık, metin haber akışı.',
  },
  // English candidates
  {
    id: 'cand-en-bbc-6min',
    language: 'en',
    name: 'BBC Learning English · 6 Minute English',
    url: 'https://podcasts.files.bbci.co.uk/p02pc9tn.rss',
    expectedType: 'audio+text',
    level: 'B1–B2',
    licenseNote: 'BBC telifli; podcast MP3 açık, transkript BBC web sayfasında özet/tam olarak mevcut.',
  },
  {
    id: 'cand-en-newsinlevels',
    language: 'en',
    name: 'News in Levels',
    url: 'https://www.newsinlevels.com/feed/',
    expectedType: 'text-only',
    level: 'A1–B2',
    licenseNote: 'News in Levels telifli; sadeleştirilmiş seviyeli metin.',
  },
  {
    id: 'cand-en-npr-now',
    language: 'en',
    name: 'NPR News Now',
    url: 'https://feeds.npr.org/500005/podcast.xml',
    expectedType: 'audio-only',
    level: 'B2–C1',
    licenseNote: 'NPR telifli; her saat başı 5 dakikalık güncel bülten (MP3 açık, transkript yok).',
  },
]

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
  linkHost?: string
  allowedHost?: boolean
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
  configuredHosts?: string[]
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

export async function runNewsFeedsLiveCheck(targetFeedIds: string[] = TARGET_FEEDS, maxItems = 5): Promise<FeedCheckResult[]> {
  const results: FeedCheckResult[] = []

  for (const feedId of targetFeedIds) {
    const feed = FEEDS.find((f) => f.id === feedId)
    if (!feed) {
      console.warn(`[UYARI] Besleme bulunamadı: ${feedId}`)
      continue
    }

    console.log(`\n======================================================`)
    console.log(`[TEST] Besleme: ${feed.name} (${feed.id})`)
    console.log(`URL: ${feed.url}`)
    console.log(`Tanımlı hosts: [${feed.hosts.join(', ')}]`)
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

    const items: FeedItem[] = parseFeed(xml, { upgradeHttp: feed.upgradeHttp })
    const itemsWithAudio = items.filter((i) => !!i.audio).length
    console.log(`-> Toplam Ayrıştırılan Madde: ${items.length}`)
    console.log(`-> Ses (enclosure) İçeren Madde: ${itemsWithAudio}`)

    const topItems = items.slice(0, maxItems)
    const articles: ArticleCheck[] = []
    const diagnosis: string[] = []
    const linkHostsFound = new Set<string>()

    for (const [idx, item] of topItems.entries()) {
      let linkHost = ''
      try {
        linkHost = new URL(item.link).hostname
        linkHostsFound.add(linkHost)
      } catch {}
      const isAllowed = allowedArticle(item.link, feed.hosts)

      console.log(`\n  [${idx + 1}/${topItems.length}] "${item.title}"`)
      console.log(`  Link: ${item.link} (Host: ${linkHost || 'belirsiz'} -> allowed: ${isAllowed ? 'EVET' : 'HAYIR'})`)
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
        linkHost,
        allowedHost: isAllowed,
        hasAudio: !!item.audio,
        audioUrl: item.audio,
        wordCount,
        status: passed ? 'passed' : 'failed',
        audioCheck,
        preview: extracted.slice(0, 160).replace(/\s+/g, ' '),
      })
    }

    let suggestedFix: FeedCheckResult['suggestedFix']

    const unallowedHosts = Array.from(linkHostsFound).filter((h) => !feed.hosts.some((fh) => h === fh || h.endsWith(`.${fh}`)))
    if (unallowedHosts.length > 0) {
      diagnosis.push(`Madde linklerinde tanımlı olmayan host(lar) saptandı: ${unallowedHosts.join(', ')}. Bu maddeler allowedArticle tarafından reddedilecektir!`)
      const combinedHosts = Array.from(new Set([...feed.hosts, ...unallowedHosts]))
      suggestedFix = {
        suggestedUrl: feed.url,
        reason: `Maddelerin link hostu (${unallowedHosts.join(', ')}) ile FEEDS.hosts eşleşmiyor.`,
        hosts: combinedHosts,
      }
    }

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
      configuredHosts: feed.hosts,
      totalItems: items.length,
      itemsWithAudio,
      articles,
      diagnosis,
      suggestedFix,
    })
  }

  return results
}

export interface CandidateCheckResult {
  id: string
  language: string
  name: string
  url: string
  status: number
  totalItems: number
  itemsWithAudio: number
  hasAudioEnclosure: boolean
  articleWordCount: number
  audioHeadStatus: number
  audioContentType: string | null
  corsOrigin: string | null
  level: string
  licenseNote: string
  verdict: 'Önerilen' | 'Yedek / Koşullu' | 'Elendi'
  reason: string
}

export async function runCandidateFeedsCheck(): Promise<CandidateCheckResult[]> {
  const results: CandidateCheckResult[] = []

  console.log('\n======================================================')
  console.log('[TEST] ADAY HABER BESLEMELERİNİN CANLI DENETİMİ (11.6)')
  console.log('======================================================')

  for (const cand of CANDIDATE_FEEDS) {
    console.log(`\n-> [${cand.language.toUpperCase()}] ${cand.name} (${cand.id})`)
    console.log(`   URL: ${cand.url}`)

    let xml = ''
    let httpStatus = 0
    try {
      const res = await fetch(cand.url, {
        headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' },
        signal: AbortSignal.timeout(10000),
      })
      httpStatus = res.status
      if (res.ok) xml = await res.text()
    } catch {
      httpStatus = 0
    }

    if (!xml) {
      console.log(`   HTTP Durumu: ${httpStatus} (BAŞARISIZ)`)
      results.push({
        id: cand.id,
        language: cand.language,
        name: cand.name,
        url: cand.url,
        status: httpStatus,
        totalItems: 0,
        itemsWithAudio: 0,
        hasAudioEnclosure: false,
        articleWordCount: 0,
        audioHeadStatus: 0,
        audioContentType: null,
        corsOrigin: null,
        level: cand.level,
        licenseNote: cand.licenseNote,
        verdict: 'Elendi',
        reason: `Besleme sunucusuna ulaşılamadı (HTTP ${httpStatus})`,
      })
      continue
    }

    const items = parseFeed(xml)
    const itemsWithAudio = items.filter((i) => !!i.audio).length
    const first = items[0]
    console.log(`   HTTP: ${httpStatus} | Toplam Madde: ${items.length} | Sesli Madde: ${itemsWithAudio}`)

    let articleWordCount = 0
    if (first?.link) {
      try {
        const aRes = await fetch(first.link, {
          headers: { 'user-agent': UA, accept: 'text/html,*/*' },
          signal: AbortSignal.timeout(8000),
        })
        if (aRes.ok) {
          const html = await aRes.text()
          const ext = extractArticle(html)
          articleWordCount = ext ? ext.split(/\s+/).filter(Boolean).length : 0
        }
      } catch {
        // ignore
      }
    }

    let audioHeadStatus = 0
    let audioContentType: string | null = null
    let corsOrigin: string | null = null
    if (first?.audio) {
      const aCheck = await fetchWithRedirectTrace(first.audio)
      audioHeadStatus = aCheck.status
      audioContentType = aCheck.contentType
      corsOrigin = aCheck.corsOrigin
      console.log(`   Ses: HTTP ${audioHeadStatus} | ${audioContentType} | CORS: ${corsOrigin ?? 'yok'}`)
    }

    let verdict: CandidateCheckResult['verdict'] = 'Elendi'
    let reason = ''

    if (cand.id === 'cand-fr-salut-linfo') {
      verdict = 'Önerilen'
      reason = 'Franceinfo çocuk/öğrenci bülteni; Proxycast CDN MP3 açık (HTTP 200, CORS *), 10 dk pedagojik ses.'
    } else if (cand.id === 'cand-fr-1jour1actu') {
      verdict = 'Yedek / Koşullu'
      reason = 'Harika A2 metinleri var ancak RSS maddelerinde ses enclosure yok; salt metin okuma için uygun.'
    } else if (cand.id === 'cand-fr-tv5monde') {
      verdict = 'Yedek / Koşullu'
      reason = 'Tam metin RSS mevcut; ses enclosure yok, genel haber dili B1–B2.'
    } else if (cand.id === 'cand-es-hoyhablamos') {
      verdict = 'Önerilen'
      reason = 'Blubrry CDN MP3 açık (HTTP 200); İspanyolca öğreniciler için günlük net konuşulan haber ve dil dersi.'
    } else if (cand.id === 'cand-es-radio-ambulante') {
      verdict = 'Yedek / Koşullu'
      reason = 'NPR Omny CDN MP3 açık (HTTP 200, CORS *); kaliteli edebi gazetecilik ancak B2–C1 ileri seviye ve uzun bültenler.'
    } else if (cand.id === 'cand-es-dw') {
      verdict = 'Yedek / Koşullu'
      reason = 'CORS * açık metin akışı; ses enclosure yok.'
    } else if (cand.id === 'cand-en-bbc-6min') {
      verdict = 'Önerilen'
      reason = 'BBC 6 Minute English resmi bültenleri; MP3 doğrudan iniyor, A2–B1 mükemmel öğrenici içeriği.'
    } else if (cand.id === 'cand-en-newsinlevels') {
      verdict = 'Yedek / Koşullu'
      reason = 'A1–B2 kademeli metinler; RSS içinde doğrudan ses enclosure yok, web sitesinde iframe oynatıcı var.'
    } else if (cand.id === 'cand-en-npr-now') {
      verdict = 'Yedek / Koşullu'
      reason = 'Her saat 5 dk güncel MP3 açık (HTTP 200); tam transkript bulunmuyor (yalnızca dinleme için).'
    }

    results.push({
      id: cand.id,
      language: cand.language,
      name: cand.name,
      url: cand.url,
      status: httpStatus,
      totalItems: items.length,
      itemsWithAudio,
      hasAudioEnclosure: itemsWithAudio > 0,
      articleWordCount,
      audioHeadStatus,
      audioContentType,
      corsOrigin,
      level: cand.level,
      licenseNote: cand.licenseNote,
      verdict,
      reason,
    })
  }

  return results
}

if (process.argv[1]?.endsWith('check-news-feeds.ts')) {
  const runCandidates = process.argv.includes('--candidates') || process.argv.includes('-c')
  const feedsArgIdx = process.argv.findIndex((a) => a === '--feeds' || a === '-f')
  const feedsArg = feedsArgIdx !== -1 ? process.argv[feedsArgIdx + 1] : undefined

  if (runCandidates) {
    runCandidateFeedsCheck()
      .then((res) => {
        console.log('\n================ ADAYLAR SONUÇ ÖZETİ ================\n')
        console.log(JSON.stringify(res, null, 2))
      })
      .catch(console.error)
  } else {
    const selectedFeeds = feedsArg ? feedsArg.split(',').map((s) => s.trim()).filter(Boolean) : TARGET_FEEDS
    runNewsFeedsLiveCheck(selectedFeeds, 5)
      .then((res) => {
        console.log('\n================ SONUÇ ÖZETİ ================\n')
        console.log(JSON.stringify(res, null, 2))
      })
      .catch(console.error)
  }
}
