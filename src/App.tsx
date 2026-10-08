import { Suspense, lazy, type ReactElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildDailyPlan, buildExtraNewPlan, MAX_DAY_FORMS, mixForms, type PlanItem } from './engine/dailyPlan'
import type { Tense as LabTense } from './engine/tenses'
import { skillProfile } from './engine/mastery'
import { openMistakes } from './engine/mistakes'
import { answeredToday, progressStats } from './engine/progress'
import { buildDeckPlan, buildMistakePlan, buildPracticePlan } from './engine/practice'
import { nextReviewAt } from './engine/review'
import { createRng } from './engine/rng'
import { firstSittingEnd, SPLIT_ABOVE_MINUTES, type SessionSummary } from './engine/session'
import {
  TARGET_LANGUAGES,
  type Mistake,
  type ReviewEvent,
  type WordList,
  type ReviewMode,
  type TargetLanguage,
  type UserWordState,
  type VocabularyEntry,
} from './engine/types'
import { db, scheduler, setLoad } from './data/instance'
import { difficultWords, withDifficult } from './engine/difficult'
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
import { AiContext } from './ui/aiContext'
import { Avatar } from './ui/Avatar'
import { Glyph } from './ui/Glyph'
import { BadgeWatcher } from './ui/BadgeWatcher'
import { GameContext, loadGame, type GameState } from './ui/game'
import { AlertIcon, BookIcon, BrandMark, ChartIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, GameIcon, GearIcon, HomeIcon, PenIcon, PlayIcon, PlusIcon, ReadIcon, SearchIcon, SparkleIcon, StoryIcon, TargetIcon, TenseIcon, UserIcon } from './ui/icons'
import { LANGUAGE_NAME, LANGUAGE_SHORT } from './ui/labels'
import { applySettings } from './ui/prefs'
import { useDayPart } from './ui/dayPart'
import { canListen } from './ui/speechInput'
import { useReminder } from './ui/reminders'
import { reminderTime, usualStudyHour } from './engine/hours'
import { updateAppBadge } from './ui/appBadge'
import { reportPushState } from './ui/pushReminders'
import { HabitCards } from './ui/Habits'
import { BackupNudge } from './ui/BackupNudge'
import { WeeklyNudge } from './ui/WeeklyNudge'
import { GainsNudge } from './ui/GainsNudge'
import { studyGains } from './engine/gains'
import { weekLine, weekSummary } from './engine/weekly'
import { LookupNudge } from './ui/LookupNudge'
import { PANE_KEY } from './ui/settingsPane'
import { natural } from './ui/naturalVoice'
import { onSynced, runSync } from './ui/syncRunner'
import { connectExtension, pushToExtension } from './ui/extensionBridge'
import { GARDEN_HARD_KEY, GardenCard, WORDS_VIEW_KEY } from './ui/Garden'
import { gardenSummary } from './engine/growth'
import { Home, Onboarding, Summary } from './ui/Screens'
import type { LabTab } from './ui/verbs/VerbLab'
import { recordLabAnswer, useDayForms, useFormsDue, useWarmup, useVerbOfDay } from './ui/verbs/labShared'
import type { Command } from './ui/CommandPalette'
import { recordVisit } from './ui/screenUsage'
import { clipboardSuggestion } from './ui/clipboardSuggest'
import { readIncoming, type IncomingWord } from './ui/incoming'
import { GAME_LIST, type GameId } from './ui/gameList'
import { ScreenBoundary } from './ui/ScreenBoundary'
import type { AuthMode } from './ui/AuthScreen'
import { Toaster, showToast } from './ui/toast'
import { ScreenSkeleton, skeletonFor } from './ui/Skeleton'
import { useOnline } from './ui/useOnline'
import { StreakFlame } from './ui/StreakFlame'
import { currentLevel, levelGroups } from './engine/lists'
import { azure } from './ui/pronunciation'

/*
 * Screens other than Today and the session summary load when first opened, so the app
 * starts with less code; once it is idle they are fetched in the background anyway, so switching
 * screens stays instant and works offline.
 */
