import { PhraseBuilder } from './PhraseBuilder'
import { useState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { WordPopExtras } from './WordPopExtras'
import { SentenceTranslation } from './TranslateButton'
import { PlayIcon, CloseIcon, TagIcon } from './icons'
import { AskMonki } from './monki/AskMonki'
import { sentenceAsk } from './monki/asks'
import { cleanToken } from '../engine/extract'
import type { ReadToken } from '../engine/reading'
import { topicOfTense } from '../data/guide/tenseTopics'
import { TENSE_GUIDE } from '../engine/tenseGuide'
import { subjectLabel, type FormAnalysis } from '../engine/tenses'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import type { useSheetSwipe } from './useSheetSwipe'

const STATUS_TEXT: Record<NonNullable<ReadToken['status']>, string> = {
  known: 'Bildiğin bir kelime.',
  learning: 'Kelimelerinde, öğreniyorsun.',
  new: 'Kelimelerinde, henüz çalışmadın.',
  unseen: 'Bu kelimeyi daha önce işaretlemedin.',
  name: 'Özel isim ya da yok saydığın bir kelime; hesaba katılmıyor.',
}

export interface Selected {
  token: ReadToken
  sentence: string
  /** Where the sentence is ("paragraph.sentence"), to light it in the text. */
  at?: string
}

/**
 * The card of a tapped word: its meaning, the verb form it is, the sentence, and what to do with
 * it. On a narrow screen it is a bottom sheet (the head stays put, a pull on it closes it).
 */
export function WordCard({
  selected,
  entry: selectedEntry,
  forms: selectedForms,
  verbEntry,
  language,
  sheetBox,
  sheet,
  ignored,
  skipped,
  targetListName,
  canListenFrom,
  canPinHeard,
  rating,
  deduceMode,
  onClose,
  onLookUp,
  onOpen,
  onOpenLab,
  onLesson,
  onKeepSentence,
  onListenFrom,
  onPinHeard,
  onAdd,
  onIgnore,
  onUnknown,
  onKnown,
  onSkip,
}: {
  selected: Selected & { token: ReadToken & { key: string } }
  entry: VocabularyEntry | undefined
  forms: FormAnalysis[]
  verbEntry: (lemma: string) => VocabularyEntry | undefined
  language: TargetLanguage
  sheetBox: { left: number; width: number } | null
  sheet: ReturnType<typeof useSheetSwipe>
  ignored: Set<string>
  skipped: Set<string>
  /** Name of the list the word will go to when added. */
  targetListName?: string
  canListenFrom: boolean
  /** The audio has no timed subtitles: the learner can pin this sentence to the moment it is heard. */
  canPinHeard?: boolean
  /** Deduction mode: asks how close the guess was; sits in the card so the bottom sheet does not cover it. */
  rating?: ReactNode
  /** When true, masks the meaning initially to prompt context-based guessing */
  deduceMode?: boolean
  onClose: () => void
  onLookUp?: (word: string) => void
  onOpen: (entryId: string) => void
  onOpenLab?: (verb: string, tense: string) => void
  /** Opens the guide's lesson on a topic. */
  onLesson?: (topic: string) => void
  onKeepSentence: (sentence: string, word: string) => void
  onListenFrom: (at: string) => void
  onPinHeard?: (at: string) => void
  onAdd: (word: string, sentence: string) => void
  onIgnore: (key: string, on: boolean) => void
  onUnknown: (key: string) => void
  onKnown: (key: string) => void
  onSkip: (key: string) => void
}) {
  const [revealed, setRevealed] = useState(!deduceMode)
  useEffect(() => {
    setRevealed(!deduceMode)
  }, [selected.token.key, deduceMode])

  return (
    <section className="card stack word-pop" aria-live="polite" style={{ ...(sheetBox ? ({ '--sheet-left': `${sheetBox.left}px`, '--sheet-w': `${sheetBox.width}px` } as CSSProperties) : {}), ...(sheet.dy ? { transform: `translateY(${sheet.dy}px)`, transition: 'none' } : {}) }}>
      {/* On a narrow screen this card is a bottom sheet: the head stays put while the rest scrolls, and a pull on it closes the sheet. */}
      <div className="word-pop-head" {...sheet.handlers}>
        <span className="sheet-handle" aria-hidden />
        <div className="row justify-between">
          <strong className="word-pop-word" lang={language}>
            {selectedEntry ? `${selectedEntry.article ? `${selectedEntry.article} ` : ''}${selectedEntry.lemma}` : cleanToken(selected.token.text, language)}
          </strong>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <CloseIcon size={16} />
          </button>
        </div>
      </div>
      {deduceMode && !revealed ? (
        <div className="card-deduction-prompt note stack">
          <div className="row between">
            <strong className="deduction-title">🧠 Bağlamdan Çıkarım</strong>
            <span className="small muted">Zihinsel Egzersiz</span>
          </div>
          <p className="small">
            Doğrudan anlama bakmadan önce cümledeki ipuçlarını kullanarak bu kelimenin ne anlama gelebileceğini zihninde tart.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-quiet"
            onClick={() => setRevealed(true)}
          >
            Tahmin ettim, anlamı göster
          </button>
        </div>
      ) : (
        <>
          {selectedEntry && <p className="gloss word-pop-gloss">{selectedEntry.senses[0].gloss}</p>}
          <WordPopExtras language={language} lemma={selectedForms[0]?.lemma ?? cleanToken(selected.token.text, language).toLocaleLowerCase(language)} entry={selectedEntry ?? undefined} />
        </>
      )}
      {onLookUp && (
        <p className="small">
          <button className="link small" onClick={() => onLookUp(selectedEntry?.lemma ?? selectedForms[0]?.lemma ?? cleanToken(selected.token.text, language).toLocaleLowerCase(language))}>
            Sözlükte aç
          </button>
        </p>
      )}
      {selectedForms.length > 0 && language !== 'en' && (
        <div className="form-analysis">
          {selectedForms.slice(0, 3).map((a) => {
            const own = verbEntry(a.lemma)
            return (
              <p key={`${a.lemma}-${a.tense}`} className="small">
                {a.phrase && (
                  <>
                    <span lang={language}>“{a.phrase}”</span> ={' '}
                  </>
                )}
                <strong lang={language}>{a.lemma}</strong> · <span lang={language}>{TENSE_GUIDE[a.tense].name}</span>
                {a.persons.length > 0 && <> · {[...new Set(a.persons.map((p) => subjectLabel(language, a.tense, p).split(' / ')[0]))].join(', ')}</>}
                {own && (
                  <>
                    {' '}
                    <button className="link small" onClick={() => onOpen(own.id)}>
                      kartı aç
                    </button>
                  </>
                )}
                {onOpenLab && (
                  <>
                    {' '}
                    <button className="link small" onClick={() => onOpenLab(a.lemma, a.tense)}>
                      fiil laboratuvarında aç
                    </button>
                  </>
                )}
                {onLesson && topicOfTense(a.tense) && (
                  <>
                    {' '}
                    <button className="link small" onClick={() => onLesson(topicOfTense(a.tense)!)}>
                      dersi oku
                    </button>
                  </>
                )}
              </p>
            )
          })}
        </div>
      )}
      <p className="small muted">{STATUS_TEXT[selected.token.status!]}</p>
      <p className="small sentence-sm">
        {selected.sentence}{' '}
        <button className="link small" onClick={() => onKeepSentence(selected.sentence, cleanToken(selected.token.text, language))}>
          Cümleyi kaydet
        </button>{' '}
        <AskMonki variant="link" label="Monki açıklasın" ask={() => sentenceAsk(selected.sentence, cleanToken(selected.token.text, language))} />
      </p>
      <PhraseBuilder key={`${selected.sentence}|${selected.token.text}`} sentence={selected.sentence} word={cleanToken(selected.token.text, language)} language={language} onAdd={onAdd} />
      {(!deduceMode || revealed) && (
        <SentenceTranslation key={selected.sentence} sentence={selected.sentence} from={language} />
      )}
      {canListenFrom && selected.at && (
        <button
          type="button"
          className="link small"
          onClick={() => onListenFrom(selected.at!)}
        >
          <PlayIcon size={14} className="inline-icon" /> Bu cümleden dinle
        </button>
      )}
      {canPinHeard && onPinHeard && selected.at && (
        <button type="button" className="link small" onClick={() => onPinHeard(selected.at!)} title="Takip öne ya da arkaya kaçıyorsa: şu an duyduğun cümleye dokunup bunu seç">
          Şu an bu cümle okunuyor
        </button>
      )}
      <p className="small muted kbd">
        <kbd>←</kbd> <kbd>→</kbd> önceki / sonraki yeni kelime · <kbd>Esc</kbd> kapat
      </p>
      {rating && <div className="word-pop-rating">{rating}</div>}
      <div className="row word-pop-actions">
        {selectedEntry ? (
          <button className="btn btn-quiet" onClick={() => onOpen(selectedEntry.id)}>
            Kelimeyi aç
          </button>
        ) : (
          <>
            <div className="word-hero-add-wrap">
              <button
                className="btn"
                onClick={() => onAdd(selectedForms[0] && !verbEntry(selectedForms[0].lemma) ? selectedForms[0].lemma : cleanToken(selected.token.text, language).toLocaleLowerCase(language), selected.sentence)}
              >
                {/* A verb goes on the list as its infinitive (aller), not the form met (allions). */}
                {selectedForms[0] && !verbEntry(selectedForms[0].lemma) ? `Kelimelerime ekle: ${selectedForms[0].lemma}` : 'Kelimelerime ekle'} <kbd className="kbd-key">E</kbd>
              </button>
              {targetListName && (
                <span className="word-hero-target-tag" title={`Bu kelime “${targetListName}” listesine eklenecek`}>
                  <TagIcon size={12} className="inline-icon" />
                  {targetListName}
                </span>
              )}
            </div>
            {ignored.has(selected.token.key) ? (
              <button className="btn btn-quiet" onClick={() => onIgnore(selected.token.key!, false)}>
                Yok saymayı kaldır
              </button>
            ) : selected.token.status === 'known' ? (
              <button className="btn btn-quiet" onClick={() => onUnknown(selected.token.key!)}>
                Aslında bilmiyorum
              </button>
            ) : (
              <>
                <button className="btn btn-quiet" onClick={() => onKnown(selected.token.key!)}>
                  Biliyorum <kbd className="kbd-key">B</kbd>
                </button>
                <button className="btn btn-quiet" onClick={() => onIgnore(selected.token.key!, true)} title="Özel isim, yabancı kelime ya da yazım hatası: hesaba katılmaz">
                  Yok say <kbd className="kbd-key">Y</kbd>
                </button>
                {!skipped.has(selected.token.key) && selected.token.status === 'unseen' && (
                  <button className="link small" onClick={() => onSkip(selected.token.key!)}>
                    Bilmiyorum, eklemeden geç <kbd className="kbd-key">G</kbd>
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}
