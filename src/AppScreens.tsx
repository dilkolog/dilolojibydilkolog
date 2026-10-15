
import { buildExtraNewPlan, type PlanItem, type PlanReason } from './engine/dailyPlan'
import type { Tense as LabTense } from './engine/tenses'
import { skillProfile } from './engine/mastery'
import { openMistakes } from './engine/mistakes'
import { answeredToday, progressStats } from './engine/progress'
import { buildDeckPlan, buildMistakePlan, buildPracticePlan } from './engine/practice'

import { createRng } from './engine/rng'
import { type SessionSummary } from './engine/session'
import { type ReviewMode, type VocabularyEntry } from './engine/types'
import { db, scheduler } from './data/instance'
import { difficultWords, withDifficult } from './engine/difficult'

import type { Settings } from './data/db'

import { FriendsCard } from './ui/FriendsCard'
import { type GameState } from './ui/game'

import { HabitCards } from './ui/Habits'
import { BackupNudge } from './ui/BackupNudge'
import { WhatsNew } from './ui/WhatsNew'
import { MindSeed } from './ui/MindSeed'
import { MonkiNudge } from './ui/monki/MonkiNudge'
import { TodayTime } from './ui/TodayTime'
import { SuggestWords } from './ui/SuggestWords'
import { WeeklyNudge } from './ui/WeeklyNudge'
import type { WeekSummary } from './engine/weekly'
import type { QuestMetric } from './engine/quests'
import { GainsNudge } from './ui/GainsNudge'
import { studyGains } from './engine/gains'

import { PANE_KEY } from './ui/settingsPane'

import { GARDEN_HARD_KEY, GardenCard, WORDS_VIEW_KEY } from './ui/Garden'
import { gardenSummary } from './engine/growth'
import { Home } from './ui/Screens'
import { type LanguageData, type Screen } from './appNav'


import { recordLabAnswer } from './ui/verbs/labShared'

import { type IncomingWord } from './ui/incoming'

import { showToast } from './ui/toastFeed'
import { ScreenSkeleton } from './ui/Skeleton'
import { skeletonFor } from './ui/skeletonFor'

import { currentLevel, levelGroups } from './engine/lists'

import { Summary, SessionScreen, GamesScreen, MistakesScreen, TranslateScreen, ProfileScreen, ProgressScreen, ReadingScreen, ProduceScreen, VocabTestScreen, ExamScreen, SettingsScreen, StoryScreen, WordDetail, WordsScreen, VerbLab, DictionaryScreen, AuthScreen } from './lazyScreens'
import { nextReviewAt } from './engine/review'
import type { UserWordState } from './engine/types'
import type { PushState } from './ui/pushReminders'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { DailyPlan } from './engine/dailyPlan'
import type { buildDailyPlan as BuildPlan } from './engine/dailyPlan'
import { WEEK_MISSES_ROUND, weekMisses } from './engine/weekly'

export interface AppScreensProps {
  screen: Screen
  data: LanguageData | null
  plan: DailyPlan | null
  settings: Settings
  options: { ai: boolean; speech: boolean }
  apiKey: string | null
  byId: Map<string, VocabularyEntry>
  game: GameState | null
  incoming: IncomingWord | null
  setIncoming: Dispatch<SetStateAction<IncomingWord | null>>
  setScreen: Dispatch<SetStateAction<Screen>>
  setSettings: Dispatch<SetStateAction<Settings | null | undefined>>
  go: (s: Screen) => () => void
  reload: () => Promise<void>
  updateSettings: (s: Settings) => Promise<void>
  finishSession: (summary: SessionSummary) => void
  sessionVocabulary: VocabularyEntry[] | undefined
  planInput: Parameters<typeof BuildPlan>[0] | null
  startSession: (items: PlanItem[], mode: ReviewMode, seed?: number, extra?: VocabularyEntry[], topic?: 'difficult', firstSitting?: boolean) => void
  startDay: () => void
  startFocus: (reason: PlanReason) => void
  startMinutes: (minutes: number) => void
  startShortRound: () => void
  startMixed: () => Promise<void>
  mixedDue: { count: number; languages: number }
  practiceDifficult: () => void
  reviewsWaiting: number
  pushState: PushState
  formsDue: number
  dayForms: readonly unknown[]
  warmup: string | null
  verbOfDay: { verb: string; gloss?: string } | null
  garden: ReturnType<typeof gardenSummary> | null
  lookupNudge: ReactNode
  newToday: VocabularyEntry[]
  weekText: string
  weekData: WeekSummary | null
  /** Starts the round that fills one of the day's quests. */
  startQuest: (id: QuestMetric, remaining: number) => void
}

