import { pickWeighted, type GrammarLog } from './grammar'
import type { TargetLanguage } from './types'

/**
 * Register: the same thought in the street's words, the standard words and the office's words
 * ("bouffer / manger / se restaurer"). A learner who only knows one register says the right word
 * in the wrong place. Asked as a situation (a message to a friend, a chat with a stranger, a job
 * interview) with the three ways of saying it to choose from.
 */
export type Register = 'informal' | 'standard' | 'formal'

export interface RegisterItem {
  id: string
  language: TargetLanguage
  /** The thought, in Turkish. */
  tr: string
  informal: string
  standard: string
  formal: string
  /** Where a form is used when it is not everywhere (Spain only, British only), in Turkish. */
  note?: string
  source: string
}

export const REGISTERS: Register[] = ['informal', 'standard', 'formal']

export const SITUATION: Record<Register, string> = {
  informal: 'Yakın bir arkadaşınla mesajlaşıyorsun.',
  standard: 'Tanımadığın biriyle sıradan bir ortamda konuşuyorsun (mağaza, yolda).',
  formal: 'İş mülakatındasın ya da resmî bir e-posta yazıyorsun.',
}

export const REGISTER_NAME: Record<Register, string> = { informal: 'günlük konuşma', standard: 'standart', formal: 'resmî' }

export const REGISTER_ROUND = 8

export interface RegisterQuestion {
  /** `${item}|${register}`: the key of the learner's log. */
  id: string
  item: RegisterItem
  register: Register
  situation: string
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

export function registerQuestion(item: RegisterItem, register: Register, rng: () => number): RegisterQuestion {
  return {
    id: `${item.id}|${register}`,
    item,
    register,
    situation: SITUATION[register],
    options: shuffle([item.informal, item.standard, item.formal], rng),
    answer: item[register],
  }
}

/** A round: each thought once, in one of its three situations; the situations missed before first (see pickWeighted). */
export function registerRound(items: readonly RegisterItem[], log: GrammarLog, language: TargetLanguage, rng: () => number, size = REGISTER_ROUND): RegisterQuestion[] {
  const pool = items.filter((i) => i.language === language).flatMap((item) => REGISTERS.map((register) => ({ id: `${item.id}|${register}`, item, register })))
  const seen = new Set<string>()
  const out: RegisterQuestion[] = []
  for (const p of pickWeighted(pool, log, rng, pool.length)) {
    if (seen.has(p.item.id)) continue
    seen.add(p.item.id)
    out.push(registerQuestion(p.item, p.register, rng))
    if (out.length >= size) break
  }
  return out
}
