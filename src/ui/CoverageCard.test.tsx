// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReadingText } from '../data/db'
import type { ReadingAnalysis } from '../engine/reading'
import { CoverageCard } from './CoverageCard'

const createMockAnalysis = (coverage: number, counts = { known: 95, learning: 2, new: 1, unseen: 2 }): ReadingAnalysis => ({
  coverage,
  coverageWithList: coverage + 0.03,
  total: 100,
  counts: {
    known: counts.known,
    learning: counts.learning,
    new: counts.new,
    unseen: counts.unseen,
    name: 0,
  },
  iPlusOne: [],
  paragraphs: [],
})

describe('CoverageCard', () => {
  let rootEl: HTMLDivElement
  let root: ReturnType<typeof createRoot>

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

  it('renders zone title, percentage and toggles on click', () => {
    const onToggle = vi.fn()
    const analysis = createMockAnalysis(0.96) // ideal: %96

    act(() => {
      root.render(
        <CoverageCard
          analysis={analysis}
          current={null}
          startCoverage={null}
          knownCount={600}
          expanded={false}
          onToggle={onToggle}
        />,
      )
    })

    expect(rootEl.textContent).toContain('%96')
    expect(rootEl.textContent).toContain('Öğrenmek için ideal')
    expect(rootEl.querySelector('.coverage-more')).toBeNull()

    const toggleBtn = rootEl.querySelector<HTMLButtonElement>('.coverage-line')
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false')
    act(() => {
      toggleBtn?.click()
    })
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('renders different zone titles based on coverage score', () => {
    const testCases = [
      { score: 0.99, title: 'Rahat okuma', className: 'zone-easy' },
      { score: 0.96, title: 'Öğrenmek için ideal', className: 'zone-ideal' },
      { score: 0.92, title: 'Zorlayıcı', className: 'zone-hard' },
      { score: 0.85, title: 'Çok zor', className: 'zone-too_hard' },
    ]

    for (const { score, title, className } of testCases) {
      act(() => {
        root.render(
          <CoverageCard
            analysis={createMockAnalysis(score)}
            current={null}
            startCoverage={null}
            knownCount={600}
            expanded={false}
            onToggle={() => {}}
          />,
        )
      })
      expect(rootEl.textContent).toContain(title)
      expect(rootEl.querySelector(`.${className}`)).not.toBeNull()
    }
  })

  it('shows detailed legend and explanation when expanded', () => {
    const analysis = createMockAnalysis(0.96, { known: 96, learning: 2, new: 1, unseen: 1 })

    act(() => {
      root.render(
        <CoverageCard
          analysis={analysis}
          current={null}
          startCoverage={null}
          knownCount={600}
          expanded={true}
          onToggle={() => {}}
        />,
      )
    })

    const details = rootEl.querySelector('.coverage-more')
    expect(details).not.toBeNull()
    expect(details?.textContent).toContain('Bilmediğin kelimeleri bağlamdan çıkarabileceğin aralıktasın')
    expect(details?.textContent).toContain('bildiğin 96')
    expect(details?.textContent).toContain('kelimelerinde 3')
    expect(details?.textContent).toContain('yeni 1')
    expect(details?.textContent).toContain('toplam 100 kelime')
  })

  it('displays history comparison when previous reading history exists', () => {
    const mockText: ReadingText = {
      id: 'text-1',
      language: 'fr',
      title: 'Le Petit Prince',
      text: 'Sample text...',
      addedAt: '2026-01-01',
      history: [
        { at: '2026-01-02', coverage: 0.80 },
        { at: '2026-01-05', coverage: 0.88 },
      ],
    }

    act(() => {
      root.render(
        <CoverageCard
          analysis={createMockAnalysis(0.92)}
          current={mockText}
          startCoverage={0.85}
          knownCount={600}
          expanded={true}
          onToggle={() => {}}
        />,
      )
    })

    expect(rootEl.textContent).toContain('Önceki okumada %80, son okumada %88; bu okumaya başlarken %85.')
  })

  it('displays low known words notice only when knownCount is under 500', () => {
    const analysis = createMockAnalysis(0.95)

    // Under 500: notice should appear
    act(() => {
      root.render(
        <CoverageCard
          analysis={analysis}
          current={null}
          startCoverage={null}
          knownCount={120}
          expanded={true}
          onToggle={() => {}}
        />,
      )
    })
    expect(rootEl.textContent).toContain('Bildiğin kelimeleri henüz az tanıyorum (120)')

    // 500 or more: notice should not appear
    act(() => {
      root.render(
        <CoverageCard
          analysis={analysis}
          current={null}
          startCoverage={null}
          knownCount={500}
          expanded={true}
          onToggle={() => {}}
        />,
      )
    })
    expect(rootEl.textContent).not.toContain('Bildiğin kelimeleri henüz az tanıyorum')
  })

  it('renders credit and source links correctly (generic and YouTube)', () => {
    const genericText: ReadingText = {
      id: 'text-1',
      language: 'fr',
      title: 'Article',
      text: 'Texte...',
      credit: 'Le Monde / CC BY',
      source: 'https://lemonde.fr/article-1',
      addedAt: '2026-01-01',
      history: [],
    }

    act(() => {
      root.render(
        <CoverageCard
          analysis={createMockAnalysis(0.95)}
          current={genericText}
          startCoverage={null}
          knownCount={600}
          expanded={false}
          onToggle={() => {}}
        />,
      )
    })

    expect(rootEl.textContent).toContain('Le Monde / CC BY')
    expect(rootEl.textContent).toContain('Kaynağı aç')
    const genericLink = rootEl.querySelector<HTMLAnchorElement>('a.link')
    expect(genericLink?.href).toBe('https://lemonde.fr/article-1')

    const ytText: ReadingText = {
      id: 'text-2',
      language: 'fr',
      title: 'Vidéo',
      text: 'Texte...',
      source: 'https://www.youtube.com/watch?v=123',
      addedAt: '2026-01-01',
      history: [],
    }

    act(() => {
      root.render(
        <CoverageCard
          analysis={createMockAnalysis(0.95)}
          current={ytText}
          startCoverage={null}
          knownCount={600}
          expanded={false}
          onToggle={() => {}}
        />,
      )
    })

    expect(rootEl.textContent).toContain('Videoyu YouTube’da aç')
  })
})
