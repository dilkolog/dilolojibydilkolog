import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildDailyPlan, MAX_DAY_FORMS } from './engine/dailyPlan'

import { engineFlags } from './engine/exercisePrefs'
import { openMistakes } from './engine/mistakes'
import { mistakesForMonki, weakWordsOf } from './engine/monkiContext'
import { answeredToday } from './engine/progress'

import type { SessionSummary } from './engine/session'
import { TARGET_LANGUAGES, type TargetLanguage, type VocabularyEntry } from './engine/types'
import { db, scheduler } from './data/instance'
import { dayWeight, isRestDay } from './engine/workload'
import { loadTenses } from './data/tenseData'
import { AccessContext } from './ui/accessContext'
import { AiContext } from './ui/aiContext'

import { Glyph } from './ui/Glyph'
import { BadgeWatcher } from './ui/BadgeWatcher'
import { LevelWatcher } from './ui/LevelWatcher'
import { GameContext } from './ui/game'
import { AlertIcon, CheckIcon, PlayIcon, PlusIcon, SparkleIcon, TargetIcon } from './ui/icons'
import { LANGUAGE_NAME, LANGUAGE_SHORT } from './ui/labels'
import { useDayPart } from './ui/dayPart'
import { canListen } from './ui/speechInput'
import { useReminder } from './ui/reminders'
import { reminderTime, usualStudyHour } from './engine/hours'
import { updateAppBadge } from './ui/appBadge'
import { reportMailState } from './ui/emailReminders'
import { reportPushState } from './ui/pushReminders'

import { weekLine, weekMisses, weekSummary, type WeekSummary } from './engine/weekly'
import { LookupNudge } from './ui/LookupNudge'

import { announceIncoming, onSynced, runSync } from './ui/syncRunner'
import { connectExtension } from './ui/extensionBridge'

import { gardenSummary } from './engine/growth'

import { Sidebar, TabBar, type NavMark } from './ui/AppSidebar'
import { AppScreens, type AppScreensProps } from './AppScreens'
import { CommandPalette, IncomingSet, Monki, prefetchScreens } from './lazyScreens'
import { useScreenHistory } from './ui/useScreenHistory'
import { useLanguageData } from './ui/useLanguageData'
import { useAppSettings } from './ui/useAppSettings'
import { ALL_SCREENS, GROUPS, NAV, RESTORABLE, SCREEN_KEY, WIDE_SCREENS, daySeed, placeOf, restoreScreen, type NavScreen, type Screen, type ScreenName } from './appNav'
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
import { ScreenSkeleton } from './ui/Skeleton'
import { skeletonFor } from './ui/skeletonFor'
import { useOnline } from './ui/useOnline'

import { useTabIndicator } from './ui/useTabIndicator'
import { useSessionStarters } from './ui/useSessionStarters'

/*
 * Screens other than Today and the session summary load when first opened, so the app
 * starts with less code; once it is idle they are fetched in the background anyway, so switching
 * screens stays instant and works offline.
 */
/** A stable empty list while the words load (a fresh [] each render would re-run the hooks). */
const NO_WORDS: readonly VocabularyEntry[] = []

/** Alt/Option + a key opens a screen straight away: S the dictionary (Sözlük), V the verb lab. */
const GO_KEYS: Record<string, Screen> = { KeyS: { name: 'dictionary' }, KeyV: { name: 'verbs' } }

export default function App() {
  // undefined = loading, null = first run
  const [screen, setScreen] = useState<Screen>(restoreScreen)
  useScreenHistory(screen, setScreen)
  // Remember where the learner was, so reopening the app continues there.
  useEffect(() => {
    if (!RESTORABLE.has(screen.name)) return
    try {
      localStorage.setItem(SCREEN_KEY, JSON.stringify(screen.name === 'word' ? { name: 'word', entryId: screen.entryId } : screen.name === 'words' && screen.list ? { name: 'words', list: screen.list } : { name: screen.name }))
    } catch {
      // Storage unavailable: the app simply opens on the home screen next time.
    }
  }, [screen])
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
  const { settings, setSettings, updateSettings, access, apiKey, ai } = useAppSettings()
  const language = settings?.activeLanguage
  const speechOn = settings ? settings.speechExercises && canListen() : false
  const flags = useMemo(() => engineFlags(settings?.exercisePrefs, settings?.typedBlanks), [settings?.exercisePrefs, settings?.typedBlanks])
  const options = useMemo(() => ({ ai: !!apiKey, speech: speechOn, skipLong: !!settings?.skipLongGloss, ...flags }), [apiKey, speechOn, settings?.skipLongGloss, flags])

  useDayPart()

  // Past and future tense tables for the language being learned, fetched in the background.
  useEffect(() => {
    if (language) void loadTenses(language)
  }, [language])

  // ⌘K / Ctrl+K opens the command palette; ⌥S / Alt+S the dictionary, ⌥V / Alt+V the verb lab (not during a
  // session, to avoid leaving it by accident). By the key's place (e.code): on a Mac ⌥S types "ß".
  const inSessionNow = screen.name === 'session'
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (inSessionNow) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((p) => !p)
        return
      }
      const to = e.altKey && !e.metaKey && !e.ctrlKey ? GO_KEYS[e.code] : undefined
      if (!to) return
      e.preventDefault()
      setPalette(false)
      setScreen(to)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inSessionNow])

  const { data, game, reload } = useLanguageData(language)

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
  }, [reload, setSettings])

  // Each screen starts at the top, like a page navigation.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen.name])

  const answeredTodayAll = data ? answeredToday(data.recentEvents, new Date()) : 0
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
  // The word missed most this week: the push reminder asks the learner to recall it.
  const recallWord = useMemo(() => {
    if (!data) return ''
    const id = weekMisses(data.recentEvents, data.language, new Date(), 1)[0]
    const entry = id ? data.vocabulary.find((v) => v.id === id) : undefined
    return entry ? (entry.article ? `${entry.article} ${entry.lemma}` : entry.lemma) : ''
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
      word: recallWord,
    }),
    [answeredTodayAll, game?.streak, settings?.studyPlan, settings?.dayWeights, settings?.vacation, dueReviews, weekText, reminder?.time, recallWord],
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

  const navRef = useRef<HTMLElement>(null)
  const [navMark, setNavMark] = useState<NavMark | null>(null)
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
  const { startSession, startDay, startFocus, startMinutes, startShortRound, startQuest, practiceDifficult, startPractice, startMistakes, startMixed, mixedDue, dueByLanguage } = useSessionStarters({
    settings,
    data,
    game,
    plan,
    planInput,
    options,
    dayForms,
    setScreen,
  })
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
    ...(startPractice ? [{ id: 'practice', label: 'Serbest pratik', icon: <SparkleIcon size={18} />, group: 'İşlemler', run: startPractice }] : []),
    ...(startMistakes ? [{ id: 'mistakes-practice', label: 'Hatalarını düzelt', icon: <AlertIcon size={18} />, group: 'İşlemler', run: startMistakes }] : []),
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
      <LevelWatcher game={game} paused={screen.name === 'session' || screen.name === 'summary'} />
      </GameContext.Provider>
    </AiContext.Provider>
    </AccessContext.Provider>
  )
}
