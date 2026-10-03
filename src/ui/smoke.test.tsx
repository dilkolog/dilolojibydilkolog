// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../data/db'
import { db, scheduler } from '../data/instance'
import { createEntry } from '../data/wordInput'
import { newWordState, processAttempt } from '../engine/review'
import type { UserWordState, VocabularyEntry } from '../engine/types'
import { GamesScreen } from './Games'
import { ProduceScreen } from './Produce'
import { ProfileScreen } from './Profile'
import { ProgressScreen } from './Progress'
import { ReadingScreen } from './Reading'
import { SettingsScreen } from './SettingsScreen'
import { WordDetail } from './WordDetail'
import { WordsScreen } from './Words'
import { Home } from './Screens'
import { buildDailyPlan } from '../engine/dailyPlan'
import { skillProfile } from '../engine/mastery'

/**
 * Smoke test: the main screens render with real data without throwing. Catches runtime errors
 * (undefined access, bad hooks) that type checks miss, since the UI isn't clicked through here.
 */
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.stubGlobal('fetch', async () => new Response('{}', { status: 404 }))
// React's own warnings (missing keys, hook order, bad nesting) fail the test too.
const problems: string[] = []
const original = console.error
console.error = (...args: unknown[]) => {
  problems.push(args.map(String).join(' ').slice(0, 300))
  original(...args)
}

const now = new Date()
let vocabulary: VocabularyEntry[] = []
let states: UserWordState[] = []

beforeAll(async () => {
  vocabulary = [
    createEntry({ word: 'la maison', meaning: 'ev', example: 'La *maison* est grande.', exampleTranslation: 'Ev büyük.' }, 'fr', now),
    createEntry({ word: 'décider', meaning: 'karar vermek', partOfSpeech: 'verb' }, 'fr', now),
    createEntry({ word: 'le chat', meaning: 'kedi' }, 'fr', now),
    createEntry({ word: 'rapide', meaning: 'hızlı' }, 'fr', now),
    createEntry({ word: 'la décision', meaning: 'karar' }, 'fr', now),
  ]
  await db.vocabulary.bulkPut(vocabulary)
  states = vocabulary.slice(0, 3).map((e) => {
    let s = newWordState(e, new Date(now.getTime() - 5 * 86_400_000))
    for (const v of ['correct', 'wrong', 'correct'] as const) {
      const r = processAttempt(s, { exerciseType: 'mc_meaning', verdict: v, responseMs: 3000, hintsUsed: 0, maxHints: 0, at: new Date(now.getTime() - 4 * 86_400_000) }, [], scheduler)
      s = r.state
      void db.events.add(r.event)
    }
    return s
  })
  await db.wordStates.bulkPut(states)
  await db.saveSettings({ ...DEFAULT_SETTINGS, activeLanguage: 'fr' })
})

/** Renders, then clicks every button matching `selector` one by one (re-rendering in between). */
async function clickThrough(node: () => React.ReactNode, selector: string, back?: string): Promise<string[]> {
  const el = document.createElement('div')
  document.body.append(el)
  const root = createRoot(el)
  const seen: string[] = []
  await act(async () => root.render(node()))
  const count = el.querySelectorAll(selector).length
  for (let i = 0; i < count; i++) {
    const target = el.querySelectorAll<HTMLElement>(selector)[i]
    if (!target || (target as HTMLButtonElement).disabled) continue
    await act(async () => {
      target.click()
      await new Promise((r) => setTimeout(r, 30))
    })
    seen.push((el.textContent ?? '').slice(0, 60))
    // Back to the list for the next one.
    const backBtn = back ? [...el.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent?.includes(back)) : undefined
    if (backBtn) await act(async () => backBtn.click())
    else {
      await act(async () => root.render(null))
      await act(async () => root.render(node()))
    }
  }
  await act(async () => root.unmount())
  el.remove()
  return seen
}

