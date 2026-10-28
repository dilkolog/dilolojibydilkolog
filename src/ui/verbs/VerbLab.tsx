import '../../lazy.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader } from '../PageHeader'
import { useTenses } from '../tenseGroups'
import { recordPractice } from '../games/shared'
import { conjugateTense, labTensesOf, tensesOf, tenseVerbs, type Tense } from '../../engine/tenses'
import { addToReview, awardLabXp, dueItems, labKey, pushRecent, recordCheck, recordForm, recordRound, recordTourDay, toggleFavorite } from '../../engine/labProgress'
import { localDate } from '../../engine/progress'
import { diagnose } from '../../engine/formDiagnosis'
import type { Scheduler } from '../../engine/scheduler'
import type { UserWordState, VocabularyEntry } from '../../engine/types'
import { EnglishVerbs } from './EnglishVerbs'
import { LearnTab } from './LearnTab'
import { MasteryTab } from './MasteryTab'
import { PracticeTab } from './PracticeTab'
import { PatternsTab } from './PatternsTab'
import { ReviewTab } from './ReviewTab'
import { verbFamilies, type FamilyId } from '../../engine/verbFamilies'
import { SentenceQuiz } from './SentenceQuiz'
import { TenseBar } from './TenseBar'
import { TimedTab } from './TimedTab'
import { PickerLists, PickerTop } from './VerbPicker'
import type { VerbFormHit } from '../../engine/verbLookup'
import type { Level } from '../../engine/verbLab'
import { recordVisit } from '../screenUsage'
import { useTabIndicator } from '../useTabIndicator'
import { COMMON, isLabTense, ownEntry, PRESENT, useLab, useVerbLevels, useVerbOfDay, verbEntry, verbKey, type LabLanguage } from './labShared'
import { BookIcon, ChevronDownIcon } from '../icons'
import { TourCard, TourRun } from './LabTour'
import { useTour } from './labTourItems'

/**
 * 'timed' opens practice on its race against the clock (the conjugation games link there);
 * 'warmup' opens Ustalık with a round on the most common kind of slip (Today's verb warm-up).
 */
export type LabTab = 'learn' | 'practice' | 'review' | 'patterns' | 'mastery' | 'timed' | 'warmup'
type ShownTab = Exclude<LabTab, 'timed' | 'warmup'>

/**
 * Three tabs: learn the verb, practise freely, see how it goes. The verb families (Kalıplar) open
 * inside Öğren from the verb's family; the review queue opens inside İlerleme (and comes first in
 * the day's round anyway).
 */
const TABS: { id: ShownTab; label: string }[] = [
  { id: 'learn', label: 'Öğren' },
  { id: 'practice', label: 'Alıştırma' },
  { id: 'mastery', label: 'İlerleme' },
]
/** The tab a view belongs to: Kalıplar under Öğren, the review queue under İlerleme. */
const PARENT: Record<ShownTab, ShownTab> = { learn: 'learn', patterns: 'learn', practice: 'practice', review: 'mastery', mastery: 'mastery' }

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
  onAdded,
}: {
  language: 'en' | 'fr' | 'es'
  vocabulary: readonly VocabularyEntry[]
  states: readonly UserWordState[]
  scheduler: Scheduler
  initialVerb?: string
  initialTense?: string
  initialTab?: LabTab
  /** A verb was added to the word list from the lab. */
  onAdded?: () => void
}) {
  if (language === 'en') return <EnglishVerbs />
  return <Lab language={language} vocabulary={vocabulary} states={states} scheduler={scheduler} initialVerb={initialVerb} initialTense={initialTense} initialTab={initialTab} onAdded={onAdded} />
}

