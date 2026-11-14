/**
 * PTE-style practice for English: the five tasks, the shape of their content, the exam's rules and a check of a
 * content pack. This file is imported by `scripts/build-pte.mjs` as well (Node strips the types), so it stays plain:
 * no runtime imports, no enums.
 *
 * The content is original (written for Diloloji); "PTE" only names the style of the tasks. Nothing here works out a
 * 10–90 score: a task shows the share of its points that were right.
 */

/** Write from dictation, repeat sentence, read aloud, fill in the blanks (dropdown), answer short question. */
export type PteTask = 'wfd' | 'rs' | 'ra' | 'fib' | 'asq'
export const PTE_TASKS: readonly PteTask[] = ['wfd', 'rs', 'ra', 'fib', 'asq']

export interface PteWfd {
  id: string
  text: string
  level: string
  topic: string
  tr: string
}
export interface PteRs {
  id: string
  text: string
  level: string
  tr: string
}
export interface PteRa {
  id: string
  text: string
  level: string
  topic: string
  tr: string
}
export interface PteBlank {
  answer: string
  options: string[]
}
export interface PteFib {
  id: string
  /** The paragraph with its gaps marked [[1]], [[2]]… in order, one per blank. */
  text: string
  blanks: PteBlank[]
  level: string
  topic: string
  tr: string
}
export interface PteAsq {
  id: string
  question: string
  /** Every answer that counts as right (one is enough). */
  answers: string[]
  level: string
  tr: string
}

export interface PteItems {
  wfd: PteWfd[]
  rs: PteRs[]
  ra: PteRa[]
  fib: PteFib[]
  asq: PteAsq[]
}
export type PteItem = PteItems[PteTask][number]

/** The built pack the app loads (src/data/pte/en.json). */
export interface PtePack extends PteItems {
  language: 'en'
  source: string
  /** Set while the pack is only a small sample standing in for the real content. */
  placeholder?: string
}

/** How each task is named on the screen. */
export const PTE_TASK_NAME: Record<PteTask, string> = {
  wfd: 'Dikte',
  rs: 'Cümle tekrarı',
  ra: 'Sesli okuma',
  fib: 'Boşluk doldurma',
  asq: 'Kısa soru',
}

/**
 * The exam's rules and the content's brief, in one place. Read from docs/sinavlar/PTE-462.md (branch belge/pte-462,
 * "Ek Bölüm", Pearson's format pages and the 2026 Score Guide; not yet merged): every value says where it comes from
 * ("Doc") or that it is Diloloji's own choice ("Brief": the content brief of 2026-11-14; "Ours"). Change them here only.
 *
 * `listens`: plays of the recording in exam mode (practice mode always allows replaying).
 * `prepSeconds` / `answerSeconds`: the exam's preparation and answer time (practice mode has no clock); null where the
 * exam gives the single question no time of its own (the section's time is managed by the test taker).
 * `silenceSeconds`: in exam mode the recording closes after this long without speech (before or while speaking).
 * `words`: the length an item must have, in words (a blank counts as a word); the check below enforces it.
 */
