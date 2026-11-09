import { lazy } from 'react'

export const screenModules = {
  // The daily loop's session too: Today comes first, and the idle prefetch has it long before a tap.
  Session: () => import('./ui/session/Session'),
  Games: () => import('./ui/practice/Games'),
  Mistakes: () => import('./ui/words/Mistakes'),
  Profile: () => import('./ui/profile/Profile'),
  Progress: () => import('./ui/progress/Progress'),
  Reading: () => import('./ui/reading/Reading'),
  Produce: () => import('./ui/practice/Produce'),
  VocabTest: () => import('./ui/progress/VocabTest'),
  Exam: () => import('./ui/progress/Exam'),
  Settings: () => import('./ui/settings/SettingsScreen'),
  Story: () => import('./ui/reading/Story'),
  WordDetail: () => import('./ui/words/WordDetail'),
  Words: () => import('./ui/words/Words'),
  VerbLab: () => import('./ui/verbs/VerbLab'),
  Dictionary: () => import('./ui/dictionary/Dictionary'),
  Translate: () => import('./ui/dictionary/TranslateScreen'),
  Guide: () => import('./ui/guide/Guide'),
  Community: () => import('./ui/social/Community'),
  Admin: () => import('./ui/admin/AdminScreen'),
  // Rarely opened, so not in the startup code either.
  Auth: () => import('./ui/account/AuthScreen'),
  Palette: () => import('./ui/CommandPalette'),
  // Shown only after a session, prefetched long before one ends.
  Summary: () => import('./ui/session/SessionSummary'),
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
export const CommunityScreen = lazy(() => screenModules.Community().then((m) => ({ default: m.CommunityScreen })))
export const AdminScreen = lazy(() => screenModules.Admin().then((m) => ({ default: m.AdminScreen })))
export const AuthScreen = lazy(() => screenModules.Auth().then((m) => ({ default: m.AuthScreen })))
export const CommandPalette = lazy(() => screenModules.Palette().then((m) => ({ default: m.CommandPalette })))

/** What a signed-out visitor sees first: only for them, so not in the screen list that is prefetched. */
export const Landing = lazy(() => import('./ui/home/Landing').then((m) => ({ default: m.Landing })))

/** A list somebody shared, opened from a link: rarely, so not in the startup code and not prefetched. */
export const IncomingSet = lazy(() => import('./ui/social/IncomingSet'))

/** Monki, the assistant: a floating button, loaded once the app is ready. */
export const Monki = lazy(() => import('./ui/monki/Monki'))

export function prefetchScreens() {
  for (const load of Object.values(screenModules)) void load().catch(() => {})
}
