import { useEffect, useState } from 'react'
import { conceptGroups, crossLanguageLinks, falseFriendsOf, type Concept, type CrossLink } from '../engine/crossLanguage'
import { displayForm } from '../engine/exercises'
import { TARGET_LANGUAGES, type TargetLanguage, type VocabularyEntry } from '../engine/types'
import { findEquivalents, sourceName, withArticle, type Equivalents, type LanguageForm } from '../data/wiktionary'
import { createEntry } from '../data/wordInput'
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

/** The same concept in English, French and Spanish, side by side. */
export function ConceptsView({ language, onOpen }: { language: VocabularyEntry['language']; onOpen: (entryId: string) => void }) {
  const [concepts, setConcepts] = useState<Concept[] | null>(null)
  useEffect(() => {
    db.vocabulary.toArray().then((all) => setConcepts(conceptGroups(all)))
  }, [language])
  if (!concepts) return null
  if (!concepts.length) {
    return (
      <p className="muted" style={{ marginTop: '1rem' }}>
        Aynı Türkçe anlamı taşıyan kelimeleri farklı dillerde eklediğinde burada yan yana görünürler. Bir dildeki kelime ötekini hatırlatır; özellikle soydaşlar.
      </p>
    )
  }
  return (
    <section className="stack" style={{ marginTop: '1rem' }}>
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

const EQUIV_KEY = (e: VocabularyEntry) => `kelime-koc:equiv:${e.language}:${e.lemma}`

function useEquivalents(entry: VocabularyEntry): Equivalents | null | 'loading' {
  const [value, setValue] = useState<Equivalents | null | 'loading'>('loading')
  useEffect(() => {
    let live = true
    try {
      const cached = localStorage.getItem(EQUIV_KEY(entry))
      if (cached) {
        setValue(JSON.parse(cached) as Equivalents)
        return
      }
    } catch {
      // No storage: just ask again.
    }
    setValue('loading')
    void findEquivalents(entry.lemma, entry.language).then((r) => {
      if (!live) return
      setValue(r)
      try {
        if (r) localStorage.setItem(EQUIV_KEY(entry), JSON.stringify(r))
      } catch {
        // Not cached; fine.
      }
    })
    return () => {
      live = false
    }
  }, [entry])
  return value
}

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
  if (eq === 'loading') return compact ? null : <p className="small muted">Diğer dillerdeki karşılıkları aranıyor…</p>
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
      await db.vocabulary.put(next)
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
        🌍{' '}
        {others.map((f, i) => (
          <span key={f.language}>
            {i > 0 && ' · '}
            {LANGUAGE_SHORT[f.language]} <em lang={f.language}>{withArticle(f.word, f.language, f.gender)}</em>{' '}
            {inList(f) ? (
              <span className="muted">✓</span>
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
          🌳 Ortak kök: <strong>{sourceName(eq.shared.lang)}</strong> <em>{eq.shared.word}</em>
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
