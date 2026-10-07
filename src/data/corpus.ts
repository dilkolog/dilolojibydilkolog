import { TARGET_LANGUAGES, type Example, type TargetLanguage, type VocabularyEntry } from '../engine/types'
import type { KelimeDB } from './db'
import { loadFrequency } from './frequency'
import { isUntouched, patchWithSources } from './provenance'
import { easyWords, rankByFit, type Easy } from '../engine/sentenceFit'

/**
 * Real sentences for each word from Tatoeba (sentences written and translated by people,
 * CC BY 2.0 FR; many with native-speaker audio). Meeting a word in many different sentences
 * builds a richer, more transferable memory than one example seen over and over.
 */

const API = 'https://api.tatoeba.org/unstable/sentences'
const TATOEBA_LANG: Record<TargetLanguage, string> = { en: 'eng', fr: 'fra', es: 'spa' }
const others = (language: TargetLanguage) => TARGET_LANGUAGES.filter((l) => l !== language)
/** Which translations to bring along: Turkish and/or the other two target languages (parallel sentences). */
const showLangs = (language: TargetLanguage, turkish: boolean) => [...(turkish ? ['tur'] : []), ...others(language).map((l) => TATOEBA_LANG[l])].join(',')
/** Enough variety without bloating each word. */
export const CORPUS_SIZE = 12
/** Words looked up per background run, so the app never floods the service. */
const PER_RUN = 12

interface TatoebaSentence {
  id: number
  text: string
  is_unapproved?: boolean
  translations?: { text: string; lang: string; is_direct?: boolean; is_unapproved?: boolean }[]
  audios?: { download_url?: string }[]
}

export { formIn, isInflection } from '../engine/inflection'
import { formIn } from '../engine/inflection'

/** A sentence's recording (the API's own download link redirects to a 404). */
export const tatoebaAudio = (id: number, language: TargetLanguage) => `https://audio.tatoeba.org/sentences/${TATOEBA_LANG[language]}/${id}.mp3`

/** The playable recording of a corpus example, also for ones saved with the old link. */
export function exampleAudio(example: Example, language: TargetLanguage): string | undefined {
  return example.source?.audioUrl ? tatoebaAudio(example.source.id, language) : undefined
}

/** A direct translation (made from this sentence) before one reached through another language. */
const bestTranslation = (s: Pick<TatoebaSentence, 'translations'>, lang: string) =>
  (s.translations ?? []).filter((t) => t.lang === lang && !t.is_unapproved).sort((a, b) => Number(!!b.is_direct) - Number(!!a.is_direct))[0]?.text

/** The sentence in the other two target languages, where Tatoeba has it. */
function parallelOf(s: Pick<TatoebaSentence, 'translations'>, language: TargetLanguage): Partial<Record<TargetLanguage, string>> {
  return Object.fromEntries(
    others(language).flatMap((l) => {
      const t = bestTranslation(s, TATOEBA_LANG[l])
      return t ? [[l, t]] : []
    }),
  )
}

export function toExamples(data: TatoebaSentence[], lemma: string, language: TargetLanguage): Example[] {
  const out: Example[] = []
  const seen = new Set<string>()
  for (const s of data) {
    if (s.is_unapproved || seen.has(s.text)) continue
    const form = formIn(s.text, lemma, language)
    if (!form) continue
    seen.add(s.text)
    out.push({
      text: s.text,
      translation: bestTranslation(s, 'tur') ?? '',
      form,
      source: { kind: 'tatoeba', id: s.id, audioUrl: s.audios?.length ? tatoebaAudio(s.id, language) : undefined },
      // Always set, empty when there is none: it marks the sentence as looked at (see fillParallel).
      parallel: parallelOf(s, language),
    })
  }
  return out
}

async function query(params: Record<string, string>): Promise<TatoebaSentence[]> {
  const all: Record<string, string> = { sort: 'relevance', limit: '40', word_count: '4-16', include: 'audios', ...params }
  // An empty value leaves the parameter out.
  const res = await fetch(`${API}?${new URLSearchParams(Object.entries(all).filter(([, v]) => v !== ''))}`)
  if (!res.ok) throw new Error(`tatoeba ${res.status}`)
  return ((await res.json()) as { data?: TatoebaSentence[] }).data ?? []
}