async function render(node: React.ReactNode): Promise<string> {
  const el = document.createElement('div')
  document.body.append(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(node)
  })
  // Let effects with async loads settle.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50))
  })
  const text = el.textContent ?? ''
  await act(async () => root.unmount())
  el.remove()
  return text
}

const noop = () => {}

describe('screens render', () => {
  it('settings', async () => {
    expect(await render(<SettingsScreen settings={{ ...DEFAULT_SETTINGS, activeLanguage: 'fr' }} onChange={noop} onDataChanged={noop} pushState={{ studiedToday: false, streak: 0, plan: '', restWeekdays: [], vacation: null, due: 0 }} />)).toContain('Hesap')
  })
  it('profile', async () => {
    expect(await render(<ProfileScreen settings={DEFAULT_SETTINGS} onChange={noop} />)).toBeTruthy()
  })
  it('games', async () => {
    expect(await render(<GamesScreen language="fr" vocabulary={vocabulary} states={states} onChanged={noop} />)).toContain('Dilbilgisi')
  })
  it('progress', async () => {
    expect(await render(<ProgressScreen db={db} language="fr" vocabularyCount={vocabulary.length} states={states} scheduler={scheduler} vocabulary={vocabulary} onOpen={noop} onVocabTest={noop} onExam={noop} />)).toContain('İlerleme')
  })
  it('reading', async () => {
    expect(await render(<ReadingScreen db={db} language="fr" vocabulary={vocabulary} states={states} onChanged={noop} onOpen={noop} />)).toContain('Okuma')
  })
  it('produce', async () => {
    expect(await render(<ProduceScreen db={db} language="fr" vocabulary={vocabulary} states={states} onChanged={noop} onOpenSettings={noop} />)).toContain('4/3/2')
  })
  it('word detail', async () => {
    expect(await render(<WordDetail db={db} entry={vocabulary[0]} vocabulary={vocabulary} state={states[0]} mistakes={[]} scheduler={scheduler} onChanged={noop} onBack={noop} />)).toContain('maison')
  })

  it('every game opens', async () => {
    const seen = await clickThrough(() => <GamesScreen language="fr" vocabulary={vocabulary} states={states} onChanged={noop} />, 'button.game-card')
    expect(seen.length).toBeGreaterThanOrEqual(8)
  })
  it('every produce tab opens', async () => {
    const seen = await clickThrough(() => <ProduceScreen db={db} language="fr" vocabulary={vocabulary} states={states} onChanged={noop} onOpenSettings={noop} />, 'button.segmented-btn')
    expect(seen.length).toBe(5)
  })
  it('words', async () => {
    expect(await render(<WordsScreen db={db} language="fr" vocabulary={vocabulary} states={states} mistakes={[]} onChanged={noop} onOpen={noop} onStudy={noop} />)).toContain('kelime')
  })
  it('home', async () => {
    const plan = buildDailyPlan({ now, settings: { language: 'fr', dailyMinutes: 10, newWordsPerDay: 3 }, catalog: vocabulary, states, mistakes: [], scheduler, seed: 1 })
    const text = await render(
      <Home
        language="fr"
        plan={plan}
        profile={skillProfile(states, scheduler, now)}
        vocabularyCount={vocabulary.length}
        learningCount={states.length}
        activeVocabulary={1}
        name="Ali"
        dailyXpGoal={50}
        answeredToday={0}
        openMistakeWords={0}
        canPractice
        onStart={noop}
        onAddWords={noop}
        onProfile={noop}
        onGames={noop}
        onMixed={noop}
        mixedDue={4}
        onExtraNew={noop}
        onPracticeMistakes={noop}
        onFreePractice={noop}
      />,
    )
    expect(text).toContain('Karışık tekrar')
  })
  it('without React warnings', () => {
    expect(problems.filter((p) => !/act\(|not wrapped in act/.test(p))).toEqual([])
  })
})