/** A stable empty list while the words load (a fresh [] each render would re-run the hooks). */
const NO_WORDS: readonly VocabularyEntry[] = []
const screenModules = {
  // The daily loop's session too: Today comes first, and the idle prefetch has it long before a tap.
  Session: () => import('./ui/Session'),
  Games: () => import('./ui/Games'),
  Mistakes: () => import('./ui/Mistakes'),
  Profile: () => import('./ui/Profile'),
  Progress: () => import('./ui/Progress'),
  Reading: () => import('./ui/Reading'),
  Produce: () => import('./ui/Produce'),
  VocabTest: () => import('./ui/VocabTest'),
  Exam: () => import('./ui/Exam'),
  Settings: () => import('./ui/SettingsScreen'),
  Story: () => import('./ui/Story'),
  WordDetail: () => import('./ui/WordDetail'),
  Words: () => import('./ui/Words'),
  VerbLab: () => import('./ui/verbs/VerbLab'),
  Dictionary: () => import('./ui/Dictionary'),
  // Rarely opened, so not in the startup code either.
  Auth: () => import('./ui/AuthScreen'),
  Palette: () => import('./ui/CommandPalette'),
}
const SessionScreen = lazy(() => screenModules.Session().then((m) => ({ default: m.SessionScreen })))
const GamesScreen = lazy(() => screenModules.Games().then((m) => ({ default: m.GamesScreen })))
const MistakesScreen = lazy(() => screenModules.Mistakes().then((m) => ({ default: m.MistakesScreen })))
const ProfileScreen = lazy(() => screenModules.Profile().then((m) => ({ default: m.ProfileScreen })))
const ProgressScreen = lazy(() => screenModules.Progress().then((m) => ({ default: m.ProgressScreen })))
const ReadingScreen = lazy(() => screenModules.Reading().then((m) => ({ default: m.ReadingScreen })))
const ProduceScreen = lazy(() => screenModules.Produce().then((m) => ({ default: m.ProduceScreen })))
const VocabTestScreen = lazy(() => screenModules.VocabTest().then((m) => ({ default: m.VocabTestScreen })))
const ExamScreen = lazy(() => screenModules.Exam().then((m) => ({ default: m.ExamScreen })))
const SettingsScreen = lazy(() => screenModules.Settings().then((m) => ({ default: m.SettingsScreen })))
const StoryScreen = lazy(() => screenModules.Story().then((m) => ({ default: m.StoryScreen })))
const WordDetail = lazy(() => screenModules.WordDetail().then((m) => ({ default: m.WordDetail })))
const WordsScreen = lazy(() => screenModules.Words().then((m) => ({ default: m.WordsScreen })))
const VerbLab = lazy(() => screenModules.VerbLab().then((m) => ({ default: m.VerbLab })))
const DictionaryScreen = lazy(() => screenModules.Dictionary().then((m) => ({ default: m.DictionaryScreen })))
const AuthScreen = lazy(() => screenModules.Auth().then((m) => ({ default: m.AuthScreen })))
const CommandPalette = lazy(() => screenModules.Palette().then((m) => ({ default: m.CommandPalette })))

function prefetchScreens() {
  for (const load of Object.values(screenModules)) void load().catch(() => {})
}

type Screen =
  | { name: 'home' }
  | { name: 'session'; items: PlanItem[]; seed: number; mode: ReviewMode; topic?: 'difficult'; gameBefore: GameState | null; extra?: VocabularyEntry[]; extraStates?: UserWordState[]; extraMistakes?: Mistake[]; firstSitting?: boolean }
  | { name: 'summary'; summary: SessionSummary; mode: ReviewMode; topic?: 'difficult'; gameBefore: GameState | null; extra?: VocabularyEntry[]; firstSitting?: boolean }
  | { name: 'words' }
  | { name: 'dictionary'; query?: string }
  | { name: 'word'; entryId: string }
  | { name: 'mistakes' }
  | { name: 'progress' }
  | { name: 'story' }
  | { name: 'reading' }
  | { name: 'vocabtest' }
  | { name: 'produce' }
  | { name: 'exam' }
  | { name: 'games'; game?: GameId }
  | { name: 'verbs'; verb?: string; tense?: string; tab?: LabTab }
  | { name: 'profile' }
  | { name: 'settings' }
  | { name: 'account'; mode?: AuthMode }

const SCREEN_KEY = 'kelime-koc:screen'
/** Screens worth returning to; sessions and summaries are not (answers are saved anyway). */
const RESTORABLE = new Set<Screen['name']>(['home', 'words', 'dictionary', 'word', 'reading', 'produce', 'story', 'games', 'verbs', 'mistakes', 'progress', 'profile', 'settings'])

function restoreScreen(): Screen {
  // Home-screen shortcuts (manifest) and push links: ?go=home | add | reading | quick | progress
  const shortcut = new URLSearchParams(location.search).get('go')
  if (shortcut) {
    history.replaceState(null, '', location.pathname)
    if (shortcut === 'reading') return { name: 'reading' }
    // The Sunday push about the week opens Progress.
    if (shortcut === 'progress') return { name: 'progress' }
    if (shortcut === 'quick') quickStart = true
    if (shortcut === 'add') {
      setTimeout(() => document.getElementById('w-word')?.focus(), 400)
      return { name: 'words' }
    }
    return { name: 'home' }
  }
  try {
    const saved = JSON.parse(localStorage.getItem(SCREEN_KEY) ?? 'null') as { name?: Screen['name']; entryId?: unknown } | null
    if (saved?.name && RESTORABLE.has(saved.name)) {
      if (saved.name === 'word') return typeof saved.entryId === 'string' ? { name: 'word', entryId: saved.entryId } : { name: 'words' }
      return { name: saved.name } as Screen
    }
  } catch {
    // Unreadable or blocked storage: start at home.
  }
  return { name: 'home' }
}

/** Overview screens that spread out on wide screens; reading, forms and the session keep a measure. */
const WIDE_SCREENS = new Set(['home', 'progress', 'words', 'games', 'verbs', 'mistakes', 'profile', 'summary', 'word', 'reading', 'settings'])

