import '../lazy.css'
import { REACT } from './drawnArt'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { IntrusionSources } from '../engine/crossLanguage'
import type { PlanItem } from '../engine/dailyPlan'
import { displayForm, type Evaluation } from '../engine/exercises'
import { xpForAnswer } from '../engine/gamification'
import { masteryStage } from '../engine/mastery'
import { markKnown, needsIntervention, newWordState, processAttempt, type AttemptInput } from '../engine/review'
import { listeningRate } from '../engine/listening'
import { createRng } from '../engine/rng'
import type { Scheduler } from '../engine/scheduler'
import { adaptExercise, completeItem, currentItem, honorOff, insertLater, isFinished, mixInTyping, retryItem, skipRemaining, startSession, suggestBreak, summarize, typedFollowUp, typeStrongCloze, TYPING_SHARE, type SessionLogEntry, type SessionSummary } from '../engine/session'
import { TARGET_LANGUAGES, timeOf, type Confidence, type EngineOptions, type ExerciseType, type Mistake, type ReviewMode, type UserWordState, type VocabularyEntry, type Verdict } from '../engine/types'
import type { KelimeDB, Settings } from '../data/db'
import { SAMPLE_WORDS } from '../data/seed'
import { addExample } from '../data/wordInput'
import { loadFrequency } from '../data/frequency'
import { ConfirmDialog } from './Dialog'
import { CloseIcon, FlameIcon, GearIcon, StarIcon } from './icons'
import { applySettings, prefs } from './prefs'
import { sfx } from './sounds'
import { useGame } from './game'
import { preloadRecording, speechPrefs } from './speech'
import { prefetchNatural } from './naturalVoice'
import { warmAudio } from '../data/audioCache'
import { Intro } from './session/Intro'
import { RefreshCard } from './session/RefreshCard'
import { FormQuestion } from './session/FormQuestion'
import { showToast, undoable } from './toastFeed'
import { effectivePrefs } from '../engine/exercisePrefs'
import { blockedByPrefs } from '../engine/exercises'
import { DifficultButton } from './DifficultButton'
import { isDifficult, withDifficult } from '../engine/difficult'
import { modalOpen } from './session/keys'

// Dialogs opened now and then during a session load when first opened, not with the session.
const SessionSettings = lazy(() => import('./session/SessionSettings').then((m) => ({ default: m.SessionSettings })))
import { ExerciseRunner } from './session/ExerciseRunner'

interface Props {
  items: PlanItem[]
  /** 'practice' = free practice: answers don't touch the schedule or the Mistake Bank. */
  mode: ReviewMode
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes: Mistake[]
  db: KelimeDB
  scheduler: Scheduler
  seed: number
  options: EngineOptions
  onFinish: (summary: SessionSummary) => void
  onQuit: () => void
  /** Study settings, adjustable from the session's gear button. */
  settings?: Settings
  onSettings?: (s: Settings) => void
  /** A verb lab form mixed into the day was answered (it goes to the lab's own review). */
  onFormAnswer?: (form: NonNullable<PlanItem['form']>, ok: boolean, given: string) => void
}

/** A word that felt hard on its refresher card is asked once more this many items later. */
const STRUGGLE_GAP = 6

const startOfYesterday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - 1)
  return d.getTime()
}

/** Keeps the phone screen on during a session (where supported); re-taken after switching apps. */
function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let alive = true
    const take = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock
        .request('screen')
        .then((l) => (alive ? (lock = l) : void l.release()))
        .catch(() => {})
    }
    take()
    document.addEventListener('visibilitychange', take)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', take)
      void lock?.release()
    }
  }, [enabled])
}

