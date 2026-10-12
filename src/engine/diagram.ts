import { shuffle, type Rng } from './rng'
import type { TargetLanguage } from './types'

/**
 * A picture with labels: dots on a drawing, a photo or a map, each standing for a word. Studied by being
 * asked, dot by dot, what it is (chosen from the labels, or typed). The picture is an ordinary image in the
 * media store; this is only the points on it.
 */
export interface DiagramPoint {
  id: string
  /** Where on the picture, 0–1 across and down. */
  x: number
  y: number
  /** The word the dot stands for (with its article, if any). */
  word: string
  /** Its meaning in Turkish (optional). */
  meaning?: string
}

export interface Diagram {
  id: string
  language: TargetLanguage
  title: string
  /** The picture, in the media store. */
  imageId: string
  points: DiagramPoint[]
  createdAt: string
  updatedAt: string
}

/** Most labels on one picture: more is a crowd, not a diagram. */
export const MAX_POINTS = 12

export const newDiagram = (language: TargetLanguage, title: string, imageId: string, now = new Date()): Diagram => ({
  id: `pic-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  language,
  title: title.trim() || 'Resim',
  imageId,
  points: [],
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
})

const clamp = (n: number) => Math.min(1, Math.max(0, n))

/** A new dot where the picture was tapped (the position is kept inside the picture). */
export function addPoint(d: Diagram, x: number, y: number, word = '', now = new Date()): Diagram {
  if (d.points.length >= MAX_POINTS) return d
  const id = `p${Math.max(0, ...d.points.map((p) => Number(p.id.slice(1)) || 0)) + 1}`
  return { ...d, points: [...d.points, { id, x: clamp(x), y: clamp(y), word }], updatedAt: now.toISOString() }
}

export const editPoint = (d: Diagram, id: string, patch: Partial<Pick<DiagramPoint, 'word' | 'meaning' | 'x' | 'y'>>, now = new Date()): Diagram => ({
  ...d,
  points: d.points.map((p) => (p.id === id ? { ...p, ...patch, ...(patch.x !== undefined ? { x: clamp(patch.x) } : {}), ...(patch.y !== undefined ? { y: clamp(patch.y) } : {}) } : p)),
  updatedAt: now.toISOString(),
})

export const removePoint = (d: Diagram, id: string, now = new Date()): Diagram => ({ ...d, points: d.points.filter((p) => p.id !== id), updatedAt: now.toISOString() })

/** The dots with a word: a diagram can be studied once it has at least two of them. */
export const labelled = (d: Diagram) => d.points.filter((p) => p.word.trim())
export const studyable = (d: Diagram) => labelled(d).length >= 2

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/’/g, "'").replace(/\s+/g, ' ').trim()

/** A typed answer: accents and capitals do not matter, and the article may be left out. */
export function isRight(point: DiagramPoint, typed: string): boolean {
  const t = norm(typed)
  if (!t) return false
  const full = norm(point.word)
  const bare = full.replace(/^(le|la|les|l'|un|une|el|los|las|lo|un|una|the|a|an)\s?/, '')
  return t === full || t === bare
}

/** One round: the labelled dots in a shuffled order, and the words to choose from (shuffled, each once). */
export function diagramRound(d: Diagram, rng: Rng): { order: DiagramPoint[]; bank: string[] } {
  const points = labelled(d)
  return { order: shuffle(points, rng), bank: shuffle([...new Set(points.map((p) => p.word.trim()))], rng) }
}
