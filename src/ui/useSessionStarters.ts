import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { buildDailyPlan, buildExtraNewPlan, mixForms, roundForMinutes, shortRound, type DailyPlan, type PlanInput, type PlanItem, type PlanReason } from '../engine/dailyPlan'
import { difficultWords } from '../engine/difficult'
import { openMistakes } from '../engine/mistakes'
import { buildDeckPlan, buildEarlyReviewPlan, buildMistakePlan, buildPracticePlan } from '../engine/practice'
import { buildQuestPlan } from '../engine/questPlan'
import type { QuestMetric } from '../engine/quests'
import { nextReviewAt } from '../engine/review'
import { createRng } from '../engine/rng'
import { firstSittingEnd, SPLIT_ABOVE_MINUTES } from '../engine/session'
import { TARGET_LANGUAGES, type EngineOptions, type ReviewMode, type TargetLanguage, type VocabularyEntry } from '../engine/types'
import type { Settings } from '../data/db'
import { db, scheduler } from '../data/instance'
import { daySeed, launch, MIXED_SIZE, QUICK_REVIEW, type LanguageData, type Screen } from '../appNav'
import type { GameState } from './game'
import { showToast } from './toastFeed'

interface Input {
  settings: Settings | null | undefined
  data: LanguageData | null
  game: GameState | null
  plan: DailyPlan | null
  planInput: PlanInput | null
  options: EngineOptions
  /** A few of the verb lab's due forms, mixed into the day's session. */
  dayForms: readonly NonNullable<PlanItem['form']>[]
  setScreen: Dispatch<SetStateAction<Screen>>
}

/**
 * Every way of starting a session from the shell: the day's plan (whole, one kind of question, N
 * minutes, a short round), a quest, the hard words, free practice, the open mistakes and the mixed
 * session across languages; plus the reviews waiting in each language, and the "?go=quick" launch.
 */
