import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AccentBar } from '../AccentBar'
import { accentChange, insertAt } from '../accentCaret'
import { ShuffleIcon, StarIcon } from '../icons'
import type { LabData } from '../../engine/labProgress'
import { irregularForms, tenseVerbs, type Tense } from '../../engine/tenses'
import { LEVELS, suggestVerbs, type Level } from '../../engine/verbLab'
import { verbFormsOf, type VerbFormHit } from '../../engine/verbLookup'
import { tenseName, verbEntry, type LabLanguage } from './labShared'
import { Sticker } from '../Sticker'

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
 * The top of the lab: one row to type a verb (with suggestions) or shuffle one. The accented
 * letters come in the panel that opens while typing, over the page, so nothing below moves and
 * the conjugation table stays close. The tense is chosen above the table (TenseBar).
 */
export function PickerTop({
  language,
  verb,
  level,
  levels,
  byFrequency,
  frequency,
  onVerb,
  onForm,
}: Omit<PickerBase, 'tense'> & {
  /** A conjugated form typed ("estés"): its verb opens at that tense, the person marked. */
  onForm?: (hit: VerbFormHit) => void
  level: Level | null
  levels: ReadonlyMap<string, Level>
  byFrequency: readonly string[]
  frequency: ReadonlyMap<string, number>
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

  // byFrequency arrives once the tables have loaded: tenseVerbs() reads them, so it stands for "loaded".
  const known = useMemo(() => new Set(tenseVerbs(language)), [language, byFrequency]) // eslint-disable-line react-hooks/exhaustive-deps
  const typed = text.trim().toLocaleLowerCase(language).replace(language === 'fr' ? /^(se |s['’])/ : /se$/, '')
  // A conjugated form leads to its verb and tense: "estés" → estar, presente de subjuntivo (tú).
  const forms = useMemo(
    () => (onForm && open && text !== verb && !known.has(typed) ? verbFormsOf(language, text).slice(0, 4) : []),
    [onForm, open, text, verb, known, typed, language],
  )
  const suggestions = useMemo(() => (open && text !== verb ? suggestVerbs(language, text, frequency).filter((s) => !forms.some((f) => f.lemma === s)) : []), [open, text, verb, language, frequency, forms])
  const options = forms.length + suggestions.length
  const pick = (v: string) => {
    setOpen(false)
    setMissing(false)
    onVerb(v)
  }
  const pickForm = (hit: VerbFormHit) => {
    setOpen(false)
    setMissing(false)
    onForm?.(hit)
  }
  const choose = (i: number) => (i < forms.length ? pickForm(forms[i]) : pick(suggestions[i - forms.length]))
  const submit = () => {
    if (known.has(typed)) return pick(typed)
    if (active < options) return choose(active)
    const hit = onForm ? verbFormsOf(language, text)[0] : undefined
    if (hit) return pickForm(hit)
    const first = suggestVerbs(language, text, frequency, 1)[0]
    if (first) return pick(first)
    setMissing(true)
  }
  const shuffle = () => {
    const pool = level ? byFrequency.filter((v) => levels.get(v) === level) : byFrequency.slice(0, 400)
    const others = pool.filter((v) => v !== verb)
    if (others.length) pick(others[Math.floor(Math.random() * others.length)])
  }

  return (
    <div className="lab-find">
      <label className="sr-only" htmlFor={`${listId}-in`}>
        Fiil
      </label>
        <div className="lab-input">
          <input
            id={`${listId}-in`}
            ref={input}
            className="input"
            role="combobox"
            aria-expanded={options > 0}
            aria-controls={`${listId}-list`}
            aria-autocomplete="list"
            aria-activedescendant={options ? `${listId}-opt-${active}` : undefined}
            value={text}
            lang={language}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={language === 'fr' ? 'ör. parler ya da parlions' : 'ör. hablar ya da hablaste'}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onChange={(e) => {
              accentChange(language, setText)(e)
              setOpen(true)
              setActive(0)
              setMissing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && options) {
                e.preventDefault()
                setActive((a) => (a + 1) % options)
              } else if (e.key === 'ArrowUp' && options) {
                e.preventDefault()
                setActive((a) => (a - 1 + options) % options)
              } else if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              } else if (e.key === 'Escape') setOpen(false)
            }}
          />
          <button type="button" className="icon-btn lab-shuffle" onClick={shuffle} aria-label="Rastgele fiil">
            <ShuffleIcon size={18} />
          </button>
          {open && (
            <div className="lab-drop">
              {options > 0 && (
                <ul className="lab-suggest" id={`${listId}-list`} role="listbox" lang={language}>
                  {forms.map((f, i) => (
                    <li key={`${f.lemma}|${f.tense}`} id={`${listId}-opt-${i}`} role="option" aria-selected={i === active} className={`lab-form-hit${i === active ? ' is-active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => pickForm(f)}>
                      <span className="lab-form-verb">{f.lemma}</span>
                      <span className="lab-form-note" lang="tr">
                        “{text.trim()}” · {f.note}
                      </span>
                    </li>
                  ))}
                  {suggestions.map((s, n) => {
                    const i = forms.length + n
                    return (
                      <li key={s} id={`${listId}-opt-${i}`} role="option" aria-selected={i === active} className={i === active ? 'is-active' : undefined} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}>
                        {s}
                      </li>
                    )
                  })}
                </ul>
              )}
              <AccentBar language={language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />
            </div>
          )}
        </div>
        {missing && (
          <p className="small notice" role="status">
            “{text}” tablolarda yok. Mastarı (örn. {language === 'fr' ? 'finir' : 'vivir'}) ya da çekimli bir biçimi (örn. {language === 'fr' ? 'finissons' : 'vivimos'}) yaz.
          </p>
        )}
    </div>
  )
}

type ListId = 'favorites' | 'own' | 'recent' | 'irregular' | Level

/**
 * The learner's verbs in one list with a filter: favourites, the verbs of their own word list, the
 * ones looked at lately, the ones irregular in the chosen tense, or the verbs of a level (by
 * frequency). One list instead of five folded ones: the choice is one tap, not a hunt.
 */
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
}: PickerBase & {
  lab: LabData
  level: Level | null
  onLevel: (l: Level | null) => void
  levels: ReadonlyMap<string, Level>
  byFrequency: readonly string[]
  ownVerbs: readonly string[]
}) {
  const first: ListId = lab.favorites.length ? 'favorites' : ownVerbs.length ? 'own' : lab.recent.length ? 'recent' : 'A1'
  const [picked, setPicked] = useState<ListId | null>(null)
  const list: ListId = level ?? picked ?? first
  const choose = (id: ListId) => {
    if ((LEVELS as readonly string[]).includes(id)) {
      onLevel(id as Level)
      setPicked(null)
    } else {
      onLevel(null)
      setPicked(id)
    }
  }
  const irregular = useMemo(
    () => (list === 'irregular' ? byFrequency.slice(0, 700).filter((v) => irregularForms(verbEntry(language, v), tense).some(Boolean)) : []),
    [list, byFrequency, language, tense],
  )
  const verbs =
    list === 'favorites' ? lab.favorites
    : list === 'own' ? ownVerbs
    : list === 'recent' ? lab.recent
    : list === 'irregular' ? irregular
    : byFrequency.filter((v) => levels.get(v) === list)
  const filters: { id: ListId; label: ReactNode; count?: number }[] = [
    { id: 'favorites', label: <><StarIcon size={14} className="lab-star is-on" /> Favori</>, count: lab.favorites.length },
    ...(ownVerbs.length ? [{ id: 'own' as const, label: 'Listemde', count: ownVerbs.length }] : []),
    { id: 'recent', label: 'Son bakılan', count: lab.recent.length },
    { id: 'irregular', label: <><span lang={language}>{tenseName(tense)}</span>’de düzensiz</> },
    ...LEVELS.map((l) => ({ id: l, label: l })),
  ]
  const empty: Partial<Record<ListId, string>> = {
    favorites: 'Fiil başlığındaki yıldıza dokunarak favori ekle.',
    recent: 'Baktığın fiiller burada birikir.',
  }

  return (
    <div className="stack lab-picker">
      <span className="section-title">Fiillerim</span>
      <div className="lab-filters" role="group" aria-label="Fiil listesi">
        {filters.map((f) => (
          <button key={f.id} type="button" className="chip chip-sm" aria-pressed={list === f.id} onClick={() => choose(f.id)}>
            {f.label}
            {f.count ? <span className="muted"> {f.count}</span> : null}
          </button>
        ))}
      </div>
      {verbs.length ? <VerbChips key={list} verbs={verbs} language={language} onVerb={onVerb} current={verb} /> : (
        <p className="small muted sticker-note">
          <Sticker name={list === 'favorites' ? 'heart' : 'think'} size={32} />
          <span>{empty[list] ?? 'Bu listede fiil yok.'}</span>
        </p>
      )}
      {(LEVELS as readonly string[]).includes(list) && <p className="small muted">Seviyeler sıklığa göre yaklaşıktır: en çok duyulan fiiller önce öğrenilir.</p>}
    </div>
  )
}
