/**
 * Near-duplicate search for the content checks (docs/ICERIK-FABRIKASI.md §5.1, 6): word 5-grams, MinHash
 * signatures and banding, so a new item is compared with the few old ones that share a band, not with all.
 */
const HASHES = 64

/** Lower case, accents and punctuation kept apart: two sentences differing only in commas are the same. */
export const words = (text: string) =>
  text
    .toLocaleLowerCase()
    .replace(/[’']/g, "'")
    .match(/[\p{L}\p{N}']+/gu) ?? []

/** The word n-grams of a text (short texts: the whole text is one gram, so they still compare). */
export function shingles(text: string, n = 5): Set<string> {
  const w = words(text)
  const out = new Set<string>()
  if (w.length < n) {
    if (w.length) out.add(w.join(' '))
    return out
  }
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '))
  return out
}

export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (!a.size && !b.size) return 1
  let both = 0
  for (const x of a) if (b.has(x)) both++
  return both / (a.size + b.size - both)
}

/** FNV-1a, salted: one hash function per seed. */
function hash(text: string, seed: number): number {
  let h = (0x811c9dc5 ^ Math.imul(seed + 1, 0x9e3779b1)) >>> 0
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

export function minhash(set: ReadonlySet<string>): number[] {
  const sig = new Array<number>(HASHES).fill(0xffffffff)
  for (const s of set) for (let i = 0; i < HASHES; i++) sig[i] = Math.min(sig[i], hash(s, i))
  return sig
}

interface Entry {
  id: string
  set: Set<string>
}

/** Items added once; a new text asks which ones look like it (Jaccard of their n-grams at least `threshold`). */
export class SimilarityIndex {
  private bands = new Map<string, Entry[]>()

  /**
   * More bands catch lower similarities: 32 bands of 2 find a pair at Jaccard 0.4 almost surely (texts, 40 %);
   * 16 of 4 at 0.7 (questions, 70 %) while sending far fewer unlike pairs to the exact comparison.
   */
  private n: number
  private bandCount: number
  constructor(n = 5, bandCount = 32) {
    this.n = n
    this.bandCount = bandCount
  }

  add(id: string, text: string) {
    const set = shingles(text, this.n)
    const entry = { id, set }
    for (const key of this.keys(set)) {
      const list = this.bands.get(key)
      if (list) list.push(entry)
      else this.bands.set(key, [entry])
    }
  }

  /** The most similar item at or above the threshold, other than the item itself. */
  closest(id: string, text: string, threshold: number): { id: string; score: number } | undefined {
    const set = shingles(text, this.n)
    const seen = new Set<string>()
    let best: { id: string; score: number } | undefined
    for (const key of this.keys(set)) {
      for (const e of this.bands.get(key) ?? []) {
        if (e.id === id || seen.has(e.id)) continue
        seen.add(e.id)
        const score = jaccard(set, e.set)
        if (score >= threshold && (!best || score > best.score)) best = { id: e.id, score }
      }
    }
    return best
  }

  private keys(set: ReadonlySet<string>): string[] {
    const sig = minhash(set)
    const rows = HASHES / this.bandCount
    return Array.from({ length: this.bandCount }, (_, b) => `${b}:${sig.slice(b * rows, (b + 1) * rows).join(',')}`)
  }
}
