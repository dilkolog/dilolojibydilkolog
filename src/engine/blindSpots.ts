import { topicName, topicStats, type GrammarExercise, type GrammarLog } from './grammar'
import { tallyCells, type LabData } from './labProgress'
import { MINIMAL_PAIRS, pairKey } from './listening'
import { TENSE_GUIDE } from './tenseGuide'
import type { TrapWord } from './traps'
import type { ErrorType, TargetLanguage } from './types'

/** Where a blind spot is worked on: a game of Games ('verbs' is the verb lab). */
export type RepairTarget = 'verbs' | 'gender' | 'article' | 'accent' | 'traps' | 'boss' | 'grammar' | 'pairs' | 'reflex' | 'ear' | 'register'

export interface BlindSpot {
  id: string
  /** The finding, as a sentence. */
  title: string
  /** The figures behind it. */
  detail: string
  target: RepairTarget
  /** Label of the button that goes there. */
  action: string
  /** 0–1: how bad, weighted by how many answers say so. */
  score: number
}

export interface BlindSpotInput {
  language: TargetLanguage
  /** Wrong answers by kind (see insights.errorBreakdown). */
  errors: Partial<Record<ErrorType, number>>
  lab?: LabData
  grammar: GrammarLog
  grammarExercises: readonly GrammarExercise[]
  pairs: GrammarLog
  traps: GrammarLog
  trapWords: readonly TrapWord[]
  reflex: GrammarLog
  /** The register questions (per thought and situation). */
  register?: GrammarLog
  /** Words the ear still misses in dictation. */
  earMissed: number
}

/** How many findings the card shows. */
export const BLIND_SPOTS_SHOWN = 3

const pct = (n: number) => `%${Math.round(n * 100)}`
/** Evidence weight: a few answers say little, ten or more say it. */
const weight = (answers: number) => Math.min(1, answers / 10)

const ERROR_SPOTS: Partial<Record<ErrorType, { title: string; target: RepairTarget; action: string; only?: TargetLanguage[] }>> = {
  gender: { title: 'İsimlerin cinsiyetinde en çok yanılıyorsun', target: 'gender', action: 'Cinsiyet kuralları', only: ['fr', 'es'] },
  article: { title: 'Artikelleri en çok karıştırıyorsun', target: 'article', action: 'Artikel antrenmanı', only: ['fr', 'es'] },
  accent: { title: 'Aksanlarda en çok takılıyorsun', target: 'accent', action: 'Aksan antrenmanı' },
  false_friend: { title: 'Benzeyen kelimelere (yalancı eşdeğer) en çok kanıyorsun', target: 'traps', action: 'Tuzak kelimeler' },
  confusion: { title: 'Birbirine benzeyen kelimeleri en çok karıştırıyorsun', target: 'boss', action: 'Boss savaşları' },
  collocation: { title: 'Kelimelerin birlikte kullanımında en çok yanılıyorsun', target: 'boss', action: 'Boss savaşları' },
  form: { title: 'Kelimenin doğru biçimini seçmekte en çok yanılıyorsun', target: 'boss', action: 'Boss savaşları' },
}

/**
 * What the learner's own data says about where they are weakest, strongest finding first: the kind
 * of mistake that makes up most of the wrong answers, the weakest tense, grammar topic and sound
 * contrast, the false friends, the phrases too slow for 3 seconds, the words the ear misses. Each
 * points at the practice for it. Only what enough answers support is said.
 */
