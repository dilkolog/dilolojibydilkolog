import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildDailyPlan, type DailyPlan } from './engine/dailyPlan'
import { skillProfile } from './engine/mastery'
import { nextReviewAt } from './engine/review'
import { createScheduler } from './engine/scheduler'
import type { SessionSummary } from './engine/session'
import { TARGET_LANGUAGES, type Mistake, type TargetLanguage, type UserWordState, type VocabularyEntry } from './engine/types'
import { KelimeDB, type Settings } from './data/db'
import { LANGUAGE_NAME, LANGUAGE_SHORT } from './ui/labels'
import { Home, Onboarding, SettingsScreen, Summary } from './ui/Screens'
import { SessionScreen } from './ui/Session'
import { WordsScreen } from './ui/Words'

const db = new KelimeDB()
const scheduler = createScheduler()

type Screen =
  | { name: 'home' }
  | { name: 'session'; plan: DailyPlan; seed: number }
  | { name: 'summary'; summary: SessionSummary }
  | { name: 'words' }
  | { name: 'settings' }

interface LanguageData {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes: Mistake[]
}

/** One plan per calendar day: reopening the app the same day gives the same order. */
const daySeed = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()

export default function App() {
  // undefined = loading, null = first run
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined)
  const [data, setData] = useState<LanguageData | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const language = settings?.activeLanguage

  useEffect(() => {
    db.getSettings().then((s) => setSettings(s ?? null))
  }, [])

  const reload = useCallback(async () => {
    if (!language) return
    const loaded = await db.loadLanguage(language)
    setData({ language, ...loaded })
  }, [language])

  useEffect(() => {
    reload()
  }, [reload])

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
    })
  }, [settings, data])

  const byId = useMemo(() => new Map((data?.vocabulary ?? []).map((v) => [v.id, v])), [data])

  const finishSession = useCallback(
    (summary: SessionSummary) => {
      reload()
      setScreen({ name: 'summary', summary })
    },
    [reload],
  )

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
    <div className="app" data-lang={settings.activeLanguage}>
      {!inSession && (
        <header className="topbar">
          <button className="brand" onClick={go({ name: 'home' })}>
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
            <button className="link" aria-current={screen.name === 'words' ? 'page' : undefined} onClick={go({ name: 'words' })}>
              Kelimeler
            </button>
            <button className="link" aria-current={screen.name === 'settings' ? 'page' : undefined} onClick={go({ name: 'settings' })}>
              Ayarlar
            </button>
          </nav>
        </header>
      )}

      <main>
        {!data || !plan ? null : screen.name === 'session' ? (
          <SessionScreen
            plan={screen.plan}
            vocabulary={data.vocabulary}
            states={data.states}
            mistakes={data.mistakes}
            db={db}
            scheduler={scheduler}
            seed={screen.seed}
            onFinish={finishSession}
            onQuit={() => {
              reload()
              setScreen({ name: 'home' })
            }}
          />
        ) : screen.name === 'summary' ? (
          <Summary summary={screen.summary} byId={byId} onDone={go({ name: 'home' })} />
        ) : screen.name === 'words' ? (
          <WordsScreen db={db} language={data.language} vocabulary={data.vocabulary} states={data.states} onChanged={reload} />
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
            nextReview={earliest(data.states)}
            onStart={() => setScreen({ name: 'session', plan, seed: daySeed(new Date()) })}
            onAddWords={go({ name: 'words' })}
          />
        )}
      </main>
    </div>
  )
}

function earliest(states: UserWordState[]): Date | undefined {
  const dates = states.map(nextReviewAt).filter((d): d is Date => !!d)
  return dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : undefined
}
