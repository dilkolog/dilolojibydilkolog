import type { Rng } from './rng'
import { displayForm } from './exercises'
import type { VocabularyEntry } from './types'

/**
 * Gravity: meanings fall, the word is typed before the meaning lands. The rules are here (movement,
 * speed, spawning, matching), as plain functions of the state, so a frame is the same as a test step.
 */
export interface Drop {
  id: number
  entry: VocabularyEntry
  /** Across the field, 0–1 (the middle of the drop). */
  x: number
  /** Down the field, 0 (top) to 1 (landed). */
  y: number
  prompt: string
}

export interface GravityState {
  drops: Drop[]
  lives: number
  score: number
  /** Seconds played. */
  time: number
  /** Seconds until the next drop appears. */
  nextIn: number
  /** Words still to fall. */
  queue: VocabularyEntry[]
  nextId: number
  solved: VocabularyEntry[]
  missed: VocabularyEntry[]
  /** Run of words solved without one landing: raises the points. */
  streak: number
}

export const START_LIVES = 3

/** How fast a drop falls (field heights per second): faster the longer the game has run. */
export const fallSpeed = (time: number) => Math.min(0.32, 0.075 + time * 0.0016)

/** Seconds between drops: shorter as the game goes. */
export const spawnGap = (time: number) => Math.max(1.4, 3.2 - time * 0.02)

/** At most this many drops at once: more than a thumb-typist can read. */
export const MAX_DROPS = 5

export const newGravity = (words: readonly VocabularyEntry[]): GravityState => ({ drops: [], lives: START_LIVES, score: 0, time: 0, nextIn: 0.6, queue: [...words], nextId: 1, solved: [], missed: [], streak: 0 })

export const isOver = (s: GravityState) => s.lives <= 0 || (s.queue.length === 0 && s.drops.length === 0)

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/’/g, "'").replace(/\s+/g, ' ').trim()

/** The forms that count as the word: with and without its article, and the alternative spellings. */
export const acceptedForms = (e: VocabularyEntry) => [...new Set([e.lemma, displayForm(e), ...(e.alternativeForms ?? [])].map(norm))]

/**
 * Time passes: drops fall, one that lands costs a life (and the streak), the next one appears when
 * it is time. `rng` only picks where across the field a drop starts.
 */
export function stepGravity(s: GravityState, dt: number, rng: Rng): GravityState {
  if (isOver(s)) return s
  const speed = fallSpeed(s.time)
  let lives = s.lives
  let streak = s.streak
  const missed = [...s.missed]
  const drops: Drop[] = []
  for (const d of s.drops) {
    const y = d.y + speed * dt
    if (y >= 1) {
      lives--
      streak = 0
      missed.push(d.entry)
    } else drops.push({ ...d, y })
  }
  let nextIn = s.nextIn - dt
  const queue = [...s.queue]
  let nextId = s.nextId
  if (nextIn <= 0 && queue.length > 0 && drops.length < MAX_DROPS) {
    const entry = queue.shift()!
    // Away from the drops already high up, so two meanings are not written over each other.
    const taken = drops.filter((d) => d.y < 0.25).map((d) => d.x)
    let x = 0.15 + rng() * 0.7
    for (let tries = 0; tries < 6 && taken.some((t) => Math.abs(t - x) < 0.22); tries++) x = 0.15 + rng() * 0.7
    drops.push({ id: nextId++, entry, x, y: 0, prompt: entry.senses[0].gloss })
    nextIn = spawnGap(s.time)
  } else if (nextIn <= 0) nextIn = 0.3
  return { ...s, drops, lives, streak, missed, nextIn, queue, nextId, time: s.time + dt }
}

/** Points for a word: more the higher it was caught (not near the ground) and the longer the streak. */
export const pointsFor = (drop: Drop, streak: number) => Math.round(10 * (1.5 - drop.y) * (1 + Math.min(streak, 10) * 0.1))

/**
 * What was typed: if it is a falling word the lowest such drop is solved (the one closest to landing),
 * otherwise nothing changes. A partial word does nothing, so this can run on every key.
 */
export function submitGravity(s: GravityState, typed: string): { state: GravityState; hit?: Drop } {
  const t = norm(typed)
  if (!t) return { state: s }
  const candidates = s.drops.filter((d) => acceptedForms(d.entry).includes(t)).sort((a, b) => b.y - a.y)
  const hit = candidates[0]
  if (!hit) return { state: s }
  return {
    hit,
    state: { ...s, drops: s.drops.filter((d) => d.id !== hit.id), score: s.score + pointsFor(hit, s.streak), streak: s.streak + 1, solved: [...s.solved, hit.entry] },
  }
}
