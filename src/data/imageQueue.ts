import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { searchImages, type ImageResult } from './imageSearch'

/**
 * Pictures for many words at once. A concrete noun without a picture gets a few suggestions to
 * accept or skip: first the picture Wikidata keeps for the thing the word names (a far better
 * match than a text search: "maison" is the house, not a film called Maison), then a search.
 * Nothing is saved until the learner picks one.
 */

/** Words worth suggesting a picture for: single nouns without one, most frequent first, minus the ones passed over. */
export function imageCandidates(vocabulary: readonly VocabularyEntry[], skipped: ReadonlySet<string>): VocabularyEntry[] {
  return vocabulary
    .filter((e) => !e.imageId && e.partOfSpeech === 'noun' && !skipped.has(e.id) && !/\s/.test(e.lemma.trim()))
    .sort((a, b) => (a.frequencyRank || Infinity) - (b.frequencyRank || Infinity) || a.lemma.localeCompare(b.lemma))
}

const SKIP_KEY = 'kelime-koc:image-skipped'

export function skippedImages(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SKIP_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export function skipImage(id: string): void {
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify([...skippedImages().add(id)]))
  } catch {
    // The word may come up again; fine.
  }
}

/** A suggestion, and which source it is (the credit says it too; this decides the "source" note). */
export interface ImageSuggestion extends ImageResult {
  from: 'wikidata' | 'search'
}

const WIKIDATA = 'https://www.wikidata.org/w/api.php'
const COMMONS = 'https://commons.wikimedia.org/w/api.php'
const IRRELEVANT_P31 = new Set([
  'Q4167410', // disambiguation page
  'Q215380',  // musical group / band
  'Q482994',  // album
  'Q134556',  // single
  'Q11424',   // film
  'Q5398426', // television series
  'Q486970',  // human settlement / commune / village
  'Q43229',   // organization / enterprise
  'Q5',       // human individual
])

const IRRELEVANT_DESC = /\b(band|musical group|album|single|song|film|movie|television series|actor|actress|rapper|boxer|politician|commune|village|municipality|company|corporation)\b/i

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

interface Snak {
  mainsnak?: { datavalue?: { value?: unknown } }
}
interface Entity {
  claims?: { P18?: Snak[]; P31?: Snak[] }
}

/** The picture file Wikidata keeps for the first thing matching the word that has one. */
export async function wikidataFile(word: string, language: TargetLanguage): Promise<string | undefined> {
  const search = new URLSearchParams({ action: 'wbsearchentities', search: word, language, uselang: language, type: 'item', limit: '5', format: 'json', origin: '*' })
  const found = await fetch(`${WIKIDATA}?${search}`)
  if (!found.ok) return undefined
  const searchData = ((await found.json()) as { search?: { id: string; description?: string }[] }).search ?? []
  const ids = searchData.map((s) => s.id)
  if (!ids.length) return undefined

  const descMap = new Map<string, string>()
  for (const s of searchData) {
    if (s.description) descMap.set(s.id, s.description.toLowerCase())
  }

  const get = new URLSearchParams({ action: 'wbgetentities', ids: ids.join('|'), props: 'claims', format: 'json', origin: '*' })
  const res = await fetch(`${WIKIDATA}?${get}`)
  if (!res.ok) return undefined
  const entities = ((await res.json()) as { entities?: Record<string, Entity> }).entities ?? {}
  const wordLower = word.toLowerCase()

  for (const id of ids) {
    const desc = descMap.get(id) ?? ''
    if (IRRELEVANT_DESC.test(desc) && !wordLower.includes('band') && !wordLower.includes('film')) {
      continue
    }
    const claims = entities[id]?.claims
    const isIrrelevant = claims?.P31?.some((s) => {
      const p31Id = (s.mainsnak?.datavalue?.value as { id?: string } | undefined)?.id
      return p31Id ? IRRELEVANT_P31.has(p31Id) : false
    })
    const file = claims?.P18?.[0]?.mainsnak?.datavalue?.value
    if (!isIrrelevant && typeof file === 'string') return file
  }
  return undefined
}

/** A Commons file as a suggestion, with its credit. */
async function commonsFile(file: string): Promise<ImageResult | undefined> {
  const params = new URLSearchParams({ action: 'query', format: 'json', origin: '*', titles: `File:${file}`, prop: 'imageinfo', iiprop: 'url|extmetadata', iiextmetadatafilter: 'Artist|LicenseShortName', iiurlwidth: '480' })
  const res = await fetch(`${COMMONS}?${params}`)
  if (!res.ok) return undefined
  const data = (await res.json()) as { query?: { pages?: Record<string, { title: string; imageinfo?: { thumburl?: string; extmetadata?: { Artist?: { value: string }; LicenseShortName?: { value: string } } }[] }> } }
  const page = Object.values(data.query?.pages ?? {})[0]
  const info = page?.imageinfo?.[0]
  if (!info?.thumburl) return undefined
  const artist = stripHtml(info.extmetadata?.Artist?.value ?? '')
  const license = info.extmetadata?.LicenseShortName?.value ?? ''
  return { thumbUrl: info.thumburl, title: page.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''), credit: [artist, license].filter(Boolean).join(', ') + ' (Wikimedia Commons · Wikidata)' }
}

/** Up to `limit` pictures for a word: Wikidata's own first, then search results; a source that fails is skipped. */
export async function suggestImages(entry: Pick<VocabularyEntry, 'language' | 'lemma'>, limit = 5): Promise<ImageSuggestion[]> {
  const out: ImageSuggestion[] = []
  try {
    const file = await wikidataFile(entry.lemma, entry.language)
    const own = file ? await commonsFile(file) : undefined
    if (own) out.push({ ...own, from: 'wikidata' })
  } catch {
    // Offline or rate limited: the search below may still work.
  }
  try {
    for (const r of await searchImages(entry.lemma, limit + 2)) {
      if (out.length >= limit) break
      if (!out.some((o) => o.thumbUrl === r.thumbUrl)) out.push({ ...r, from: 'search' })
    }
  } catch {
    // Nothing from either source: the caller shows "no picture found".
  }
  return out
}