export function SessionScreen(p: Props) {
  useWakeLock(p.settings?.keepAwake !== false)
  // State, not memo: an override can add an accepted spelling to a word mid-session.
  const [byId, setById] = useState(() => new Map(p.vocabulary.map((e) => [e.id, e])))
  /** The last answer, kept so "my answer was right too" can recompute it from the prior state. */
  const lastAnswer = useRef<{ before: UserWordState; hadState: boolean; bank: Mistake[]; input: AttemptInput; eventId: string } | null>(null)
  const states = useRef(new Map(p.states.map((s) => [s.entryId, s])))
  const mistakes = useRef(p.mistakes)
  // Distractors may come from the sample set too, so options are full even with few own words.
  const distractorPool = useMemo(() => {
    const own = new Set(p.vocabulary.map((v) => v.id))
    // A mixed session spans languages: samples for each one present.
    const langs = [...new Set(p.vocabulary.map((v) => v.language))]
    return [...p.vocabulary, ...langs.flatMap((l) => SAMPLE_WORDS[l].filter((w) => !own.has(w.id)))]
  }, [p.vocabulary])
  const rng = useMemo(() => createRng(p.seed ^ 0x5bd1e995), [p.seed])
  // Words of the other languages, to recognise an answer given in the wrong language.
  const [intrusionSources, setIntrusionSources] = useState<IntrusionSources>()
  useEffect(() => {
    const lang = p.vocabulary[0]?.language
    if (!lang) return
    let live = true
    const others = TARGET_LANGUAGES.filter((l) => l !== lang)
    Promise.all([p.db.vocabulary.where('language').anyOf(others).toArray(), ...TARGET_LANGUAGES.map(loadFrequency)]).then(([otherWords, ...maps]) => {
      if (!live) return
      const lists = Object.fromEntries(TARGET_LANGUAGES.map((l, i) => [l, new Set(maps[i].keys())]))
      setIntrusionSources({ others: otherWords, lists })
    })
    return () => {
      live = false
    }
  }, [p.db, p.vocabulary])
  // Own recordings are loaded up front: Safari only plays audio started directly by a click.
  useEffect(() => {
    const ids = new Set(p.items.map((i) => i.entryId))
    for (const v of p.vocabulary) {
      if (!ids.has(v.id)) continue
      if (v.audioId) void preloadRecording(v.audioId)
      else {
        // A native recording kept on the device plays at once (and offline).
        if (v.audioUrl) warmAudio([v.audioUrl])
        prefetchNatural(displayForm(v), v.language, speechPrefs.rate)
      }
    }
  }, [p.items, p.vocabulary])
  // Some recognition questions become typing (Settings → Yazma oranı), and a well-known word's
  // blank is typed instead of chosen; practice sessions keep their plan.
  /** Typing from the meaning is open to this word: not switched off, and its meaning is not a long definition when those are skipped. */
  const typedAllowed = (entryId: string) => {
    const word = byId.get(entryId)
    return !blockedByPrefs('typed_translation', word ?? ({ senses: [{ gloss: '' }] } as VocabularyEntry), { off: prefs.exerciseOff, skipLong: prefs.skipLongGloss })
  }
  const shape = (it: PlanItem, st: UserWordState | undefined) => {
    const mixed = mixInTyping(it, st, TYPING_SHARE[prefs.typingShare], rng, typedAllowed(it.entryId))
    return prefs.exerciseOff.includes('cloze_typed') ? mixed : typeStrongCloze(mixed, st)
  }
  const [session, setSession] = useState(() =>
    startSession(p.mode === 'practice' || !p.items.length ? p.items : [shape(p.items[0], states.current.get(p.items[0].entryId)), ...p.items.slice(1)]),
  )
  const item = currentItem(session)
  // The day's XP goal is reached in the middle of a round: said once, with the same little chime as a run of five.
  const dayGame = useGame()
  const earnedXp = session.log.reduce((sum, l) => sum + (l.xp ?? 0), 0)
  const dayGoal = p.settings?.dailyXpGoal ?? 0
  const goalSaid = useRef(false)
  useEffect(() => {
    if (goalSaid.current || !dayGoal || !dayGame || p.mode !== 'normal') return
    if (dayGame.xp.today < dayGoal && dayGame.xp.today + earnedXp >= dayGoal) {
      goalSaid.current = true
      sfx.combo()
      showToast('Günlük XP hedefin tamam!')
    }
  }, [earnedXp, dayGoal, dayGame, p.mode])
  const { onFinish } = p
  // Words whose refresher card was shown (or put away) in this session.
  const [refreshed, setRefreshed] = useState<ReadonlySet<string>>(() => new Set())
  // The verdict of a lab form on screen, logged when the learner moves on.
  const formVerdict = useRef<Verdict | undefined>(undefined)

  useEffect(() => {
    if (isFinished(session)) onFinish(summarize(session))
  }, [session, onFinish])

  const { onQuit } = p
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const answered = session.log.filter((l) => l.verdict).length
  // The answer on screen is saved already but joins the log only on "Devam"; quitting counts it too.
  const [answeredAt, setAnsweredAt] = useState<number | null>(null)
  const onScreen = answeredAt === session.index ? 1 : 0
  // Offered once per session; "Devam edeyim" puts it away for good.
  const [breakDismissed, setBreakDismissed] = useState(false)
  const showBreak = !breakDismissed && answeredAt !== session.index && suggestBreak(session.log)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A dialog that is open (or closing on this same keypress) owns Esc.
      if (e.key === 'Escape' && !modalOpen()) setConfirmQuit(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!item) return null
  const form = item.form
  const found = byId.get(item.entryId)
  const progress = (session.index / session.items.length) * 100

  const next = (log: Omit<SessionLogEntry, 'item'>, retry?: PlanItem, followUp?: PlanItem) =>
    setSession((s) => {
      const after = completeItem(s, log, retry, followUp)
      // 85 % rule: the coming item's format follows how the session is going.
      const up = after.items[after.index]
      const upEntry = up && byId.get(up.entryId)
      if (!up || !upEntry) return after
      // Some recognition questions become typing (Settings → Yazma oranı), decided as each one comes up.
      const mixed = p.mode === 'practice' || up.reason === 'practice' ? up : shape(up, states.current.get(up.entryId))
      const adapted = adaptExercise(mixed, upEntry, states.current.get(up.entryId), after.log.map((l) => l.verdict), rng, p.options)
      // A type switched off in this session's settings applies to what is still to come, not only to the next plan.
      const final = p.mode === 'practice' || up.reason === 'practice' ? adapted : honorOff(adapted, upEntry, states.current.get(up.entryId), rng, { ...p.options, off: prefs.exerciseOff, skipLong: prefs.skipLongGloss })
      if (final === up) return after
      const items = [...after.items]
      items[after.index] = final
      return { ...after, items }
    })

  if (!found && !form) {
    // The word was deleted after the plan was built.
    queueMicrotask(() => next({ entryId: item.entryId }))
    return null
  }
  // A lab form has no word: the word-only actions below are never reached for it.
  const entry = found as VocabularyEntry

  const introduce = async (known = false) => {
    const now = new Date()
    let state = states.current.get(entry.id) ?? newWordState(entry, now)
    if (known) state = markKnown(state, p.scheduler, now)
    states.current.set(entry.id, state)
    await p.db.wordStates.put(state)
    if (known) setSession((s) => skipRemaining(completeItem(s, { entryId: entry.id }), entry.id))
    else next({ entryId: entry.id })
  }

  // A word met yesterday or earlier today comes back as a card before its first question here (not one just introduced in this session).
  const refreshDue = (it: PlanItem, e: VocabularyEntry) =>
    prefs.refreshCard &&
    p.mode === 'normal' &&
    it.kind === 'exercise' &&
    it.reason !== 'practice' &&
    !refreshed.has(e.id) &&
    // Never over an answer already given (answering gives a new word its state).
    answeredAt !== session.index &&
    !session.log.some((l) => l.entryId === e.id) &&
    timeOf(states.current.get(e.id)?.introducedAt) >= startOfYesterday()

  const answer = async (ev: Evaluation, responseMs: number, hintsUsed: number, maxHints: number, confidence?: Confidence) => {
    setAnsweredAt(session.index)
    const hadState = states.current.has(entry.id)
    const before = states.current.get(entry.id) ?? newWordState(entry, new Date())
    const input: AttemptInput = {
      exerciseType: item.exerciseType!,
      verdict: ev.verdict,
      errorType: ev.errorType,
      given: ev.given,
      expected: ev.expected,
      responseMs,
      hintsUsed,
      maxHints,
      at: new Date(),
      // Graduated follow-ups of a new word are practice: they help memory, not the schedule.
      mode: item.reason === 'practice' ? 'practice' : p.mode,
      confidence,
    }
    const bank = mistakes.current
    const result = processAttempt(before, input, bank, p.scheduler)
    // The in-memory copies change only once the answer is saved: a refused write (storage full, database closed)
    // leaves them as they were, in step with what is on the device.
    try {
      await p.db.saveReview(result)
    } catch (e) {
      setAnsweredAt((a) => (a === session.index ? null : a))
      throw e
    }
    states.current.set(entry.id, result.state)
    mistakes.current = result.mistakes
    lastAnswer.current = { before, hadState, bank, input, eventId: result.event.id }
    const runBefore = comboOf(session.log)
    const xp = xpForAnswer({ exerciseType: input.exerciseType, verdict: ev.verdict, hintsUsed, responseMs, mode: input.mode ?? p.mode, combo: runBefore })
    const run = ev.verdict === 'wrong' ? 0 : runBefore + 1
    if (ev.verdict === 'wrong') sfx.wrong()
    else if (run === 5 || run === 10 || run === 20) sfx.combo()
    else if (ev.verdict === 'near') sfx.near()
    else sfx.correct()
    return {
      entryId: entry.id,
      verdict: ev.verdict,
      errorType: ev.errorType,
      stageBefore: masteryStage(before),
      stageAfter: masteryStage(result.state),
      xp,
    }
  }

  /**
   * The learner says the answer was actually right (e.g. a valid synonym). Recompute the review
   * from the state before it, and remember the spelling so it is accepted next time.
   */
  const override = async (): Promise<Omit<SessionLogEntry, 'item'> | null> => {
    const last = lastAnswer.current
    if (!last) return null
    const input: AttemptInput = { ...last.input, verdict: 'correct', errorType: undefined }
    const result = processAttempt(last.before, input, last.bank, p.scheduler)
    const keep = new Set(result.mistakes.map((m) => m.id))
    const stale = mistakes.current.filter((m) => m.entryId === entry.id && !keep.has(m.id)).map((m) => m.id)
    await p.db.replaceReview(last.eventId, result, stale)
    states.current.set(entry.id, result.state)
    mistakes.current = result.mistakes
    lastAnswer.current = { ...last, input, eventId: result.event.id }
    const given = last.input.given?.trim()
    if (given && (input.exerciseType === 'typed_translation' || input.exerciseType === 'listen_type')) {
      const updated = { ...entry, alternativeForms: [...new Set([...(entry.alternativeForms ?? []), given])] }
      setById((m) => new Map(m).set(entry.id, updated))
      await p.db.vocabulary.put(updated)
    }
    const xp = xpForAnswer({ exerciseType: input.exerciseType, verdict: 'correct', hintsUsed: input.hintsUsed, responseMs: input.responseMs, mode: p.mode, combo: 0 })
    return { entryId: entry.id, verdict: 'correct', stageBefore: masteryStage(last.before), stageAfter: masteryStage(result.state), xp }
  }

  /** "I tapped the wrong option": the answer is taken back as if it never happened. */
  const discard = async (): Promise<boolean> => {
    const last = lastAnswer.current
    if (!last) return false
    await p.db.revertReview(last.eventId, last.hadState ? last.before : null, entry.id, last.bank)
    if (last.hadState) states.current.set(entry.id, last.before)
    else states.current.delete(entry.id)
    mistakes.current = last.bank
    lastAnswer.current = null
    setAnsweredAt(null)
    return true
  }

  /** A kind of question turned down or off from the feedback after a miss (Settings → Sorular), undoable. */
  const setTypePref = (type: ExerciseType, name: string, level: 'less' | 'off') => {
    const settings = p.settings
    if (!settings || !p.onSettings) return
    const prefs = { ...effectivePrefs(settings.exercisePrefs, settings.typedBlanks), [type]: level }
    const apply = (next: Settings) => {
      applySettings(next)
      p.onSettings!(next)
    }
    apply({ ...settings, exercisePrefs: prefs, typedBlanks: true })
    undoable(level === 'off' ? `“${name}” soruları artık sorulmayacak.` : `“${name}” soruları daha az sorulacak.`, () => apply(settings))
  }

  const proceed = (log: Omit<SessionLogEntry, 'item'>) => {
    const state = states.current.get(entry.id)
    const retry = log.verdict === 'wrong' && state ? retryItem(item, entry, state, rng, p.options) : undefined
    // A new word answered right comes back a little later in another format (graduated recall).
    // The second comeback is typed: picked out twice, now produced from its meaning.
    const comebacks = session.followUps?.[entry.id] ?? 0
    const followUp =
      log.verdict && log.verdict !== 'wrong' && state ? (comebacks >= 1 ? typedFollowUp(item, typedAllowed(entry.id)) : retryItem(item, entry, state, rng, p.options)) : undefined
    next(log, retry, followUp)
  }

  // The lightning mark, kept on the word itself, so a hard word is gathered for a practice of its own.
  const markDifficult = async (on: boolean) => {
    const updated = withDifficult(entry, on)
    await p.db.vocabulary.put(updated)
    setById((m) => new Map(m).set(updated.id, updated))
    showToast(on ? 'Zor kelimelere eklendi: ayrı çalışmada toplanır.' : 'Zor işareti kaldırıldı.')
  }
  const combo = comboOf(session.log)
  const sessionXp = session.log.reduce((sum, l) => sum + (l.xp ?? 0), 0)

  return (
    <div className="session">
      <div className="session-top">
        <button className="icon-btn" onClick={() => setConfirmQuit(true)} aria-label="Oturumu bitir">
          <CloseIcon size={22} />
        </button>
        {/* One segment per question, coloured by why it is here; done ones solid, the rest faint. */}
        <div className="progress progress-segments" role="progressbar" aria-label="Oturumun ilerlemesi" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          {session.items.length <= 60 ? (
            session.items.map((it, i) => <span key={i} className={`seg seg-${it.kind === 'introduce' ? 'new' : it.reason}${i < session.index ? ' is-done' : ''}${i === session.index ? ' is-now' : ''}`} />)
          ) : (
            <div style={{ width: `${Math.max(progress, 3)}%` }} />
          )}
        </div>
        {combo >= 3 ? (
          <span className="combo" key={combo} data-tier={combo >= 10 ? 3 : combo >= 5 ? 2 : 1} data-burst={combo === 5 || combo === 10 || combo === 20 ? '' : undefined}>
            <FlameIcon size={18} /> {combo}
          </span>
        ) : (
          <span className="progress-count">
            {session.index}/{session.items.length}
          </span>
        )}
        <span className="session-xp" key={sessionXp}>
          <StarIcon size={16} className="icon-star" /> {sessionXp}
        </span>
        {!form && <DifficultButton marked={isDifficult(entry)} onToggle={() => void markDifficult(!isDifficult(entry))} />}
        {p.settings && p.onSettings && (
          <button className="icon-btn session-gear" onClick={() => setShowSettings(true)} aria-label="Çalışma ayarları" title="Çalışma ayarları">
            <GearIcon size={20} />
          </button>
        )}
      </div>
      {showSettings && p.settings && p.onSettings && (
        <Suspense fallback={null}>
          <SessionSettings
            settings={p.settings}
            onChange={(s) => {
              applySettings(s)
              p.onSettings!(s)
            }}
            onClose={() => setShowSettings(false)}
            questionType={!form && item.kind === 'exercise' ? item.exerciseType : undefined}
            remaining={Math.max(0, session.items.length - session.index - 1)}
            onShorten={(n) => {
              // Keeps the current question and the next n; the rest of the day's plan is still there afterwards.
              setSession((s) => ({ ...s, items: s.items.slice(0, s.index + 1 + n) }))
              setShowSettings(false)
              showToast(`Bu oturum ${n} soru daha sürecek.`)
            }}
          />
        </Suspense>
      )}
      {showBreak && (
        <div className="break-note" role="status">
          <p>
            <strong>Kısa bir ara iyi gelebilir.</strong> Son cevaplarda zorlanıyorsun. Aynı süreyi tek oturuma sıkıştırmak yerine araya mola koymak daha kalıcı öğretir; kalan sorular bugünkü görevinde bekler.
          </p>
          <div className="break-actions">
            <button className="btn btn-quiet" onClick={() => p.onFinish(summarize(session))}>
              Ara ver
            </button>
            <button className="link" onClick={() => setBreakDismissed(true)}>
              Devam edeyim
            </button>
          </div>
        </div>
      )}
      {p.mode === 'practice' && (
        <p className="practice-badge">
          <span className="badge">Serbest pratik</span>
        </p>
      )}
      {confirmQuit && (
        <ConfirmDialog
          title="Oturumdan çıkılsın mı?"
          confirmLabel="Çık"
          cancelLabel="Devam et"
          danger
          onConfirm={onQuit}
          onCancel={() => setConfirmQuit(false)}
        >
          {answered + onScreen > 0
            ? `Verdiğin ${answered + onScreen} cevap kaydedildi. Kalan ${session.items.length - session.index - onScreen} soru bugünkü görevinde bekleyecek.`
            : 'Henüz cevap vermedin; görev olduğu gibi bekleyecek.'}
        </ConfirmDialog>
      )}
      <div className="session-stage">
      {session.index === 0 && session.log.length === 0 && answeredAt === null && session.items.length > 1 && (
        <p className="session-hello">
          <img src={REACT.hello} alt="" width={44} height={44} draggable={false} />
          <span>
            Merhaba! <strong>{session.items.length}</strong> soruluk bir tur, hadi başlayalım.
          </span>
        </p>
      )}
      {form ? (
        <FormQuestion
          key={session.index}
          form={form}
          onAnswered={(ok, given) => {
            setAnsweredAt(session.index)
            formVerdict.current = ok ? 'correct' : 'wrong'
            p.onFormAnswer?.(form, ok, given)
          }}
          onContinue={() => next({ entryId: item.entryId, verdict: formVerdict.current })}
        />
      ) : refreshDue(item, entry) ? (
        <RefreshCard
          key={`refresh-${session.index}`}
          entry={entry}
          onRemember={() => setRefreshed((r) => new Set(r).add(entry.id))}
          onStruggle={() => {
            setRefreshed((r) => new Set(r).add(entry.id))
            // A word that feels hard comes once more later, as an easy question that doesn't touch the schedule.
            setSession((s) => insertLater(s, { kind: 'exercise', entryId: entry.id, reason: 'practice', skill: 'recognition', exerciseType: 'mc_meaning' }, STRUGGLE_GAP))
          }}
        />
      ) : item.kind === 'introduce' ? (
        <Intro
          key={session.index}
          entry={entry}
          catalog={distractorPool}
          rng={rng}
          onContinue={() => introduce(false)}
          onKnown={() => introduce(true)}
          onPretestOff={p.settings && p.onSettings ? () => { const next = { ...p.settings!, pretest: false }; applySettings(next); p.onSettings!(next); showToast('Yeni kelimeler artık önce kart olarak gösterilecek. Geri açmak için Ayarlar > Sorular.') } : undefined}
          onOwnSentence={async (text) => {
            const updated = addExample(entry, text, '', true)
            await p.db.vocabulary.put(updated)
            setById((m) => new Map(m).set(updated.id, updated))
          }}
        />
      ) : (
        <ExerciseRunner
          key={session.index}
          entry={entry}
          item={item}
          catalog={distractorPool}
          rng={rng}
          onAnswer={answer}
          onOverride={override}
          onDiscard={discard}
          onContinue={proceed}
          combo={combo}
          struggling={() => needsIntervention(states.current.get(entry.id) ?? newWordState(entry, new Date()))}
          wordState={() => states.current.get(entry.id)}
          listenRate={listeningRate(speechPrefs.rate, states.current.get(entry.id)?.skills.listening?.stability)}
          intrusionSources={intrusionSources}
          onEntryUpdated={(updated) => setById((m) => new Map(m).set(updated.id, updated))}
          onToggleDifficult={() => void markDifficult(!isDifficult(entry))}
          onTypePref={p.settings && p.onSettings ? setTypePref : undefined}
        />
      )}
      </div>
    </div>
  )
}

/** Consecutive non-wrong answers at the end of the log (introductions don't break a run). */
function comboOf(log: readonly SessionLogEntry[]): number {
  let n = 0
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].verdict === undefined) continue
    if (log[i].verdict === 'wrong') break
    n++
  }
  return n
}
