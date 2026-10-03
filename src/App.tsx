import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactElement } from 'react'
import { buildDailyPlan, buildExtraNewPlan, type PlanItem } from './engine/dailyPlan'
import { skillProfile } from './engine/mastery'
import { openMistakes } from './engine/mistakes'
import { answeredToday, progressStats } from './engine/progress'
import { buildDeckPlan, buildMistakePlan, buildPracticePlan } from './engine/practice'
import { nextReviewAt } from './engine/review'
import { createRng } from './engine/rng'
import type { SessionSummary } from './engine/session'
import {
  TARGET_LANGUAGES,
  type Mistake,
  type ReviewEvent,
  type ReviewMode,
  type TargetLanguage,
  type UserWordState,
  type VocabularyEntry,
} from './engine/types'
import { db, scheduler, setLoad } from './data/instance'
import { dayWeight, isRestDay } from './engine/workload'
import type { Settings } from './data/db'
import { fillCorpus } from './data/corpus'
import { fillWordInfo } from './data/wordInfo'
import { fillFrequencyRanks } from './data/frequency'
import { aiConfig, monthKey } from './ai/usage'
import { AiError } from './ai/types'
import { AiContext } from './ui/aiContext'
import { Avatar } from './ui/Avatar'
import { GameContext, loadGame, type GameState } from './ui/game'
import { AlertIcon, BookIcon, ChartIcon, FlameIcon, GameIcon, GearIcon, HomeIcon, MoreIcon, PenIcon, ReadIcon, SearchIcon, StoryIcon, UserIcon } from './ui/icons'
import { LANGUAGE_NAME, LANGUAGE_SHORT } from './ui/labels'
import { applySettings } from './ui/prefs'
import { canListen } from './ui/speechInput'
import { useReminder } from './ui/reminders'
import { reportPushState } from './ui/pushReminders'
import { HabitCards } from './ui/Habits'
import { natural } from './ui/naturalVoice'
import { onSynced, runSync } from './ui/syncRunner'
import { connectExtension, pushToExtension } from './ui/extensionBridge'
import { saveSentence } from './ui/Sentences'
import { GardenCard, WORDS_VIEW_KEY } from './ui/Garden'
import { gardenSummary } from './engine/growth'
import { Home, Onboarding, Summary } from './ui/Screens'
import { SessionScreen } from './ui/Session'
import { CommandPalette, type Command } from './ui/CommandPalette'
import { readIncoming, type IncomingWord } from './ui/incoming'
import { ScreenBoundary } from './ui/ScreenBoundary'
import { Toaster } from './ui/toast'
import { useOnline } from './ui/useOnline'

/*
 * Screens other than the daily loop (home, session, summary) load when first opened, so the app
 * starts with less code; once it is idle they are fetched in the background anyway, so switching
 * screens stays instant and works offline.
 */
const screenModules = {
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
}
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

function prefetchScreens() {
  for (const load of Object.values(screenModules)) void load().catch(() => {})
}

type Screen =
  | { name: 'home' }
  | { name: 'session'; items: PlanItem[]; seed: number; mode: ReviewMode; gameBefore: GameState | null; extra?: VocabularyEntry[]; extraStates?: UserWordState[]; extraMistakes?: Mistake[] }
  | { name: 'summary'; summary: SessionSummary; mode: ReviewMode; gameBefore: GameState | null; extra?: VocabularyEntry[] }
  | { name: 'words' }
  | { name: 'word'; entryId: string }
  | { name: 'mistakes' }
  | { name: 'progress' }
  | { name: 'story' }
  | { name: 'reading' }
  | { name: 'vocabtest' }
  | { name: 'produce' }
  | { name: 'exam' }
  | { name: 'games'; game?: 'sentences' }
  | { name: 'profile' }
  | { name: 'settings' }

const SCREEN_KEY = 'kelime-koc:screen'
/** Screens worth returning to; sessions and summaries are not (answers are saved anyway). */
const RESTORABLE = new Set<Screen['name']>(['home', 'words', 'word', 'reading', 'produce', 'story', 'games', 'mistakes', 'progress', 'profile', 'settings'])

