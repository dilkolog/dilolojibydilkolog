import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react'
import { buildDailyPlan, type PlanItem } from './engine/dailyPlan'
import { skillProfile } from './engine/mastery'
import { openMistakes } from './engine/mistakes'
import { answeredToday, progressStats, studyStreak } from './engine/progress'
import { buildMistakePlan, buildPracticePlan } from './engine/practice'
import { nextReviewAt } from './engine/review'
import { createRng } from './engine/rng'
import { createScheduler } from './engine/scheduler'
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
import { KelimeDB, type Settings } from './data/db'
import { AlertIcon, BookIcon, ChartIcon, FlameIcon, GearIcon, HomeIcon } from './ui/icons'
import { LANGUAGE_NAME, LANGUAGE_SHORT } from './ui/labels'
import { AiContext } from './ui/aiContext'
import { MistakesScreen } from './ui/Mistakes'
import { ProgressScreen } from './ui/Progress'
import { Home, Onboarding, SettingsScreen, Summary } from './ui/Screens'
import { SessionScreen } from './ui/Session'
import { WordDetail } from './ui/WordDetail'
import { WordsScreen } from './ui/Words'

const db = new KelimeDB()
const scheduler = createScheduler()

type Screen =
  | { name: 'home' }
  | { name: 'session'; items: PlanItem[]; seed: number; mode: ReviewMode }
  | { name: 'summary'; summary: SessionSummary; mode: ReviewMode }
  | { name: 'words' }
  | { name: 'word'; entryId: string }
  | { name: 'mistakes' }
  | { name: 'progress' }
  | { name: 'settings' }

const NAV: { screen: 'home' | 'words' | 'mistakes' | 'progress' | 'settings'; label: string; icon: (p: { size?: number }) => ReactElement }[] = [
  { screen: 'home', label: 'Bugün', icon: HomeIcon },
  { screen: 'words', label: 'Kelimeler', icon: BookIcon },
  { screen: 'mistakes', label: 'Hatalar', icon: AlertIcon },
  { screen: 'progress', label: 'İlerleme', icon: ChartIcon },
  { screen: 'settings', label: 'Ayarlar', icon: GearIcon },
]

interface LanguageData {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes: Mistake[]
  /** Last ~2 months of answers in ALL languages: the streak counts any study day. */
  recentEvents: ReviewEvent[]
}

const STREAK_WINDOW_DAYS = 60

/** One plan per calendar day: reopening the app the same day gives the same order. */
const daySeed = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()

export default function App() {
  // undefined = loading, null = first run
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined)
  const [data, setData] = useState<LanguageData | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [apiKey, setApiKeyState] = useState<string | null>(null)
  const language = settings?.activeLanguage
  const options = useMemo(() => ({ ai: !!apiKey }), [apiKey])

  useEffect(() => {
    db.getSettings().then((s) => setSettings(s ?? null))
    db.getAiKey().then(setApiKeyState)
  }, [])

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
    const since = new Date(Date.now() - STREAK_WINDOW_DAYS * 86_400_000)
    const [loaded, recentEvents] = await Promise.all([db.loadLanguage(language), db.eventsSince(since)])
    setData({ language, ...loaded, recentEvents })
  }, [language])

  useEffect(() => {
    reload()
  }, [reload])

  // Each screen starts at the top, like a page navigation.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen.name])

  const updateSettings = async (s: Settings) => {
    await db.saveSettings(s)
    setSettings(s)
  }

  const plan = useMemo(() => {
    if (!settings || !data || data.language !== settings.activeLanguage) return null
    const now = new Date()
    return buildDailyPlan({
      now,
      settings: {
        language: data.language,
        level: settings.levels[data.language] ?? 'B1',
        dailyMinutes: settings.dailyMinutes,
        newWordsPerDay: settings.newWordsPerDay,
      },
      catalog: data.vocabulary,
      states: data.states,
      mistakes: data.mistakes,
      scheduler,
      seed: daySeed(now),
      options,
    })
  }, [settings, data, options])

  const byId = useMemo(() => new Map((data?.vocabulary ?? []).map((v) => [v.id, v])), [data])
  const streak = data ? studyStreak(data.recentEvents, new Date()) : 0

  const finishSession = useCallback(
    (summary: SessionSummary) => {
      reload()
      setScreen((s) => ({ name: 'summary', summary, mode: s.name === 'session' ? s.mode : 'normal' }))
    },
    [reload],
  )

  const startSession = (items: PlanItem[], mode: ReviewMode) => {
    if (items.length) setScreen({ name: 'session', items, mode, seed: Date.now() % 2 ** 31 })
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

  return (
    <AiContext.Provider value={ai}>
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
                aria-current={
                  screen.name === n.screen || (n.screen === 'words' && screen.name === 'word') || (n.screen === 'home' && screen.name === 'summary')
                    ? 'page'
                    : undefined
                }
                onClick={go({ name: n.screen })}
              >
                <n.icon size={20} />
                <span>{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <FlameIcon size={18} className="icon-flame" />
            {streak > 0 ? `${streak} günlük seri` : 'Bugün seriyi başlat'}
          </div>
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
          <Summary summary={screen.summary} byId={byId} practice={screen.mode === 'practice'} streak={streak} onDone={go({ name: 'home' })} />
        ) : screen.name === 'words' ? (
          <WordsScreen
            db={db}
            language={data.language}
            vocabulary={data.vocabulary}
            states={data.states}
            level={settings.levels[data.language] ?? 'B1'}
            onChanged={reload}
            onOpen={(entryId) => setScreen({ name: 'word', entryId })}
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
          />
        ) : screen.name === 'settings' ? (
          <SettingsScreen
            db={db}
            settings={settings}
            onChange={updateSettings}
            onRestored={async () => {
              const s = await db.getSettings()
              if (s) setSettings(s)
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
            streak={streak}
            answeredToday={answeredToday(data.recentEvents.filter((e) => e.language === data.language), new Date())}
            nextReview={earliest(data.states)}
            openMistakeWords={new Set(openMistakes(data.mistakes).map((m) => m.entryId)).size}
            canPractice={data.states.some((s) => Object.keys(s.skills).length > 0)}
            onStart={() => setScreen({ name: 'session', items: plan.items, mode: 'normal', seed: daySeed(new Date()) })}
            onAddWords={go({ name: 'words' })}
            onPracticeMistakes={() =>
              startSession(buildMistakePlan({ catalog: data.vocabulary, states: data.states, mistakes: data.mistakes, rng: createRng(Date.now()), options }), 'normal')
            }
            onFreePractice={() => startSession(buildPracticePlan({ catalog: data.vocabulary, states: data.states, rng: createRng(Date.now()), options }), 'practice')}
          />
        )}
      </main>
    </div>
    </AiContext.Provider>
  )
}

function earliest(states: UserWordState[]): Date | undefined {
  const dates = states.map(nextReviewAt).filter((d): d is Date => !!d)
  return dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : undefined
}
