import type { TargetLanguage } from '../engine/types'
import type { Pack, PackRecord } from './wordpackBuild'

export interface MeaningSupplement {
  language: TargetLanguage
  word: string
  pos: string
  meanings: string[]
  definition?: string
  example?: { text: string; translation: string }
  source: string
  status: 'draft' | 'reviewed'
  reviewedBy?: string
  /** Exact previous meanings authorized by this editorial correction. */
  replaces?: string[]
}

/** Reviewed supplements can fill gaps and add real headwords; existing corrections always win. */
export function enrichPack(base: Pack, fresh: Pack | undefined, supplements: readonly MeaningSupplement[], version: string): { pack: Pack; filled: number; added: number; corrected: number } {
  const w: Record<string, PackRecord> = structuredClone(base.w)
  const hasMeaning = (r: PackRecord | undefined) => !!r?.t?.some(t => t.trim())
  let filled = 0
  let added = 0
  let corrected = 0
  for (const [word, rec] of Object.entries(fresh?.w ?? {})) {
    if (!w[word]) {
      if (hasMeaning(rec)) { w[word] = structuredClone(rec); added++ }
    } else {
      const old = w[word]
      const meanings = hasMeaning(old) ? old.t : (!old.p || !rec.p || old.p === rec.p) ? rec.t : undefined
      if (!hasMeaning(old) && meanings?.length) filled++
      w[word] = { ...rec, ...old, ...(meanings?.length ? { t: meanings } : {}) }
    }
  }
  for (const s of supplements) {
    if (s.status !== 'reviewed') continue
    if (!s.reviewedBy?.trim() || !s.source?.trim() || !/^[nvadpcrh]$/.test(s.pos) || !s.word.trim() || s.word !== s.word.trim().normalize('NFC').toLowerCase() || !s.meanings.length || s.meanings.some(t => !t.trim() || t.length > 160)) throw new Error(`Invalid reviewed supplement: ${s.word}`)
    const old = w[s.word]
    if (old?.p && old.p !== s.pos) throw new Error(`Part-of-speech conflict: ${s.word} (${old.p}/${s.pos})`)
    if (hasMeaning(old)) {
      if (!s.replaces || JSON.stringify(old.t) === JSON.stringify(s.meanings)) continue
      if (JSON.stringify(old.t) !== JSON.stringify(s.replaces)) throw new Error(`Meaning correction conflict: ${s.word}`)
      corrected++
    } else if (old) filled++; else added++
    w[s.word] = { ...old, p: s.pos, t: [...new Set(s.meanings.map(t => t.trim()))].slice(0, 4), ...(s.definition && !old?.d ? { d: s.definition } : {}), ...(s.example && !old?.c ? { c: [[s.example.text, s.example.translation]] } : {}) }
  }
  const f = Object.fromEntries(Object.entries({ ...fresh?.f, ...base.f }).filter(([, lemma]) => !!w[lemma]))
  return { pack: { v: version, w, ...(Object.keys(f).length ? { f } : {}) }, filled, added, corrected }
}
