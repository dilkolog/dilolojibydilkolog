import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react'
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
import { db, scheduler } from './data/instance'
import type { Settings } from './data/db'
import { AiContext } from './ui/aiContext'
import { Avatar } from './ui/Avatar'
import { GameContext, loadGame, type GameState } from './ui/game'
import { AlertIcon, BookIcon, ChartIcon, FlameIcon, GearIcon, HomeIcon, StoryIcon, UserIcon } from './ui/icons'
import { LANGUAGE_NAME, LANGUAGE_SHORT } from './ui/labels'
import { MistakesScreen } from './ui/Mistakes'
import { applySettings } from './ui/prefs'
import { ProfileScreen } from './ui/Profile'
import { ProgressScreen } from './ui/Progress'
import { useReminder } from './ui/reminders'
import { Home, Onboarding, Summary } from './ui/Screens'
import { SessionScreen } from './ui/Session'
import { SettingsScreen } from './ui/SettingsScreen'
import { StoryScreen } from './ui/Story'
import { WordDetail } from './ui/WordDetail'
import { WordsScreen } from './ui/Words'

type Screen =
  | { name: 'home' }
  | { name: 'session'; items: PlanItem[]; seed: number; mode: ReviewMode; gameBefore: GameState | null }
  | { name: 'summary'; summary: SessionSummary; mode: ReviewMode; gameBefore: GameState | null }
  | { name: 'words' }
  | { name: 'word'; entryId: string }
  | { name: 'mistakes' }
  | { name: 'progress' }
  | { name: 'story' }
  | { name: 'profile' }
  | { name: 'settings' }

type NavScreen = 'home' | 'words' | 'story' | 'mistakes' | 'progress' | 'profile' | 'settings'

const NAV: { screen: NavScreen; label: string; icon: (p: { size?: number }) => ReactElement }[] = [
  { screen: 'home', label: 'Bugün', icon: HomeIcon },
  { screen: 'words', label: 'Kelimeler', icon: BookIcon },
  { screen: 'story', label: 'Hikaye', icon: StoryIcon },
  { screen: 'mistakes', label: 'Hatalar', icon: AlertIcon },
  { screen: 'progress', label: 'İlerleme', icon: ChartIcon },
  { screen: 'profile', label: 'Profil', icon: UserIcon },
  { screen: 'settings', label: 'Ayarlar', icon: GearIcon },
]

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
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [apiKey, setApiKeyState] = useState<string | null>(null)
  const language = settings?.activeLanguage
  const options = useMemo(() => ({ ai: !!apiKey }), [apiKey])

  useEffect(() => {
    db.getSettings().then((s) => setSettings(s ?? null))
    db.getAiKey().then(setApiKeyState)
  }, [])

  useEffect(() => {
    if (settings) applySettings(settings)
  }, [settings])

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
    setGame(g)
  }, [language])

  useEffect(() => {
    reload()
  }, [reload])

  // Each screen starts at the top, like a page navigation.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen.name])

  const answeredTodayAll = data ? answeredToday(data.recentEvents, new Date()) : 0
  useReminder(settings?.reminder, answeredTodayAll, game?.streak ?? 0)

  const updateSettings = async (s: Settings) => {
    await db.saveSettings(s)
    setSettings(s)
  }

  const planInput = useMemo(() => {
    if (!settings || !data || data.language !== settings.activeLanguage) return null
    const now = new Date()
    return {
      now,
      settings: {
        language: data.language,
        dailyMinutes: settings.dailyMinutes,
        newWordsPerDay: settings.newWordsPerDay,
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

  const byId = useMemo(() => new Map((data?.vocabulary ?? []).map((v) => [v.id, v])), [data])

  const finishSession = useCallback(
    (summary: SessionSummary) => {
      reload()
      setScreen((s) => ({
        name: 'summary',
        summary,
        mode: s.name === 'session' ? s.mode : 'normal',
        gameBefore: s.name === 'session' ? s.gameBefore : null,
      }))
    },
    [reload],
  )

  const startSession = (items: PlanItem[], mode: ReviewMode, seed = Date.now() % 2 ** 31) => {
    // A session cap takes a prefix: introductions always come before their first test.
    const capped = settings?.sessionMax ? items.slice(0, settings.sessionMax) : items
    if (capped.length) setScreen({ name: 'session', items: capped, mode, seed, gameBefore: game })
  }

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
  const inSession = screen.name === 'session'
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
              <nav className="nav">
                {NAV.map((n) => (
                  <button
                    key={n.screen}
                    className={`nav-btn${n.screen === 'home' ? ' nav-home' : ''}`}
                    aria-current={current(n.screen) ? 'page' : undefined}
                    onClick={go({ name: n.screen })}
                  >
                    <n.icon size={20} />
                    <span>{n.label}</span>
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

          <main className="main">
            {!data || !plan ? null : screen.name === 'session' ? (
              <SessionScreen
                items={screen.items}
                mode={screen.mode}
                vocabulary={data.vocabulary}
                states={data.states}
                mistakes={data.mistakes}
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
                byId={byId}
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
                onStudy={(deck) =>
                  startSession(buildDeckPlan({ catalog: deck, states: data.states, rng: createRng(Date.now()), scheduler, now: new Date(), options }), 'normal')
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
              />
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
            ) : screen.name === 'profile' ? (
              <ProfileScreen settings={settings} onChange={updateSettings} />
            ) : screen.name === 'settings' ? (
              <SettingsScreen
                settings={settings}
                onChange={updateSettings}
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
                onExtraNew={() => planInput && startSession(buildExtraNewPlan({ ...planInput, seed: Date.now() % 2 ** 31 }, 5), 'normal')}
                onPracticeMistakes={() =>
                  startSession(buildMistakePlan({ catalog: data.vocabulary, states: data.states, mistakes: data.mistakes, rng: createRng(Date.now()), options }), 'normal')
                }
                onFreePractice={() => startSession(buildPracticePlan({ catalog: data.vocabulary, states: data.states, rng: createRng(Date.now()), options }), 'practice')}
              />
            )}
          </main>
        </div>
      </GameContext.Provider>
    </AiContext.Provider>
  )
}

function earliest(states: UserWordState[]): Date | undefined {
  const dates = states.map(nextReviewAt).filter((d): d is Date => !!d)
  return dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : undefined
}
