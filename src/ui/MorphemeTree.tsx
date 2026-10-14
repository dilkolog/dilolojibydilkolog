import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { KelimeDB } from '../data/db'
import { linkEntries } from '../data/familyLinks'
import { makeLookup } from '../data/deriveLookup'
import { loadFrequency } from '../data/frequency'
import { createEntry, WordInputError } from '../data/wordInput'
import { loadPack, packKeys } from '../data/wordpack'
import type { Pack } from '../data/wordpackBuild'
import { familyOf, type FamilyNode, type Morph } from '../engine/derive'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { POS_NAME } from './labels'
import { PlusIcon } from './icons'
import { sameList } from './listMemory'

/** The pieces of a word: un- · comfort · -able · -ly. */
function Morphs({ morphs }: { morphs: Morph[] }) {
  return (
    <span className="morphs" role="img" aria-label={morphs.map((m) => m.text).join(' + ')}>
      {morphs.map((m, i) => (
        <span key={i} className={`morph morph-${m.kind}`} aria-hidden="true">
          {m.kind === 'suffix' ? `-${m.text}` : m.kind === 'prefix' ? `${m.text}-` : m.text}
        </span>
      ))}
    </span>
  )
}

/**
 * Root and endings: the word taken apart into prefix · root · suffix, and everything the dictionary
 * has that is built from the same root as a tree (comfort → comfortable → uncomfortable → …), with
 * what each ending does and its Turkish counterpart. One root and a few endings open a whole family.
 */
export function MorphemeTree({ db, entry, vocabulary, onOpen, onChanged }: { db: KelimeDB; entry: VocabularyEntry; vocabulary: VocabularyEntry[]; onOpen?: (entryId: string) => void; onChanged: () => void }) {
  const [data, setData] = useState<{ language: TargetLanguage; pack: Pack; rank: Map<string, number> } | null>(null)
  const [error, setError] = useState('')
  const language = entry.language

  useEffect(() => setError(''), [entry.id])

  useEffect(() => {
    let live = true
    void Promise.all([loadPack(language), loadFrequency(language).catch(() => new Map<string, number>())]).then(([pack, rank]) => {
      if (live && pack) setData({ language, pack, rank })
    })
    return () => {
      live = false
    }
  }, [language])

  const family = useMemo(() => {
    // The pack of the language the word is in (a language switch leaves the old one here for a moment).
    if (!data || data.language !== language) return undefined
    const lookup = makeLookup(data.pack, data.rank, vocabulary, language)
    const key = packKeys(entry.lemma, language).find((k) => lookup(k))
    return key ? familyOf(key, language, lookup) : undefined
  }, [data, entry.lemma, language, vocabulary])

  if (!family) return null

  const byLemma = new Map(vocabulary.filter((v) => v.language === language).map((v) => [v.lemma.toLocaleLowerCase(language), v]))
  const walk = (n: FamilyNode): FamilyNode[] => [n, ...n.children.flatMap(walk)]
  const current = walk(family.root).find((n) => n.word === family.current)

  const add = async (node: FamilyNode) => {
    setError('')
    try {
      const next = createEntry({ word: node.word, meaning: node.gloss ?? '', partOfSpeech: node.pos }, language, new Date())
      const existing = await db.vocabulary.get(next.id)
      if (existing) await linkEntries(db, entry, existing)
      else {
        const [placed] = await sameList(db, entry, [next])
        await db.vocabulary.put(placed)
        await linkEntries(db, entry, placed)
      }
      onChanged()
    } catch (e) {
      setError(e instanceof WordInputError ? e.message : 'Eklenemedi.')
    }
  }

  // Each branch comes in a moment after the one before it, so the tree is seen growing from its root.
  let order = 0
  const render = (node: FamilyNode) => {
    const own = byLemma.get(node.word)
    const isCurrent = node.word === family.current
    const n = order++
    return (
      <li key={node.word} className="morph-branch" style={{ '--n': n } as CSSProperties}>
        <div className={`morph-row${isCurrent ? ' is-current' : ''}`} aria-current={isCurrent ? 'true' : undefined}>
          {own && !isCurrent && onOpen ? (
            <button type="button" className="link morph-word" lang={language} onClick={() => onOpen(own.id)}>
              {node.word}
            </button>
          ) : (
            <span className="morph-word" lang={language}>
              {node.word}
            </span>
          )}
          <span className="small muted">
            {POS_NAME[node.pos]}
            {node.gloss ? ` · ${node.gloss}` : ''}
          </span>
          {node.affix && <Morphs morphs={node.morphs} />}
          {!own && !isCurrent && node.gloss && (
            <button type="button" className="btn btn-quiet btn-sm" aria-label={`${node.word} kelimesini ekle ve bağla`} onClick={() => void add(node)}>
              <PlusIcon size={14} /> Ekle
            </button>
          )}
        </div>
        {node.children.length > 0 && <ul className="morph-tree">{node.children.map(render)}</ul>}
      </li>
    )
  }

  return (
    <section className="section stack morpheme-card">
      <h2 className="section-title">Kök ve ekler</h2>
      {current && current.word !== family.root.word ? (
        <p className="small">
          <span lang={language}>{current.word}</span> = <Morphs morphs={current.morphs} />
        </p>
      ) : (
        <p className="small muted">Bu kök, ekler ekleyince başka kelimelere dönüşüyor. Bir kök ve birkaç ek öğrenince hepsini tanırsın.</p>
      )}
      <ul className="morph-tree morph-tree-root">{render(family.root)}</ul>
      {error && <p className="cross-warn">{error}</p>}
      <ul className="morph-legend small" aria-label="Kullanılan ekler">
        {family.affixes.map((a) => (
          <li key={`${a.kind}${a.form}`}>
            <span className={`morph morph-${a.kind}`}>{a.kind === 'prefix' ? `${a.form}-` : `-${a.form}`}</span> {a.role}
            <span className="muted"> · Türkçesi: {a.tr}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
