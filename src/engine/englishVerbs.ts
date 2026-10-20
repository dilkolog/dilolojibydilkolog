import { pickWeighted, type GrammarLog } from './grammar'

/**
 * English has no conjugation tables, but two things in verbs cost a Turkish speaker much: the irregular past
 * and participle forms (go – went – gone) and phrasal verbs (give up, look after). Both are asked in short
 * rounds; progress is a `GrammarLog` keyed `irr|<base>` and `phr|<phrasal>`.
 */
export interface IrregularVerb {
  id: string
  base: string
  /** Every accepted past form (learnt / learned; was / were). */
  past: string[]
  pp: string[]
  tr: string
  /** A sentence with the past simple form, and its Turkish. */
  text: string
  textTr: string
}

export interface PhrasalVerb {
  id: string
  phrasal: string
  tr: string
  text: string
  textTr: string
}

export const VERB_ROUND = 10

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Whether what was typed is one of the accepted forms (case and spaces do not matter). */
export const formRight = (given: string, accepted: readonly string[]) => accepted.some((a) => norm(a) === norm(given))

export const formsText = (forms: readonly string[]) => forms.join(' / ')

/** A round of irregular verbs, those missed before first. */
export const irregularRound = (all: readonly IrregularVerb[], log: GrammarLog, rng: () => number, size = VERB_ROUND) => pickWeighted(all, log, rng, size)

export type PhrasalKind = 'meaning' | 'particle'

export interface PhrasalQuestion {
  id: string
  verb: PhrasalVerb
  kind: PhrasalKind
  options: string[]
  answer: string
}

const shuffle = <T>(list: readonly T[], rng: () => number): T[] => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const words = (v: PhrasalVerb) => v.phrasal.split(' ')

/**
 * One question: the meaning among four ("give up" → vazgeçmek), or, for a two-word phrasal verb, the particle
 * among four ("give ___" = vazgeçmek). Wrong particles are never one that makes another phrasal verb of the
 * list with the same verb, so there is one right answer.
 */
export function phrasalQuestion(verb: PhrasalVerb, all: readonly PhrasalVerb[], rng: () => number): PhrasalQuestion {
  const [head, particle] = words(verb)
  const two = words(verb).length === 2
  if (two && rng() < 0.5) {
    const taken = new Set(all.map((v) => v.phrasal))
    const wrong = shuffle(
      [...new Set(all.filter((v) => words(v).length === 2).map((v) => words(v)[1]))].filter((p) => p !== particle && !taken.has(`${head} ${p}`)),
      rng,
    ).slice(0, 3)
    if (wrong.length === 3) return { id: verb.id, verb, kind: 'particle', options: shuffle([particle, ...wrong], rng), answer: particle }
  }
  // Synonyms share their meaning text (watch out, look out): the same meaning is offered once, never as a second right answer.
  const wrong = [...new Set(shuffle(all.filter((v) => v.id !== verb.id && v.tr !== verb.tr), rng).map((v) => v.tr))].slice(0, 3)
  return { id: verb.id, verb, kind: 'meaning', options: shuffle([verb.tr, ...wrong], rng), answer: verb.tr }
}

export const phrasalRound = (all: readonly PhrasalVerb[], log: GrammarLog, rng: () => number, size = VERB_ROUND) =>
  pickWeighted(all, log, rng, size).map((v) => phrasalQuestion(v, all, rng))
