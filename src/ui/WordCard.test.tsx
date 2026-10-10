// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FormAnalysis } from '../engine/tenses'
import type { VocabularyEntry } from '../engine/types'
import { WordCard, type Selected } from './WordCard'

vi.mock('./WordPopExtras', () => ({
  WordPopExtras: () => null,
}))

vi.mock('./TranslateButton', () => ({
  SentenceTranslation: () => null,
}))

describe('WordCard', () => {
  let rootEl: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const mockSheet = {
    dy: 0,
    handlers: {},
  } as unknown as ReturnType<typeof import('./useSheetSwipe')['useSheetSwipe']>

  const baseSelected: Selected & { token: { text: string; key: string; status: 'unseen' | 'known' | 'learning' | 'new' | 'name' } } = {
    token: { text: 'mangent', key: 'manger', status: 'unseen' },
    sentence: 'Ils mangent du pain.',
    at: '0.1',
  }

  beforeEach(() => {
    rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    root = createRoot(rootEl)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    rootEl.remove()
  })

  it('renders unseen word actions (add, know, ignore, skip)', () => {
    const onAdd = vi.fn()
    const onKnown = vi.fn()
    const onIgnore = vi.fn()
    const onSkip = vi.fn()
    const onClose = vi.fn()

    act(() => {
      root.render(
        <WordCard
          selected={baseSelected}
          entry={undefined}
          forms={[]}
          verbEntry={() => undefined}
          language="fr"
          sheetBox={null}
          sheet={mockSheet}
          ignored={new Set()}
          skipped={new Set()}
          canListenFrom={false}
          onClose={onClose}
          onAdd={onAdd}
          onKnown={onKnown}
          onIgnore={onIgnore}
          onUnknown={() => {}}
          onSkip={onSkip}
          onKeepSentence={() => {}}
          onListenFrom={() => {}}
          onOpen={() => {}}
        />,
      )
    })

    expect(rootEl.textContent).toContain('mangent')
    expect(rootEl.textContent).toContain('Bu kelimeyi daha önce işaretlemedin.')

    // Close button
    const closeBtn = rootEl.querySelector<HTMLButtonElement>('.icon-btn')
    act(() => {
      closeBtn?.click()
    })
    expect(onClose).toHaveBeenCalled()

    // Add button
    const addBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Kelimelerime ekle'),
    )
    act(() => {
      addBtn?.click()
    })
    expect(onAdd).toHaveBeenCalledWith('mangent', 'Ils mangent du pain.')

    // Known button
    const knownBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Biliyorum'),
    )
    act(() => {
      knownBtn?.click()
    })
    expect(onKnown).toHaveBeenCalledWith('manger')

    // Ignore button
    const ignoreBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Yok say'),
    )
    act(() => {
      ignoreBtn?.click()
    })
    expect(onIgnore).toHaveBeenCalledWith('manger', true)

    // Skip button
    const skipBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Bilmiyorum, eklemeden geç'),
    )
    act(() => {
      skipBtn?.click()
    })
    expect(onSkip).toHaveBeenCalledWith('manger')
  })

  it('renders actions for an already known word ("Aslında bilmiyorum")', () => {
    const onUnknown = vi.fn()
    const knownSelected = {
      ...baseSelected,
      token: { ...baseSelected.token, status: 'known' as const },
    }

    act(() => {
      root.render(
        <WordCard
          selected={knownSelected}
          entry={undefined}
          forms={[]}
          verbEntry={() => undefined}
          language="fr"
          sheetBox={null}
          sheet={mockSheet}
          ignored={new Set()}
          skipped={new Set()}
          canListenFrom={false}
          onClose={() => {}}
          onAdd={() => {}}
          onKnown={() => {}}
          onIgnore={() => {}}
          onUnknown={onUnknown}
          onSkip={() => {}}
          onKeepSentence={() => {}}
          onListenFrom={() => {}}
          onOpen={() => {}}
        />,
      )
    })

    expect(rootEl.textContent).toContain('Bildiğin bir kelime.')
    const unknownBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Aslında bilmiyorum'),
    )
    expect(unknownBtn).toBeDefined()
    act(() => {
      unknownBtn?.click()
    })
    expect(onUnknown).toHaveBeenCalledWith('manger')
  })

  it('renders actions for an ignored word ("Yok saymayı kaldır")', () => {
    const onIgnore = vi.fn()

    act(() => {
      root.render(
        <WordCard
          selected={baseSelected}
          entry={undefined}
          forms={[]}
          verbEntry={() => undefined}
          language="fr"
          sheetBox={null}
          sheet={mockSheet}
          ignored={new Set(['manger'])}
          skipped={new Set()}
          canListenFrom={false}
          onClose={() => {}}
          onAdd={() => {}}
          onKnown={() => {}}
          onIgnore={onIgnore}
          onUnknown={() => {}}
          onSkip={() => {}}
          onKeepSentence={() => {}}
          onListenFrom={() => {}}
          onOpen={() => {}}
        />,
      )
    })

    const unignoreBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Yok saymayı kaldır'),
    )
    expect(unignoreBtn).toBeDefined()
    act(() => {
      unignoreBtn?.click()
    })
    expect(onIgnore).toHaveBeenCalledWith('manger', false)
  })

  it('renders entry details and "Kelimeyi aç" when entry exists in vocabulary', () => {
    const onOpen = vi.fn()
    const mockEntry = {
      id: 'entry-123',
      lemma: 'manger',
      article: 'le',
      language: 'fr',
      addedAt: new Date('2026-01-01'),
      senses: [{ id: 's-1', gloss: 'yemek yemek', examples: [] }],
    } as unknown as VocabularyEntry

    act(() => {
      root.render(
        <WordCard
          selected={baseSelected}
          entry={mockEntry}
          forms={[]}
          verbEntry={() => undefined}
          language="fr"
          sheetBox={null}
          sheet={mockSheet}
          ignored={new Set()}
          skipped={new Set()}
          canListenFrom={false}
          onClose={() => {}}
          onAdd={() => {}}
          onKnown={() => {}}
          onIgnore={() => {}}
          onUnknown={() => {}}
          onSkip={() => {}}
          onKeepSentence={() => {}}
          onListenFrom={() => {}}
          onOpen={onOpen}
        />,
      )
    })

    expect(rootEl.textContent).toContain('le manger')
    expect(rootEl.textContent).toContain('yemek yemek')

    const openBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Kelimeyi aç'),
    )
    expect(openBtn).toBeDefined()
    act(() => {
      openBtn?.click()
    })
    expect(onOpen).toHaveBeenCalledWith('entry-123')
  })

  it('renders verb form analysis, opens entry card or opens verb lab', () => {
    const onOpen = vi.fn()
    const onOpenLab = vi.fn()
    const mockForms: FormAnalysis[] = [
      {
        lemma: 'manger',
        tense: 'present',
        persons: [5],
      },
    ]
    const verbEntry = (lemma: string) =>
      lemma === 'manger'
        ? ({ id: 'v-manger', lemma: 'manger', language: 'fr', addedAt: new Date('2026-01-01'), senses: [{ id: 's-2', gloss: 'yemek', examples: [] }] } as unknown as VocabularyEntry)
        : undefined

    act(() => {
      root.render(
        <WordCard
          selected={baseSelected}
          entry={undefined}
          forms={mockForms}
          verbEntry={verbEntry}
          language="fr"
          sheetBox={null}
          sheet={mockSheet}
          ignored={new Set()}
          skipped={new Set()}
          canListenFrom={false}
          onClose={() => {}}
          onAdd={() => {}}
          onKnown={() => {}}
          onIgnore={() => {}}
          onUnknown={() => {}}
          onSkip={() => {}}
          onKeepSentence={() => {}}
          onListenFrom={() => {}}
          onOpen={onOpen}
          onOpenLab={onOpenLab}
        />,
      )
    })

    expect(rootEl.textContent).toContain('présent')

    const openCardLink = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button.link')).find((b) =>
      b.textContent?.includes('kartı aç'),
    )
    expect(openCardLink).toBeDefined()
    act(() => {
      openCardLink?.click()
    })
    expect(onOpen).toHaveBeenCalledWith('v-manger')

    const openLabLink = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button.link')).find((b) =>
      b.textContent?.includes('fiil laboratuvarında aç'),
    )
    expect(openLabLink).toBeDefined()
    act(() => {
      openLabLink?.click()
    })
    expect(onOpenLab).toHaveBeenCalledWith('manger', 'present')
  })

  it('renders "Bu cümleden dinle" only when canListenFrom is true and sentence position is given', () => {
    const onListenFrom = vi.fn()

    // canListenFrom = true, selected.at = '0.1' -> visible
    act(() => {
      root.render(
        <WordCard
          selected={baseSelected}
          entry={undefined}
          forms={[]}
          verbEntry={() => undefined}
          language="fr"
          sheetBox={null}
          sheet={mockSheet}
          ignored={new Set()}
          skipped={new Set()}
          canListenFrom={true}
          onClose={() => {}}
          onAdd={() => {}}
          onKnown={() => {}}
          onIgnore={() => {}}
          onUnknown={() => {}}
          onSkip={() => {}}
          onKeepSentence={() => {}}
          onListenFrom={onListenFrom}
          onOpen={() => {}}
        />,
      )
    })

    const listenBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Bu cümleden dinle'),
    )
    expect(listenBtn).toBeDefined()
    act(() => {
      listenBtn?.click()
    })
    expect(onListenFrom).toHaveBeenCalledWith('0.1')

    // canListenFrom = false -> not visible
    act(() => {
      root.render(
        <WordCard
          selected={baseSelected}
          entry={undefined}
          forms={[]}
          verbEntry={() => undefined}
          language="fr"
          sheetBox={null}
          sheet={mockSheet}
          ignored={new Set()}
          skipped={new Set()}
          canListenFrom={false}
          onClose={() => {}}
          onAdd={() => {}}
          onKnown={() => {}}
          onIgnore={() => {}}
          onUnknown={() => {}}
          onSkip={() => {}}
          onKeepSentence={() => {}}
          onListenFrom={onListenFrom}
          onOpen={() => {}}
        />,
      )
    })

    expect(rootEl.textContent).not.toContain('Bu cümleden dinle')
  })

  it('supports "Cümleyi kaydet" and dictionary lookup', () => {
    const onKeepSentence = vi.fn()
    const onLookUp = vi.fn()

    act(() => {
      root.render(
        <WordCard
          selected={baseSelected}
          entry={undefined}
          forms={[]}
          verbEntry={() => undefined}
          language="fr"
          sheetBox={null}
          sheet={mockSheet}
          ignored={new Set()}
          skipped={new Set()}
          canListenFrom={false}
          onClose={() => {}}
          onAdd={() => {}}
          onKnown={() => {}}
          onIgnore={() => {}}
          onUnknown={() => {}}
          onSkip={() => {}}
          onKeepSentence={onKeepSentence}
          onListenFrom={() => {}}
          onOpen={() => {}}
          onLookUp={onLookUp}
        />,
      )
    })

    const saveSentenceBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button.link')).find((b) =>
      b.textContent?.includes('Cümleyi kaydet'),
    )
    act(() => {
      saveSentenceBtn?.click()
    })
    expect(onKeepSentence).toHaveBeenCalledWith('Ils mangent du pain.', 'mangent')

    const lookupBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button.link')).find((b) =>
      b.textContent?.includes('Sözlükte aç'),
    )
    act(() => {
      lookupBtn?.click()
    })
    expect(onLookUp).toHaveBeenCalledWith('mangent')
  })
})
