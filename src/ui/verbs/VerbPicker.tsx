import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AccentBar, accentChange, insertAt } from '../AccentBar'
import { ChevronDownIcon, ShuffleIcon, StarIcon } from '../icons'
import { difficultItems, dueItems, type LabData, type LabItem } from '../../engine/labProgress'
import { irregularForms, tenseVerbs, type Tense } from '../../engine/tenses'
import { LEVELS, suggestVerbs, type Level } from '../../engine/verbLab'
import { tenseName, verbEntry, type LabLanguage } from './labShared'
import { TensePicker } from './LearnTab'

/** A section that opens and closes: the list inside is only built while it is open. */
function Fold({ title, count, tone, children }: { title: ReactNode; count?: number; tone?: 'warn'; children: () => ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <section className={`lab-fold${tone ? ` is-${tone}` : ''}`}>
      <button type="button" className="lab-fold-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="lab-fold-title">{title}</span>
        {count !== undefined && <span className="lab-count">{count}</span>}
        <ChevronDownIcon size={16} className={open ? 'lab-chev is-open' : 'lab-chev'} />
      </button>
      {open && <div className="lab-fold-body">{children()}</div>}
    </section>
  )
}

const MORE = 36

function VerbChips({ verbs, language, onVerb, current }: { verbs: readonly string[]; language: LabLanguage; onVerb: (v: string) => void; current: string }) {
  const [shown, setShown] = useState(MORE)
  if (!verbs.length) return <p className="small muted">Henüz yok.</p>
  return (
    <div className="lab-chips" lang={language}>
      {verbs.slice(0, shown).map((v) => (
        <button key={v} type="button" className="chip chip-sm" aria-pressed={v === current} onClick={() => onVerb(v)}>
          {v}
        </button>
      ))}
      {verbs.length > shown && (
        <button type="button" className="chip chip-sm is-more" onClick={() => setShown((n) => n + MORE)}>
          +{verbs.length - shown}
        </button>
      )}
    </div>
  )
}

/** Props both halves of the picker share. */
interface PickerBase {
  language: LabLanguage
  verb: string
  tense: Tense
  onVerb: (v: string) => void
}

/**
 * The top of the lab's side panel: type a verb (with suggestions), shuffle one, and choose the
 * tense. Always in view; the lists of verbs below it are a separate card (PickerLists).
 */
