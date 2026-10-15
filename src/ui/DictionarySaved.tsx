import { useState } from 'react'
import { wordOfTheDay } from '../data/dictionary'
import { genderOfCode, POS_CODE } from '../data/wordpackBuild'
import type { Example, Gender, PartOfSpeech, TargetLanguage, VocabularyEntry } from '../engine/types'
import { CheckIcon, CloseIcon, PlusIcon, SpeakerIcon } from './icons'
import { sentencesNow } from './dictSentences'
import { PosTag } from './PosTag'
import { speak, unlockedAudio } from './speech'
import { Sticker } from './Sticker'

export function SavedCard({
  language,
  word,
  meanings,
  from,
  own,
  onOpenWord,
  onAdd,
  onRemove,
}: {
  language: TargetLanguage
  word: string
  meanings: string[]
  from?: 'deepl' | 'own'
  own?: VocabularyEntry
  onOpenWord: (id: string) => void
  onAdd: (word: string, meaning: string) => void
  onRemove: () => void
}) {
  return (
    <section className="section card stack" aria-label="Kaydettiğin kelime">
      <p>
        <strong lang={language}>{word}</strong>: {meanings.join(', ')} <span className="small muted">({from === 'deepl' ? 'DeepL, sen kaydettin' : 'sen kaydettin'})</span>
      </p>
      <div className="row gap-xs">
        {own ? (
          <button className="btn btn-sm btn-quiet" onClick={() => onOpenWord(own.id)}>
            <CheckIcon size={15} /> Kelime sayfasını aç
          </button>
        ) : (
          <button className="btn btn-sm" onClick={() => onAdd(word, meanings.slice(0, 2).join(', '))}>
            <PlusIcon size={15} /> Kelimelerime ekle
          </button>
        )}
        <button className="btn btn-sm btn-quiet" onClick={onRemove}>
          Sözlükten kaldır
        </button>
      </div>
    </section>
  )
}

/** A French noun with its article when the pack knows its gender (as the add form wants it). */
const writtenOf = (word: string, language: TargetLanguage, gender?: Gender) =>
  language === 'fr' && (gender === 'm' || gender === 'f') ? (/^[aeiouyéèêàâîôûh]/i.test(word) ? `l'${word}` : `${gender === 'f' ? 'la' : 'le'} ${word}`) : word

/** The day's word, at the top of the dictionary: heard, read, opened or added in one tap. */
export function DayWord({
  language,
  hit,
  onOpen,
  onAdd,
}: {
  language: TargetLanguage
  hit: NonNullable<ReturnType<typeof wordOfTheDay>>
  onOpen: () => void
  onAdd: (written: string, meaning: string, extra: { pos?: PartOfSpeech; gender?: Gender; examples?: Example[] }) => void
}) {
  const { word, rec } = hit
  const pos = rec.p ? POS_CODE[rec.p] : undefined
  const gender = pos === 'noun' ? genderOfCode(rec.g) : undefined
  const g = gender === 'm' || gender === 'f' ? gender : undefined
  const written = writtenOf(word, language, g)
  const meaning = (rec.t ?? []).slice(0, 3).join(', ')
  const play = () => {
    if (!rec.a) return speak(word, language)
    void unlockedAudio(rec.a)
      .then((a) => a.play())
      .catch(() => speak(word, language))
  }
  return (
    <section className="section">
      <div className="card dict-today">
        <p className="dict-today-kicker">Günün kelimesi</p>
        <div className="dict-today-head">
          <button type="button" className="dict-today-word" lang={language} onClick={onOpen}>
            {written}
          </button>
          <button type="button" className="icon-btn" onClick={play} aria-label={`${word} kelimesini dinle`} title="Dinle">
            <SpeakerIcon size={18} />
          </button>
          {pos && <PosTag pos={pos} label />}
        </div>
        {rec.i && <span className="ipa">{rec.i}</span>}
        <p className="dict-today-gloss">{meaning}</p>
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={() => onAdd(written, (rec.t ?? []).slice(0, 2).join(', '), { pos, gender: g, examples: sentencesNow(language, word, rec.c) })}>
            <PlusIcon size={15} /> Kelimelerime ekle
          </button>
          <button type="button" className="btn btn-sm btn-quiet" onClick={onOpen}>
            Kartını aç
          </button>
        </div>
      </div>
    </section>
  )
}

/** How many saved words show before "Tümünü göster". */
export const SAVED_SHOWN = 8

/** The saved words (all of them, or those matching the query) as one compact list: a tap opens the card, × removes. */
export function SavedList({ language, list, onPick, onRemove }: { language: TargetLanguage; list: { word: string; t: string[] }[]; onPick: (word: string) => void; onRemove: (word: string) => void }) {
  const [all, setAll] = useState(false)
  const shown = all ? list : list.slice(0, SAVED_SHOWN)
  return (
    <section className="section stack">
      <h2 className="section-title">
        <Sticker name="heart" size={28} className="sticker-title" />
        Kaydettiklerin <span className="dict-saved-count">{list.length}</span>
      </h2>
      <ul className="dict-saved">
        {shown.map((e) => (
          <li key={e.word} className="dict-saved-row">
            <button type="button" className="dict-saved-pick" onClick={() => onPick(e.word)}>
              <span className="dict-saved-word" lang={language}>
                {e.word}
              </span>
              <span className="dict-saved-meaning">{e.t.join(', ')}</span>
            </button>
            <button type="button" className="icon-btn icon-btn-sm dict-saved-remove" aria-label={`${e.word} sözlükten kaldır`} title="Kaldır" onClick={() => onRemove(e.word)}>
              <CloseIcon size={14} />
            </button>
          </li>
        ))}
      </ul>
      {list.length > SAVED_SHOWN && (
        <button type="button" className="link small" onClick={() => setAll((x) => !x)}>
          {all ? 'Daha az göster' : `Tümünü göster (${list.length})`}
        </button>
      )}
    </section>
  )
}
