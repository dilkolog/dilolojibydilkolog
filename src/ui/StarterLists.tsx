import { useEffect, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { loadStarterLists, type StarterList } from '../data/starterLists'
import { formIn } from '../engine/inflection'
import { splitArticle } from '../engine/answerCheck'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { addKeyList, type KeyItem } from './keyWordsList'
import { showToast } from './toastFeed'

/** A starter word as the card builder takes it: its form in the sentence, so the sentence can blank it out. */
export function starterItems(list: StarterList, language: TargetLanguage): KeyItem[] {
  return list.items.map((i) => {
    const bare = splitArticle(i.w.toLowerCase(), language).rest || i.w
    return {
      word: formIn(i.s, bare, language) ?? bare,
      lemma: i.w,
      turkish: i.t.split(/,\s*/).filter(Boolean),
      sentence: i.s,
      translation: i.tr,
      pos: i.p,
      gender: i.g,
    }
  })
}

/**
 * Ready-made lists of everyday words (greetings, family, food, home, city, travel, time, body, work, shopping):
 * one tap makes a list of that name with each word's meaning and a sentence, leaving alone the words already there.
 */
export function StarterLists({ db, language, vocabulary, onAdded }: { db: KelimeDB; language: TargetLanguage; vocabulary: VocabularyEntry[]; onAdded: () => void }) {
  const [lists, setLists] = useState<StarterList[] | null>(null)
  const [busy, setBusy] = useState('')
  useEffect(() => {
    let live = true
    setLists(null)
    void loadStarterLists(language).then((l) => live && setLists(l))
    return () => {
      live = false
    }
  }, [language])

  const have = new Set(vocabulary.map((v) => v.id))
  const missing = (list: StarterList) => starterItems(list, language).filter((x) => !have.has(`${language}:${x.lemma.toLowerCase().replace(/^(l'|le |la |les |el |los |las |un |una )/, '')}`)).length

  const add = async (list: StarterList) => {
    setBusy(list.id)
    try {
      const { added } = await addKeyList(db, language, list.title, starterItems(list, language), '')
      showToast(added.length ? `“${list.title}” listesine ${added.length} kelime eklendi.` : `“${list.title}” listesindeki kelimeler zaten kelimelerinde.`)
      onAdded()
    } catch {
      showToast('Liste eklenemedi, biraz sonra yine dene.', undefined, 4000, 'info')
    } finally {
      setBusy('')
    }
  }

  if (!lists?.length) return null
  return (
    <details className="card">
      <summary>Hazır başlangıç listeleri</summary>
      <div className="stack">
        <p className="small muted">Günlük hayattan sık kullanılan kelimeler: her kelimenin Türkçesi ve bir örnek cümlesi var. Listeyi ekleyince kendi listen olur; kelimelerin tekrarı diğerleri gibi planlanır.</p>
        <ul className="stack gap-2">
          {lists.map((list) => {
            const left = missing(list)
            return (
              <li key={list.id} className="row">
                <div className="grow">
                  <strong>{list.title}</strong>
                  <p className="small muted">
                    {list.items.length} kelime · {list.level}
                    {left < list.items.length ? ` · ${list.items.length - left} tanesi zaten kelimelerinde` : ''}
                  </p>
                </div>
                <button type="button" className="btn btn-sm" disabled={busy === list.id || left === 0} onClick={() => void add(list)}>
                  {left === 0 ? 'Eklendi' : busy === list.id ? 'Ekleniyor…' : 'Listeyi ekle'}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </details>
  )
}
