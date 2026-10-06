import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader } from '../PageHeader'
import { EmptyState } from '../EmptyState'
import { useTenses } from '../ConjugationTable'
import { recordPractice } from '../games/shared'
import { labTensesOf, tensesOf, tenseVerbs, type Tense } from '../../engine/tenses'
import { addToReview, dueItems, labKey, pushRecent, recordCheck, recordForm, recordRound, toggleFavorite } from '../../engine/labProgress'
import { diagnose } from '../../engine/formDiagnosis'
import type { Scheduler } from '../../engine/scheduler'
import type { UserWordState, VocabularyEntry } from '../../engine/types'
import { CompareTab } from './CompareTab'
import { LearnTab } from './LearnTab'
import { MasteryTab } from './MasteryTab'
import { PracticeTab } from './PracticeTab'
import { PatternsTab } from './PatternsTab'
import { ReviewTab } from './ReviewTab'
import { verbFamilies, type FamilyId } from '../../engine/verbFamilies'
import { TimedTab } from './TimedTab'
import { PickerLists, PickerTop } from './VerbPicker'
import type { Level } from '../../engine/verbLab'
import { COMMON, isLabTense, ownEntry, PRESENT, useLab, useVerbLevels, verbEntry, verbKey, type LabLanguage } from './labShared'

export type LabTab = 'learn' | 'practice' | 'review' | 'patterns' | 'timed' | 'compare' | 'mastery'

const TABS: { id: LabTab; label: string }[] = [
  { id: 'learn', label: 'Öğrenme' },
  { id: 'practice', label: 'Alıştırma' },
  { id: 'review', label: 'Tekrar' },
  { id: 'patterns', label: 'Kalıplar' },
  { id: 'timed', label: 'Zamana karşı' },
  { id: 'compare', label: 'Kıyaslama' },
  { id: 'mastery', label: 'Ustalık' },
]

/**
 * The verb lab: pick any French or Spanish verb and a tense, learn its forms (simple or every
 * tense by mood), practise them (write, choose, listen, match), race the clock, compare tenses
 * side by side and see how well each tense is known. Verbs and tenses the learner has not yet met
 * in their own list are all here too: this is where the conjugation tables are explored.
 */
export function VerbLab({
  language,
  vocabulary,
  states,
  scheduler,
  initialVerb,
  initialTense,
  initialTab,
}: {
  language: 'en' | 'fr' | 'es'
  vocabulary: readonly VocabularyEntry[]
  states: readonly UserWordState[]
  scheduler: Scheduler
  initialVerb?: string
  initialTense?: string
  initialTab?: LabTab
}) {
  if (language === 'en')
    return (
      <div className="stack">
        <PageHeader title="Fiil laboratuvarı" />
        <EmptyState art="library" title="Fiil laboratuvarı Fransızca ve İspanyolca için">
          İngilizce fiillerin çekimi basit olduğu için burada tablo yok. Üstteki dil düğmesinden Fransızca ya da İspanyolca’ya geçebilirsin.
        </EmptyState>
      </div>
    )
  return <Lab language={language} vocabulary={vocabulary} states={states} scheduler={scheduler} initialVerb={initialVerb} initialTense={initialTense} initialTab={initialTab} />
}