export const PTE_RULES = {
  /** Brief: the target is a PTE overall of 24 (above A1, early A2), for the Subclass 462 visa. Shown nowhere as a score. */
  target: 24,
  /** Brief: the share of each level in the content (no B2 or above); the build warns when a pack strays from it. */
  levels: { A1: 0.2, A2: 0.5, B1: 0.3 },
  /** Ours: items in one round of a task. */
  roundSize: 5,
  wfd: {
    /** Doc: plays once, by itself. */
    listens: 1,
    /** Doc: no time per question (within the listening section). */
    answerSeconds: null,
    /** Brief: a 3–5 s recording (Doc) is 8–12 words. */
    words: [8, 12],
  },
  rs: {
    /** Doc: plays once. */
    listens: 1,
    /** Doc: no preparation, the microphone opens when the recording ends. */
    prepSeconds: 0,
    /** Doc: 15 s to answer. */
    answerSeconds: 15,
    /** Doc: 3 s of silence closes the recording. */
    silenceSeconds: 3,
    /** Brief: a 3–9 s recording (Doc) is 6–14 words. */
    words: [6, 14],
  },
  ra: {
    /** Doc: 30–40 s of preparation; the middle of it. */
    prepSeconds: 35,
    /** Doc: "varies by item, depending on the length of text", no number: 40 s is ours, for a 60-word text. */
    answerSeconds: 40,
    /** Doc: 3 s of silence closes the recording. */
    silenceSeconds: 3,
    /** Doc: at most 60 words (the 15 at least is ours). */
    words: [15, 60],
  },
  fib: {
    /** Doc: no time per question (within the reading section's 23–30 min). */
    answerSeconds: null,
    /** Doc: at most 200 words. Brief: half the items 60–90 words, half 120–180 (an item must fall in one of the two). */
    words: [60, 200],
    lengths: [
      [60, 90],
      [120, 180],
    ],
    /** Ours: four choices in each blank's list. */
    options: 4,
    /** Brief: 4–5 blanks a paragraph. */
    blanks: [4, 5],
  },
  asq: {
    /** Doc: plays once. */
    listens: 1,
    /** Doc: no preparation, no tone. */
    prepSeconds: 0,
    /** Doc: 10 s to answer (here typed: the 3 s silence rule of the spoken answer does not apply). */
    answerSeconds: 10,
    /** Doc: a 3–9 s question; 4–20 words (ours). */
    words: [4, 20],
  },
} as const

/** The levels the content may have (the brief's, no B2 or above). */
export const PTE_LEVELS = Object.keys(PTE_RULES.levels) as (keyof typeof PTE_RULES.levels)[]