export function blindSpots(input: BlindSpotInput): BlindSpot[] {
  const out: BlindSpot[] = []

  // The kind of mistake behind most wrong answers.
  const wrongTotal = Object.values(input.errors).reduce((n, c) => n + (c ?? 0), 0)
  for (const [type, spot] of Object.entries(ERROR_SPOTS) as [ErrorType, NonNullable<(typeof ERROR_SPOTS)[ErrorType]>][]) {
    const count = input.errors[type] ?? 0
    if (count < 5 || (spot.only && !spot.only.includes(input.language))) continue
    const share = count / Math.max(1, wrongTotal)
    if (share < 0.3) continue
    out.push({ id: `error:${type}`, title: spot.title, detail: `Yanlışlarının ${pct(share)} kadarı bu türden (${count} yanlış).`, target: spot.target, action: spot.action, score: share * weight(count) })
  }

  // The tense that goes worst in the verb lab.
  if (input.lab && input.language !== 'en') {
    const by = new Map<string, { ok: number; wrong: number }>()
    for (const c of tallyCells(input.lab)) {
      const t = by.get(c.tense) ?? { ok: 0, wrong: 0 }
      by.set(c.tense, { ok: t.ok + c.ok, wrong: t.wrong + c.wrong })
    }
    const worst = [...by.entries()]
      .map(([tense, t]) => ({ tense, ...t, n: t.ok + t.wrong, rate: t.wrong / Math.max(1, t.ok + t.wrong) }))
      .filter((t) => t.n >= 6 && t.wrong >= 3 && t.rate >= 0.3 && t.tense in TENSE_GUIDE)
      .sort((a, b) => b.rate * weight(b.n) - a.rate * weight(a.n))[0]
    if (worst) {
      const name = TENSE_GUIDE[worst.tense as keyof typeof TENSE_GUIDE].name
      out.push({ id: `tense:${worst.tense}`, title: `${name} çekimlerinde yanılıyorsun`, detail: `${worst.n} cevabın ${pct(worst.rate)} kadarı yanlış.`, target: 'verbs', action: 'Fiil laboratuvarı', score: worst.rate * weight(worst.n) })
    }
  }

  // The grammar topic with the lowest share right.
  const topic = topicStats(input.grammar, input.grammarExercises)
    .filter((t) => t.answered >= 5 && t.accuracy < 0.7)
    .sort((a, b) => (1 - b.accuracy) * weight(b.answered) - (1 - a.accuracy) * weight(a.answered))[0]
  if (topic) {
    out.push({ id: `grammar:${topic.topic}`, title: `“${topicName(topic.topic)}” sorularında zorlanıyorsun`, detail: `${topic.answered} cevabın ${pct(topic.accuracy)} kadarı doğru.`, target: 'grammar', action: 'Dilbilgisi soruları', score: (1 - topic.accuracy) * weight(topic.answered) })
  }

  // The sound contrast that is mixed up most.
  const contrasts = new Map<string, { ok: number; wrong: number }>()
  for (const pair of MINIMAL_PAIRS[input.language]) {
    const r = input.pairs[pairKey(input.language, pair)]
    if (!r) continue
    const c = contrasts.get(pair.contrast) ?? { ok: 0, wrong: 0 }
    contrasts.set(pair.contrast, { ok: c.ok + r.ok, wrong: c.wrong + r.wrong })
  }
  const sound = [...contrasts.entries()]
    .map(([contrast, c]) => ({ contrast, n: c.ok + c.wrong, rate: c.wrong / Math.max(1, c.ok + c.wrong) }))
    .filter((c) => c.n >= 4 && c.rate >= 0.3)
    .sort((a, b) => b.rate * weight(b.n) - a.rate * weight(a.n))[0]
  if (sound) {
    out.push({ id: `pair:${sound.contrast}`, title: `“${sound.contrast}” sesini ayırt etmekte zorlanıyorsun`, detail: `${sound.n} dinlemenin ${pct(sound.rate)} kadarında yanlış kelimeyi seçtin.`, target: 'pairs', action: 'Ses ayırt etme', score: sound.rate * weight(sound.n) })
  }

  // False friends fallen for.
  const trapIds = new Set(input.trapWords.filter((t) => t.language === input.language).map((t) => t.id))
  const traps = Object.entries(input.traps).filter(([id, r]) => trapIds.has(id) && r.wrong > r.ok)
  const trapWrong = traps.reduce((n, [, r]) => n + r.wrong, 0)
  if (traps.length >= 2 && trapWrong >= 3) {
    out.push({ id: 'traps', title: 'Tuzak kelimelere düşüyorsun', detail: `${traps.length} kelimede doğrulardan çok yanlışın var.`, target: 'traps', action: 'Tuzak kelimeler', score: Math.min(1, traps.length / 6) * weight(trapWrong * 2) })
  }

  // Phrases that do not come within 3 seconds.
  const slow = Object.values(input.reflex).filter((r) => r.wrong > r.ok)
  if (slow.length >= 3) {
    out.push({ id: 'reflex', title: 'Bazı kalıplar 3 saniyeye sığmıyor', detail: `${slow.length} kalıpta doğrulardan çok yanlış ya da geç kalma var.`, target: 'reflex', action: 'Refleks turu', score: Math.min(1, slow.length / 8) * 0.8 })
  }

  // Saying it in the wrong register.
  const reg = Object.values(input.register ?? {}).reduce((t, r) => ({ ok: t.ok + r.ok, wrong: t.wrong + r.wrong }), { ok: 0, wrong: 0 })
  const regN = reg.ok + reg.wrong
  if (regN >= 6 && reg.wrong / regN >= 0.4) {
    out.push({ id: 'register', title: 'Ortama uygun söyleyişi seçmekte zorlanıyorsun', detail: `${regN} cevabın ${pct(reg.wrong / regN)} kadarında sokak, standart ya da resmî söyleyişi karıştırdın.`, target: 'register', action: 'Kayıt farkı', score: (reg.wrong / regN) * weight(regN) })
  }

  // Words the ear misses in dictation.
  if (input.earMissed >= 5) {
    out.push({ id: 'ear', title: 'Kulağın bazı kelimeleri kaçırıyor', detail: `Dikte ederken ${input.earMissed} kelimeyi hâlâ yazamıyorsun.`, target: 'ear', action: 'Kaçırdıkların', score: Math.min(1, input.earMissed / 15) * 0.8 })
  }

  return out.sort((a, b) => b.score - a.score).slice(0, BLIND_SPOTS_SHOWN)
}
