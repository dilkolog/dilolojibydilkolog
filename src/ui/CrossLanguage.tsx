import '../lazy.css'
import { useEffect, useState } from 'react'
import { LinesSkeleton } from './Skeleton'
import { useCrossLinks, useEquivalents } from './useCrossLanguage'
import { AlertIcon, CheckIcon, GlobeIcon, LinkIcon, SproutIcon } from './icons'
import { conceptGroups, falseFriendsOf, type Concept } from '../engine/crossLanguage'
import { displayForm } from '../engine/exercises'
import { TARGET_LANGUAGES, type TargetLanguage, type VocabularyEntry } from '../engine/types'
import { sourceName, withArticle, type LanguageForm } from '../data/wiktionary'
import { turkishKin } from '../engine/turkishKin'
import { createEntry } from '../data/wordInput'
import { db } from '../data/instance'
import { LANGUAGE_SHORT } from './labels'
import { placeNew } from './listMemory'
import { cleanEtymology } from '../data/wordpackBuild'

/**
 * False-friend warning and links to the same word in the other languages. `compact` is the
 * one-line form for the new-word card; the full form lists everything for the word page.
 */
export function CrossLanguageNotes({ entry, compact = false }: { entry: VocabularyEntry; compact?: boolean }) {
  const links = useCrossLinks(entry)
  const friends = falseFriendsOf(entry)
  const kin = turkishKin(entry)
  if (!links.length && !friends.length && !kin) return null
  const shown = compact ? links.slice(0, 3) : links
  return (
    <div className={compact ? 'cross cross-compact' : 'cross'}>
      {kin && (
        <p className="cross-kin">
          <SproutIcon size={16} className="inline-icon" />
          <strong>Türkçedeki akrabası:</strong> <em lang="tr">{kin.tr}</em>
          {kin.note && <span className="small muted"> ({kin.note})</span>}
        </p>
      )}
      {friends.map((f) => (
        <p key={`${f.lang}:${f.word}`} className="cross-warn">
          <AlertIcon size={16} className="inline-icon" /><strong>Sahte dost:</strong> {LANGUAGE_SHORT[f.lang]} <em lang={f.lang}>{f.word}</em> “{f.gloss}” demek; bu kelime öyle değil.
        </p>
      ))}
      {shown.length > 0 && (
        <p className="cross-links">
          <LinkIcon size={16} className="inline-icon" />Diğer dillerde:{' '}
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

/** The same concept in English, French and Spanish, side by side. */
export function ConceptsView({ language, onOpen }: { language: VocabularyEntry['language']; onOpen: (entryId: string) => void }) {
  const [concepts, setConcepts] = useState<Concept[] | null>(null)
  useEffect(() => {
    db.vocabulary.toArray().then((all) => setConcepts(conceptGroups(all)))
  }, [language])
  if (!concepts) return null
  if (!concepts.length) {
    return (
      <p className="muted mt-4">
        Aynı Türkçe anlamı taşıyan kelimeleri farklı dillerde eklediğinde burada yan yana görünürler. Bir dildeki kelime ötekini hatırlatır; özellikle soydaşlar.
      </p>
    )
  }
  return (
    <section className="stack mt-4">
      <p className="small muted">
        {concepts.length} kavram en az iki dilde listende. Bir dilde bildiğin kelime, diğer dildekine köprü olur. Burada sadece {LANGUAGE_SHORT[language]} kelimeleri açılabilir.
      </p>
      <div className="concepts" role="table" aria-label="Kavramlar">
        <div className="concept-row concept-head" role="row">
          <span role="columnheader">Anlam</span>
          {TARGET_LANGUAGES.map((l) => (
            <span role="columnheader" key={l} className={l === language ? 'is-current' : ''}>
              {LANGUAGE_SHORT[l]}
            </span>
          ))}
        </div>
        {concepts.map((c) => (
          <div className="concept-row" role="row" key={c.gloss + Object.values(c.words).flat()[0]?.id}>
            <span role="cell" className="concept-gloss">
              {c.gloss}
              {c.cognate && <span className="cognate-tag">soydaş</span>}
            </span>
            {TARGET_LANGUAGES.map((l) => (
              <span role="cell" key={l} lang={l} className={l === language ? 'is-current' : ''}>
                {(c.words[l] ?? []).map((w, i) => (
                  <span key={w.id}>
                    {i > 0 && ', '}
                    {l === language ? (
                      <button className="word-link concept-word" onClick={() => onOpen(w.id)}>
                        {displayForm(w)}
                      </button>
                    ) : (
                      <span className="concept-word">{displayForm(w)}</span>
                    )}
                  </span>
                ))}
                {!c.words[l] && <span className="muted">·</span>}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// The word in all three languages (Wiktionary)
// ---------------------------------------------------------------------------

/**
 * The word in English, French and Spanish side by side with where each comes from. Words not in
 * the learner's lists can be added with one tap, with the same Turkish meaning: three languages
 * learned around one concept and, often, one Latin root.
 */
export function TriLanguageCard({ entry, compact = false, onAdded }: { entry: VocabularyEntry; compact?: boolean; onAdded?: () => void }) {
  const eq = useEquivalents(entry)
  const links = useCrossLinks(entry)
  const [added, setAdded] = useState<Set<TargetLanguage>>(new Set())
  const [error, setError] = useState('')
  if (eq === 'loading') return compact ? null : <LinesSkeleton lines={2} label="Diğer dillerdeki karşılıklar aranıyor" />
  if (!eq || eq.forms.length < 2) return compact ? null : null

  const add = async (f: LanguageForm) => {
    setError('')
    try {
      const meaning = [entry.senses[0].gloss, ...(entry.senses[0].altGlosses ?? [])].join(', ')
      const next = createEntry({ word: withArticle(f.word, f.language, f.gender), meaning, gender: f.gender }, f.language, new Date())
      if (await db.vocabulary.get(next.id)) {
        setError(`${LANGUAGE_SHORT[f.language]} ${f.word} zaten listende.`)
        return
      }
      // Lists are per language: it goes where that language's new words go.
      const [placed] = (await placeNew(db, f.language, [next])).entries
      await db.vocabulary.put(placed)
      setAdded((s) => new Set(s).add(f.language))
      onAdded?.()
    } catch {
      setError('Eklenemedi.')
    }
  }

  const others = eq.forms.filter((f) => f.language !== entry.language)
  const inList = (f: LanguageForm) => added.has(f.language) || links.some((l) => l.entry.language === f.language)

  if (compact) {
    return (
      <p className="small tri-compact">
        <GlobeIcon size={16} className="inline-icon" />
        {others.map((f, i) => (
          <span key={f.language}>
            {i > 0 && ' · '}
            {LANGUAGE_SHORT[f.language]} <em lang={f.language}>{withArticle(f.word, f.language, f.gender)}</em>{' '}
            {inList(f) ? (
              <span className="muted"><CheckIcon size={14} /></span>
            ) : (
              <button type="button" className="link small" onClick={() => add(f)}>
                + ekle
              </button>
            )}
          </span>
        ))}
        {eq.shared && <span className="muted"> · ortak kök {sourceName(eq.shared.lang)} {eq.shared.word}</span>}
        {error && <span className="error"> {error}</span>}
      </p>
    )
  }

  return (
    <section className="section stack">
      <h2 className="section-title">Üç dilde</h2>
      {eq.shared && (
        <p className="tri-root">
          <SproutIcon size={16} className="inline-icon" />Ortak kök: <strong>{sourceName(eq.shared.lang)}</strong> <em>{eq.shared.word}</em>
        </p>
      )}
      <ul className="tri-list">
        {eq.forms.map((f) => (
          <li key={f.language} className={f.language === entry.language ? 'is-self' : ''}>
            <span className="tri-lang">{LANGUAGE_SHORT[f.language]}</span>
            <span className="tri-word" lang={f.language}>
              {withArticle(f.word, f.language, f.gender)}
            </span>
            <span className="small muted tri-from">{f.root ? `← ${sourceName(f.root.lang)} ${f.root.word}` : ''}</span>
            {f.language !== entry.language &&
              (inList(f) ? (
                <span className="small muted">listende</span>
              ) : (
                <button className="btn btn-sm btn-quiet" onClick={() => add(f)}>
                  + Ekle
                </button>
              ))}
          </li>
        ))}
      </ul>
      {error && <p className="error small">{error}</p>}
      <p className="small muted">
        Eklenen kelime aynı Türkçe anlamla gelir. Kaynak: <a href="https://en.wiktionary.org" target="_blank" rel="noreferrer">Wiktionary</a> (CC BY-SA).
      </p>
    </section>
  )
}

/** Where the word comes from, its synonyms and antonyms (from the word pack), when there are any. */
export function OriginNotes({ entry }: { entry: VocabularyEntry }) {
  // Words filled before the cleaning still carry Wiktionary's "Etymology tree" in front.
  const etymology = cleanEtymology(entry.etymology)
  if (!etymology && !entry.synonyms?.length && !entry.antonyms?.length) return null
  return (
    <div className="origin-notes">
      {etymology && (
        <p className="small">
          <strong>Köken:</strong> <span lang="en">{etymology}</span>
        </p>
      )}
      {entry.synonyms && entry.synonyms.length > 0 && (
        <p className="small">
          <strong>Eş anlamlılar:</strong> <span lang={entry.language}>{entry.synonyms.join(', ')}</span>
        </p>
      )}
      {entry.antonyms && entry.antonyms.length > 0 && (
        <p className="small">
          <strong>Zıt anlamlılar:</strong> <span lang={entry.language}>{entry.antonyms.join(', ')}</span>
        </p>
      )}
    </div>
  )
}
