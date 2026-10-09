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
import { SessionScreen } from './Session'
import type { SessionSummary } from '../engine/session'
import { ArticleDrill } from './ArticleDrill'
import { VerbLab } from './verbs/VerbLab'
import { createScheduler } from '../engine/scheduler'
import { SentencesGame } from './Sentences'
import { saveSentence } from './saveSentence'
import { GameContext, loadGame } from './game'
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
    expect(await render(<SettingsScreen settings={{ ...DEFAULT_SETTINGS, activeLanguage: 'fr' }} onChange={noop} onDataChanged={noop} pushState={{ studiedToday: false, streak: 0, plan: '', restWeekdays: [], vacation: null, due: 0, week: '', hour: 20 }} />)).toContain('Hesap')
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
    const seen = await clickThrough(() => <ProduceScreen db={db} language="fr" vocabulary={vocabulary} states={states} onChanged={noop} onOpenSettings={noop} />, 'button.page-tab')
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
  it('home: a deep pile of reviews offers a short round of the most urgent questions', async () => {
    const base = buildDailyPlan({ now, settings: { language: 'fr', dailyMinutes: 10, newWordsPerDay: 3 }, catalog: vocabulary, states, mistakes: [], scheduler, seed: 1 })
    const exercise = { kind: 'exercise', entryId: vocabulary[0].id, reason: 'due', skill: 'recognition', exerciseType: 'mc_meaning' } as const
    const piled = { ...base, items: Array.from({ length: 30 }, () => exercise), dueTotal: 83 }
    const props = { language: 'fr', plan: piled, profile: skillProfile(states, scheduler, now), vocabularyCount: vocabulary.length, learningCount: states.length, activeVocabulary: 1, name: '', dailyXpGoal: 50, answeredToday: 0, openMistakeWords: 0, canPractice: true, onStart: noop, onAddWords: noop, onProfile: noop, onExtraNew: noop, onPracticeMistakes: noop, onFreePractice: noop } as const
    const text = await render(<Home {...props} onShortRound={noop} />)
    expect(text).toContain('83 tekrar birikmiş')
    expect(text).toContain('Kısa tur (15 soru)')
    // Not offered for an ordinary day, when the pile fits in a short round anyway, or with no way to start it.
    expect(await render(<Home {...props} plan={{ ...piled, dueTotal: 20 }} onShortRound={noop} />)).not.toContain('birikmiş')
    expect(await render(<Home {...props} plan={{ ...piled, items: piled.items.slice(0, 12) }} onShortRound={noop} />)).not.toContain('birikmiş')
    expect(await render(<Home {...props} />)).not.toContain('birikmiş')
  })
  it('home: once the day is done, the sentences translated are offered to write back', async () => {
    await db.saveTranslations([{ text: 'Le chat dort sur le canapé.', translation: 'Kedi kanepede uyuyor.', from: 'fr', to: 'tr', at: now.toISOString() }])
    const plan = { ...buildDailyPlan({ now, settings: { language: 'fr', dailyMinutes: 10, newWordsPerDay: 3 }, catalog: vocabulary, states, mistakes: [], scheduler, seed: 1 }), items: [] }
    const props = { language: 'fr', plan, profile: skillProfile(states, scheduler, now), vocabularyCount: vocabulary.length, learningCount: states.length, activeVocabulary: 1, name: '', dailyXpGoal: 50, answeredToday: 10, openMistakeWords: 0, canPractice: true, onStart: noop, onAddWords: noop, onProfile: noop, onExtraNew: noop, onPracticeMistakes: noop, onFreePractice: noop } as const
    expect(await render(<Home {...props} onSentenceGame={noop} />)).toContain('Çevirdiğin 1 cümle hazır')
    // Still reviewing: not yet.
    expect(await render(<Home {...props} plan={{ ...plan, items: buildDailyPlan({ now, settings: { language: 'fr', dailyMinutes: 10, newWordsPerDay: 3 }, catalog: vocabulary, states, mistakes: [], scheduler, seed: 1 }).items }} onSentenceGame={noop} />)).not.toContain('Geri çeviri')
    await db.saveTranslations([])
  })
  it('a whole session can be clicked through to its summary', async () => {
    const plan = buildDailyPlan({ now, settings: { language: 'fr', dailyMinutes: 30, newWordsPerDay: 2 }, catalog: vocabulary, states, mistakes: [], scheduler, seed: 3 })
    expect(plan.items.length).toBeGreaterThan(2)
    let finished: SessionSummary | null = null
    const el = document.createElement('div')
    document.body.append(el)
    const root = createRoot(el)
    await act(async () =>
      root.render(
        <SessionScreen
          items={plan.items}
          mode="normal"
          vocabulary={vocabulary}
          states={states}
          mistakes={[]}
          db={db}
          scheduler={scheduler}
          seed={3}
          options={{}}
          onFinish={(sum) => (finished = sum)}
          onQuit={noop}
        />,
      ),
    )
    const click = async (b: HTMLElement) =>
      act(async () => {
        b.click()
        await new Promise((r) => setTimeout(r, 20))
      })
    let waits = 0
    for (let step = 0; step < 120 && !finished; step++) {
      const buttons = [...el.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.disabled)
      const option = el.querySelector<HTMLButtonElement>('button.option:not([disabled])')
      const input = el.querySelector<HTMLInputElement>('input.answer-input:not([disabled]), textarea.answer-input:not([disabled])')
      const go = buttons.find((b) => /^(Devam|Anladım|Kontrol et|Tamam|Başla|Sonraki|Öğrendim)/.test(b.textContent?.trim() ?? ''))
      if (option || input || go) waits = 0
      if (option) await click(option)
      else if (input) {
        await act(async () => {
          const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')!.set!
          setter.call(input, 'xyz')
          input.dispatchEvent(new Event('input', { bubbles: true }))
        })
        const check = [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => /Kontrol|Cevapla|Gönder/.test(b.textContent ?? '') && !b.disabled)
        if (check) await click(check)
        else await act(async () => input.form?.requestSubmit())
      } else if (go) await click(go)
      else if (waits++ < 8) {
        // A pause the screen imposes on purpose (e.g. reading a confident error's correction).
        await act(async () => new Promise((r) => setTimeout(r, 700)))
      } else break
    }
    await act(async () => root.unmount())
    el.remove()
    expect(finished).not.toBeNull()
    expect(finished!.answered).toBeGreaterThan(0)
  }, 90_000)
  it('reading an open text: word popup, ⌘-click multi-select, mark known', async () => {
    const text = 'Le gouvernement a présenté une réforme ambitieuse. La réforme change les retraites et le travail. Les syndicats critiquent la réforme du gouvernement.'
    const item = { id: 'smoke-text', language: 'fr' as const, title: 'Réforme', text, addedAt: new Date().toISOString(), history: [], audio: 'https://example.test/a.mp3' }
    await db.saveText(item)
    await db.setCurrentText('fr', item.id)
    const el = document.createElement('div')
    document.body.append(el)
    const root = createRoot(el)
    await act(async () => root.render(<ReadingScreen db={db} language="fr" vocabulary={vocabulary} states={states} onChanged={noop} onOpen={noop} />))
    await act(async () => new Promise((r) => setTimeout(r, 80)))
    expect(el.textContent).toContain('1. tur: sadece dinle')
    // Leave the listen-first rounds so the text is clickable.
    const leave = [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('Turları bırak'))!
    await act(async () => leave.click())
    const words = [...el.querySelectorAll<HTMLElement>('.rw-unseen')]
    expect(words.length).toBeGreaterThan(2)
    await act(async () => words[0].click())
    expect(el.querySelector('.word-pop')).not.toBeNull()
    await act(async () => {
      words[1].dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey: true }))
      words[2].dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }))
    })
    expect(el.querySelector('.multi-bar')?.textContent).toContain('2 kelime seçili')
    const known = [...el.querySelectorAll<HTMLButtonElement>('.multi-bar button')].find((b) => b.textContent === 'Biliyorum')!
    await act(async () => {
      known.click()
      await new Promise((r) => setTimeout(r, 30))
    })
    expect(el.querySelector('.multi-bar')).toBeNull()
    await act(async () => root.unmount())
    el.remove()
  })
  it('profile with game data: every tab opens', async () => {
    const game = await loadGame(db)
    const seen = await clickThrough(
      () => (
        <GameContext.Provider value={game}>
          <ProfileScreen settings={DEFAULT_SETTINGS} onChange={noop} />
        </GameContext.Provider>
      ),
      'button.page-tab',
    )
    expect(seen).toHaveLength(3)
  })

  it('verb lab: opens on a verb, practises a tense and marks the round', async () => {
    const el = document.createElement('div')
    document.body.append(el)
    const root = createRoot(el)
    await act(async () => root.render(<VerbLab language="es" vocabulary={vocabulary} states={states} scheduler={createScheduler({ fuzz: false })} initialVerb="hablar" />))
    const btn = (re: RegExp) => [...el.querySelectorAll<HTMLButtonElement>('button, [role=tab]')].find((b) => re.test(b.textContent ?? '') && !(b as HTMLButtonElement).disabled)
    for (let i = 0; i < 40 && !el.querySelector('.lab-forms'); i++) await act(async () => new Promise((r) => setTimeout(r, 50)))
    expect(el.querySelector('.lab-verb')!.textContent).toBe('Hablar')
    expect(el.querySelector('.lab-forms')!.textContent).toContain('hablamos')
    await act(async () => btn(/^Alıştırma$/)!.click())
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    const answers = ['hablo', 'hablas', 'habla', 'hablamos', 'habláis', 'hablan']
    for (const [i, a] of answers.entries()) {
      await act(async () => {
        const input = el.querySelector<HTMLInputElement>(`#lab-in-${i}`)!
        set.call(input, a)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }
    await act(async () => btn(/Kontrol et/)!.click())
    expect(el.textContent).toContain('Hepsi doğru!')
    // The round is in the garden: it shows under İlerleme.
    await act(async () => btn(/^İlerleme/)!.click())
    expect(el.querySelector('.lab-garden')?.textContent).toContain('hablar')
    await act(async () => root.unmount())
  })

  it('article drill plays to the end', async () => {
    const el = document.createElement('div')
    document.body.append(el)
    const root = createRoot(el)
    let changed = 0
    await act(async () => root.render(<ArticleDrill language="fr" vocabulary={vocabulary} states={states} onExit={noop} onChanged={() => changed++} />))
    const btn = (re: RegExp) => [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => re.test(b.textContent ?? '') && !b.disabled)
    await act(async () => btn(/isimle başla/)!.click())
    for (let i = 0; i < 20 && !el.textContent?.includes('Bitti'); i++) {
      const option = el.querySelector<HTMLButtonElement>('.article-options button:not([disabled])')
      await act(async () => {
        if (option) option.click()
        else btn(/^Devam$/)?.click()
        await new Promise((r) => setTimeout(r, 500))
      })
      const cont = btn(/^Devam$/)
      if (cont) await act(async () => cont.click())
    }
    expect(el.textContent).toContain('Bitti')
    expect(changed).toBeGreaterThan(0)
    await act(async () => root.unmount())
    el.remove()
  }, 30_000)

  it('sentence cards: list and a review', async () => {
    await saveSentence({ language: 'fr', text: 'Il a pris une décision difficile.', translation: 'Zor bir karar verdi.', focus: 'décision' })
    const el = document.createElement('div')
    document.body.append(el)
    const root = createRoot(el)
    await act(async () => root.render(<SentencesGame language="fr" onExit={noop} />))
    await act(async () => new Promise((r) => setTimeout(r, 50)))
    const start = [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => /tekrar bekliyor/.test(b.textContent ?? ''))!
    await act(async () => start.click())
    expect(el.querySelector('input.answer-input')).not.toBeNull()
    await act(async () => root.unmount())
    el.remove()
  })

  it('without React warnings', () => {
    expect(problems.filter((p) => !/act\(|not wrapped in act/.test(p))).toEqual([])
  })
})