function Lab({ language, vocabulary, states, scheduler, initialVerb, initialTense, initialTab }: { language: LabLanguage; vocabulary: readonly VocabularyEntry[]; states: readonly UserWordState[]; scheduler: Scheduler; initialVerb?: string; initialTense?: string; initialTab?: LabTab }) {
  const ready = useTenses(language)
  const { lab, update, ready: labReady } = useLab(language, scheduler)
  const { frequency, levels, byFrequency } = useVerbLevels(language, ready)
  const [picked, setPicked] = useState<string | undefined>(initialVerb)
  const [tense, setTense] = useState<Tense>(() => (initialTense && isLabTense(language, initialTense) ? initialTense : PRESENT[language]))
  const [tab, setTab] = useState<LabTab>(initialTab ?? 'learn')
  const [level, setLevel] = useState<Level | null>(null)
  const [family, setFamily] = useState<FamilyId | undefined>()
  const main = useRef<HTMLElement>(null)

  const ownVerbs = useMemo(() => {
    if (!ready) return []
    const known = new Set(tenseVerbs(language))
    return [...new Set(vocabulary.filter((v) => v.partOfSpeech === 'verb').map((v) => verbKey(language, v.lemma)))].filter((v) => known.has(v))
  }, [vocabulary, language, ready])

  // The verb: the one chosen, else the last looked at, else the learner's first own verb, else the most common one.
  const verb = picked ?? (labReady ? (lab.recent[0] ?? ownVerbs[0] ?? COMMON[language][0][0]) : undefined)
  const available = useMemo(() => (verb && ready ? labTensesOf(verbEntry(language, verb)) : []), [verb, ready, language])
  const current: Tense = available.includes(tense) ? tense : (available[0] ?? tense)

  useEffect(() => {
    if (verb && labReady && ready && lab.recent[0] !== verb) update((l) => pushRecent(l, verb))
  }, [verb, labReady, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !labReady || !verb)
    return (
      <div className="stack">
        <PageHeader title="Fiil laboratuvarı" sub="Çekim tabloları yükleniyor…" />
      </div>
    )

  const own = ownEntry(vocabulary, language, verb)
  const dueCount = dueItems(lab, new Date()).length
  /** The forms the questions use: what "add to my review" puts in the queue. */
  const reviewable = tensesOf(verbEntry(language, verb))
  const gloss = own?.senses[0]?.gloss ?? COMMON[language].find(([l]) => l === verb)?.[1]
  /** On a phone the lists sit below the lesson: after picking from them, bring the lesson back into view. */
  const showLesson = () =>
    requestAnimationFrame(() => {
      if ((main.current?.getBoundingClientRect().top ?? 0) < 0) main.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  const choose = (v: string) => {
    setPicked(v)
    showLesson()
  }
  const openItem = (v: string, t: Tense) => {
    setPicked(v)
    setTense(t)
    setTab('practice')
    showLesson()
  }
  const onAnswer = (v: string, t: Tense, ok: boolean, given: string, expected: string, person?: number) => {
    // Where the slips are: counted per tense and person, and a wrong one by what kind it was.
    if (person !== undefined) {
      const kind = ok ? undefined : diagnose(verbEntry(language, v), t, person, given)
      update((l) => recordForm(l, t, person, ok, kind))
    }
    // A verb that is one of the learner's own words keeps its history (and the weak-tense hints) too.
    const entry = ownEntry(vocabulary, language, v)
    if (entry) void recordPractice(entry, states.find((s) => s.entryId === entry.id), 'conjugation', ok, 0, { given, expected })
    void t
  }

  return (
    <div className="stack verb-lab">
      <PageHeader title="Fiil laboratuvarı" sub="Herhangi bir fiili ve zamanı seç: öğren, alıştır, zamana karşı dene." />
      <div className="lab-grid">
        <div className="card lab-top">
          <PickerTop
            language={language}
            verb={verb}
            tense={current}
            available={available}
            level={level}
            levels={levels}
            byFrequency={byFrequency}
            frequency={frequency}
            onVerb={choose}
            onTense={setTense}
          />
        </div>
        <section className="card lab-main" ref={main} aria-label="Fiil çalışması">
          <div className="lab-tabs" role="tablist" aria-label="Çalışma türü">
            {TABS.map((t) => (
              <button key={t.id} id={`lab-tab-${t.id}`} role="tab" aria-selected={tab === t.id} aria-controls="lab-panel" className="lab-tab" onClick={() => setTab(t.id)}>
                {t.label}
                {t.id === 'review' && dueCount > 0 && <span className="lab-count">{Math.min(dueCount, 99)}</span>}
              </button>
            ))}
          </div>
          <div id="lab-panel" role="tabpanel" aria-labelledby={`lab-tab-${tab}`} className="lab-panel">
            {available.length === 0 ? (
              <p className="muted">Bu fiilin çekim tablosu yok.</p>
            ) : tab === 'learn' ? (
              <LearnTab
                language={language}
                verb={verb}
                tense={current}
                available={available}
                gloss={gloss}
                lab={lab}
                favorite={lab.favorites.includes(verb)}
                onTense={setTense}
                onFavorite={() => update((l) => toggleFavorite(l, verb))}
                families={verbFamilies(language, verb)}
                onFamily={(id) => {
                  setFamily(id)
                  setTab('patterns')
                }}
                inReview={reviewable.filter((t) => lab.records[labKey(verb, t)]).length}
                reviewable={reviewable.length}
                onAddReview={() => update((l) => addToReview(l, scheduler, verb, reviewable, new Date()))}
                onPractice={() => setTab('practice')}
              />
            ) : tab === 'practice' ? (
              <PracticeTab
                language={language}
                verb={verb}
                tense={current}
                available={available}
                onTense={setTense}
                onRound={(v, t, r) => update((l) => recordRound(l, scheduler, v, t, r, new Date()))}
                onAnswer={onAnswer}
                onTimed={() => setTab('timed')}
                byFrequency={byFrequency}
              />
            ) : tab === 'review' ? (
              <ReviewTab
                language={language}
                lab={lab}
                onCheck={(v, t, ok, given, expected) => {
                  update((l) => recordCheck(l, scheduler, v, t, ok, new Date()))
                  onAnswer(v, t, ok, given, expected)
                }}
                onOpen={choose}
              />
            ) : tab === 'patterns' ? (
              <PatternsTab
                key={family ?? 'all'}
                language={language}
                frequency={frequency}
                initial={family}
                onVerb={(v) => {
                  choose(v)
                  setTab('learn')
                }}
                onCheck={(v, t, ok, given, expected, person) => {
                  update((l) => recordCheck(l, scheduler, v, t, ok, new Date()))
                  onAnswer(v, t, ok, given, expected, person)
                }}
              />
            ) : tab === 'timed' ? (
              <TimedTab language={language} byFrequency={byFrequency} levels={levels} vocabulary={vocabulary} states={states} onAnswer={onAnswer} />
            ) : tab === 'compare' ? (
              <CompareTab language={language} verb={verb} available={available} />
            ) : (
              <MasteryTab
                language={language}
                verb={verb}
                available={available}
                lab={lab}
                onPractice={(t) => {
                  setTense(t)
                  setTab('practice')
                }}
                onOpenVerb={(v) => {
                  choose(v)
                  setTab('learn')
                }}
                onWeak={(t) => {
                  setTense(t)
                  setTab('practice')
                }}
              />
            )}
          </div>
        </section>
        <aside className="card lab-lists" aria-label="Fiil listeleri">
          <PickerLists language={language} verb={verb} tense={current} lab={lab} level={level} onLevel={setLevel} levels={levels} byFrequency={byFrequency} ownVerbs={ownVerbs} onVerb={choose} onItem={openItem} onReview={() => setTab('review')} />
        </aside>
      </div>
    </div>
  )
}
