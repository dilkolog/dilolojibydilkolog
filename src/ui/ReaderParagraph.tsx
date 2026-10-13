import { memo, useMemo, type MouseEvent } from 'react'
import type { ReadSentence, ReadToken } from '../engine/reading'
import { posKey } from '../engine/deduction'
import type { TranslateLang } from '../data/translate'
import { ParagraphTranslation } from './ReaderTranslation'

export interface ReaderParagraphProps {
  index: number
  sentences: ReadSentence[]
  /** The index of the paragraph's first sentence in the whole text. */
  start: number
  image?: string
  /** The sentence lit with the open word card: its place ("paragraph.sentence"), or its text when the card has no place. */
  litAt?: string
  litText?: string
  /** The sentence being heard, and the one lit for a moment ("show in text"), as indexes in the whole text. */
  heard: number | null
  flash: number | null
  /** The key of the open word: every occurrence is marked. */
  selectedKey?: string
  multi: ReadonlySet<string>
  multiMode: boolean
  skipped: ReadonlySet<string>
  masks: ReadonlySet<string>
  revealed: ReadonlySet<string>
  shade: (entryId: string | undefined) => string
  /** The paragraph's Turkish under it: `given` when the text brings its own, else translated on request. */
  turkish: boolean
  given?: string
  language: TranslateLang
  /** A word was picked (`hidden`: it was masked for guessing). Must be stable: the paragraph is memoised. */
  onPick: (token: ReadToken, sentence: string, at: string, hidden: boolean) => void
  onToggleMulti: (key: string) => void
}

/**
 * One paragraph of the reader. Memoised: picking a word or following the audio changes a few
 * paragraphs, and the rest of a long text (thousands of word spans) is not rendered again. The parent
 * passes each paragraph only what concerns it (the heard sentence, the open word) so the others keep
 * equal props.
 */
export const ReaderParagraph = memo(function ReaderParagraph(props: ReaderParagraphProps) {
  const { index: i, sentences, start, image, litAt, litText, heard, flash, selectedKey, multi, multiMode, skipped, masks, revealed, shade, turkish, given, language, onPick, onToggleMulti } = props
  const texts = useMemo(() => sentences.map((s) => s.text), [sentences])
  return (
    <>
      {image && <img className="reader-img" src={image} alt="" loading="lazy" />}
      <p>
        {sentences.map((s, j) => (
          <span
            key={j}
            data-s={start + j}
            className={
              [
                (litAt ? litAt === `${i}.${j}` : litText === s.text) ? 'rs is-lit' : '',
                heard === start + j ? 'rs is-heard' : '',
                flash === start + j ? 'rs is-flash' : '',
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
          >
            {s.tokens.map((t, k) => {
              const hidden = !!t.key && masks.has(posKey(i, j, k)) && !revealed.has(t.key)
              const pick = () => onPick(t, s.text, `${i}.${j}`, hidden)
              return t.key ? (
                <span
                  key={k}
                  role="button"
                  tabIndex={t.status === 'known' || t.status === 'name' ? -1 : 0}
                  data-key={t.key}
                  aria-label={hidden ? 'Gizli kelime: anlamını cümleden tahmin et, sonra aç' : undefined}
                  className={`rw rw-${t.status}${hidden ? ' rw-masked' : ''}${t.status === 'learning' || t.status === 'new' ? ` ${shade(t.entryId)}` : ''}${t.status === 'unseen' && skipped.has(t.key) ? ' rw-skipped' : ''}${selectedKey === t.key ? ' is-selected' : ''}${multi.has(t.key) ? ' is-multi' : ''}`}
                  onClick={(e: MouseEvent) => {
                    // ⌘/Ctrl+click (or multi-select mode) collects words to mark together.
                    if ((e.metaKey || e.ctrlKey || multiMode) && !t.entryId) {
                      e.preventDefault()
                      onToggleMulti(t.key!)
                      return
                    }
                    pick()
                  }}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick())}
                >
                  {hidden ? '[ ? ]' : t.text}
                </span>
              ) : (
                <span key={k}>{t.text}</span>
              )
            })}{' '}
          </span>
        ))}
      </p>
      {turkish && <ParagraphTranslation sentences={texts} from={language} given={given} />}
    </>
  )
})