function restoreScreen(): Screen {
  // Home-screen shortcuts (manifest): ?go=home | add | reading
  const shortcut = new URLSearchParams(location.search).get('go')
  if (shortcut) {
    history.replaceState(null, '', location.pathname)
    if (shortcut === 'reading') return { name: 'reading' }
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
const WIDE_SCREENS = new Set(['home', 'progress', 'words', 'games', 'mistakes', 'profile', 'summary', 'word', 'reading'])

type NavScreen = 'home' | 'words' | 'reading' | 'produce' | 'story' | 'games' | 'mistakes' | 'progress' | 'profile' | 'settings'

const NAV: { screen: NavScreen; label: string; icon: (p: { size?: number }) => ReactElement }[] = [
  { screen: 'home', label: 'Bugün', icon: HomeIcon },
  { screen: 'words', label: 'Kelimeler', icon: BookIcon },
  { screen: 'reading', label: 'Okuma', icon: ReadIcon },
  { screen: 'produce', label: 'Yaz & konuş', icon: PenIcon },
  { screen: 'story', label: 'Hikaye', icon: StoryIcon },
  { screen: 'games', label: 'Oyunlar', icon: GameIcon },
  { screen: 'mistakes', label: 'Hatalar', icon: AlertIcon },
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

/** Phones get a bottom tab bar with these; the rest sit behind "Daha". */
const TABS: NavScreen[] = ['home', 'words', 'reading', 'progress']

interface LanguageData {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes: Mistake[]
  /** Last ~2 months of answers in ALL languages. */
  recentEvents: ReviewEvent[]
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
  const [more, setMore] = useState(false)
  const online = useOnline()
  // A word sent from the "add to Kelime Koçu" bookmarklet on another site.
  const [incoming, setIncoming] = useState<IncomingWord | null>(() => readIncoming())
  const language = settings?.activeLanguage
  const speechOn = settings ? settings.speechExercises && canListen() : false
  const options = useMemo(() => ({ ai: !!apiKey, speech: speechOn }), [apiKey, speechOn])

  useEffect(() => {
    db.getSettings().then((s) => setSettings(s ?? null))
    db.getAiKey().then(setApiKeyState)
    db.getTtsKey().then((k) => (natural.key = k))
  }, [])

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
    const since = new Date(Date.now() - RECENT_DAYS * 86_400_000)
    const [loaded, recentEvents, g] = await Promise.all([db.loadLanguage(language), db.eventsSince(since), loadGame(db)])
    setData({ language, ...loaded, recentEvents })
    setLoad(loaded.states)
    pushToExtension(db)
    setGame(g)
    // New words without a frequency band get one from the bundled list, in the background.
    if (loaded.vocabulary.some((v) => v.source !== 'sample' && !v.frequencyRank)) {
      const filled = await fillFrequencyRanks(db, language)
      if (filled) setData({ language, ...(await db.loadLanguage(language)), recentEvents })
    }
    // Real sentences for words that don't have them yet (a few per run, one run at a time).
    if (!corpusRun && loaded.vocabulary.some((v) => v.source !== 'sample' && v.corpus === undefined)) {
      corpusRun = fillCorpus(db, language).finally(() => (corpusRun = null))
      if (await corpusRun) setData({ language, ...(await db.loadLanguage(language)), recentEvents })
    }
    // Pronunciation, definition and word family from Wiktionary, also in the background.
    if (!wiktRun && loaded.vocabulary.some((v) => v.source !== 'sample' && (!v.wiktAt || (v.partOfSpeech === 'noun' && v.language !== 'en' && !v.gender && v.wiktAt < '2026-10-03T12')))) {
      wiktRun = fillWordInfo(db, language).finally(() => (wiktRun = null))
      if (await wiktRun) setData({ language, ...(await db.loadLanguage(language)), recentEvents })
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
    void saveSentence({ language: lang, text, focus: p.get('focus') ?? undefined, source: p.get('src') ?? undefined }).then(() => {
      if (lang !== settings.activeLanguage) void updateSettings({ ...settings, activeLanguage: lang })
      setScreen({ name: 'games', game: 'sentences' })
    })
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
      mistakes: data ? new Set(openMistakes(data.mistakes).map((m) => m.entryId)).size : 0,
    }),
    [plan, data],
  )
  const badgeLabel: Partial<Record<NavScreen, string>> = { home: 'soru bekliyor', mistakes: 'kelimede açık hata' }
  // Rest days and holidays: no reminder.
  const restToday = !!settings && isRestDay(new Date(), settings)
  // Words waiting for review today: the reminder names them, so it's a concrete, small ask.
  const dueReviews = plan ? plan.items.filter((i) => i.kind === 'exercise').length : 0
  useReminder(restToday ? undefined : settings?.reminder, answeredTodayAll, game?.streak ?? 0, settings?.studyPlan, dueReviews)
  const pushState = useMemo(
    () => ({
      studiedToday: answeredTodayAll > 0,
      streak: game?.streak ?? 0,
      plan: settings?.studyPlan ?? '',
      restWeekdays: (settings?.dayWeights ?? []).flatMap((w, day) => (w === 0 ? [day] : [])),
      vacation: settings?.vacation ?? null,
      due: dueReviews,
    }),
    [answeredTodayAll, game?.streak, settings?.studyPlan, settings?.dayWeights, settings?.vacation, dueReviews],
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
        gameBefore: s.name === 'session' ? s.gameBefore : null,
        // Words of other languages (a mixed session) still get their names in the summary.
        extra: s.name === 'session' ? s.extra : undefined,
      }))
    },
    [reload],
  )

  /** `extra`: words that may not be in the loaded list yet (just added), so the session has them. */
  const startSession = (items: PlanItem[], mode: ReviewMode, seed = Date.now() % 2 ** 31, extra?: VocabularyEntry[]) => {
    // A session cap takes a prefix: introductions always come before their first test.
    const capped = settings?.sessionMax ? items.slice(0, settings.sessionMax) : items
    if (capped.length) setScreen({ name: 'session', items: capped, mode, seed, gameBefore: game, extra })
  }

  // Interleaving (Kornell & Bjork 2008): reviews due across languages, mixed into one session.
  const [mixedDue, setMixedDue] = useState({ count: 0, languages: 0 })
  useEffect(() => {
    const now = new Date()
    void db.wordStates.toArray().then((all) => {
      const due = all.filter((st) => Object.values(st.skills).some((c) => c.due <= now))
      setMixedDue({ count: due.length, languages: new Set(due.map((st) => st.language)).size })
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

  const go = (s: Screen) => () => {
    setMore(false)
    setScreen(s)
  }
  const inSession = screen.name === 'session'

  const commands: Command[] = [
    { id: 'home', label: 'Bugün', icon: '🏠', run: go({ name: 'home' }) },
    ...(plan && plan.items.length ? [{ id: 'start', label: 'Bugünkü görevi başlat', icon: '▶️', run: () => startSession(plan.items, 'normal', daySeed(new Date())) }] : []),
    { id: 'add', label: 'Kelime ekle', icon: '➕', run: () => { setScreen({ name: 'words' }); setTimeout(() => document.getElementById('w-word')?.focus(), 100) } },
    { id: 'words', label: 'Kelimeler', icon: '📚', run: go({ name: 'words' }) },
    { id: 'reading', label: 'Okuma', icon: '📰', run: go({ name: 'reading' }) },
    { id: 'produce', label: 'Yaz & konuş: günlük ve sohbet', icon: '✍️', run: go({ name: 'produce' }) },
    { id: 'story', label: 'Hikaye', icon: '📖', run: go({ name: 'story' }) },
    { id: 'games', label: 'Oyunlar', icon: '🧩', run: go({ name: 'games' }) },
    ...(data && data.states.some((s) => Object.keys(s.skills).length)
      ? [{ id: 'practice', label: 'Serbest pratik', icon: '✨', run: () => startSession(buildPracticePlan({ catalog: data.vocabulary, states: data.states, rng: createRng(Date.now()), options }), 'practice') }]
      : []),
    ...(data && openMistakes(data.mistakes).length
      ? [{ id: 'mistakes-practice', label: 'Hatalarını düzelt', icon: '🩹', run: () => startSession(buildMistakePlan({ catalog: data.vocabulary, states: data.states, mistakes: data.mistakes, rng: createRng(Date.now()), options }), 'normal') }]
      : []),
    { id: 'mistakes', label: 'Hatalar', icon: '⚠️', run: go({ name: 'mistakes' }) },
    { id: 'progress', label: 'İlerleme', icon: '📈', run: go({ name: 'progress' }) },
    { id: 'vocabtest', label: 'Kelime dağarcığı testi', icon: '🧪', run: go({ name: 'vocabtest' }) },
    { id: 'exam', label: 'Hatırlama sınavı', icon: '📝', run: go({ name: 'exam' }) },
    { id: 'profile', label: 'Profil', icon: '👤', run: go({ name: 'profile' }) },
    { id: 'settings', label: 'Ayarlar', icon: '⚙️', run: go({ name: 'settings' }) },
    ...TARGET_LANGUAGES.filter((l) => l !== settings.activeLanguage).map((l) => ({
      id: `lang-${l}`,
      label: `Dil: ${LANGUAGE_NAME[l]}`,
      icon: '🌍',
      run: () => updateSettings({ ...settings, activeLanguage: l }),
    })),
  ]
  const current = (n: NavScreen) =>
    screen.name === n || (n === 'words' && screen.name === 'word') || (n === 'home' && screen.name === 'summary')

  return (
    <AiContext.Provider value={ai}>
      <GameContext.Provider value={game}>
        <div className={inSession ? 'app' : 'shell'} data-lang={settings.activeLanguage}>
          {!inSession && (
            <aside className="sidebar">
              <button className="brand" onClick={go({ name: 'home' })}>
                <span className="brand-mark" aria-hidden>
                  k
                </span>
                Kelime Koçu
              </button>
              <div className="langs" role="group" aria-label="Dil">
                {TARGET_LANGUAGES.map((l) => (
                  <button
                    key={l}
                    className="lang-btn"
                    aria-pressed={l === settings.activeLanguage}
                    aria-label={LANGUAGE_NAME[l]}
                    onClick={() => updateSettings({ ...settings, activeLanguage: l })}
                  >
                    {LANGUAGE_SHORT[l]}
                  </button>
                ))}
              </div>
              <button className="palette-trigger" onClick={() => setPalette(true)}>
                <span>Ara ya da git…</span>
                <kbd>⌘K</kbd>
              </button>
              <nav className="nav">
                {NAV.map((n) => (
                  <button
                    key={n.screen}
                    className={`nav-btn${n.screen === 'home' ? ' nav-home' : ''}${n.screen === 'progress' ? ' nav-group' : ''}`}
                    aria-current={current(n.screen) ? 'page' : undefined}
                    onClick={go({ name: n.screen })}
                  >
                    <n.icon size={20} />
                    <span>{n.label}</span>
                    {!!navBadge[n.screen] && (
                      <span className={`nav-badge nav-badge-${n.screen}`} aria-label={`${navBadge[n.screen]} ${badgeLabel[n.screen]}`}>
                        {navBadge[n.screen]! > 99 ? '99+' : navBadge[n.screen]}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
              <button className="sidebar-foot" onClick={go({ name: 'profile' })}>
                <Avatar profile={settings.profile} size={40} />
                <span className="sidebar-who">
                  <strong>{settings.profile.name || 'Profilin'}</strong>
                  {game && (
                    <span className="small muted">
                      Seviye {game.level.level} · <FlameIcon size={13} className="icon-flame" /> {game.streak}
                    </span>
                  )}
                </span>
              </button>
            </aside>
          )}

          {!inSession && (
            <nav className="tabbar" aria-label="Ana menü">
              {TABS.map((t) => {
                const n = NAV.find((x) => x.screen === t)!
                return (
                  <button key={t} className="tab" aria-current={current(t) ? 'page' : undefined} onClick={go({ name: t })}>
                    <span className="tab-icon">
                      <n.icon size={22} />
                      {!!navBadge[t] && <span className="tab-dot" aria-label={`${navBadge[t]} ${badgeLabel[t]}`} />}
                    </span>
                    <span>{n.label}</span>
                  </button>
                )
              })}
              <button
                className="tab"
                aria-current={NAV.some((n) => !TABS.includes(n.screen) && current(n.screen)) ? 'page' : undefined}
                aria-expanded={more}
                onClick={() => setMore(true)}
              >
                <MoreIcon size={22} />
                <span>Daha</span>
              </button>
            </nav>
          )}
          {more && (
            <div className="more-backdrop" onClick={(e) => e.target === e.currentTarget && setMore(false)} onKeyDown={(e) => e.key === 'Escape' && setMore(false)}>
              <div className="more-sheet" role="dialog" aria-modal="true" aria-label="Diğer bölümler">
                <div className="more-grab" aria-hidden />
                <button
                  className="more-search"
                  onClick={() => {
                    setMore(false)
                    setPalette(true)
                  }}
                >
                  <SearchIcon size={18} /> Ara ya da git…
                </button>
                <div className="more-grid">
                  {NAV.filter((n) => !TABS.includes(n.screen)).map((n) => (
                    <button key={n.screen} className="more-item" aria-current={current(n.screen) ? 'page' : undefined} onClick={go({ name: n.screen })}>
                      <n.icon size={24} />
                      <span>{n.label}</span>
                    </button>
                  ))}
                </div>
                <button className="btn btn-quiet btn-block" onClick={() => setMore(false)} autoFocus>
                  Kapat
                </button>
              </div>
            </div>
          )}

          <main className={`main${WIDE_SCREENS.has(screen.name) ? ' main-wide' : ''}`}>
            {!online && !inSession && (
              <p className="offline-banner" role="status">
                İnternet yok. Tekrarların ve kelimelerin normal çalışır; haberler, gerçek cümleler, görseller ve AI özellikleri bağlantı gelince açılır.
              </p>
            )}
            <ScreenBoundary resetKey={screen.name} onHome={() => setScreen({ name: 'home' })}>
            <Suspense fallback={<p className="muted screen-loading">Yükleniyor…</p>}>
            {!data || !plan ? null : screen.name === 'session' ? (
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
                before={screen.gameBefore}
                after={game}
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
              />
            ) : screen.name === 'mistakes' ? (
              <MistakesScreen
                mistakes={data.mistakes}
                vocabulary={data.vocabulary}
                onOpen={(entryId) => setScreen({ name: 'word', entryId })}
                onPractice={() =>
                  startSession(buildMistakePlan({ catalog: data.vocabulary, states: data.states, mistakes: data.mistakes, rng: createRng(Date.now()), options }), 'normal')
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
                onStudy={(deck) =>
                  startSession(buildDeckPlan({ catalog: deck, states: data.states, rng: createRng(Date.now()), scheduler, now: new Date(), options }), 'normal', undefined, deck)
                }
              />
            ) : screen.name === 'games' ? (
              <GamesScreen key={screen.game} initialGame={screen.game} language={data.language} vocabulary={data.vocabulary} states={data.states} mistakes={data.mistakes} onChanged={reload} />
            ) : screen.name === 'profile' ? (
              <ProfileScreen settings={settings} onChange={updateSettings} />
            ) : screen.name === 'settings' ? (
              <SettingsScreen
                settings={settings}
                onChange={updateSettings}
                pushState={pushState}
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
                onStart={() => startSession(plan.items, 'normal', daySeed(new Date()))}
                onAddWords={go({ name: 'words' })}
                onProfile={go({ name: 'profile' })}
                onStory={apiKey && data.states.length >= 3 ? go({ name: 'story' }) : undefined}
                onGames={data.vocabulary.length >= 4 ? go({ name: 'games' }) : undefined}
                onMixed={mixedDue.languages >= 2 ? startMixed : undefined}
                mixedDue={mixedDue.count}
                onExtraNew={() => planInput && startSession(buildExtraNewPlan({ ...planInput, seed: Date.now() % 2 ** 31 }, 5), 'normal')}
                onPracticeMistakes={() =>
                  startSession(buildMistakePlan({ catalog: data.vocabulary, states: data.states, mistakes: data.mistakes, rng: createRng(Date.now()), options }), 'normal')
                }
                onFreePractice={() => startSession(buildPracticePlan({ catalog: data.vocabulary, states: data.states, rng: createRng(Date.now()), options }), 'practice')}
                garden={garden && {
                  urgent: garden.wilting + garden.thirsty > 0,
                  node: (
                      <GardenCard
                        summary={garden}
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
                  </>
                }
              />
            )}
            </Suspense>
            </ScreenBoundary>
          </main>
          <Toaster />
          {palette && data && (
            <CommandPalette
              commands={commands}
              vocabulary={data.vocabulary}
              onOpenWord={(entryId) => setScreen({ name: 'word', entryId })}
              onClose={() => setPalette(false)}
            />
          )}
        </div>
      </GameContext.Provider>
    </AiContext.Provider>
  )
}

function earliest(states: UserWordState[]): Date | undefined {
  const dates = states.map(nextReviewAt).filter((d): d is Date => !!d)
  return dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : undefined
}
