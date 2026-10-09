import { useEffect, useState } from 'react'
import { fold } from '../data/dictionary'
import { db } from '../data/instance'
import { suggestMeanings } from '../data/wordpack'
import { normalize, splitArticle } from '../engine/answerCheck'
import { dismissLookup, lookupSuggestions } from '../engine/dictionaryNotes'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { CloseIcon, SearchIcon } from './icons'

/**
 * One line on Today for a word the learner keeps looking up in the dictionary but hasn't added:
 * needing it twice says it is worth learning. One word at a time; turning it down is remembered.
 */
export function LookupNudge({ language, vocabulary, onAdd }: { language: TargetLanguage; vocabulary: readonly VocabularyEntry[]; onAdd: (word: string, meaning: string) => void }) {
  const [shown, setShown] = useState<{ word: string; n: number; meaning: string } | null>(null)
  useEffect(() => {
    let live = true
    void (async () => {
      const notes = await db.getDictionaryNotes(language)
      const bare = (w: string) => fold(splitArticle(normalize(w).toLocaleLowerCase(language), language).rest)
      const have = new Set(vocabulary.filter((v) => v.language === language).map((v) => bare(v.lemma)))
      const [top] = lookupSuggestions(notes, (w) => have.has(bare(w)), 2, 1)
      if (!top) return live && setShown(null)
      const meaning = (notes.fixes[top.word]?.t ?? (await suggestMeanings(top.word, language))).slice(0, 2).join(', ')
      if (live) setShown({ ...top, meaning })
    })()
    return () => {
      live = false
    }
  }, [language, vocabulary])
  if (!shown) return null
  return (
    <div className="habit-nudge lookup-nudge">
      <button type="button" className="habit-nudge-main" onClick={() => onAdd(shown.word, shown.meaning)}>
        <SearchIcon size={18} />
        <span>
          <strong lang={language}>{shown.word}</strong> <span className="muted">· sözlükte {shown.n} kez baktın{shown.meaning && `: ${shown.meaning}`}</span>
        </span>
        <span className="habit-nudge-cta">Kelimelerime ekle</span>
      </button>
      <button
        type="button"
        className="icon-btn icon-btn-sm"
        aria-label="Bu kelimeyi önerme"
        title="Bu kelimeyi önerme"
        onClick={async () => {
          await db.saveDictionaryNotes(language, dismissLookup(await db.getDictionaryNotes(language), shown.word))
          setShown(null)
        }}
      >
        <CloseIcon size={16} />
      </button>
    </div>
  )
}