/**
 * Five places in the menu (all of them fit the phone's tab bar). Related screens share one place
 * and switch with tabs at the top (GROUPS); Profile and Settings open from the profile card
 * (desktop) or the avatar (phones and tablets).
 */
type NavScreen = 'home' | 'words' | 'reading' | 'practice' | 'progress'
type ScreenName = Screen['name']

const NAV: { screen: NavScreen; label: string; icon: (p: { size?: number }) => ReactElement }[] = [
  { screen: 'home', label: 'Bugün', icon: HomeIcon },
  { screen: 'words', label: 'Kelimeler', icon: BookIcon },
  { screen: 'reading', label: 'Okuma', icon: ReadIcon },
  { screen: 'practice', label: 'Pratik', icon: GameIcon },
  { screen: 'progress', label: 'İlerleme', icon: ChartIcon },
]

const GROUPS: Partial<Record<NavScreen, { screen: ScreenName; label: string }[]>> = {
  words: [
    { screen: 'words', label: 'Kelimeler' },
    { screen: 'dictionary', label: 'Sözlük' },
    { screen: 'mistakes', label: 'Hatalar' },
  ],
  reading: [
    { screen: 'reading', label: 'Metinler' },
    { screen: 'story', label: 'Hikaye' },
  ],
  practice: [
    { screen: 'games', label: 'Oyunlar' },
    { screen: 'verbs', label: 'Fiiller' },
    { screen: 'produce', label: 'Yaz & konuş' },
  ],
}

/** Which menu place a screen belongs to. */
function placeOf(name: ScreenName): NavScreen | undefined {
  if (name === 'word') return 'words'
  if (name === 'summary') return 'home'
  if (name === 'home' || name === 'progress') return name
  return (Object.keys(GROUPS) as NavScreen[]).find((k) => GROUPS[k]!.some((g) => g.screen === name))
}

/** Every screen by name, for the command palette. */
const ALL_SCREENS: { screen: ScreenName; label: string; icon: (p: { size?: number }) => ReactElement }[] = [
  { screen: 'home', label: 'Bugün', icon: HomeIcon },
  { screen: 'words', label: 'Kelimeler', icon: BookIcon },
  { screen: 'dictionary', label: 'Sözlük', icon: SearchIcon },
  { screen: 'mistakes', label: 'Hatalar', icon: AlertIcon },
  { screen: 'reading', label: 'Okuma', icon: ReadIcon },
  { screen: 'story', label: 'Hikaye', icon: StoryIcon },
  { screen: 'games', label: 'Oyunlar', icon: GameIcon },
  { screen: 'verbs', label: 'Fiil laboratuvarı', icon: TenseIcon },
  { screen: 'produce', label: 'Yaz & konuş', icon: PenIcon },
  { screen: 'progress', label: 'İlerleme', icon: ChartIcon },
  { screen: 'profile', label: 'Profil', icon: UserIcon },
  { screen: 'settings', label: 'Ayarlar', icon: GearIcon },
]

let corpusRun: Promise<number> | null = null
let wiktRun: Promise<number> | null = null
/** Set when opened from a reminder: start a short review as soon as the plan is ready. */
let quickStart = false
/** About three minutes. */
const QUICK_REVIEW = 10
/** A mixed session's length. */
const MIXED_SIZE = 30


interface LanguageData {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes: Mistake[]
  /** Last ~2 months of answers in ALL languages. */
  recentEvents: ReviewEvent[]
  /** Word lists of this language. */
  lists: WordList[]
}

const RECENT_DAYS = 60

/** One plan per calendar day: reopening the app the same day gives the same order. */
const daySeed = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()

