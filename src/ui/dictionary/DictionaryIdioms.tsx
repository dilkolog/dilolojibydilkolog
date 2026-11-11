import { IDIOM_THEMES, type Idiom } from '../../data/idioms'
import type { TargetLanguage, VocabularyEntry } from '../../engine/types'
import { CheckIcon, PlusIcon, TagIcon } from '../shared/icons'
import { REGISTER_NAME } from './idiomLabels'

/** An idiom of the pack, found by the dictionary: what it means, the picture it paints word for word, how it is built and a sentence. */
export function IdiomCard({
  language,
  idiom,
  own,
  targetListName,
  onOpenWord,
  onAdd,
}: {
  language: TargetLanguage
  idiom: Idiom
  own?: VocabularyEntry
  /** Name of the list the idiom will go to when added. */
  targetListName?: string
  onOpenWord: (id: string) => void
  onAdd: () => void
}) {
  const [before, after] = idiom.s.split(idiom.form)
  const where = [REGISTER_NAME[idiom.reg], idiom.area !== 'genel' ? idiom.area : '', idiom.level].filter(Boolean).join(' · ')
  return (
    <section className="section card stack" aria-label="Deyim">
      <div>
        <p className="eyebrow">Deyim · {IDIOM_THEMES[idiom.theme]}</p>
        <h2 className="section-title target" lang={language}>
          {idiom.w}
        </h2>
        <p>{idiom.t}</p>
        <p className="small muted">Kelimesi kelimesine: {idiom.lit}</p>
      </div>
      <dl className="idiom-facts small">
        {idiom.pat && (
          <div>
            <dt className="muted">Kalıp</dt>
            <dd lang={language}>{idiom.pat}</dd>
          </div>
        )}
        {idiom.eq && (
          <div>
            <dt className="muted">Türkçe deyim</dt>
            <dd>{idiom.eq}</dd>
          </div>
        )}
        <div>
          <dt className="muted">Kullanım</dt>
          <dd>{where}</dd>
        </div>
      </dl>
      <div className="note">
        <p className="target" lang={language}>
          {before}
          <strong>{idiom.form}</strong>
          {after}
        </p>
        <p className="small muted">{idiom.tr}</p>
      </div>
      <div className="row gap-xs items-center">
        {own ? (
          <button className="btn btn-sm btn-quiet" onClick={() => onOpenWord(own.id)}>
            <CheckIcon size={15} /> Kelime sayfasını aç
          </button>
        ) : (
          <div className="word-hero-add-wrap">
            <button className="btn btn-sm" onClick={onAdd}>
              <PlusIcon size={15} /> Kelimelerime ekle
            </button>
            {targetListName && (
              <span className="word-hero-target-tag" title={`Bu deyim “${targetListName}” listesine eklenecek`}>
                <TagIcon size={12} className="inline-icon" />
                {targetListName}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/** The other idioms the search touches (they hold the typed word, or their Turkish says it): one tap looks each up. */
export function IdiomList({ language, typed, idioms, onPick }: { language: TargetLanguage; typed: string; idioms: readonly Idiom[]; onPick: (w: string) => void }) {
  if (!idioms.length) return null
  return (
    <section className="section stack" aria-label="Deyimler">
      <h2 className="section-title">“{typed}” ile deyimler</h2>
      <ul className="plain">
        {idioms.map((i) => (
          <li key={i.w}>
            <button type="button" className="link target" lang={language} onClick={() => onPick(i.w)}>
              {i.w}
            </button>
            <span className="small muted"> · {i.t}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
