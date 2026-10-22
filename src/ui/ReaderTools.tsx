import type { TargetLanguage } from '../engine/types'
import { BrainIcon, ConjugationsIcon, DictationIcon, GlobeIcon, ShadowingIcon, UserIcon } from './icons'
import { ReaderViewMenu } from './readerPrefs'
import type { ReaderPrefs } from './readerSettings'

/**
 * The row above an open text: the legend of the word colours, the reading view menu and the chips of the
 * reading modes (Turkish under each paragraph, dictation, shadowing, deduction, verb forms, finish, multi-select).
 * Which chips show depends on the text (a heard text is hidden at first, dictation hides it too).
 */
export function ReaderTools({
  language,
  reader,
  onReader,
  listenFirst,
  showTurkishButton,
  showTurkish,
  onTurkish,
  canPractise,
  canShadow,
  dictating,
  onDictation,
  shadowing,
  onShadowing,
  deduce,
  onDeduce,
  showForms,
  onForms,
  onFinish,
  multiMode,
  onMulti,
  onClub,
}: {
  language: TargetLanguage
  reader: ReaderPrefs
  onReader: (change: (prefs: ReaderPrefs) => ReaderPrefs) => void
  listenFirst: boolean
  showTurkishButton: boolean
  showTurkish: boolean
  onTurkish: () => void
  /** The text can be heard (a recording or the device voice): dictation is offered. */
  canPractise: boolean
  /** ...and the learner can be recorded: shadowing is offered too. */
  canShadow: boolean
  dictating: boolean
  onDictation: () => void
  shadowing: boolean
  onShadowing: () => void
  deduce: boolean
  onDeduce: () => void
  showForms: boolean
  onForms: () => void
  onFinish: () => void
  multiMode: boolean
  onMulti: () => void
  /** Opens a reading club on this text (none while one is open). */
  onClub?: () => void
}) {
  return (
    <div className="row reader-tools">
      <span className="reader-legend small" aria-hidden>
        <i className="legend-unseen">yeni</i> <i className="legend-learning">öğreniliyor</i> <i>bilinen</i>
      </span>
      <span className="grow" />
      <ReaderViewMenu prefs={reader} onChange={onReader} />
      <div className="reader-modes">
        {showTurkishButton && !listenFirst && (
          <button className="chip chip-sm" aria-pressed={showTurkish} onClick={onTurkish} title="Her paragrafın altında Türkçesi">
            <GlobeIcon size={14} /> Türkçesi
          </button>
        )}
        {canPractise && (
          <button className="chip chip-sm" aria-pressed={dictating} onClick={onDictation} title="Metni cümle cümle dinleyip yaz">
            <DictationIcon size={14} /> Dikte
          </button>
        )}
        {canShadow && (
          <button className="chip chip-sm" aria-pressed={shadowing} onClick={onShadowing} title="Cümleyi dinle, hemen ardından söyle, sonra karşılaştır">
            <ShadowingIcon size={14} /> Gölgele
          </button>
        )}
        {!listenFirst && !dictating && (
          <button type="button" className="chip chip-sm" aria-pressed={deduce} onClick={onDeduce} title="Bilinmeyen kelimelerin bir kısmı gizlenir: anlamını cümleden tahmin et, sonra dokunup aç">
            <BrainIcon size={14} /> Çıkarım
          </button>
        )}
        {language !== 'en' && !listenFirst && (
          <button type="button" className="chip chip-sm" aria-pressed={showForms} onClick={onForms} title="Metindeki fiil çekimleri, zamana göre">
            <ConjugationsIcon size={14} /> Çekimler
          </button>
        )}
        <button type="button" className="chip chip-sm" onClick={onFinish}>
          Okumayı bitir
        </button>
        <button className={`chip chip-sm${multiMode ? ' is-on' : ''}`} aria-pressed={multiMode} onClick={onMulti} title="ya da ⌘/Ctrl ile kelimelere tıkla">
          Çoklu seç
        </button>
        {onClub && (
          <button type="button" className="chip chip-sm" onClick={onClub} title="Bir arkadaşınla aynı metni oku: birbirinizin baktığı kelimeleri görün">
            <UserIcon size={14} /> Birlikte oku
          </button>
        )}
      </div>
    </div>
  )
}