/**
 * Which words count as known when rating a sentence: the language's frequent words and the
 * learner's own words (sentenceFit.ts).
 */
export async function easyFor(db: KelimeDB, language: TargetLanguage): Promise<Easy> {
  const [rank, own] = await Promise.all([loadFrequency(language), db.vocabulary.where('language').equals(language).toArray()])
  return easyWords(language, rank, own.map((e) => e.lemma))
}

/** Sentences with a Turkish translation first; topped up with untranslated ones (fine for cloze). With `easy`, best fit first. */
export async function fetchCorpus(entry: Pick<VocabularyEntry, 'language' | 'lemma'>, easy?: Easy): Promise<Example[]> {
  const found = await fetchRaw(entry)
  return easy ? rankByFit(found, entry.lemma, easy) : found
}

async function fetchRaw(entry: Pick<VocabularyEntry, 'language' | 'lemma'>): Promise<Example[]> {
  const lang = TATOEBA_LANG[entry.language]
  const q = /\s/.test(entry.lemma.trim()) ? `"${entry.lemma.trim()}"` : entry.lemma.trim()
  const translated = toExamples(await query({ lang, q, 'trans:lang': 'tur', 'showtrans:lang': showLangs(entry.language, true) }), entry.lemma, entry.language)
  if (translated.length >= CORPUS_SIZE / 2) return translated.slice(0, CORPUS_SIZE)
  const more = toExamples(await query({ lang, q, 'showtrans:lang': showLangs(entry.language, false) }), entry.lemma, entry.language).filter((x) => !translated.some((t) => t.text === x.text))
  return [...translated, ...more].slice(0, CORPUS_SIZE)
}

export interface ListeningSentence {
  id: number
  text: string
  translation: string
  audio: string
}

/** Random sentences recorded by native speakers (many voices), with a Turkish translation when there is one. */
export async function fetchListening(language: TargetLanguage, limit = 10): Promise<ListeningSentence[]> {
  const lang = TATOEBA_LANG[language]
  let data = await query({ lang, has_audio: 'yes', sort: 'random', word_count: '4-12', 'trans:lang': 'tur', showtrans: 'matching', limit: String(limit), include: '' })
  if (data.length < limit) data = [...data, ...(await query({ lang, has_audio: 'yes', sort: 'random', word_count: '4-12', showtrans: 'none', limit: String(limit - data.length), include: '' }))]
  return data
    .filter((s) => !s.is_unapproved)
    .map((s) => ({ id: s.id, text: s.text, translation: s.translations?.find((t) => t.lang === 'tur')?.text ?? '', audio: tatoebaAudio(s.id, language) }))
}

/** Many plain sentences containing the word, for mining its collocations (see patterns.ts). */
export async function fetchSentences(entry: Pick<VocabularyEntry, 'language' | 'lemma'>, limit = 100): Promise<string[]> {
  const q = /\s/.test(entry.lemma.trim()) ? `"${entry.lemma.trim()}"` : entry.lemma.trim()
  const data = await query({ lang: TATOEBA_LANG[entry.language], q, showtrans: 'none', limit: String(limit), word_count: '3-30', include: '' })
  return data.filter((s) => !s.is_unapproved).map((s) => s.text)
}

/**
 * Background top-up: words that were never looked up get their sentences (an empty list marks
 * "looked, nothing found"). Only changes the `corpus` field, so it can't overwrite an edit.
 */
export async function fillCorpus(db: KelimeDB, language: TargetLanguage): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0
  const todo = (await db.vocabulary.where('language').equals(language).toArray()).filter((e) => e.source !== 'sample' && e.corpus === undefined).slice(0, PER_RUN)
  let done = 0
  const easy = todo.length ? await easyFor(db, language) : undefined
  for (const e of todo) {
    try {
      await db.vocabulary.update(e.id, patchWithSources(e, { corpus: await fetchCorpus(e, easy) }, { corpus: 'tatoeba' }))
      done++
    } catch {
      break // offline or the service is down: try again next time
    }
  }
  return done
}

