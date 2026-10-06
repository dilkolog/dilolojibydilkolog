import { useEffect, useState } from 'react'
import { suggestMeanings } from '../data/wordpack'
import { turkishKin } from '../engine/turkishKin'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { OriginNotes } from './CrossLanguage'
import { SproutIcon } from './icons'

/**
 * What the word card in a text adds to the plain meaning: the Turkish word that came from this one,
 * a meaning from the word pack for a word not in the list yet, and the origin of a word that is.
 */
export function WordPopExtras({ language, lemma, entry }: { language: TargetLanguage; lemma: string; entry?: VocabularyEntry }) {
  const kin = turkishKin({ language, lemma: entry?.lemma ?? lemma })
  const [meanings, setMeanings] = useState<string[]>([])
  useEffect(() => {
    let live = true
    setMeanings([])
    if (!entry) void suggestMeanings(lemma, language).then((m) => live && setMeanings(m))
    return () => {
      live = false
    }
  }, [entry, lemma, language])
  return (
    <>
      {!entry && meanings.length > 0 && (
        <p className="small">
          <strong>Anlamı:</strong> {meanings.join(', ')}
        </p>
      )}
      {kin && (
        <p className="small cross-kin">
          <SproutIcon size={16} className="inline-icon" />
          <strong>Türkçedeki akrabası:</strong> <em lang="tr">{kin.tr}</em>
          {kin.note && <span className="muted"> ({kin.note})</span>}
        </p>
      )}
      {entry && <OriginNotes entry={entry} />}
    </>
  )
}
