import type { Trouble } from './engine/trouble'
import type { ReactElement } from 'react'
import type { PlanItem } from './engine/dailyPlan'
import type { SessionSummary } from './engine/session'
import type { Mistake, ReviewEvent, ReviewMode, TargetLanguage, UserWordState, VocabularyEntry, WordList } from './engine/types'
import type { GameState } from './ui/game'
import type { GameId } from './ui/gameList'
import type { LabTab } from './ui/verbs/VerbLab'
import type { AuthMode } from './ui/AuthScreen'
import type { SharedRead } from './ui/incoming'
import { AlertIcon, BookIcon, ChartIcon, GameIcon, GearIcon, GlobeIcon, HomeIcon, PenIcon, ReadIcon, SearchIcon, StoryIcon, TenseIcon, UserIcon } from './ui/icons'

/** Set when opened from a reminder ("?go=quick"): start a short review as soon as the plan is ready. */
export const launch = { quick: false }
/** About three minutes. */
export const QUICK_REVIEW = 10
/** A mixed session's length. */
export const MIXED_SIZE = 30
/** How far back the recent answers reach. */
export const RECENT_DAYS = 60

export interface LanguageData {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes: Mistake[]
  /** Last ~2 months of answers in ALL languages. */
  recentEvents: ReviewEvent[]
  /** Word lists of this language. */
  lists: WordList[]
  /** Words the ear or voice struggles with (dictation misses, low pronunciation scores). */
  trouble: ReadonlyMap<string, Trouble>
}

/** One plan per calendar day: reopening the app the same day gives the same order. */
export const daySeed = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()

export type Screen =
  | { name: 'home' }
  | { name: 'session'; items: PlanItem[]; seed: number; mode: ReviewMode; topic?: 'difficult'; gameBefore: GameState | null; extra?: VocabularyEntry[]; extraStates?: UserWordState[]; extraMistakes?: Mistake[]; firstSitting?: boolean }
  | { name: 'summary'; summary: SessionSummary; mode: ReviewMode; topic?: 'difficult'; gameBefore: GameState | null; extra?: VocabularyEntry[]; firstSitting?: boolean }
  | { name: 'words'; list?: string }
  | { name: 'dictionary'; query?: string }
  | { name: 'translate' }
  | { name: 'word'; entryId: string }
  | { name: 'mistakes' }
  | { name: 'progress' }
  | { name: 'story' }
  | { name: 'reading'; shared?: SharedRead }
  | { name: 'vocabtest' }
  | { name: 'produce' }
  | { name: 'exam' }
  | { name: 'games'; game?: GameId }
  | { name: 'verbs'; verb?: string; tense?: string; tab?: LabTab }
  | { name: 'profile' }
  | { name: 'settings' }
  | { name: 'account'; mode?: AuthMode }

export const SCREEN_KEY = 'kelime-koc:screen'
/** Screens worth returning to; sessions and summaries are not (answers are saved anyway). */
export const RESTORABLE = new Set<Screen['name']>(['home', 'words', 'dictionary', 'translate', 'word', 'reading', 'produce', 'story', 'games', 'verbs', 'mistakes', 'progress', 'profile', 'settings'])

export function restoreScreen(): Screen {
  // Home-screen shortcuts (manifest) and push links: ?go=home | add | reading | quick | progress
  const shortcut = new URLSearchParams(location.search).get('go')
  if (shortcut) {
    history.replaceState(null, '', location.pathname)
    if (shortcut === 'reading') return { name: 'reading' }
    // The Sunday push about the week opens Progress.
    if (shortcut === 'progress') return { name: 'progress' }
    if (shortcut === 'quick') launch.quick = true
    if (shortcut === 'add') {
      setTimeout(() => document.getElementById('w-word')?.focus(), 400)
      return { name: 'words' }
    }
    return { name: 'home' }
  }
  try {
    const saved = JSON.parse(localStorage.getItem(SCREEN_KEY) ?? 'null') as { name?: Screen['name']; entryId?: unknown; list?: unknown } | null
    if (saved?.name && RESTORABLE.has(saved.name)) {
      if (saved.name === 'word') return typeof saved.entryId === 'string' ? { name: 'word', entryId: saved.entryId } : { name: 'words' }
      if (saved.name === 'words') return typeof saved.list === 'string' ? { name: 'words', list: saved.list } : { name: 'words' }
      return { name: saved.name } as Screen
    }
  } catch {
    // Unreadable or blocked storage: start at home.
  }
  return { name: 'home' }
}

/** Overview screens that spread out on wide screens; reading, forms and the session keep a measure. */
export const WIDE_SCREENS = new Set(['home', 'progress', 'words', 'games', 'verbs', 'mistakes', 'profile', 'summary', 'word', 'reading', 'settings'])

/**
 * Five places in the menu (all of them fit the phone's tab bar). Related screens share one place
 * and switch with tabs at the top (GROUPS); Profile and Settings open from the profile card
 * (desktop) or the avatar (phones and tablets).
 */
export type NavScreen = 'home' | 'words' | 'reading' | 'practice' | 'progress'
export type ScreenName = Screen['name']

export const NAV: { screen: NavScreen; label: string; icon: (p: { size?: number }) => ReactElement }[] = [
  { screen: 'home', label: 'Bugün', icon: HomeIcon },
  { screen: 'words', label: 'Kelimeler', icon: BookIcon },
  { screen: 'reading', label: 'Okuma', icon: ReadIcon },
  { screen: 'practice', label: 'Pratik', icon: GameIcon },
  { screen: 'progress', label: 'İlerleme', icon: ChartIcon },
]

export const GROUPS: Partial<Record<NavScreen, { screen: ScreenName; label: string }[]>> = {
  words: [
    { screen: 'words', label: 'Kelimeler' },
    { screen: 'dictionary', label: 'Sözlük' },
    { screen: 'translate', label: 'Çeviri' },
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
export function placeOf(name: ScreenName): NavScreen | undefined {
  if (name === 'word') return 'words'
  if (name === 'summary') return 'home'
  if (name === 'home' || name === 'progress') return name
  return (Object.keys(GROUPS) as NavScreen[]).find((k) => GROUPS[k]!.some((g) => g.screen === name))
}

/** Every screen by name, for the command palette. */
export const ALL_SCREENS: { screen: ScreenName; label: string; icon: (p: { size?: number }) => ReactElement }[] = [
  { screen: 'home', label: 'Bugün', icon: HomeIcon },
  { screen: 'words', label: 'Kelimeler', icon: BookIcon },
  { screen: 'dictionary', label: 'Sözlük', icon: SearchIcon },
  { screen: 'translate', label: 'Çeviri', icon: GlobeIcon },
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
