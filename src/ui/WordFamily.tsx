import { useEffect, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { fillEntries } from '../data/wordInfo'
import { linkEntries } from '../data/familyLinks'
import { createEntry, WordInputError } from '../data/wordInput'
import { displayForm } from '../engine/exercises'
import type { VocabularyEntry } from '../engine/types'
import { POS_NAME } from './labels'
import { AiError, suggestFamily, type FamilySuggestion } from '../ai'
import { useAi } from './aiContext'
import { WandIcon } from './icons'
import { sameList } from './listMemory'

/**
 * The word's other forms and relatives (decide → decision → prendre une décision; lent →
 * lentement): the ones linked so far, ones to add by hand, and frequent relatives suggested by
 * Wiktionary. Learning a family together is cheap: one stem, a few suffixes. Links go both
 * ways, so the "right suffix" exercise can use them.
 */
export function WordFamilySection({ db, entry, vocabulary, onChanged }: { db: KelimeDB; entry: VocabularyEntry; vocabulary: VocabularyEntry[]; onChanged: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [meaning, setMeaning] = useState('')
  const [manual, setManual] = useState({ word: '', meaning: '' })
  const [error, setError] = useState('')
  const { apiKey } = useAi()
  const [ai, setAi] = useState<{ busy: boolean; items: FamilySuggestion[] | null; error: string }>({ busy: false, items: null, error: '' })

  /** Other forms and relatives from the AI, for when Wiktionary has little: each one added by hand. */
  const askAi = async () => {
    if (!apiKey) return
    setAi({ busy: true, items: null, error: '' })
    try {
      const have = [...entry.wordFamily.map((m) => m.lemma), ...(entry.familyCandidates ?? [])]
      setAi({ busy: false, items: await suggestFamily(apiKey, entry, have), error: '' })
    } catch (e) {
      setAi({ busy: false, items: null, error: e instanceof AiError ? e.message : 'Öneri alınamadı.' })
    }
  }

  // Not looked up yet (just added): do it now rather than waiting for the background run.
  useEffect(() => {
    if (entry.wiktAt || entry.source === 'sample' || !navigator.onLine) return
    let live = true
    void fillEntries(db, [entry], entry.language).then(() => live && onChanged())
    return () => {
      live = false
    }
  }, [entry.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const byLemma = new Map(vocabulary.filter((v) => v.language === entry.language).map((v) => [v.lemma.toLocaleLowerCase(), v]))
  const linkedIds = new Set(entry.wordFamily.map((m) => m.entryId).filter(Boolean))
  const linkedLemmas = new Set(entry.wordFamily.map((m) => m.lemma.toLocaleLowerCase()))
  const candidates = (entry.familyCandidates ?? []).filter((w) => !linkedLemmas.has(w.toLocaleLowerCase()))

  const link = (other: VocabularyEntry) => linkEntries(db, entry, other)

  /** A new word (or phrase) in the list, linked to this one. */
  const add = async (word: string, gloss: string) => {
    setError('')
    try {
      const next = createEntry({ word, meaning: gloss }, entry.language, new Date())
      const existing = await db.vocabulary.get(next.id)
      if (existing) await link(existing)
      else {
        const [placed] = await sameList(db, entry, [next])
        await db.vocabulary.put(placed)
        await link(placed)
      }
      setOpen(null)
      setMeaning('')
      setManual({ word: '', meaning: '' })
      onChanged()
    } catch (e) {
      setError(e instanceof WordInputError ? e.message : 'Eklenemedi.')
    }
  }

  const unlink = async (id: string) => {
    const a = (await db.vocabulary.get(entry.id)) ?? entry
    const b = await db.vocabulary.get(id)
    await db.vocabulary.update(a.id, { wordFamily: a.wordFamily.filter((m) => m.entryId !== id) })
    if (b) await db.vocabulary.update(b.id, { wordFamily: b.wordFamily.filter((m) => m.entryId !== a.id) })
    onChanged()
  }

  return (
    <section className="section stack">
      <h2 className="section-title">Diğer halleri ve kelime ailesi</h2>
      <p className="small muted">
        Aynı kelimenin başka türdeki halleri ve kalıpları: <em>decide → decision → prendre une décision</em>, <em>lent → lentement</em>. Eklediklerin listene
        girer ve bu kelimeye bağlanır; alıştırmalarda doğru eki seçmen istenir.
      </p>

      {entry.wordFamily.length > 0 && (
        <ul className="family-list">
          {entry.wordFamily.map((m) => (
            <li key={m.entryId ?? m.lemma}>
              <span className="family-word" lang={entry.language}>
                {m.entryId && vocabulary.find((v) => v.id === m.entryId) ? displayForm(vocabulary.find((v) => v.id === m.entryId)!) : m.lemma}
              </span>
              <span className="small muted">
                {m.gloss}
                {m.partOfSpeech && m.partOfSpeech !== 'other' ? ` · ${POS_NAME[m.partOfSpeech]}` : ''}
              </span>
              {m.entryId && (
                <button className="link small" onClick={() => unlink(m.entryId!)} aria-label={`${m.lemma} bağını kaldır`}>
                  Bağı kaldır
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className="row family-add"
        onSubmit={(e) => {
          e.preventDefault()
          if (manual.word.trim() && manual.meaning.trim()) void add(manual.word, manual.meaning)
        }}
      >
        <input
          className="input"
          lang={entry.language}
          value={manual.word}
          onChange={(e) => setManual((m) => ({ ...m, word: e.target.value }))}
          placeholder={entry.language === 'fr' ? 'la décision, décider, prendre une décision' : entry.language === 'es' ? 'la decisión, decidir' : 'decision, decisive, make a decision'}
          aria-label="Başka hali"
          autoCapitalize="off"
          autoCorrect="off"
        />
        <input className="input" value={manual.meaning} onChange={(e) => setManual((m) => ({ ...m, meaning: e.target.value }))} placeholder="Türkçe anlamı" aria-label="Türkçe anlamı" />
        <button className="btn btn-sm" type="submit" disabled={!manual.word.trim() || !manual.meaning.trim()}>
          Hal ekle
        </button>
      </form>

      {candidates.length > 0 && (
        <>
          <h3 className="subhead">Önerilen akrabalar (Wiktionary)</h3>
          <ul className="family-list">
            {candidates.map((w) => {
              const listed = byLemma.get(w.toLocaleLowerCase())
              return (
                <li key={w}>
                  <span className="family-word" lang={entry.language}>
                    {w}
                  </span>
                  {listed ? (
                    linkedIds.has(listed.id) ? (
                      <span className="small muted">bağlı</span>
                    ) : (
                      <>
                        <span className="small muted">listende: {listed.senses[0].gloss}</span>
                        <button className="link small" onClick={async () => (await link(listed), onChanged())}>
                          Bağla
                        </button>
                      </>
                    )
                  ) : open === w ? (
                    <form
                      className="row"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (meaning.trim()) void add(w, meaning)
                      }}
                    >
                      <input className="input word-family-meaning-input" value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="Türkçe anlamı" aria-label={`${w} Türkçe anlamı`} autoFocus />
                      <button className="btn btn-sm" type="submit" disabled={!meaning.trim()}>
                        Ekle
                      </button>
                      <a className="link small" href={`https://translate.google.com/?sl=${entry.language}&tl=tr&text=${encodeURIComponent(w)}`} target="_blank" rel="noreferrer">
                        Çeviri
                      </a>
                    </form>
                  ) : (
                    <button
                      className="link small"
                      onClick={() => {
                        setOpen(w)
                        setMeaning('')
                      }}
                    >
                      + Ekle
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="small muted">
            Kaynak: <a href="https://wiktionary.org" target="_blank" rel="noreferrer">Wiktionary</a> (CC BY-SA).
          </p>
        </>
      )}
      {apiKey && (
        <div className="family-ai">
          <div className="row justify-between items-center">
            <h3 className="subhead">YZ önerileri</h3>
            <button className="btn btn-sm btn-quiet" onClick={() => void askAi()} disabled={ai.busy}>
              <WandIcon size={15} /> {ai.busy ? 'Düşünüyor…' : ai.items ? 'Yeniden öner' : 'YZ ile öner'}
            </button>
          </div>
          {!ai.items && !ai.busy && !ai.error && (
            <p className="small muted">Dişil, çoğul gibi diğer halleri, aynı kökten kelimeleri ve sık kalıpları önerir; hangisini ekleyeceğine sen karar verirsin.</p>
          )}
          {ai.error && <p className="error small">{ai.error}</p>}
          {ai.items && ai.items.length === 0 && <p className="small muted">Eklemeye değer başka hal ya da akraba bulunamadı.</p>}
          {ai.items && ai.items.length > 0 && (
            <ul className="family-list">
              {ai.items.map((s) => {
                const listed = byLemma.get(s.word.toLocaleLowerCase().replace(/^(le |la |les |l'|el |los |las |the |to )/, ''))
                return (
                  <li key={s.word}>
                    <span className="family-word" lang={entry.language}>
                      {s.word}
                    </span>
                    <span className="small muted">
                      {s.meaning} · {s.note}
                    </span>
                    {listed && linkedIds.has(listed.id) ? (
                      <span className="small muted">bağlı</span>
                    ) : listed ? (
                      <button className="link small" onClick={async () => (await link(listed), onChanged())}>
                        Bağla
                      </button>
                    ) : (
                      <button className="link small" onClick={() => void add(s.word, s.meaning).then(() => setAi((a) => ({ ...a, items: a.items?.filter((x) => x !== s) ?? null })))}>
                        + Ekle
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
      {error && <p className="error small">{error}</p>}
    </section>
  )
}