export default function App() {
  // undefined = loading, null = first run
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined)
  const [data, setData] = useState<LanguageData | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [screen, setScreen] = useState<Screen>(restoreScreen)
  // Remember where the learner was, so reopening the app continues there.
  useEffect(() => {
    if (!RESTORABLE.has(screen.name)) return
    try {
      localStorage.setItem(SCREEN_KEY, JSON.stringify(screen.name === 'word' ? { name: 'word', entryId: screen.entryId } : { name: screen.name }))
    } catch {
      // Storage unavailable: the app simply opens on the home screen next time.
    }
  }, [screen])
  const [apiKey, setApiKeyState] = useState<string | null>(null)
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
  const options = useMemo(() => ({ ai: !!apiKey, speech: speechOn }), [apiKey, speechOn])

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
      if (spent >= limit) throw new AiError('budget', 'Bu ayki AI bütçen doldu. Ayarlar → AI yardımcısı bölümünden sınırı değiştirebilirsin.')
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
      setApiKey: async (key: string | null) => {
        await db.saveAiKey(key)
        setApiKeyState(key)
      },
    }),
    [apiKey],
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
    if (!current()) return
    setLoad(loaded.states)
    pushToExtension(db)
    setGame(g)
    // New words without a frequency band get one from the bundled list, in the background.
    if (loaded.vocabulary.some((v) => v.source !== 'sample' && !v.frequencyRank)) {
      const filled = await fillFrequencyRanks(db, language)
      if (filled) apply({ language, ...(await db.loadLanguage(language)), recentEvents })
    }
    // French words saved without a part of speech or a noun gender get them from Lexique (offline).
    if (language === 'fr' && loaded.vocabulary.some((v) => v.source !== 'sample' && (v.partOfSpeech === 'other' || (v.partOfSpeech === 'noun' && !v.gender)))) {
      if (await fillFromLexicon(db, language)) apply({ language, ...(await db.loadLanguage(language)), recentEvents })
    }
    // The word pack (other languages, origins, synonyms, recordings), offline, for languages that ship one.
    if (await fillFromPack(db, language)) apply({ language, ...(await db.loadLanguage(language)), recentEvents })
    // Sentences get rated (offline), and re-rated once the word list has grown: the ones with at most one unknown word come first.
    if (await scoreCorpus(db, language)) apply({ language, ...(await db.loadLanguage(language)), recentEvents })
    // Real sentences for words that don't have them yet (a few per run, one run at a time).
    if (!corpusRun && loaded.vocabulary.some((v) => v.source !== 'sample' && v.corpus === undefined)) {
      corpusRun = fillCorpus(db, language).finally(() => (corpusRun = null))
      if (await corpusRun) apply({ language, ...(await db.loadLanguage(language)), recentEvents })
    }
    // Sentences saved before they came with their French/Spanish/English versions get them, a few per run.
    if (!corpusRun && loaded.vocabulary.some((v) => v.corpus?.some((x) => x.source?.kind === 'tatoeba' && x.parallel === undefined))) {
      corpusRun = fillParallel(db, language).finally(() => (corpusRun = null))
      if (await corpusRun) apply({ language, ...(await db.loadLanguage(language)), recentEvents })
    }
    // Pronunciation, definition and word family from Wiktionary, also in the background.
    if (!wiktRun && loaded.vocabulary.some((v) => v.source !== 'sample' && (!v.wiktAt || (v.partOfSpeech === 'noun' && v.language !== 'en' && !v.gender && v.wiktAt < '2026-10-03T12')))) {
      wiktRun = fillWordInfo(db, language).finally(() => (wiktRun = null))
      if (await wiktRun) apply({ language, ...(await db.loadLanguage(language)), recentEvents })
    }
  }, [language])

  useEffect(() => {
    reload()
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
    void runSync()
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
    void import('./ui/Sentences').then(({ saveSentence }) => saveSentence({ language: lang, text, focus: p.get('focus') ?? undefined, source: p.get('src') ?? undefined }).then(() => {
      if (lang !== settings.activeLanguage) void updateSettings({ ...settings, activeLanguage: lang })
      setScreen({ name: 'games', game: 'sentences' })
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Bookmarklet: switch to the page's language and open the add-word form prefilled.
  useEffect(() => {
    if (!incoming || !settings) return
    history.replaceState(null, '', location.pathname)
    if (incoming.lang && incoming.lang !== settings.activeLanguage) void updateSettings({ ...settings, activeLanguage: incoming.lang })
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
  // The reminder comes at the usual study hour (unless a fixed time was chosen), here and from the server.
  const usualHour = useMemo(() => (data ? usualStudyHour(data.recentEvents, new Date()) : null), [data])
  const reminder = useMemo(() => settings && { ...settings.reminder, time: reminderTime(settings.reminder, usualHour) }, [settings, usualHour])
  useReminder(restToday ? undefined : (reminder ?? undefined), answeredTodayAll, game?.streak ?? 0, settings?.studyPlan, dueReviews)
  useEffect(() => {
    if (plan) updateAppBadge(dueReviews, settings?.appBadge ?? true)
  }, [plan, dueReviews, settings?.appBadge])
  // The week in one line: on Today on Sunday and Monday, and in Sunday evening's push.
  const [weekText, setWeekText] = useState('')
  useEffect(() => {
    if (!data) return
    let live = true
    void (async () => {
      const [texts, lab] = await Promise.all([db.getLibrary(data.language), data.language === 'en' ? undefined : db.getLab(data.language)])
      const line = weekLine(weekSummary({ language: data.language, now: new Date(), events: data.recentEvents, vocabulary: data.vocabulary, texts, seen: lab?.seen }))
      if (live) setWeekText(line)
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
    if (loaded) void reportPushState(pushState)
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
      { language: settings.activeLanguage, vocabulary: data!.vocabulary, states: data!.states, mistakes: data!.mistakes },
      ...loaded.map((x, i) => ({ language: others[i], ...x })),
    ].map((x) =>
      buildDailyPlan({
        now,
        settings: { language: x.language, dailyMinutes: settings.dailyMinutes, newWordsPerDay: 0, autoRetire: settings.autoRetire },
        catalog: x.vocabulary,
        states: x.states,
        mistakes: x.mistakes,
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
    if (!quickStart || !plan || !data) return
    quickStart = false
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

  return (
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
            <aside className="sidebar">
              <div className="brand-row">
                <button className="brand" onClick={go({ name: 'home' })} title="Kelime Koçu">
                  <span className="brand-mark" aria-hidden>
                    <BrandMark />
                  </span>
                  <span className="brand-name">Kelime Koçu</span>
                </button>
                <button className="icon-btn rail-toggle" onClick={toggleRail} aria-label={rail ? 'Menüyü aç' : 'Menüyü daralt'} title={rail ? 'Menüyü aç' : 'Menüyü daralt'}>
                  {rail ? <ChevronRightIcon size={18} /> : <ChevronLeftIcon size={18} />}
                </button>
              </div>
              <div className="langs" role="group" aria-label="Dil" style={{ ['--i' as string]: TARGET_LANGUAGES.indexOf(settings.activeLanguage) }}>
                <span className="langs-thumb" aria-hidden />
                {TARGET_LANGUAGES.map((l) => (
                  <button
                    key={l}
                    className="lang-btn"
                    aria-pressed={l === settings.activeLanguage}
                    aria-label={`${LANGUAGE_NAME[l]}${l !== settings.activeLanguage && dueByLanguage[l] ? `, ${dueByLanguage[l]} tekrar bekliyor` : ''}`}
                    title={l !== settings.activeLanguage && dueByLanguage[l] ? `${dueByLanguage[l]} tekrar bekliyor` : undefined}
                    onClick={() => updateSettings({ ...settings, activeLanguage: l })}
                  >
                    {LANGUAGE_SHORT[l]}
                    {l !== settings.activeLanguage && !!dueByLanguage[l] && <span className="lang-dot" aria-hidden />}
                  </button>
                ))}
              </div>
              <button className="top-profile" onClick={go({ name: 'profile' })} aria-label="Profil ve ayarlar" title="Profil ve ayarlar">
                <Avatar profile={settings.profile} size={32} />
              </button>
              <button className="palette-trigger" onClick={() => setPalette(true)} title="Ara ya da git (⌘K)">
                <SearchIcon size={16} />
                <span>Ara ya da git…</span>
                <kbd>⌘K</kbd>
              </button>
              <nav className={`nav${navMark ? ' has-indicator' : ''}`} ref={navRef}>
                {navMark && (
                  <span
                    className={`nav-indicator${navMark.ready ? ' is-ready' : ''}`}
                    aria-hidden
                    style={{ transform: `translate(${navMark.left}px, ${navMark.top}px)`, width: navMark.width, height: navMark.height }}
                  />
                )}
                {NAV.map((n) => (
                  <button
                    key={n.screen}
                    className={`nav-btn${n.screen === 'home' ? ' nav-home' : ''}`}
                    aria-current={current(n.screen) ? 'page' : undefined}
                    onClick={goPlace(n.screen)}
                    title={rail ? n.label : undefined}
                  >
                    <n.icon size={20} />
                    <span className="nav-label">{n.label}</span>
                    {!!navBadge[n.screen] && (
                      <span className={`nav-badge nav-badge-${n.screen}`} aria-label={`${navBadge[n.screen]} ${badgeLabel[n.screen]}`}>
                        {navBadge[n.screen]! > 99 ? '99+' : navBadge[n.screen]}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
              <button className="nav-btn sidebar-settings" aria-current={inSettings ? 'page' : undefined} onClick={go({ name: 'settings' })} title={rail ? 'Ayarlar' : undefined}>
                <GearIcon size={20} />
                <span className="nav-label">Ayarlar</span>
              </button>
              <button className="sidebar-foot" aria-current={screen.name === 'profile' ? 'page' : undefined} onClick={go({ name: 'profile' })}>
                <Avatar profile={settings.profile} size={40} />
                <span className="sidebar-who">
                  <strong>{settings.profile.name || 'Profilin'}</strong>
                  {game && (
                    <span className="small muted">
                      Seviye {game.level.level} · <StreakFlame streak={game.streak} frozen={game.frozenYesterday} size={13} /> {game.streak}
                    </span>
                  )}
                  {game && (
                    <span className="sidebar-level" aria-hidden>
                      <span style={{ width: `${game.level.progress * 100}%` }} />
                    </span>
                  )}
                </span>
              </button>
            </aside>
          )}

          {!inSession && (
            <nav className="tabbar" aria-label="Ana menü">
              {NAV.map((n) => (
                <button key={n.screen} className="tab" aria-current={current(n.screen) ? 'page' : undefined} onClick={goPlace(n.screen)}>
                  <span className="tab-icon">
                    <n.icon size={22} />
                    {!!navBadge[n.screen] && <span className="tab-dot" aria-label={`${navBadge[n.screen]} ${badgeLabel[n.screen]}`} />}
                  </span>
                  <span>{n.label}</span>
                </button>
              ))}
            </nav>
          )}

          <main id="main" tabIndex={-1} className={`main${WIDE_SCREENS.has(screen.name) ? ' main-wide' : ''}`}>
            {/* Related screens under one menu place: switch between them here. */}
            {place && GROUPS[place]?.some((g) => g.screen === screen.name) && (
              <nav className="hub-tabs" aria-label={NAV.find((n) => n.screen === place)!.label}>
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
                İnternet yok. Tekrarların ve kelimelerin normal çalışır; haberler, gerçek cümleler, görseller ve AI özellikleri bağlantı gelince açılır.
              </p>
            )}
            <ScreenBoundary resetKey={screen.name} onHome={() => setScreen({ name: 'home' })}>
            <div key={screenKey} className="screen-enter" data-transition={transition.current.value}>
            <Suspense fallback={<ScreenSkeleton kind={skeletonFor(screen.name)} />}>
            {!data || !plan ? <ScreenSkeleton kind={skeletonFor(screen.name)} /> : screen.name === 'session' ? (
              <SessionScreen
                items={screen.items}
                mode={screen.mode}
                vocabulary={sessionVocabulary ?? data.vocabulary}
                states={screen.extraStates ? [...data.states, ...screen.extraStates] : data.states}
                mistakes={screen.extraMistakes ? [...data.mistakes, ...screen.extraMistakes] : data.mistakes}
                db={db}
                scheduler={scheduler}
                seed={screen.seed}
                options={options}
                settings={settings}
                onSettings={updateSettings}
                onFormAnswer={(f, ok, given) => void recordLabAnswer(scheduler, f.language, f.verb, f.tense as LabTense, f.person, ok, given)}
                onFinish={finishSession}
                onQuit={() => {
                  reload()
                  setScreen({ name: 'home' })
                }}
              />
            ) : screen.name === 'summary' ? (
              <Summary
                summary={screen.summary}
                byId={screen.extra ? new Map([...byId, ...screen.extra.map((e) => [e.id, e] as const)]) : byId}
                practice={screen.mode === 'practice'}
                topic={screen.topic}
                onUnmarkDifficult={async (entryId) => {
                  const e = byId.get(entryId)
                  if (e) await db.vocabulary.put(withDifficult(e, false))
                  reload()
                }}
                before={screen.gameBefore}
                after={game}
                firstSitting={screen.firstSitting}
                onDone={go({ name: 'home' })}
              />
            ) : screen.name === 'words' ? (
              <WordsScreen
                db={db}
                language={data.language}
                vocabulary={data.vocabulary}
                states={data.states}
                mistakes={data.mistakes}
                onChanged={reload}
                onOpen={(entryId) => setScreen({ name: 'word', entryId })}
                incoming={incoming && (!incoming.lang || incoming.lang === data.language) ? incoming : null}
                onIncomingDone={() => setIncoming(null)}
                onStudy={(deck) =>
                  startSession(buildDeckPlan({ catalog: deck, states: data.states, rng: createRng(Date.now()), scheduler, now: new Date(), options }), 'normal', undefined, deck)
                }
                lists={data.lists}
                focusListId={planInput?.settings.focusListId}
                onFocus={(listId) => void updateSettings({ ...settings, focusList: { ...settings.focusList, [data.language]: listId ?? undefined } })}
              />
            ) : screen.name === 'word' && byId.has(screen.entryId) ? (
              <WordDetail
                key={screen.entryId}
                db={db}
                entry={byId.get(screen.entryId)!}
                vocabulary={data.vocabulary}
                state={data.states.find((s) => s.entryId === screen.entryId)}
                mistakes={data.mistakes}
                scheduler={scheduler}
                onChanged={reload}
                onBack={go({ name: 'words' })}
                onOpen={(entryId) => setScreen({ name: 'word', entryId })}
                onOpenLab={(verb) => setScreen({ name: 'verbs', verb })}
                onStudy={(deck) =>
                  startSession(buildDeckPlan({ catalog: deck, states: data.states, rng: createRng(Date.now()), scheduler, now: new Date(), options }), 'normal', undefined, deck)
                }
              />
            ) : screen.name === 'dictionary' ? (
              <DictionaryScreen
                key={`${data.language}:${screen.query ?? ''}`}
                language={data.language}
                vocabulary={data.vocabulary}
                initialQuery={screen.query}
                onOpenWord={(entryId) => setScreen({ name: 'word', entryId })}
                // The add form, with the dictionary's meaning filled in (the incoming-word effect opens Words).
                onAdd={(word, meaning) => setIncoming({ word, context: '', meaning })}
                onOpenLab={data.language !== 'en' ? (verb) => setScreen({ name: 'verbs', verb }) : undefined}
                onSwitchLanguage={(targetLang, query) => {
                  if (settings) void updateSettings({ ...settings, activeLanguage: targetLang })
                  setScreen({ name: 'dictionary', query })
                }}
              />
            ) : screen.name === 'mistakes' ? (
              <MistakesScreen
                mistakes={data.mistakes}
                vocabulary={data.vocabulary}
                onOpen={(entryId) => setScreen({ name: 'word', entryId })}
                onConjugation={data.language !== 'en' ? go({ name: 'verbs', tab: 'practice' }) : undefined}
                onPractice={() =>
                  startSession(buildMistakePlan({ catalog: data.vocabulary, states: data.states, mistakes: data.mistakes, rng: createRng(Date.now()), options }), 'normal')
                }
                onPracticeType={(type) =>
                  startSession(
                    buildMistakePlan({ catalog: data.vocabulary, states: data.states, mistakes: data.mistakes.filter((m) => m.errorType === type), rng: createRng(Date.now()), options }),
                    'normal',
                  )
                }
              />
            ) : screen.name === 'progress' ? (
              <ProgressScreen
                db={db}
                language={data.language}
                vocabularyCount={data.vocabulary.length}
                states={data.states}
                scheduler={scheduler}
                vocabulary={data.vocabulary}
                onOpen={(entryId) => setScreen({ name: 'word', entryId })}
                onVocabTest={go({ name: 'vocabtest' })}
                onExam={go({ name: 'exam' })}
              />
            ) : screen.name === 'produce' ? (
              <ProduceScreen
                key={data.language}
                db={db}
                language={data.language}
                vocabulary={data.vocabulary}
                states={data.states}
                onChanged={reload}
                onOpenSettings={go({ name: 'settings' })}
              />
            ) : screen.name === 'exam' ? (
              <ExamScreen key={data.language} db={db} language={data.language} vocabulary={data.vocabulary} states={data.states} onDone={go({ name: 'progress' })} />
            ) : screen.name === 'vocabtest' ? (
              <VocabTestScreen key={data.language} db={db} language={data.language} onDone={go({ name: 'progress' })} />
            ) : screen.name === 'story' ? (
              <StoryScreen
                language={data.language}
                settings={settings}
                vocabulary={data.vocabulary}
                states={data.states}
                mistakes={data.mistakes}
                onSettings={updateSettings}
                onChanged={reload}
                onOpenSettings={go({ name: 'settings' })}
              />
            ) : screen.name === 'reading' ? (
              <ReadingScreen
                key={data.language}
                db={db}
                language={data.language}
                vocabulary={data.vocabulary}
                states={data.states}
                onChanged={reload}
                onOpen={(entryId) => setScreen({ name: 'word', entryId })}
                onOpenLab={data.language !== 'en' ? (verb, tense) => setScreen({ name: 'verbs', verb, tense }) : undefined}
                onLookUp={(query) => setScreen({ name: 'dictionary', query })}
                onStudy={(deck) =>
                  startSession(buildDeckPlan({ catalog: deck, states: data.states, rng: createRng(Date.now()), scheduler, now: new Date(), options }), 'normal', undefined, deck)
                }
              />
            ) : screen.name === 'games' ? (
              <GamesScreen key={screen.game} initialGame={screen.game} onOpenVerbs={data.language !== 'en' ? go({ name: 'verbs' }) : undefined} language={data.language} vocabulary={data.vocabulary} states={data.states} mistakes={data.mistakes} onChanged={reload} />
            ) : screen.name === 'verbs' ? (
              <VerbLab key={data.language} language={data.language} vocabulary={data.vocabulary} states={data.states} scheduler={scheduler} initialVerb={screen.verb} initialTense={screen.tense} initialTab={screen.tab} onAdded={reload} />
            ) : screen.name === 'profile' ? (
              <ProfileScreen settings={settings} onChange={updateSettings} onOpenSettings={() => setScreen({ name: 'settings' })} />
            ) : screen.name === 'account' ? (
              <AuthScreen key={screen.mode} initialMode={screen.mode} onDone={() => setScreen({ name: 'settings' })} onBack={() => setScreen({ name: 'settings' })} />
            ) : screen.name === 'settings' ? (
              <SettingsScreen
                settings={settings}
                onChange={updateSettings}
                pushState={pushState}
                onOpenAuth={(mode) => setScreen({ name: 'account', mode })}
                onDataChanged={async () => {
                  const s = await db.getSettings()
                  setSettings(s ?? null)
                  reload()
                }}
              />
            ) : (
              <Home
                language={data.language}
                plan={plan}
                profile={skillProfile(data.states, scheduler, new Date())}
                vocabularyCount={data.vocabulary.length}
                learningCount={data.states.length}
                activeVocabulary={progressStats({ vocabularyCount: data.vocabulary.length, states: data.states, events: [], scheduler, now: new Date() }).activeVocabulary}
                name={settings.profile.name}
                dailyXpGoal={settings.dailyXpGoal}
                answeredToday={answeredToday(data.recentEvents.filter((e) => e.language === data.language), new Date())}
                nextReview={earliest(data.states)}
                openMistakeWords={new Set(openMistakes(data.mistakes).map((m) => m.entryId)).size}
                canPractice={data.states.some((s) => Object.keys(s.skills).length > 0)}
                onStart={startDay}
                onAddWords={go({ name: 'words' })}
                focus={(() => {
                  const list = data.lists.find((l) => l.id === planInput?.settings.focusListId)
                  if (!list) return undefined
                  const met = new Map(data.states.map((st) => [st.entryId, st]))
                  const groups = levelGroups(list, data.vocabulary)
                  const now = currentLevel(groups, met)
                  const words = now ? groups[now.index].words : []
                  return { name: list.name, level: now ? (now.level?.name ?? null) : undefined, met: words.filter((w) => met.has(w.id)).length, total: words.length }
                })()}
                pinned={settings.profile.pinned}
                onOpenLists={() => {
                  try {
                    localStorage.setItem(WORDS_VIEW_KEY, 'lists')
                  } catch {
                    // The words screen just opens on its last view.
                  }
                  setScreen({ name: 'words' })
                }}
                onTrySamples={async () => {
                  // Dated now, so samples removed earlier and loaded again aren't taken for deleted ones on sync.
                  const at = new Date()
                  const { SAMPLE_WORDS } = await import('./data/seed')
                  await db.vocabulary.bulkPut(SAMPLE_WORDS[data.language].map((w) => ({ ...w, addedAt: at })))
                  await reload()
                }}
                onProfile={go({ name: 'profile' })}
                onStory={apiKey && data.states.length >= 3 ? go({ name: 'story' }) : undefined}
                onGames={data.vocabulary.length >= 4 ? go({ name: 'games' }) : undefined}
                // The forms mixed into the day's session are counted there, not on a tile of their own.
                formsDue={Math.max(0, formsDue - dayForms.length)}
                onForms={settings.activeLanguage !== 'en' ? go({ name: 'verbs', tab: 'review' }) : undefined}
                warmup={warmup}
                onWarmup={settings.activeLanguage !== 'en' ? go({ name: 'verbs', tab: 'warmup' }) : undefined}
                verbOfDay={verbOfDay}
                onVerbOfDay={(verb) => setScreen({ name: 'verbs', verb })}
                onMixed={mixedDue.languages >= 2 ? startMixed : undefined}
                mixedDue={mixedDue.count}
                onExtraNew={() => planInput && startSession(buildExtraNewPlan({ ...planInput, seed: Date.now() % 2 ** 31 }, 5), 'normal')}
                onPracticeMistakes={() =>
                  startSession(buildMistakePlan({ catalog: data.vocabulary, states: data.states, mistakes: data.mistakes, rng: createRng(Date.now()), options }), 'normal')
                }
                difficultCount={difficultWords(data.vocabulary).length}
                onPracticeDifficult={practiceDifficult}
                onFreePractice={() => startSession(buildPracticePlan({ catalog: data.vocabulary, states: data.states, rng: createRng(Date.now()), options }), 'practice')}
                garden={garden && {
                  urgent: garden.wilting + garden.thirsty > 0,
                  node: (
                      <GardenCard
                        summary={garden}
                        hardCount={difficultWords(data.vocabulary).length}
                        onPracticeHard={practiceDifficult}
                        onOpenHard={() => {
                          try {
                            localStorage.setItem(WORDS_VIEW_KEY, 'garden')
                            sessionStorage.setItem(GARDEN_HARD_KEY, '1')
                          } catch {
                            // The garden just opens unfiltered.
                          }
                          setScreen({ name: 'words' })
                        }}
                        onWater={() => {
                          const ids = garden.toWater.slice(0, 20)
                          const deck = data.vocabulary.filter((v) => ids.includes(v.id))
                          startSession(buildDeckPlan({ catalog: deck, states: data.states, rng: createRng(Date.now()), scheduler, now: new Date(), options }), 'normal')
                        }}
                        onOpen={() => {
                          try {
                            localStorage.setItem(WORDS_VIEW_KEY, 'garden')
                          } catch {
                            // The words screen just opens on its last view.
                          }
                          setScreen({ name: 'words' })
                        }}
                      />
                  ),
                }}
                firstWords={lookupNudge}
                extra={
                  <>
                  <HabitCards
                    settings={settings}
                    onSettings={updateSettings}
                    newToday={newToday.length}
                    onEveningReview={() =>
                      startSession(buildDeckPlan({ catalog: newToday, states: data.states, rng: createRng(Date.now()), scheduler, now: new Date(), options }), 'practice')
                    }
                  />
                  {lookupNudge}
                  <GainsNudge gains={studyGains(data.states, data.recentEvents, data.language, new Date())} target={settings.retention} onOpen={go({ name: 'progress' })} />
                  <WeeklyNudge line={weekText} now={new Date()} onOpen={go({ name: 'progress' })} />
                  <BackupNudge
                    onOpenSync={() => {
                      try {
                        localStorage.setItem(PANE_KEY, 's-account')
                      } catch {
                        // Settings just opens on its last pane.
                      }
                      setScreen({ name: 'settings' })
                    }}
                  />
                  </>
                }
              />
            )}
            </Suspense>
            </div>
            </ScreenBoundary>
          </main>
          <Toaster />
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
      <BadgeWatcher game={game} paused={screen.name === 'session' || screen.name === 'summary'} onProfile={go({ name: 'profile' })} />
      </GameContext.Provider>
    </AiContext.Provider>
  )
}

function earliest(states: UserWordState[]): Date | undefined {
  const dates = states.map(nextReviewAt).filter((d): d is Date => !!d)
  return dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : undefined
}