/** Sentences looked up per background run: the other languages of each is one request. */
const PARALLEL_PER_RUN = 24

/**
 * Background top-up for sentences saved before they came with their other-language versions
 * (no `parallel` yet): each is looked up by its Tatoeba id. Only that field is added, so the
 * learner's list, order and trims stay; a sentence with none gets an empty one, so it isn't asked again.
 */
export async function fillParallel(db: KelimeDB, language: TargetLanguage, budget = PARALLEL_PER_RUN): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0
  const show = others(language).map((l) => TATOEBA_LANG[l]).join(',')
  let asked = 0
  let changed = 0
  for (const e of await db.vocabulary.where('language').equals(language).toArray()) {
    if (asked >= budget) break
    if (!e.corpus?.some((x) => x.source?.kind === 'tatoeba' && x.parallel === undefined)) continue
    const found = new Map<number, Partial<Record<TargetLanguage, string>>>()
    let stop = false
    for (const x of e.corpus) {
      if (asked >= budget) break
      if (x.source?.kind !== 'tatoeba' || x.parallel !== undefined) continue
      asked++
      const res = await fetch(`${API}/${x.source.id}?${new URLSearchParams({ 'showtrans:lang': show })}`).catch(() => null)
      // Offline, rate-limited or down: keep what was found and try the rest next time.
      if (!res || res.status === 429 || res.status >= 500) {
        stop = true
        break
      }
      // A sentence gone from Tatoeba (404) has nothing to add.
      const data = res.ok ? ((await res.json()) as { data?: TatoebaSentence }).data : undefined
      found.set(x.source.id, data ? parallelOf(data, language) : {})
    }
    if (found.size) {
      // Onto the word as it is now: a sentence the learner removed meanwhile stays removed.
      const fresh = (await db.vocabulary.get(e.id)) ?? e
      const corpus = (fresh.corpus ?? []).map((x) => (x.source && x.parallel === undefined && found.has(x.source.id) ? { ...x, parallel: found.get(x.source.id) } : x))
      const kind = fresh.sources?.corpus?.kind
      await db.vocabulary.update(e.id, kind && isUntouched(fresh, 'corpus') ? patchWithSources(fresh, { corpus }, { corpus: kind }) : { corpus })
      changed++
    }
    if (stop) break
  }
  return changed
}

/**
 * Ratings go stale as the learner's own word list grows (a word learned since is no longer
 * unknown). They are redone for every word when the list has grown by a tenth (at least 10 words)
 * since the last full pass, or when there never was one.
 */
export function needsRescore(ownWords: number, ratedAt: number | undefined): boolean {
  return ratedAt === undefined || ownWords >= ratedAt + Math.max(10, Math.ceil(ratedAt / 10))
}

const sameOrder = (a: readonly Example[], b: readonly Example[]) => a.length === b.length && a.every((x, i) => x.text === b[i].text && x.fit === b[i].fit)

/**
 * Rates saved sentences (no network) and puts the best fit first: the never-rated ones always,
 * all of them when needsRescore says the ratings are stale. Only words whose list actually
 * changes are written. A list the learner never touched stays "Tatoeba's" for the source note;
 * one they trimmed stays theirs. Returns how many words changed.
 */
export async function scoreCorpus(db: KelimeDB, language: TargetLanguage): Promise<number> {
  const words = await db.vocabulary.where('language').equals(language).toArray()
  const key = `corpusRated:${language}`
  const ratedAt = (await db.meta.get(key))?.value as number | undefined
  const full = needsRescore(words.length, ratedAt)
  const todo = words.filter((e) => e.corpus?.length && (full || e.corpus.some((x) => x.fit === undefined)))
  let changed = 0
  if (todo.length) {
    const easy = await easyFor(db, language)
    for (const e of todo) {
      const corpus = rankByFit(e.corpus!, e.lemma, easy)
      if (sameOrder(corpus, e.corpus!)) continue
      const kind = e.sources?.corpus?.kind
      await db.vocabulary.update(e.id, kind && isUntouched(e, 'corpus') ? patchWithSources(e, { corpus }, { corpus: kind }) : { corpus })
      changed++
    }
  }
  if (full) await db.meta.put({ key, value: words.length })
  return changed
}