export function PickerTop({
  language,
  verb,
  tense,
  available,
  level,
  levels,
  byFrequency,
  frequency,
  onVerb,
  onTense,
}: PickerBase & {
  available: readonly Tense[]
  level: Level | null
  levels: ReadonlyMap<string, Level>
  byFrequency: readonly string[]
  frequency: ReadonlyMap<string, number>
  onTense: (t: Tense) => void
}) {
  const [text, setText] = useState(verb)
  const [open, setOpen] = useState(false)
  const [missing, setMissing] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  useEffect(() => {
    setText(verb)
    setMissing(false)
  }, [verb])

  const suggestions = useMemo(() => (open && text !== verb ? suggestVerbs(language, text, frequency) : []), [open, text, verb, language, frequency])
  const known = useMemo(() => new Set(tenseVerbs(language)), [language, byFrequency])
  const pick = (v: string) => {
    setOpen(false)
    setMissing(false)
    onVerb(v)
  }
  const submit = () => {
    const typed = text.trim().toLocaleLowerCase(language).replace(language === 'fr' ? /^(se |s['’])/ : /se$/, '')
    if (known.has(typed)) return pick(typed)
    const first = suggestVerbs(language, text, frequency, 1)[0]
    if (suggestions[active]) return pick(suggestions[active])
    if (first) return pick(first)
    setMissing(true)
  }
  const shuffle = () => {
    const pool = level ? byFrequency.filter((v) => levels.get(v) === level) : byFrequency.slice(0, 400)
    const others = pool.filter((v) => v !== verb)
    if (others.length) pick(others[Math.floor(Math.random() * others.length)])
  }

  return (
    <div className="stack lab-picker">
      <div className="stack gap-2">
        <label className="section-title" htmlFor={`${listId}-in`}>
          Fiil girin
        </label>
        <div className="lab-input">
          <input
            id={`${listId}-in`}
            ref={input}
            className="input"
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls={`${listId}-list`}
            aria-autocomplete="list"
            aria-activedescendant={suggestions.length ? `${listId}-opt-${active}` : undefined}
            value={text}
            lang={language}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={language === 'fr' ? 'ör. parler' : 'ör. hablar'}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onChange={(e) => {
              accentChange(language, setText)(e)
              setOpen(true)
              setActive(0)
              setMissing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && suggestions.length) {
                e.preventDefault()
                setActive((a) => (a + 1) % suggestions.length)
              } else if (e.key === 'ArrowUp' && suggestions.length) {
                e.preventDefault()
                setActive((a) => (a - 1 + suggestions.length) % suggestions.length)
              } else if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              } else if (e.key === 'Escape') setOpen(false)
            }}
          />
          <button type="button" className="icon-btn lab-shuffle" onClick={shuffle} aria-label="Rastgele fiil">
            <ShuffleIcon size={18} />
          </button>
          {suggestions.length > 0 && (
            <ul className="lab-suggest" id={`${listId}-list`} role="listbox" lang={language}>
              {suggestions.map((s, i) => (
                <li key={s} id={`${listId}-opt-${i}`} role="option" aria-selected={i === active} className={i === active ? 'is-active' : undefined} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
        <AccentBar language={language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />
        {missing && (
          <p className="small notice" role="status">
            “{text}” tablolarda yok. Mastar biçimini yaz (örn. {language === 'fr' ? 'finir' : 'vivir'}).
          </p>
        )}
      </div>

      <div className="stack gap-2">
        <span className="section-title">Zaman seçin</span>
        <TensePicker language={language} tense={tense} onPick={onTense} available={available} />
      </div>

    </div>
  )
}

/** The lists of verbs and the review queue: favourites, own verbs, levels, irregular, recent, due and difficult. */
export function PickerLists({
  language,
  verb,
  tense,
  lab,
  level,
  onLevel,
  levels,
  byFrequency,
  ownVerbs,
  onVerb,
  onItem,
}: PickerBase & {
  lab: LabData
  level: Level | null
  onLevel: (l: Level | null) => void
  levels: ReadonlyMap<string, Level>
  byFrequency: readonly string[]
  ownVerbs: readonly string[]
  /** A due or difficult item: open that verb in that tense for practice. */
  onItem: (verb: string, tense: Tense) => void
}) {
  const due = dueItems(lab, Date.now())
  const difficult = difficultItems(lab)
  const irregular = () => {
    const odd = byFrequency.slice(0, 700).filter((v) => irregularForms(verbEntry(language, v), tense).some(Boolean))
    return <VerbChips verbs={odd} language={language} onVerb={onVerb} current={verb} />
  }
  const itemChips = (items: LabItem[]) => (
    <div className="lab-chips" lang={language}>
      {items.slice(0, 24).map((i) => (
        <button key={`${i.verb}|${i.tense}`} type="button" className="chip chip-sm" onClick={() => onItem(i.verb, i.tense)}>
          {i.verb} <span className="muted">· {tenseName(i.tense)}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="stack lab-picker">
      <Fold
        title={
          <>
            <StarIcon size={15} className="lab-star is-on" /> Favorilerim
          </>
        }
        count={lab.favorites.length}
      >
        {() => (lab.favorites.length ? <VerbChips verbs={lab.favorites} language={language} onVerb={onVerb} current={verb} /> : <p className="small muted">Fiil başlığındaki yıldıza dokunarak favori ekle.</p>)}
      </Fold>

      {ownVerbs.length > 0 && (
        <Fold title="Kelimelerimdeki fiiller" count={ownVerbs.length}>
          {() => <VerbChips verbs={ownVerbs} language={language} onVerb={onVerb} current={verb} />}
        </Fold>
      )}

      <div className="stack gap-2">
        <span className="section-title">Seviyelere göre keşfet</span>
        <div className="lab-levels" role="group" aria-label="Seviye">
          {LEVELS.map((l) => (
            <button key={l} type="button" className="chip" aria-pressed={level === l} onClick={() => onLevel(level === l ? null : l)}>
              {l}
            </button>
          ))}
        </div>
        {level && <VerbChips key={level} verbs={byFrequency.filter((v) => levels.get(v) === level)} language={language} onVerb={onVerb} current={verb} />}
        {level && <p className="small muted">Seviyeler sıklığa göre yaklaşıktır: en çok duyulan fiiller önce öğrenilir.</p>}
      </div>

      <Fold title={<span><span lang={language}>{tenseName(tense)}</span>’de düzensiz</span>} key={tense}>
        {irregular}
      </Fold>

      <Fold title="Geçmiş" count={lab.recent.length}>
        {() => <VerbChips verbs={lab.recent} language={language} onVerb={onVerb} current={verb} />}
      </Fold>

      <section className="lab-review">
        <h3 className={due.length ? 'lab-review-title is-due' : 'lab-review-title'}>Bugünün tekrarları ({due.length})</h3>
        {due.length ? itemChips(due) : <p className="small lab-done">Bugün tüm tekrarlar tamam!</p>}
        <h3 className="lab-review-title is-hard">Zorlandıklarım [{difficult.length}]</h3>
        {difficult.length ? itemChips(difficult) : <p className="small muted">Henüz kayıt yok: alıştırmada yanlış yaptıkça buraya düşer.</p>}
      </section>
    </div>
  )
}
