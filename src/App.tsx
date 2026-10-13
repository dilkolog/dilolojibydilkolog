import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildDailyPlan, buildExtraNewPlan, MAX_DAY_FORMS, mixForms, roundForMinutes, shortRound, type PlanItem, type PlanReason } from './engine/dailyPlan'

import { engineFlags } from './engine/exercisePrefs'
import { openMistakes } from './engine/mistakes'
import { mistakesForMonki, weakWordsOf } from './engine/monkiContext'
import { answeredToday } from './engine/progress'
import { buildDeckPlan, buildMistakePlan, buildPracticePlan } from './engine/practice'
import { buildQuestPlan } from './engine/questPlan'
import type { QuestMetric } from './engine/quests'

import { createRng } from './engine/rng'
import { firstSittingEnd, SPLIT_ABOVE_MINUTES, type SessionSummary } from './engine/session'
import { TARGET_LANGUAGES, type ReviewMode, type TargetLanguage, type VocabularyEntry } from './engine/types'
import { db, scheduler, setLoad } from './data/instance'
import { difficultWords } from './engine/difficult'
import { dayWeight, isRestDay } from './engine/workload'
import type { Settings } from './data/db'
import { fillCorpus, fillParallel, scoreCorpus } from './data/corpus'
import { fillWordInfo } from './data/wordInfo'
import { fillFromLexicon } from './data/lexicon'
import { fillFromPack } from './data/wordpack'
import { fillFrequencyRanks } from './data/frequency'
import { loadTenses } from './data/tenseData'
import { aiConfig, monthKey } from './ai/usage'
import { AiError } from './ai/types'
import { AccessContext } from './ui/accessContext'
import { AiContext } from './ui/aiContext'
import { useAccessStatus } from './ui/useAccessStatus'

import { Glyph } from './ui/Glyph'
import { BadgeWatcher } from './ui/BadgeWatcher'
import { GameContext, loadGame, type GameState } from './ui/game'
import { AlertIcon, CheckIcon, PlayIcon, PlusIcon, SparkleIcon, TargetIcon } from './ui/icons'
import { LANGUAGE_NAME, LANGUAGE_SHORT } from './ui/labels'
import { applySettings } from './ui/prefs'
import { useDayPart } from './ui/dayPart'
import { canListen } from './ui/speechInput'
import { useReminder } from './ui/reminders'
import { reminderTime, usualStudyHour } from './engine/hours'
import { updateAppBadge } from './ui/appBadge'
import { reportMailState } from './ui/emailReminders'
import { reportPushState } from './ui/pushReminders'

import { weekLine, weekSummary, type WeekSummary } from './engine/weekly'
import { LookupNudge } from './ui/LookupNudge'

import { natural } from './ui/naturalVoice'
import { announceIncoming, onSynced, runSync } from './ui/syncRunner'
import { connectExtension, pushToExtension } from './ui/extensionBridge'

import { gardenSummary } from './engine/growth'

import { Sidebar, TabBar } from './ui/AppSidebar'
import { AppScreens, type AppScreensProps } from './AppScreens'
import { CommandPalette, IncomingSet, Monki, prefetchScreens } from './lazyScreens'
import { useScreenHistory } from './ui/useScreenHistory'
import { ALL_SCREENS, GROUPS, MIXED_SIZE, NAV, QUICK_REVIEW, RECENT_DAYS, RESTORABLE, SCREEN_KEY, WIDE_SCREENS, daySeed, launch, placeOf, restoreScreen, type LanguageData, type NavScreen, type Screen, type ScreenName } from './appNav'
import { Onboarding } from './ui/Onboarding'

import { useDayForms, useFormsDue, useWarmup, useVerbOfDay } from './ui/verbs/labShared'
import type { Command } from './ui/CommandPalette'
import { recordVisit } from './ui/screenUsage'
import { clipboardSuggestion } from './ui/clipboardSuggest'
import { readIncoming, type IncomingWord } from './ui/incoming'
import { GAME_LIST } from './ui/gameList'
import { ScreenBoundary } from './ui/ScreenBoundary'

