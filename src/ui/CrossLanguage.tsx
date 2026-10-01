import { useEffect, useState } from 'react'
import { crossLanguageLinks, falseFriendsOf, type CrossLink } from '../engine/crossLanguage'
import { displayForm } from '../engine/exercises'
import { TARGET_LANGUAGES, type VocabularyEntry } from '../engine/types'
import { db } from '../data/instance'
import { LANGUAGE_SHORT } from './labels'

/** The same concept in the learner's other languages, read from their own word list. */
function useCrossLinks(entry: VocabularyEntry): CrossLink[] {
  const [links, setLinks] = useState<CrossLink[]>([])
  useEffect(() => {
    let live = true
    const others = TARGET_LANGUAGES.filter((l) => l !== entry.language)
    db.vocabulary
      .where('language')
      .anyOf(others)
      .toArray()
      .then((all) => live && setLinks(crossLanguageLinks(entry, all)))
    return () => {
      live = false
    }
  }, [entry])
  return links
}

/**
 * False-friend warning and links to the same word in the other languages. `compact` is the
 * one-line form for the new-word card; the full form lists everything for the word page.
 */
export function CrossLanguageNotes({ entry, compact = false }: { entry: VocabularyEntry; compact?: boolean }) {
  const links = useCrossLinks(entry)
  const friends = falseFriendsOf(entry)
  if (!links.length && !friends.length) return null
  const shown = compact ? links.slice(0, 3) : links
  return (
    <div className={compact ? 'cross cross-compact' : 'cross'}>
      {friends.map((f) => (
        <p key={`${f.lang}:${f.word}`} className="cross-warn">
          ⚠️ <strong>Sahte dost:</strong> {LANGUAGE_SHORT[f.lang]} <em lang={f.lang}>{f.word}</em> “{f.gloss}” demek; bu kelime öyle değil.
        </p>
      ))}
      {shown.length > 0 && (
        <p className="cross-links">
          🔗 Diğer dillerde:{' '}
          {shown.map((l, i) => (
            <span key={l.entry.id}>
              {i > 0 && ', '}
              {LANGUAGE_SHORT[l.entry.language]} <em lang={l.entry.language}>{displayForm(l.entry)}</em>
              {l.cognate && <span className="cognate-tag">soydaş</span>}
            </span>
          ))}
        </p>
      )}
      {!compact && links.some((l) => l.cognate) && (
        <p className="small muted">Soydaş: aynı anlamda ve neredeyse aynı yazılan kelime; biri ötekini hatırlatır.</p>
      )}
    </div>
  )
}