/** Words in a text; a blank mark counts as the word it stands for. */
export const pteWords = (text: string): number => text.replace(/\[\[\d+\]\]/g, ' blank ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length

/**
 * How a pack strays from the brief's mix, as readable lines (warnings, not errors: a batch can be lopsided while the
 * whole is not): each level's share against the brief's, more than 10 points off; the paragraphs' two lengths.
 */
export function pteMixWarnings(items: Partial<Record<PteTask, readonly { level?: string; text?: string }[]>>): string[] {
  const all = PTE_TASKS.flatMap((t) => items[t] ?? [])
  if (!all.length) return []
  const out: string[] = []
  for (const [level, want] of Object.entries(PTE_RULES.levels)) {
    const share = all.filter((i) => i.level === level).length / all.length
    if (Math.abs(share - want) > 0.1) out.push(`${level}: %${Math.round(share * 100)} (hedef %${Math.round(want * 100)})`)
  }
  const fib = items.fib ?? []
  if (fib.length >= 4) {
    const short = fib.filter((f) => pteWords(f.text ?? '') <= PTE_RULES.fib.lengths[0][1]).length / fib.length
    if (Math.abs(short - 0.5) > 0.2) out.push(`boşluk doldurma: paragrafların %${Math.round(short * 100)} kadarı kısa (hedef yarı yarıya)`)
  }
  return out
}

/** The blank numbers marked in a paragraph, in order. */
export const blankMarks = (text: string): number[] => [...text.matchAll(/\[\[(\d+)\]\]/g)].map((m) => Number(m[1]))

/** The paragraph cut at its marks: text, blank, text, … (`blank` is the 0-based blank index). */
export function blankParts(text: string): ({ text: string } | { blank: number })[] {
  const out: ({ text: string } | { blank: number })[] = []
  let at = 0
  for (const m of text.matchAll(/\[\[(\d+)\]\]/g)) {
    if (m.index > at) out.push({ text: text.slice(at, m.index) })
    out.push({ blank: Number(m[1]) - 1 })
    at = m.index + m[0].length
  }
  if (at < text.length) out.push({ text: text.slice(at) })
  return out
}

/** The text an item is heard or read by (the question for a short question). */
export const pteText = (task: PteTask, item: PteItem): string => (task === 'asq' ? (item as PteAsq).question : (item as PteWfd).text)

const filled = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

/**
 * What is wrong with a pack (or a raw batch), as readable lines; empty when it is fine. Ids are unique across every
 * task and safe as keys, every text has its task's length, a paragraph's marks match its blanks one to one and in
 * order, every blank has its answer among exactly `PTE_RULES.fib.options` different choices, and a short question
 * has at least one answer.
 */
export function pteProblems(items: Partial<Record<PteTask, unknown>>): string[] {
  const problems: string[] = []
  const seen = new Set<string>()
  for (const task of PTE_TASKS) {
    const list = items[task]
    if (list === undefined) continue
    if (!Array.isArray(list)) {
      problems.push(`${task}: liste değil`)
      continue
    }
    list.forEach((raw: unknown, i) => {
      const row = (raw ?? {}) as Record<string, unknown>
      const id = typeof row.id === 'string' ? row.id : ''
      const at = `${task}[${i}]${id ? ` ${id}` : ''}`
      if (!/^[\w-]+$/.test(id)) problems.push(`${at}: kimlik (id) boş ya da harf, rakam, - ve _ dışında karakter taşıyor`)
      else if (seen.has(id)) problems.push(`${at}: kimlik iki kez kullanılmış`)
      seen.add(id)
      if (!(PTE_LEVELS as readonly string[]).includes(row.level as string)) problems.push(`${at}: seviye (level) ${PTE_LEVELS.join(', ')} değil`)
      if (!filled(row.tr)) problems.push(`${at}: Türkçesi (tr) yok`)
      if ((task === 'wfd' || task === 'ra' || task === 'fib') && !filled(row.topic)) problems.push(`${at}: konu (topic) yok`)
      const text = task === 'asq' ? row.question : row.text
      if (!filled(text)) {
        problems.push(`${at}: ${task === 'asq' ? 'soru (question)' : 'metin (text)'} yok`)
        return
      }
      const [min, max] = PTE_RULES[task].words
      const n = pteWords(text)
      if (n < min || n > max) problems.push(`${at}: ${n} kelime; ${min}–${max} olmalı`)
      else if (task === 'fib' && !PTE_RULES.fib.lengths.some(([a, b]) => n >= a && n <= b)) problems.push(`${at}: ${n} kelime; ${PTE_RULES.fib.lengths.map(([a, b]) => `${a}–${b}`).join(' ya da ')} olmalı`)
      if (task !== 'fib' && blankMarks(text).length) problems.push(`${at}: boşluk işareti yalnızca boşluk doldurmada olur`)
      if (task === 'fib') {
        const blanks = row.blanks
        if (!Array.isArray(blanks)) {
          problems.push(`${at}: boşluklar (blanks) yok`)
          return
        }
        const marks = blankMarks(text)
        const [bMin, bMax] = PTE_RULES.fib.blanks
        if (blanks.length < bMin || blanks.length > bMax) problems.push(`${at}: ${blanks.length} boşluk; ${bMin}–${bMax} olmalı`)
        if (marks.length !== blanks.length || marks.some((m, k) => m !== k + 1)) problems.push(`${at}: metindeki işaretler (${marks.map((m) => `[[${m}]]`).join(' ') || 'yok'}) ${blanks.length} boşlukla sırayla tutmuyor`)
        blanks.forEach((b: unknown, k) => {
          const blank = (b ?? {}) as Record<string, unknown>
          const options = Array.isArray(blank.options) ? blank.options : []
          if (options.length !== PTE_RULES.fib.options || !options.every(filled)) problems.push(`${at}: ${k + 1}. boşlukta ${PTE_RULES.fib.options} seçenek olmalı`)
          else if (new Set(options.map((o) => o.trim().toLowerCase())).size !== options.length) problems.push(`${at}: ${k + 1}. boşlukta aynı seçenek iki kez var`)
          if (!filled(blank.answer) || !options.includes(blank.answer)) problems.push(`${at}: ${k + 1}. boşluğun cevabı seçeneklerin içinde değil`)
        })
      }
      if (task === 'asq') {
        const answers = row.answers
        if (!Array.isArray(answers) || !answers.length || !answers.every(filled)) problems.push(`${at}: cevaplar (answers) boş`)
      }
    })
  }
  return problems
}
