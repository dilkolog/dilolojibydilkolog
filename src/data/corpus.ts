import type { Example, TargetLanguage, VocabularyEntry } from '../engine/types'
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

export function toExamples(data: TatoebaSentence[], lemma: string, language: TargetLanguage): Example[] {
  const out: Example[] = []
  const seen = new Set<string>()
  for (const s of data) {
    if (s.is_unapproved || seen.has(s.text)) continue
    const form = formIn(s.text, lemma, language)
    if (!form) continue
    seen.add(s.text)
    const tr = (s.translations ?? []).filter((t) => t.lang === 'tur' && !t.is_unapproved).sort((a, b) => Number(!!b.is_direct) - Number(!!a.is_direct))[0]
    out.push({
      text: s.text,
      translation: tr?.text ?? '',
      form,
      source: { kind: 'tatoeba', id: s.id, audioUrl: s.audios?.length ? tatoebaAudio(s.id, language) : undefined },
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
  const translated = toExamples(await query({ lang, q, 'trans:lang': 'tur', showtrans: 'matching' }), entry.lemma, entry.language)
  if (translated.length >= CORPUS_SIZE / 2) return translated.slice(0, CORPUS_SIZE)
  const more = toExamples(await query({ lang, q, showtrans: 'none' }), entry.lemma, entry.language).filter((x) => !translated.some((t) => t.text === x.text))
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

/**
 * Rates the sentences already saved that were never rated (no network): puts the best fit first.
 * A list the learner never touched stays "Tatoeba's" for the source note; one they trimmed stays theirs.
 */
export async function scoreCorpus(db: KelimeDB, language: TargetLanguage): Promise<number> {
  const todo = (await db.vocabulary.where('language').equals(language).toArray()).filter((e) => e.corpus?.some((x) => x.fit === undefined))
  if (!todo.length) return 0
  const easy = await easyFor(db, language)
  for (const e of todo) {
    const corpus = rankByFit(e.corpus!, e.lemma, easy)
    const kind = e.sources?.corpus?.kind
    await db.vocabulary.update(e.id, kind && isUntouched(e, 'corpus') ? patchWithSources(e, { corpus }, { corpus: kind }) : { corpus })
  }
  return todo.length
}
