import { useEffect, useMemo, useState } from 'react'
import type { KelimeDB } from '../../data/db'
import { IDIOM_LEVELS, IDIOM_THEMES, loadIdioms, type Idiom, type IdiomLevel, type IdiomTheme } from '../../data/idioms'
import type { TargetLanguage, VocabularyEntry } from '../../engine/types'
import { addKeyList, keyEntries } from '../reading/keyWordsList'
import { showToast } from '../shared/toastFeed'
import { IDIOM_LIST, idiomItems } from './idiomItems'

/**
 * The idiom pack: the language's own idioms by theme and level, each with its Turkish meaning, its word-for-word
 * image and a sentence. A theme is added in one tap; all of them go to the one "Deyimler" list.
 */
export function IdiomPack({ db, language, vocabulary, onAdded }: { db: KelimeDB; language: TargetLanguage; vocabulary: VocabularyEntry[]; onAdded: () => void }) {
  const [idioms, setIdioms] = useState<Idiom[] | null>(null)
  const [level, setLevel] = useState<IdiomLevel | ''>('')
  const [busy, setBusy] = useState('')
  useEffect(() => {
    let live = true
    setIdioms(null)
    void loadIdioms(language).then((l) => live && setIdioms(l))
    return () => {
      live = false
    }
  }, [language])

  const have = useMemo(() => new Set(vocabulary.map((v) => v.id)), [vocabulary])
  // The card each idiom makes, to tell which are already among the learner's words.
  const idOf = useMemo(() => new Map((idioms ?? []).map((i) => [i.w, keyEntries(idiomItems([i]), language, new Date(), '')[0]?.id ?? ''])), [idioms, language])
  const levels = IDIOM_LEVELS.filter((l) => idioms?.some((i) => i.level === l))
  const shown = (idioms ?? []).filter((i) => !level || i.level === level)
  const themes = (Object.keys(IDIOM_THEMES) as IdiomTheme[]).map((id) => ({ id, items: shown.filter((i) => i.theme === id) })).filter((t) => t.items.length)

  const add = async (theme: IdiomTheme, items: Idiom[]) => {
    setBusy(theme)
    try {
      const { added } = await addKeyList(db, language, IDIOM_LIST, idiomItems(items), '')
      showToast(added.length ? `“${IDIOM_LIST}” listesine ${added.length} deyim eklendi.` : 'Bu deyimler zaten kelimelerinde.')
      onAdded()
    } catch {
      showToast('Deyimler eklenemedi, biraz sonra yine dene.', undefined, 4000, 'info')
    } finally {
      setBusy('')
    }
  }

  if (!idioms?.length) return null
  return (
    <details className="card">
      <summary>Deyim paketi</summary>
      <div className="stack">
        <p className="small muted">
          Günlük konuşmada gerçekten kullanılan {idioms.length} deyim: her birinin Türkçesi, kelimesi kelimesine anlamı ve örnek cümlesi var. Eklediklerin “{IDIOM_LIST}” listende toplanır.
        </p>
        {levels.length > 1 && (
          <div className="row wrap gap-2" role="group" aria-label="Seviye">
            <button type="button" className="chip chip-sm" aria-pressed={!level} onClick={() => setLevel('')}>
              Hepsi
            </button>
            {levels.map((l) => (
              <button key={l} type="button" className="chip chip-sm" aria-pressed={level === l} onClick={() => setLevel(l)}>
                {l}
              </button>
            ))}
          </div>
        )}
        <ul className="stack gap-2">
          {themes.map(({ id, items }) => {
            const left = items.filter((i) => !have.has(idOf.get(i.w) ?? '')).length
            return (
              <li key={id} className="row">
                <div className="grow">
                  <strong>{IDIOM_THEMES[id]}</strong>
                  <p className="small muted">
                    {items.length} deyim
                    {left < items.length ? ` · ${items.length - left} tanesi zaten kelimelerinde` : ''}
                  </p>
                </div>
                <button type="button" className="btn btn-quiet btn-sm" disabled={busy === id || left === 0} onClick={() => void add(id, items)}>
                  {left === 0 ? 'Eklendi' : busy === id ? 'Ekleniyor…' : 'Ekle'}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </details>
  )
}