export function useSessionStarters({ settings, data, game, plan, planInput, options, dayForms, setScreen }: Input) {
  /** `extra`: words that may not be in the loaded list yet (just added), so the session has them. */
  const startSession = (items: PlanItem[], mode: ReviewMode, seed = Date.now() % 2 ** 31, extra?: VocabularyEntry[], topic?: 'difficult', firstSitting?: boolean) => {
    // A session cap takes a prefix: introductions always come before their first test.
    const capped = settings?.sessionMax ? items.slice(0, settings.sessionMax) : items
    if (capped.length) setScreen({ name: 'session', items: capped, mode, seed, gameBefore: game, extra, topic, firstSitting })
  }
  /** The day's plan; a long day (and no session cap set) in two sittings, the first ending about halfway. */
  const startDay = () => {
    if (!plan) return
    // A few of the verb lab's due forms join the words (interleaving), spread through the session.
    const items = mixForms(plan.items, dayForms)
    const split = !settings?.sessionMax && (settings?.splitLongDays ?? true) && plan.estimatedMinutes > SPLIT_ABOVE_MINUTES
    const end = split ? firstSittingEnd(items) : items.length
    startSession(items.slice(0, end), 'normal', daySeed(new Date()), undefined, undefined, split && end < items.length)
  }
  /** Only one kind of the day's questions (the wrong, the weak, the reviews, the new words), in the plan's order; "Devam et" stays the whole mix. */
  const startFocus = (reason: PlanReason) => {
    if (!plan) return
    const items = plan.items.filter((it) => it.reason === reason)
    if (items.length) startSession(items, 'normal', daySeed(new Date()))
  }
  /** The day's most urgent questions that fit N minutes: for a short moment. */
  const startMinutes = (minutes: number) => {
    if (!plan) return
    const items = roundForMinutes(plan.items, minutes)
    if (items.length) startSession(items, 'normal', daySeed(new Date()))
  }
  /** A short round of the day's most urgent questions, when the pile of reviews is deep. */
  const startShortRound = () => plan && startSession(shortRound(plan.items), 'normal', daySeed(new Date()))
  /**
   * A quest of the day was tapped: the round that fills it. New words → extra new words; typing and
   * listening → questions of that kind over the words being learned; the rest count any answer, so the
   * day's session (or, once it is done, a round over the words being learned).
   */
  const startQuest = (id: QuestMetric, remaining: number) => {
    if (!data || !settings) return
    const rng = createRng(Date.now())
    const now = new Date()
    let items: PlanItem[] = []
    if (id === 'newWords') items = planInput ? buildExtraNewPlan({ ...planInput, seed: Date.now() % 2 ** 31 }, Math.min(10, Math.max(1, remaining))) : []
    else if (id === 'typedCorrect' || id === 'listenCorrect') items = buildQuestPlan(id, remaining, { catalog: data.vocabulary, states: data.states, rng, now, options })
    else {
      if (plan?.items.length) return startDay()
      const learning = new Set(data.states.map((s) => s.entryId))
      items = buildDeckPlan({ catalog: data.vocabulary.filter((v) => learning.has(v.id)), states: data.states, rng, scheduler, now, limit: Math.min(30, Math.max(10, remaining)), options })
    }
    if (items.length) startSession(items, 'normal')
    else showToast(id === 'newWords' ? 'Tanışılacak yeni kelime kalmadı. Kelimeler sekmesinden ekleyebilirsin.' : 'Bu görev için uygun kelime bulunamadı. Biraz daha kelimeyle çalışınca açılır.')
  }
  /** A practice of just the words marked hard, apart from the day's plan. */
  const practiceDifficult = () =>
    data && startSession(buildDeckPlan({ catalog: difficultWords(data.vocabulary), states: data.states, rng: createRng(Date.now()), scheduler, now: new Date(), options }), 'normal', undefined, undefined, 'difficult')
  /** Free practice over the words met so far (the command palette); undefined while there is none. */
  const startPractice =
    data && data.states.some((s) => Object.keys(s.skills).length)
      ? () => startSession(buildPracticePlan({ catalog: data.vocabulary, states: data.states, rng: createRng(Date.now()), options }), 'practice')
      : undefined
  /** The open mistakes, corrected (the command palette); undefined while there are none. */
  const startMistakes =
    data && openMistakes(data.mistakes).length
      ? () => startSession(buildMistakePlan({ catalog: data.vocabulary, states: data.states, mistakes: data.mistakes, rng: createRng(Date.now()), options }), 'normal')
      : undefined
  /** Early review of upcoming words before their due time arrives. */
  const startEarlyReview =
    data && data.states.some((s) => !s.retired && Object.keys(s.skills).length > 0 && nextReviewAt(s) !== undefined)
      ? () => {
          const items = buildEarlyReviewPlan({
            catalog: data.vocabulary,
            states: data.states,
            rng: createRng(Date.now()),
            scheduler,
            now: new Date(),
            limit: 15,
            options,
          })
          if (items.length) startSession(items, 'normal')
          else showToast('Tekrar edilecek kelime bulunamadı.')
        }
      : undefined

  // Interleaving (Kornell & Bjork 2008): reviews due across languages, mixed into one session.
  const [mixedDue, setMixedDue] = useState({ count: 0, languages: 0 })
  // Reviews waiting in each language: a dot on the language buttons, and the mixed session.
  const [dueByLanguage, setDueByLanguage] = useState<Partial<Record<TargetLanguage, number>>>({})
  useEffect(() => {
    const now = new Date()
    void db.wordStates.toArray().then((all) => {
      const due = all.filter((st) => Object.values(st.skills).some((c) => c.due <= now))
      setMixedDue({ count: due.length, languages: new Set(due.map((st) => st.language)).size })
      const by: Partial<Record<TargetLanguage, number>> = {}
      for (const st of due) by[st.language] = (by[st.language] ?? 0) + 1
      setDueByLanguage(by)
    })
  }, [data])
  const startMixed = async () => {
    if (!settings || !data) return
    const now = new Date()
    const others = TARGET_LANGUAGES.filter((l) => l !== settings.activeLanguage)
    const loaded = await Promise.all(others.map((l) => db.loadLanguage(l)))
    const perLanguage = [
      { language: settings.activeLanguage, vocabulary: data.vocabulary, states: data.states, mistakes: data.mistakes, trouble: data.trouble },
      ...loaded.map((x, i) => ({ language: others[i], ...x })),
    ].map((x) =>
      buildDailyPlan({
        now,
        settings: { language: x.language, dailyMinutes: settings.dailyMinutes, newWordsPerDay: 0, autoRetire: settings.autoRetire },
        catalog: x.vocabulary,
        states: x.states,
        mistakes: x.mistakes,
        trouble: x.trouble,
        scheduler,
        seed: daySeed(now) + x.language.charCodeAt(0),
        options,
      }).items.filter((i) => i.kind === 'exercise'),
    )
    // Round-robin, so the language changes from one item to the next.
    const items: PlanItem[] = []
    for (let i = 0; items.length < MIXED_SIZE && perLanguage.some((l) => i < l.length); i++) for (const l of perLanguage) if (l[i] && items.length < MIXED_SIZE) items.push(l[i])
    if (!items.length) return
    setScreen({
      name: 'session',
      items,
      mode: 'normal',
      seed: Date.now() % 2 ** 31,
      gameBefore: game,
      extra: loaded.flatMap((x) => x.vocabulary),
      extraStates: loaded.flatMap((x) => x.states),
      extraMistakes: loaded.flatMap((x) => x.mistakes),
    })
  }

  // Opened from a reminder ("?go=quick"): straight into a short review of what's due.
  useEffect(() => {
    if (!launch.quick || !plan || !data) return
    launch.quick = false
    const items = plan.items.filter((i) => i.kind === 'exercise').slice(0, QUICK_REVIEW)
    if (items.length) startSession(items, 'normal')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, data])

  return { startSession, startDay, startFocus, startMinutes, startShortRound, startQuest, practiceDifficult, startPractice, startMistakes, startEarlyReview, startMixed, mixedDue, dueByLanguage }
}
