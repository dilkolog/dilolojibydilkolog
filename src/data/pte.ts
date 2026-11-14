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
 * The exam's rules, in one place. Taken from docs/sinavlar/PTE-462.md (branch belge/pte-462, not yet reviewed); every
 * value read from it says so, the rest are Diloloji's own choices. Change them here only.
 *
 * `listens`: how many times the recording may be played in exam mode (practice mode always allows replaying).
 * `prepSeconds` / `answerSeconds`: the exam's preparation and answer time (practice mode has no clock); null when
 * the document gives no time for the single task (it is managed within the section).
 * `words`: the length a content item must have, in words (the check below).
 */
export const PTE_RULES = {
  /** Items in one round of a task (Diloloji's choice). */
  roundSize: 5,
  wfd: {
    /** Plays once (the task's instruction, as on the exam screen). */
    listens: 1,
    /** Doc: no time per question ("Kalan Listening bölüm süresi içinde"). */
    answerSeconds: null,
    /** Doc: a 3–5 s recording; about 6–15 words read at a learner's pace (Diloloji's reading of it). */
    words: [5, 15],
  },
  rs: {
    listens: 1,
    /** Doc: no preparation, the microphone opens when the recording ends. */
    prepSeconds: 0,
    /** Doc: 15 s to answer. */
    answerSeconds: 15,
    /** Doc: a 3–9 s recording; 4–18 words (Diloloji's reading of it). */
    words: [4, 18],
  },
  ra: {
    /** Doc: 30–40 s of preparation; the middle of it. */
    prepSeconds: 35,
    /** Doc: "depends on the length of the text", no number given: 40 s is Diloloji's choice for a 60-word text. */
    answerSeconds: 40,
    /** Doc: at most 60 words. */
    words: [15, 60],
  },
  fib: {
    /** Doc: no time per question (the reading section's time is managed by the test taker). */
    answerSeconds: null,
    /** Doc: at most 200 words. */
    words: [25, 200],
    /** Choices in each blank's list (the task's brief: four). */
    options: 4,
    /** Blanks in one paragraph (Diloloji's choice; the doc does not say per paragraph). */
    blanks: [2, 6],
  },
  asq: {
    listens: 1,
    /** Doc: no preparation. */
    prepSeconds: 0,
    /** Doc: 10 s to answer. */
    answerSeconds: 10,
    /** Doc: a 3–9 s question; 4–20 words (Diloloji's reading of it). */
    words: [4, 20],
  },
} as const

export const PTE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

/** Words in a text, the blank marks left out. */
export const pteWords = (text: string): number => text.replace(/\[\[\d+\]\]/g, ' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length

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
      if (!(PTE_LEVELS as readonly string[]).includes(row.level as string)) problems.push(`${at}: seviye (level) A1–C2 değil`)
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