import { Toaster } from './ui/toast'
import { shareIdOf } from './engine/sharedSet'
import { useCollabSync } from './ui/useCollabSync'
import { showToast } from './ui/toastFeed'
import { reportError } from './data/errorReport'
import { ScreenSkeleton } from './ui/Skeleton'
import { skeletonFor } from './ui/skeletonFor'
import { useOnline } from './ui/useOnline'

import { useTabIndicator } from './ui/useTabIndicator'
import { azure } from './ui/pronunciation'

/*
 * Screens other than Today and the session summary load when first opened, so the app
 * starts with less code; once it is idle they are fetched in the background anyway, so switching
 * screens stays instant and works offline.
 */
/** A stable empty list while the words load (a fresh [] each render would re-run the hooks). */
const NO_WORDS: readonly VocabularyEntry[] = []
let corpusRun: Promise<number> | null = null
let wiktRun: Promise<number> | null = null

export default function App() {
  // undefined = loading, null = first run
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined)
  const [data, setData] = useState<LanguageData | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [screen, setScreen] = useState<Screen>(restoreScreen)
  useScreenHistory(screen, setScreen)
  // Remember where the learner was, so reopening the app continues there.
  useEffect(() => {
    if (!RESTORABLE.has(screen.name)) return
    try {
      localStorage.setItem(SCREEN_KEY, JSON.stringify(screen.name === 'word' ? { name: 'word', entryId: screen.entryId } : { name: screen.name }))
    } catch {
      // Storage unavailable: the app simply opens on the home screen next time.
    }
  }, [screen])
  const [storedKey, setApiKeyState] = useState<string | null>(null)
  // The AI screens, like sync and the quota features, open once the owner has approved the account.
  const access = useAccessStatus()
  const apiKey = access.approved ? storedKey : null
  const [palette, setPalette] = useState(false)
  // The tab last open in each menu place, so the menu returns to it.
  const lastTab = useRef<Partial<Record<NavScreen, ScreenName>>>({})
  // Wide screens: the sidebar can fold to an icon rail, giving the content more room (remembered).
  const [rail, setRail] = useState(() => {
    try {
      return localStorage.getItem('kelime-koc:rail') === '1'
    } catch {
      return false
    }
  })
  const toggleRail = () =>
    setRail((r) => {
      try {
        localStorage.setItem('kelime-koc:rail', r ? '0' : '1')
      } catch {
        // Not remembered; fine.
      }
      return !r
    })
  const online = useOnline()
  // A word sent from the "add to Kelime Koçu" bookmarklet on another site.
  const [incoming, setIncoming] = useState<IncomingWord | null>(() => readIncoming())
  const language = settings?.activeLanguage
  const languageRef = useRef(language)
  useLayoutEffect(() => {
    languageRef.current = language
  }, [language])
  const speechOn = settings ? settings.speechExercises && canListen() : false
  const flags = useMemo(() => engineFlags(settings?.exercisePrefs, settings?.typedBlanks), [settings?.exercisePrefs, settings?.typedBlanks])
  const options = useMemo(() => ({ ai: !!apiKey, speech: speechOn, skipLong: !!settings?.skipLongGloss, ...flags }), [apiKey, speechOn, settings?.skipLongGloss, flags])

  useEffect(() => {
    db.getSettings().then((s) => setSettings(s ?? null))
    db.getAiKey().then(setApiKeyState)
    db.getTtsKey().then((k) => (natural.key = k))
    db.getSpeechKey().then((c) => {
      azure.key = c?.key ?? null
      azure.region = c?.region ?? null
    })
  }, [])

  useDayPart()

  // Past and future tense tables for the language being learned, fetched in the background.
  useEffect(() => {
    if (language) void loadTenses(language)
  }, [language])

  useEffect(() => {
    if (settings) applySettings(settings)
    // AI usage is recorded per month, and the monthly limit is checked before each request.
    const limit = settings?.aiMonthlyLimit ?? 0
    aiConfig.onUsage = (r) => void db.addAiUsage(r)
    aiConfig.beforeRequest = async () => {
      if (!limit) return
      const spent = (await db.getAiUsage())[monthKey(new Date())]?.cost ?? 0
      if (spent >= limit) throw new AiError('budget', 'Bu ayki YZ bütçen doldu. Ayarlar → YZ yardımcısı bölümünden sınırı değiştirebilirsin.')
    }
  }, [settings])

  // ⌘K / Ctrl+K opens the command palette (not during a session, to avoid leaving it by accident).
  const inSessionNow = screen.name === 'session'
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !inSessionNow) {
        e.preventDefault()
        setPalette((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inSessionNow])

  const ai = useMemo(
    () => ({
      apiKey,
      needsApproval: !access.approved,
      setApiKey: async (key: string | null) => {
        await db.saveAiKey(key)
        setApiKeyState(key)
      },
    }),
    [apiKey, access.approved],
  )

  const reload = useCallback(async () => {
    if (!language) return
    // The background steps below can outlast a switch to another language: their results are
    // dropped then, or the old language's data would come back and the new one never show.
    const current = () => languageRef.current === language
    const apply = (next: LanguageData) => current() && setData(next)
    const since = new Date(Date.now() - RECENT_DAYS * 86_400_000)
    const [loaded, recentEvents, g] = await Promise.all([db.loadLanguage(language), db.eventsSince(since), loadGame(db)])
    apply({ language, ...loaded, recentEvents })
    // After a background step the words and states are read again, and the recent answers with them: a session
    // finished while the step ran must not be rolled back to the answers this run started with.
    const refresh = async () => apply({ language, ...(await db.loadLanguage(language)), recentEvents: await db.eventsSince(since) })
    if (!current()) return
    setLoad(loaded.states)
    pushToExtension(db)
    setGame(g)
    // New words without a frequency band get one from the bundled list, in the background.
    if (loaded.vocabulary.some((v) => v.source !== 'sample' && !v.frequencyRank)) {
      const filled = await fillFrequencyRanks(db, language)
      if (filled) await refresh()
    }
    // French words saved without a part of speech or a noun gender get them from Lexique (offline).
    if (language === 'fr' && loaded.vocabulary.some((v) => v.source !== 'sample' && (v.partOfSpeech === 'other' || (v.partOfSpeech === 'noun' && !v.gender)))) {
      if (await fillFromLexicon(db, language)) await refresh()
    }
    // The word pack (other languages, origins, synonyms, recordings), offline, for languages that ship one.
    if (await fillFromPack(db, language)) await refresh()
    // Sentences get rated (offline), and re-rated once the word list has grown: the ones with at most one unknown word come first.
    if (await scoreCorpus(db, language)) await refresh()
    // Real sentences for words that don't have them yet (a few per run, one run at a time).
    if (!corpusRun && loaded.vocabulary.some((v) => v.source !== 'sample' && v.corpus === undefined)) {
      corpusRun = fillCorpus(db, language).finally(() => (corpusRun = null))
      if (await corpusRun) await refresh()
    }
    // Sentences saved before they came with their French/Spanish/English versions get them, a few per run.
    if (!corpusRun && loaded.vocabulary.some((v) => v.corpus?.some((x) => x.source?.kind === 'tatoeba' && x.parallel === undefined))) {
      corpusRun = fillParallel(db, language).finally(() => (corpusRun = null))
      if (await corpusRun) await refresh()
    }
    // Pronunciation, definition and word family from Wiktionary, also in the background.
    if (!wiktRun && loaded.vocabulary.some((v) => v.source !== 'sample' && (!v.wiktAt || (v.partOfSpeech === 'noun' && v.language !== 'en' && !v.gender && v.wiktAt < '2026-10-03T12')))) {
      wiktRun = fillWordInfo(db, language).finally(() => (wiktRun = null))
      if (await wiktRun) await refresh()
    }
  }, [language])

  useEffect(() => {
    // A failed load (a closed or damaged database) is said, with a way to try again, not left as a blank wait.
    const load = () =>
      reload().catch((e) => {
        reportError(e, 'reload')
        showToast('Veriler yüklenemedi. Verilerin silinmedi; yeniden denemek genelde yeter.', { label: 'Yeniden dene', run: load }, 10_000, 'info')
      })
    void load()
  }, [reload])

  // The other screens' code, once the first screen is up.
  useEffect(() => {
    const t = setTimeout(prefetchScreens, 2500)
    return () => clearTimeout(t)
  }, [])

  // Browser extension: words marked known on other sites come back here.
  useEffect(() => connectExtension(db, reload), [reload])

  // Pull what other devices did on start, then keep in step after every session.
  useEffect(() => {
    void runSync().then(announceIncoming)
    return onSynced(async () => {
      setSettings((await db.getSettings()) ?? null)
      reload()
    })
  }, [reload])

  // Each screen starts at the top, like a page navigation.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen.name])

  const answeredTodayAll = data ? answeredToday(data.recentEvents, new Date()) : 0
  const updateSettings = async (s: Settings) => {
    await db.saveSettings(s)
    setSettings(s)
  }

  // A sentence sent from the browser extension (?sentence=…): kept as a sentence card.
  const ready = settings !== undefined && settings !== null
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    const text = p.get('sentence')?.trim()
    if (!text || !settings) return
    history.replaceState(null, '', location.pathname)
    const lang = (TARGET_LANGUAGES as readonly string[]).includes(p.get('lang') ?? '') ? (p.get('lang') as TargetLanguage) : settings.activeLanguage
    void import('./ui/saveSentence').then(({ saveSentence }) => saveSentence({ language: lang, text, focus: p.get('focus') ?? undefined, source: p.get('src') ?? undefined }).then(() => {
      if (lang !== settings.activeLanguage) void updateSettings({ ...settings, activeLanguage: lang })
      setScreen({ name: 'games', game: 'sentences' })
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // A list somebody shared (?set=…): shown, and added only when confirmed.
  const [incomingSet, setIncomingSet] = useState<string | null>(null)
  useEffect(() => {
    const id = shareIdOf(location.href)
    if (!id) return
    history.replaceState(null, '', location.pathname)
    setIncomingSet(id)
  }, [])
  // What went wrong most lately: Monki builds its examples, small quizzes and mistake talks from it.
  const weakWords = useMemo(() => (data ? weakWordsOf(data.vocabulary, data.mistakes) : undefined), [data])
  const monkiMistakes = useMemo(() => (data ? mistakesForMonki(data.vocabulary, data.mistakes) : undefined), [data])
  // The collaborative lists this device has joined, kept in step with the others.
  useCollabSync(reload, ready)

  // Bookmarklet: switch to the page's language and open the add-word form prefilled.
  useEffect(() => {
    if (!incoming || !settings) return
    history.replaceState(null, '', location.pathname)
    if (incoming.lang && incoming.lang !== settings.activeLanguage) void updateSettings({ ...settings, activeLanguage: incoming.lang })
    // A shared article or video goes to Reading, filled in; anything else to the add-word form.
    if (incoming.read) {
      setScreen({ name: 'reading', shared: incoming.read })
      setIncoming(null)
      return
    }
    setScreen({ name: 'words' })
    // Once, when both the incoming word and the settings are there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming, !settings])

  // Which screens are used, counted on this device only (Settings → Görünüm → Kullanım).
  useEffect(() => {
    recordVisit(screen.name)
  }, [screen.name])

  // A word copied elsewhere, offered on coming back (Settings → Panodan kelime ekle).
  const lemmasRef = useRef<string[]>([])
  useEffect(() => {
    lemmasRef.current = data?.vocabulary.map((v) => v.lemma) ?? []
  }, [data])
  const clipboardOn = !!data && !!settings?.clipboardSuggest
  useEffect(() => {
    if (!clipboardOn) return
    const check = async () => {
      if (document.visibilityState !== 'visible') return
      const word = await clipboardSuggestion(lemmasRef.current)
      if (word) showToast(`Panoda “${word}” var; listene eklensin mi?`, { label: 'Ekle', run: () => setIncoming({ word, context: '' }) }, 8000, 'info')
    }
    void check()
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [clipboardOn])

  // A word brought in (bookmarklet, ⌘K "add") belongs to that visit of the add form: leaving the
  // words page drops it, so the page doesn't keep reopening a half-filled form.
  const prevScreen = useRef(screen.name)
  useEffect(() => {
    if (prevScreen.current === 'words' && screen.name !== 'words') setIncoming(null)
    prevScreen.current = screen.name
  }, [screen.name])

  // How a screen arrives says where it is: a session takes the stage, a word page goes a level
  // deeper, coming back from it returns the other way. Decided once per screen, so a re-render
  // doesn't restart the animation.
  const screenKey = screen.name === 'summary' ? 'session' : screen.name === 'word' ? `word:${screen.entryId}` : screen.name
  const transition = useRef<{ key: string; value?: string }>({ key: '' })
  if (transition.current.key !== screenKey)
    transition.current = { key: screenKey, value: screen.name === 'session' ? 'focus' : screen.name === 'word' ? 'forward' : prevScreen.current === 'word' ? 'back' : undefined }

  const planInput = useMemo(() => {
    if (!settings || !data || data.language !== settings.activeLanguage) return null
    const now = new Date()
    return {
      now,
      settings: {
        language: data.language,
        dailyMinutes: settings.dailyMinutes,
        // Light days introduce fewer new words; rest days and holidays none.
        newWordsPerDay: Math.round(settings.newWordsPerDay * dayWeight(now, settings)),
        frequencyFirst: settings.frequencyFirst,
        autoRetire: settings.autoRetire,
        // Only a list that still exists (another device may have deleted it).
        ...((focus) => (focus ? { focusListId: focus.id, focusLevels: (focus.levels ?? []).map((l) => l.id) } : {}))(data.lists.find((l) => l.id === settings.focusList?.[data.language])),
      },
      catalog: data.vocabulary,
      states: data.states,
      mistakes: data.mistakes,
      trouble: data.trouble,
      scheduler,
      seed: daySeed(now),
      options,
    }
  }, [settings, data, options])
  const plan = useMemo(() => (planInput ? buildDailyPlan(planInput) : null), [planInput])
  // What is waiting where, shown as small counts in the menu.
  const navBadge: Partial<Record<NavScreen, number>> = useMemo(
    () => ({
      home: plan?.items.filter((i) => i.kind === 'exercise').length ?? 0,
      words: data ? new Set(openMistakes(data.mistakes).map((m) => m.entryId)).size : 0,
    }),
    [plan, data],
  )
  const badgeLabel: Partial<Record<NavScreen, string>> = { home: 'soru bekliyor', words: 'kelimede açık hata' }
  // Rest days and holidays: no reminder.
  const restToday = !!settings && isRestDay(new Date(), settings)
  // Words waiting for review today: the reminder names them, so it's a concrete, small ask.
  const dueReviews = plan ? plan.items.filter((i) => i.kind === 'exercise').length : 0
  /** Reviews of words already met (not a new word's follow-ups): what Games asks to do first. */
  const reviewsWaiting = plan ? plan.items.filter((i) => i.kind === 'exercise' && i.reason !== 'new' && i.reason !== 'practice').length : 0
  // The reminder comes at the usual study hour (unless a fixed time was chosen), here and from the server.
  const usualHour = useMemo(() => (data ? usualStudyHour(data.recentEvents, new Date()) : null), [data])
  const reminder = useMemo(() => settings && { ...settings.reminder, time: reminderTime(settings.reminder, usualHour) }, [settings, usualHour])
  useReminder(restToday ? undefined : (reminder ?? undefined), answeredTodayAll, game?.streak ?? 0, settings?.studyPlan, dueReviews)
  useEffect(() => {
    if (plan) updateAppBadge(dueReviews, settings?.appBadge ?? true)
  }, [plan, dueReviews, settings?.appBadge])
  // The week in one line: on Today on Sunday and Monday, and in Sunday evening's push.
  const [weekText, setWeekText] = useState('')
  const [weekData, setWeekData] = useState<WeekSummary | null>(null)
  useEffect(() => {
    if (!data) return
    let live = true
    void (async () => {
      const texts = await db.getLibrary(data.language)
      const summary = weekSummary({ language: data.language, now: new Date(), events: data.recentEvents, vocabulary: data.vocabulary, texts })
      if (!live) return
      setWeekText(weekLine(summary))
      setWeekData(summary)
    })()
    return () => {
      live = false
    }
  }, [data])
  const pushState = useMemo(
    () => ({
      studiedToday: answeredTodayAll > 0,
      streak: game?.streak ?? 0,
      plan: settings?.studyPlan ?? '',
      restWeekdays: (settings?.dayWeights ?? []).flatMap((w, day) => (w === 0 ? [day] : [])),
      vacation: settings?.vacation ?? null,
      due: dueReviews,
      week: weekText,
      hour: Number((reminder?.time ?? '20:00').slice(0, 2)),
    }),
    [answeredTodayAll, game?.streak, settings?.studyPlan, settings?.dayWeights, settings?.vacation, dueReviews, weekText, reminder?.time],
  )
  // Keeps the server's evening reminder from firing on days already studied.
  const loaded = !!data && !!game
  useEffect(() => {
    if (!loaded) return
    void reportPushState(pushState)
    void reportMailState(pushState)
  }, [loaded, pushState])

  // A session started on just-added words gets them even before the list has reloaded.
  const sessionVocabulary = useMemo(() => {
    if (screen.name !== 'session' || !screen.extra || !data) return undefined
    const extra = screen.extra
    return [...data.vocabulary.filter((v) => !extra.some((x) => x.id === v.id)), ...extra]
  }, [screen, data])
  // Words met for the first time today, for the before-sleep review.
  const newToday = useMemo(() => {
    if (!data) return []
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const ids = new Set(data.states.filter((s) => s.introducedAt >= start).map((s) => s.entryId))
    return data.vocabulary.filter((v) => ids.has(v.id))
  }, [data])

  const byId = useMemo(() => new Map((data?.vocabulary ?? []).map((v) => [v.id, v])), [data])
  const garden = useMemo(() => (data ? gardenSummary(data.vocabulary, data.states, scheduler, new Date()) : null), [data])

  const finishSession = useCallback(
    (summary: SessionSummary) => {
      reload()
      void runSync()
      setScreen((s) => ({
        name: 'summary',
        summary,
        mode: s.name === 'session' ? s.mode : 'normal',
        topic: s.name === 'session' ? s.topic : undefined,
        gameBefore: s.name === 'session' ? s.gameBefore : null,
        // Words of other languages (a mixed session) still get their names in the summary.
        extra: s.name === 'session' ? s.extra : undefined,
        firstSitting: s.name === 'session' ? s.firstSitting : undefined,
      }))
    },
    [reload],
  )

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
    if (!settings) return
    const now = new Date()
    const others = TARGET_LANGUAGES.filter((l) => l !== settings.activeLanguage)
    const loaded = await Promise.all(others.map((l) => db.loadLanguage(l)))
    const perLanguage = [
      { language: settings.activeLanguage, vocabulary: data!.vocabulary, states: data!.states, mistakes: data!.mistakes, trouble: data!.trouble },
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

  const navRef = useRef<HTMLElement>(null)
  const [navMark, setNavMark] = useState<{ top: number; left: number; width: number; height: number; ready: boolean } | null>(null)
  // The highlight of the current page slides from the previous one (vertical sidebar only).
  useLayoutEffect(() => {
    const place = () => {
      const nav = navRef.current
      const active = nav?.querySelector<HTMLElement>('.nav-btn[aria-current="page"]')
      if (!nav || !active || getComputedStyle(nav).flexDirection !== 'column') return setNavMark(null)
      const next = { top: active.offsetTop, left: active.offsetLeft, width: active.offsetWidth, height: active.offsetHeight }
      setNavMark((m) => {
        if (!m) return { ...next, ready: false }
        const same = m.top === next.top && m.left === next.left && m.width === next.width && m.height === next.height
        return same ? (m.ready ? m : { ...m, ready: true }) : { ...next, ready: true }
      })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  })
  const formsDue = useFormsDue(settings?.activeLanguage ?? 'en', screen.name)
  const dayForms = useDayForms(settings?.activeLanguage ?? 'en', screen.name, MAX_DAY_FORMS)
  const warmup = useWarmup(settings?.activeLanguage ?? 'en', screen.name)
  const hubTabsRef = useTabIndicator(screen.name)
  const verbOfDay = useVerbOfDay(settings?.activeLanguage ?? 'en', data?.vocabulary ?? NO_WORDS, screen.name)
  if (settings === undefined) return null
  if (settings === null) {
    return (
      <div className="app">
        <Onboarding
          onDone={async (s) => {
            await updateSettings(s)
            setScreen({ name: 'words' })
          }}
        />
      </div>
    )
  }

  const go = (s: Screen) => () => setScreen(s)
  const place = placeOf(screen.name)
  if (place && GROUPS[place]?.some((g) => g.screen === screen.name)) lastTab.current[place] = screen.name
  /** A menu place opens the tab last used there. */
  const goPlace = (n: NavScreen) => go({ name: lastTab.current[n] ?? GROUPS[n]?.[0].screen ?? n } as Screen)
  const inSession = screen.name === 'session'

  const commands: Command[] = [
    ...(plan && plan.items.length ? [{ id: 'start', label: 'Bugünkü görevi başlat', icon: <PlayIcon size={18} />, group: 'İşlemler', run: startDay }] : []),
    { id: 'add', label: 'Kelime ekle', icon: <PlusIcon size={18} />, group: 'İşlemler', run: () => { setScreen({ name: 'words' }); setTimeout(() => document.getElementById('w-word')?.focus(), 100) } },
    ...(data && data.states.some((s) => Object.keys(s.skills).length)
      ? [{ id: 'practice', label: 'Serbest pratik', icon: <SparkleIcon size={18} />, group: 'İşlemler', run: () => startSession(buildPracticePlan({ catalog: data.vocabulary, states: data.states, rng: createRng(Date.now()), options }), 'practice') }]
      : []),
    ...(data && openMistakes(data.mistakes).length
      ? [{ id: 'mistakes-practice', label: 'Hatalarını düzelt', icon: <AlertIcon size={18} />, group: 'İşlemler', run: () => startSession(buildMistakePlan({ catalog: data.vocabulary, states: data.states, mistakes: data.mistakes, rng: createRng(Date.now()), options }), 'normal') }]
      : []),
    { id: 'vocabtest', label: 'Kelime dağarcığı testi', icon: <TargetIcon size={18} />, group: 'İşlemler', run: go({ name: 'vocabtest' }) },
    { id: 'exam', label: 'Hatırlama sınavı', icon: <CheckIcon size={18} />, group: 'İşlemler', run: go({ name: 'exam' }) },
    ...GAME_LIST.filter((g) => !g.grammar || settings.activeLanguage !== 'en').map((g) => ({
      id: `game-${g.id}`,
      label: g.name,
      icon: <Glyph emoji={g.emoji} size={18} />,
      group: 'Oyunlar',
      // The conjugation games live in the verb lab now.
      run: g.id === 'conjugation' || g.id === 'aspect' ? go({ name: 'verbs', tab: 'timed' }) : go({ name: 'games', game: g.id }),
    })),
    ...ALL_SCREENS.map((n) => ({ id: n.screen, label: n.label, icon: <n.icon size={18} />, group: 'Ekranlar', run: go({ name: n.screen } as Screen) })),
    ...TARGET_LANGUAGES.filter((l) => l !== settings.activeLanguage).map((l) => ({
      id: `lang-${l}`,
      label: `${LANGUAGE_NAME[l]} çalış`,
      icon: <span className="palette-lang">{LANGUAGE_SHORT[l]}</span>,
      group: 'Dil',
      run: () => updateSettings({ ...settings, activeLanguage: l }),
    })),
  ]
  const current = (n: NavScreen) => place === n
  const inSettings = screen.name === 'settings' || screen.name === 'account'
  // A word looked up twice in the dictionary but not in the list, offered on Today (also on an empty list).
  const lookupNudge = data && <LookupNudge language={data.language} vocabulary={data.vocabulary} onAdd={(word, meaning) => setIncoming({ word, context: '', meaning })} />

  const screens: AppScreensProps = { screen, data, plan, settings, options, apiKey, byId, game, incoming, setIncoming, setScreen, setSettings, go, reload, updateSettings, finishSession, sessionVocabulary, planInput, startSession, startDay, startFocus, startMinutes, startShortRound, startMixed, mixedDue, practiceDifficult, reviewsWaiting, pushState, formsDue, dayForms, warmup, verbOfDay, garden, lookupNudge, newToday, weekText, weekData, startQuest }

  return (
    <AccessContext.Provider value={access}>
    <AiContext.Provider value={ai}>
      <GameContext.Provider value={game}>
        <div className={inSession ? 'app' : `shell${rail ? ' is-rail' : ''}`} data-lang={settings.activeLanguage}>
          {/* Keyboard: the first Tab offers a jump past the menu to the screen itself. */}
          {!inSession && (
            <a className="skip-link" href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
              İçeriğe geç
            </a>
          )}
          {!inSession && (
            <>
              <Sidebar
                settings={settings}
                game={game}
                rail={rail}
                onToggleRail={toggleRail}
                dueByLanguage={dueByLanguage}
                onLanguage={(l) => updateSettings({ ...settings, activeLanguage: l })}
                onOpenPalette={() => setPalette(true)}
                navRef={navRef}
                navMark={navMark}
                navBadge={navBadge}
                badgeLabel={badgeLabel}
                current={current}
                goPlace={goPlace}
                go={go}
                inSettings={inSettings}
                onProfilePage={screen.name === 'profile'}
              />
              <TabBar navBadge={navBadge} badgeLabel={badgeLabel} current={current} goPlace={goPlace} />
            </>
          )}

          <main id="main" tabIndex={-1} className={`main${WIDE_SCREENS.has(screen.name) ? ' main-wide' : ''}`}>
            {/* Related screens under one menu place: switch between them here. */}
            {place && GROUPS[place]?.some((g) => g.screen === screen.name) && (
              <nav className="hub-tabs ind-pill" aria-label={NAV.find((n) => n.screen === place)!.label} ref={hubTabsRef}>
                {GROUPS[place]!.filter(
                  (g) => (g.screen !== 'verbs' || settings.activeLanguage !== 'en') && (g.screen === screen.name || !settings.hiddenTabs?.includes(g.screen)),
                ).map((g) => (
                  <button key={g.screen} className="hub-tab" aria-current={g.screen === screen.name ? 'page' : undefined} onClick={go({ name: g.screen } as Screen)}>
                    {g.label}
                    {g.screen === 'mistakes' && !!navBadge.words && <span className="hub-count">{navBadge.words}</span>}
                  </button>
                ))}
              </nav>
            )}
            {!online && !inSession && (
              <p className="offline-banner" role="status">
                İnternet yok. Tekrarların ve kelimelerin normal çalışır; haberler, gerçek cümleler, görseller ve YZ özellikleri bağlantı gelince açılır.
              </p>
            )}
            <ScreenBoundary resetKey={screen.name} onHome={() => setScreen({ name: 'home' })}>
            <div key={screenKey} className="screen-enter" data-transition={transition.current.value}>
            <Suspense fallback={<ScreenSkeleton kind={skeletonFor(screen.name)} />}>
            <AppScreens {...screens} />
            </Suspense>
            </div>
            </ScreenBoundary>
          </main>
          <Toaster />
          {ready && data && (
            <Suspense fallback={null}>
              <Monki
                language={data.language}
                name={settings.profile.name || undefined}
                weakWords={weakWords}
                mistakes={monkiMistakes}
                showButton={!inSession && screen.name !== 'summary'}
                inSession={inSession}
                onSettings={go({ name: 'settings' })}
              />
            </Suspense>
          )}
          {incomingSet && ready && (
            <Suspense fallback={null}>
              <IncomingSet id={incomingSet} onClose={() => setIncomingSet(null)} onDone={reload} />
            </Suspense>
          )}
          {palette && data && (
            <Suspense fallback={null}>
              <CommandPalette
                commands={commands}
                vocabulary={data.vocabulary}
                onOpenWord={(entryId) => setScreen({ name: 'word', entryId })}
                onAddWord={(word) => setIncoming({ word, context: '' })}
                onLookUp={(query) => setScreen({ name: 'dictionary', query })}
                onClose={() => setPalette(false)}
              />
            </Suspense>
          )}
        </div>
      <BadgeWatcher game={game} paused={screen.name === 'session' || screen.name === 'summary'} onProfile={go({ name: 'profile' })} onLogged={reload} />
      </GameContext.Provider>
    </AiContext.Provider>
    </AccessContext.Provider>
  )
}
