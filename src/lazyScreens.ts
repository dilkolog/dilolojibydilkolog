import { lazy } from 'react'

export const screenModules = {
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
  Translate: () => import('./ui/TranslateScreen'),
  Guide: () => import('./ui/Guide'),
  // Rarely opened, so not in the startup code either.
  Auth: () => import('./ui/AuthScreen'),
  Palette: () => import('./ui/CommandPalette'),
  // Shown only after a session, prefetched long before one ends.
  Summary: () => import('./ui/SessionSummary'),
}
export const SessionScreen = lazy(() => screenModules.Session().then((m) => ({ default: m.SessionScreen })))
export const GamesScreen = lazy(() => screenModules.Games().then((m) => ({ default: m.GamesScreen })))
export const MistakesScreen = lazy(() => screenModules.Mistakes().then((m) => ({ default: m.MistakesScreen })))
export const TranslateScreen = lazy(() => screenModules.Translate().then((m) => ({ default: m.TranslateScreen })))
export const ProfileScreen = lazy(() => screenModules.Profile().then((m) => ({ default: m.ProfileScreen })))
export const ProgressScreen = lazy(() => screenModules.Progress().then((m) => ({ default: m.ProgressScreen })))
export const ReadingScreen = lazy(() => screenModules.Reading().then((m) => ({ default: m.ReadingScreen })))
export const ProduceScreen = lazy(() => screenModules.Produce().then((m) => ({ default: m.ProduceScreen })))
export const VocabTestScreen = lazy(() => screenModules.VocabTest().then((m) => ({ default: m.VocabTestScreen })))
export const ExamScreen = lazy(() => screenModules.Exam().then((m) => ({ default: m.ExamScreen })))
export const SettingsScreen = lazy(() => screenModules.Settings().then((m) => ({ default: m.SettingsScreen })))
export const StoryScreen = lazy(() => screenModules.Story().then((m) => ({ default: m.StoryScreen })))
export const WordDetail = lazy(() => screenModules.WordDetail().then((m) => ({ default: m.WordDetail })))
export const WordsScreen = lazy(() => screenModules.Words().then((m) => ({ default: m.WordsScreen })))
export const VerbLab = lazy(() => screenModules.VerbLab().then((m) => ({ default: m.VerbLab })))
export const Summary = lazy(() => screenModules.Summary().then((m) => ({ default: m.Summary })))
export const DictionaryScreen = lazy(() => screenModules.Dictionary().then((m) => ({ default: m.DictionaryScreen })))
export const GuideScreen = lazy(() => screenModules.Guide().then((m) => ({ default: m.GuideScreen })))
export const AuthScreen = lazy(() => screenModules.Auth().then((m) => ({ default: m.AuthScreen })))
export const CommandPalette = lazy(() => screenModules.Palette().then((m) => ({ default: m.CommandPalette })))

/** What a signed-out visitor sees first: only for them, so not in the screen list that is prefetched. */
export const Landing = lazy(() => import('./ui/Landing').then((m) => ({ default: m.Landing })))

/** A list somebody shared, opened from a link: rarely, so not in the startup code and not prefetched. */
export const IncomingSet = lazy(() => import('./ui/IncomingSet'))

/** Monki, the assistant: a floating button, loaded once the app is ready. */
export const Monki = lazy(() => import('./ui/monki/Monki'))

export function prefetchScreens() {
  for (const load of Object.values(screenModules)) void load().catch(() => {})
}