function Lab({ language, vocabulary, states, scheduler, initialVerb, initialTense, initialTab, onAdded }: { language: LabLanguage; vocabulary: readonly VocabularyEntry[]; states: readonly UserWordState[]; scheduler: Scheduler; initialVerb?: string; initialTense?: string; initialTab?: LabTab; onAdded?: () => void }) {
  const ready = useTenses(language)
  const { lab, update, ready: labReady } = useLab(language, scheduler)
  // The day's round: one button to practise, the lab deciding what and how.
  const verbOfDay = useVerbOfDay(language, vocabulary, null)?.verb
  const [tourRound, setTourRound] = useState(0)
  const [touring, setTouring] = useState(false)
  const tour = useTour(language, lab, verbOfDay, ready && labReady, tourRound)
  const { frequency, levels, byFrequency } = useVerbLevels(language, ready)
  const [picked, setPicked] = useState<string | undefined>(initialVerb)
  const [tense, setTense] = useState<Tense>(() => (initialTense && isLabTense(language, initialTense) ? initialTense : PRESENT[language]))
  const [tab, setTabState] = useState<ShownTab>(initialTab === 'timed' ? 'practice' : initialTab === 'warmup' ? 'mastery' : (initialTab ?? 'learn'))
  const [timedFirst, setTimedFirst] = useState(initialTab === 'timed')
  const setTab = (t: ShownTab) => {
    setTimedFirst(false)
    setTabState(t)
  }
  // Which tabs are used, on this device only (Settings → Kullanım): the shown tab, the first one too.
  useEffect(() => {
    recordVisit(`verbs:${tab}`)
    if (timedFirst) recordVisit('verbs:practice:timed')
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps
  const tabsRef = useTabIndicator(tab)
  const [level, setLevel] = useState<Level | null>(null)
  // The verb lists stay folded: once a verb is chosen they would only crowd the lesson.
  const [listsOpen, setListsOpen] = useState(false)
  const [family, setFamily] = useState<FamilyId | undefined>()
  /** A conjugated form searched for: its person is marked while that verb and tense are in view. */
  const [found, setFound] = useState<{ verb: string; tense: Tense; person: number } | null>(null)
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
        <PageHeader art="write" title="Fiil laboratuvarı" sub="Çekim tabloları yükleniyor…" />
      </div>
    )

  const own = ownEntry(vocabulary, language, verb)
  const dueCount = dueItems(lab, new Date()).length
  /** The forms the questions use: what "add to my review" puts in the queue. */
  const reviewable = tensesOf(verbEntry(language, verb))
  const gloss = own?.senses[0]?.gloss ?? COMMON[language].find(([l]) => l === verb)?.[1]
  /** After choosing a verb (typed or from the lists), the lesson in view: on a phone it can be off screen. */
  const showLesson = () =>
    requestAnimationFrame(() => {
      const top = main.current?.getBoundingClientRect().top ?? 0
      const tableEnd = main.current?.querySelector('.lab-forms')?.getBoundingClientRect().bottom ?? 0
      // Above the screen, or low enough that the table would start or end below it: bring the lesson up.
      if (top < 0 || top > innerHeight / 2 || (top > 0 && tableEnd > innerHeight)) main.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  const choose = (v: string) => {
    setPicked(v)
    showLesson()
  }
  const openForm = (hit: VerbFormHit) => {
    setPicked(hit.lemma)
    if (isLabTense(language, hit.tense)) {
      setTense(hit.tense)
      setFound(hit.person !== undefined ? { verb: hit.lemma, tense: hit.tense, person: hit.person } : null)
    }
    if (tab !== 'learn' && tab !== 'practice') setTab('learn')
    showLesson()
  }
  const openItem = (v: string, t: Tense) => {
    setPicked(v)
    setTense(t)
    setTab('practice')
    showLesson()
  }
  const onAnswer = (v: string, t: Tense, ok: boolean, given: string, expected: string, person?: number) => {
    // Every answer in the lab earns XP (a right one 8, a wrong one 1).
    update((l) => awardLabXp(l, ok))
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

  const endTour = () => {
    setTouring(false)
    setTourRound((r) => r + 1)
  }

  if (touring)
    return (
      <div className="stack verb-lab">
        <PageHeader art="write" title="Fiil laboratuvarı" />
        <TourRun
          language={language}
          items={tour}
          onAnswer={(item, ok, given) => {
            update((l) => recordCheck(l, scheduler, item.verb, item.tense, ok, new Date()))
            onAnswer(item.verb, item.tense, ok, given, conjugateTense(verbEntry(language, item.verb), item.tense)?.[item.person] ?? '', item.person)
          }}
          onOpenVerb={(v) => {
            endTour()
            choose(v)
          }}
          onClose={endTour}
          onFinished={() => update((l) => recordTourDay(l, localDate(new Date())))}
        />
      </div>
    )

  return (
    <div className="stack verb-lab">
      <PageHeader art="write" title="Fiil laboratuvarı" />
      <TourCard language={language} items={tour} onStart={() => setTouring(true)} />
      <div className="lab-grid">
        {/* One strip on top: find a verb, or open the lists (favourites, levels, own verbs) when wanted. */}
        <div className="card lab-top">
          <PickerTop language={language} verb={verb} level={level} levels={levels} byFrequency={byFrequency} frequency={frequency} onVerb={choose} onForm={openForm} />
          <button type="button" className="chip lab-lists-toggle" aria-label="Fiil listeleri" aria-expanded={listsOpen} aria-controls="lab-lists" onClick={() => setListsOpen((o) => !o)}>
            <BookIcon size={18} /> <span className="lab-wide">Fiil listeleri</span>
            <ChevronDownIcon size={16} className={listsOpen ? 'is-flipped' : undefined} />
          </button>
        </div>
        {listsOpen && (
          <aside id="lab-lists" className="card lab-lists" aria-label="Fiil listeleri">
            <PickerLists
              language={language}
              verb={verb}
              tense={current}
              lab={lab}
              level={level}
              onLevel={setLevel}
              levels={levels}
              byFrequency={byFrequency}
              ownVerbs={ownVerbs}
              onVerb={(v) => {
                setListsOpen(false)
                choose(v)
              }}
            />
          </aside>
        )}
        <section className="card lab-main" ref={main} aria-label="Fiil çalışması">
          <div className="lab-tabs ind-line" role="tablist" aria-label="Çalışma türü" ref={tabsRef}>
            {TABS.map((t) => (
              <button key={t.id} id={`lab-tab-${t.id}`} role="tab" aria-selected={PARENT[tab] === t.id} aria-controls="lab-panel" className="lab-tab" onClick={() => setTab(t.id)}>
                {t.label}
                {t.id === 'mastery' && dueCount > 0 && <span className="lab-count">{Math.min(dueCount, 99)}</span>}
              </button>
            ))}
          </div>
          {(tab === 'learn' || tab === 'practice') && available.length > 0 && <TenseBar language={language} verb={verb} tense={current} available={available} onTense={setTense} />}
          <div id="lab-panel" role="tabpanel" aria-labelledby={`lab-tab-${PARENT[tab]}`} className="lab-panel">
            {tab !== PARENT[tab] && (
              <button type="button" className="link lab-back" onClick={() => setTab(PARENT[tab])}>
                {tab === 'patterns' ? '← Fiile dön' : '← İlerleme'}
              </button>
            )}
            {available.length === 0 ? (
              <p className="muted">Bu fiilin çekim tablosu yok.</p>
            ) : tab === 'learn' ? (
              <LearnTab
                language={language}
                verb={verb}
                tense={current}
                found={found && found.verb === verb && found.tense === current ? found.person : undefined}
                onMemorised={(t, results) =>
                  update((l) => {
                    // Saying "I knew it" counts like a round: per person in the tally, and the tense's points.
                    const tallied = results.reduce((x, r) => recordForm(x, t, r.person, r.ok), l)
                    return recordRound(tallied, scheduler, verb, t, { correct: results.filter((r) => r.ok).length, total: results.length }, new Date())
                  })
                }
                available={available}
                gloss={gloss}
                inList={!!own}
                onAdded={onAdded}
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
                initialMode={timedFirst ? 'timed' : undefined}
                sentences={<SentenceQuiz language={language} verbs={[verb, ...ownVerbs, ...lab.recent, ...byFrequency.slice(0, 300)].filter((v, i, all) => all.indexOf(v) === i)} onAnswer={onAnswer} />}
                timed={<TimedTab language={language} byFrequency={byFrequency} levels={levels} vocabulary={vocabulary} states={states} onAnswer={onAnswer} />}
                byFrequency={byFrequency}
              />
            ) : tab === 'review' ? (
              <ReviewTab
                language={language}
                lab={lab}
                onCheck={(v, t, ok, given, expected, person) => {
                  update((l) => recordCheck(l, scheduler, v, t, ok, new Date()))
                  onAnswer(v, t, ok, given, expected, person)
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
            ) : (
              <MasteryTab
                language={language}
                verb={verb}
                available={available}
                lab={lab}
                byFrequency={byFrequency}
                startDrill={initialTab === 'warmup'}
                onItem={openItem}
                onCheck={(v, t, ok, given, expected, person) => {
                  update((l) => recordCheck(l, scheduler, v, t, ok, new Date()))
                  onAnswer(v, t, ok, given, expected, person)
                }}
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
                dueCount={dueCount}
                onReview={() => setTab('review')}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
