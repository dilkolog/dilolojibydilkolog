import type { Example, TargetLanguage, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from './db'
import { patchWithSources } from './provenance'

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

/**
 * Is `token` an inflected form of `lemma` (decide → decided, decidir → decidió), not merely a
 * related word (reluctant → reluctantly, dépaysement → dépaysé)? The search behind the corpus
 * matches word families loosely, so this is stricter than matching a shared prefix.
 */
export function isInflection(token: string, lemma: string, language: TargetLanguage): boolean {
  const t = token.toLocaleLowerCase()
  const l = lemma.toLocaleLowerCase()
  if (t === l) return true
  const rest = t.startsWith(l) ? t.slice(l.length) : null
  if (language === 'en') {
    if (rest !== null && ['s', 'es', 'ed', 'ing', "'s"].includes(rest)) return true
    if (l.endsWith('e') && rest === 'd') return true
    const cut = l.slice(0, -1)
    if (l.endsWith('e') && t.startsWith(cut) && ['ing', 'ed'].includes(t.slice(cut.length))) return true
    if (l.endsWith('y') && t.startsWith(cut) && ['ies', 'ied'].includes(t.slice(cut.length))) return true
    // Doubled final consonant: stop → stopped, stopping.
    return rest !== null && rest.length > 1 && rest[0] === l.at(-1) && ['ed', 'ing'].includes(rest.slice(1))
  }
  if (rest !== null && (language === 'fr' ? ['s', 'e', 'es', 'x'] : ['s', 'es']).includes(rest)) return true
  // Regular verbs: any ending on the stem (décider → décidez, décida; aprovechar → aprovechó).
  const verb = language === 'fr' ? /(er|ir|re)$/ : /(ar|er|ir)$/
  if (!verb.test(l)) return false
  const stem = l.slice(0, -2)
  return stem.length >= 3 && t.startsWith(stem) && t.length - stem.length <= 6 && !/(tion|sion|ción|sión|ment|miento|ance|ancia|eur|dor|able|ible)$/.test(t)
}

/** The word's form inside the sentence, or undefined when it can't be found reliably. */
export function formIn(text: string, lemma: string, language: TargetLanguage): string | undefined {
  const target = lemma.trim()
  if (/\s/.test(target)) {
    const i = text.toLocaleLowerCase().indexOf(target.toLocaleLowerCase())
    return i < 0 ? undefined : text.slice(i, i + target.length)
  }
  // Apostrophes split tokens so elided articles (l', d', j') don't stick to the word.
  return (text.match(/[\p{L}-]+/gu) ?? []).find((t) => isInflection(t, target, language))
}

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

/** Sentences with a Turkish translation first; topped up with untranslated ones (fine for cloze). */
export async function fetchCorpus(entry: Pick<VocabularyEntry, 'language' | 'lemma'>): Promise<Example[]> {
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
  for (const e of todo) {
    try {
      await db.vocabulary.update(e.id, patchWithSources(e, { corpus: await fetchCorpus(e) }, { corpus: 'tatoeba' }))
      done++
    } catch {
      break // offline or the service is down: try again next time
    }
  }
  return done
}