/** The screen the app is on: the chain of screens, each given what it needs from the shell. */
export function AppScreens(props: AppScreensProps) {
  const { screen, data, plan, settings, options, apiKey, byId, game, incoming, setIncoming, setScreen, setSettings, go, reload, updateSettings, finishSession, sessionVocabulary, planInput, startSession, startDay, startFocus, startMinutes, startShortRound, startMixed, mixedDue, practiceDifficult, reviewsWaiting, pushState, formsDue, dayForms, warmup, verbOfDay, garden, lookupNudge, newToday, weekText, weekData, startQuest } = props
  // This week's slips, met once more: words missed in the last seven days, most missed first.
  const weekMissed = data ? weekMisses(data.recentEvents, data.language, new Date()) : []
  return (
    <>
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
          openList={screen.list}
          onOpenList={(list) => setScreen(list ? { name: 'words', list } : { name: 'words' })}
          onPlay={(game) => setScreen({ name: 'games', game })}
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
          // Words are added in one tap there; the form (the incoming-word effect opens Words) only when a card can't be made.
          onAdd={(word, meaning) => setIncoming({ word, context: '', meaning })}
          onAdded={reload}
          onOpenLab={data.language !== 'en' ? (verb) => setScreen({ name: 'verbs', verb }) : undefined}
          onSwitchLanguage={(targetLang, query) => {
            if (settings) void updateSettings({ ...settings, activeLanguage: targetLang })
            setScreen({ name: 'dictionary', query })
          }}
        />
      ) : screen.name === 'translate' ? (
        <TranslateScreen key={data.language} language={data.language} onAdd={(word, meaning) => setIncoming({ word, context: '', meaning })} />
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
          onEarPractice={go({ name: 'games', game: 'ear' })}
          onRepair={(target) => (target === 'verbs' ? setScreen({ name: 'verbs' }) : setScreen({ name: 'games', game: target }))}
          weeklyGoal={settings.weeklyTimeGoal}
          onWeeklyGoal={(minutes) => void updateSettings({ ...settings, weeklyTimeGoal: minutes })}
          learnerName={settings.profile.name}
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
        <ExamScreen
          key={data.language}
          db={db}
          language={data.language}
          vocabulary={data.vocabulary}
          states={data.states}
          onDone={go(screen.repair ? { name: 'home' } : { name: 'progress' })}
          repair={screen.repair ? game?.repair : undefined}
          onRepair={(days) => void updateSettings({ ...settings, repairedDays: [...new Set([...(settings.repairedDays ?? []), ...days])] })}
        />
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
          shared={screen.shared}
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
        <GamesScreen key={data.language} initialGame={screen.game} onGameChange={(g) => setScreen({ name: 'games', game: g ?? undefined })} onOpenVerbs={data.language !== 'en' ? go({ name: 'verbs' }) : undefined} dayDue={plan ? { reviews: reviewsWaiting, minutes: plan.estimatedMinutes } : undefined} onStartDay={startDay} language={data.language} vocabulary={data.vocabulary} states={data.states} mistakes={data.mistakes} onChanged={reload} />
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
          onRepairStreak={() => setScreen({ name: 'exam', repair: true })}
          onFocusReason={startFocus}
          onMinutes={startMinutes}
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
          lists={data.lists.map((l) => ({ id: l.id, name: l.name, count: data.vocabulary.filter((v) => v.listId === l.id).length })).filter((l) => l.count > 0)}
          focusListId={planInput?.settings.focusListId}
          onFocusList={(listId) => void updateSettings({ ...settings, focusList: { ...settings.focusList, [data.language]: listId ?? undefined } })}
          onOpenList={(list) => setScreen({ name: 'words', list })}
          onOpenLists={() => {
            // The list in focus opens on its own page; without one, the shelf of lists.
            const list = planInput?.settings.focusListId
            try {
              localStorage.setItem(WORDS_VIEW_KEY, 'lists')
            } catch {
              // The words screen just opens on its last view.
            }
            setScreen(list ? { name: 'words', list } : { name: 'words' })
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
          onShortRound={startShortRound}
          onQuest={startQuest}
          onSentenceGame={(game) => setScreen({ name: 'games', game })}
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
          weekMisses={weekMissed.length}
          onWeekMisses={() => {
            const deck = weekMissed.flatMap((id) => byId.get(id) ?? [])
            startSession(buildDeckPlan({ catalog: deck, states: data.states, rng: createRng(Date.now()), scheduler, now: new Date(), limit: WEEK_MISSES_ROUND, options }), 'normal', undefined, deck)
          }}
          onFreePractice={() => startSession(buildPracticePlan({ catalog: data.vocabulary, states: data.states, rng: createRng(Date.now()), options }), 'practice')}
          newWordsPerDay={settings.newWordsPerDay}
          onLowerNew={() => {
            void updateSettings({ ...settings, newWordsPerDay: 8 })
            showToast('Günlük yeni kelime 8 oldu; Ayarlar’dan istediğin zaman değiştirebilirsin.')
          }}
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
          timeCard={<TodayTime db={db} language={data.language} goal={settings.weeklyTimeGoal} onOpen={go({ name: 'progress' })} />}
          friendsCard={<FriendsCard game={game} profile={settings.profile} />}
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
            <WeeklyNudge language={data.language} line={weekText} summary={weekData} lemmaOf={(id) => byId.get(id)?.lemma} now={new Date()} onOpen={go({ name: 'progress' })} onWord={(entryId) => setScreen({ name: 'word', entryId })} />
            <SuggestWords db={db} language={data.language} vocabulary={data.vocabulary} settings={settings} onAdded={reload} onlyWhenDue />
            <WhatsNew words={data.vocabulary.filter((v) => v.source !== 'sample').length} onReading={go({ name: 'reading' })} onPractice={go({ name: 'games', game: 'pron' })} onGrammar={go({ name: 'games', game: 'grammar' })} />
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
            <MonkiNudge openMistakes={openMistakes(data.mistakes).length} />
            {/* Last: only when no other nudge has something to say (one at a time). */}
            <MindSeed language={data.language} />
            </>
          }
        />
      )}
    </>
  )
}

function earliest(states: UserWordState[]): Date | undefined {
  const dates = states.map(nextReviewAt).filter((d): d is Date => !!d)
  return dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : undefined
}
