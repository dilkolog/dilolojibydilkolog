// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TenseGroup } from '../engine/textForms'
import { TextForms } from './TextForms'

describe('TextForms', () => {
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

  it('renders empty state when there are no verb groups', () => {
    const onClose = vi.fn()
    act(() => {
      root.render(<TextForms groups={[]} language="fr" onClose={onClose} />)
    })

    expect(rootEl.textContent).toContain('Bu metinde tanıdığım bir fiil çekimi yok.')
    const closeBtn = rootEl.querySelector<HTMLButtonElement>('button.link')
    expect(closeBtn?.textContent).toContain('Kapat')
    act(() => {
      closeBtn?.click()
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders tense groups, totals, and form occurrence counts', () => {
    const groups: TenseGroup[] = [
      {
        tense: 'present',
        total: 5,
        forms: [
          { form: 'parle', lemma: 'parler', count: 3 },
          { form: 'parlons', lemma: 'parler', count: 1 },
          { form: 'mange', lemma: 'manger', count: 1 },
        ],
      },
      {
        tense: 'imparfait',
        total: 2,
        forms: [{ form: 'parlait', lemma: 'parler', count: 2 }],
      },
    ]

    act(() => {
      root.render(<TextForms groups={groups} language="fr" onClose={() => {}} />)
    })

    // Group headings & stats
    expect(rootEl.textContent).toContain('7 çekim, 2 zaman')
    expect(rootEl.textContent).toContain('présent')
    expect(rootEl.textContent).toContain('Şimdiki / geniş zaman')
    expect(rootEl.textContent).toContain('5 kez · 3 farklı biçim')

    expect(rootEl.textContent).toContain('imparfait')
    expect(rootEl.textContent).toContain('Süren geçmiş')
    expect(rootEl.textContent).toContain('2 kez · 1 farklı biçim')

    // Occurrence count format: count > 1 shows "· N kez"
    expect(rootEl.textContent).toContain('parle')
    expect(rootEl.textContent).toContain('parler · 3 kez')
    // count === 1 does not append "· 1 kez"
    expect(rootEl.textContent).toContain('parlons')
    expect(rootEl.textContent).not.toContain('parler · 1 kez')
  })

  it('calls onOpenLab when a form row is clicked', () => {
    const onOpenLab = vi.fn()
    const groups: TenseGroup[] = [
      {
        tense: 'present',
        total: 1,
        forms: [{ form: 'parle', lemma: 'parler', count: 1 }],
      },
    ]

    act(() => {
      root.render(<TextForms groups={groups} language="fr" onOpenLab={onOpenLab} onClose={() => {}} />)
    })

    const formBtn = rootEl.querySelector<HTMLButtonElement>('button.word-row')
    expect(formBtn).not.toBeNull()
    act(() => {
      formBtn?.click()
    })
    expect(onOpenLab).toHaveBeenCalledWith('parler', 'present')
  })

  it('handles review actions for all tenses and single tense', () => {
    const onReview = vi.fn()
    const groups: TenseGroup[] = [
      {
        tense: 'present',
        total: 3,
        forms: [
          { form: 'parle', lemma: 'parler', count: 2 },
          { form: 'mange', lemma: 'manger', count: 1 },
        ],
      },
      {
        tense: 'passe-compose',
        total: 1,
        forms: [{ form: 'ai parlé', lemma: 'parler', count: 1 }],
      },
    ]

    act(() => {
      root.render(<TextForms groups={groups} language="fr" onReview={onReview} onClose={() => {}} />)
    })

    // "Hepsini fiil tekrarına ekle" button
    const reviewAllBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.includes('Hepsini fiil tekrarına ekle'),
    )
    expect(reviewAllBtn).toBeDefined()
    // 2 unique verbs in present (parler, manger) + 1 in passé composé (parler) = 3 pairs
    expect(reviewAllBtn?.textContent).toContain('(3)')

    act(() => {
      reviewAllBtn?.click()
    })
    expect(onReview).toHaveBeenCalledWith([
      { lemma: 'parler', tense: 'present' },
      { lemma: 'manger', tense: 'present' },
      { lemma: 'parler', tense: 'passe-compose' },
    ])

    // Specific tense review button
    const singleTenseReviewBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button.link')).find(
      (b) => b.textContent?.includes('Bu zamanın fiillerini tekrara ekle'),
    )
    expect(singleTenseReviewBtn).toBeDefined()
    act(() => {
      singleTenseReviewBtn?.click()
    })
    expect(onReview).toHaveBeenCalledWith([
      { lemma: 'parler', tense: 'present' },
      { lemma: 'manger', tense: 'present' },
    ])
  })

  it('renders overflow notice when a group has more than 12 forms', () => {
    const manyForms = Array.from({ length: 15 }, (_, i) => ({
      form: `form_${i}`,
      lemma: `lemma_${i}`,
      count: 1,
    }))
    const groups: TenseGroup[] = [
      {
        tense: 'present',
        total: 15,
        forms: manyForms,
      },
    ]

    act(() => {
      root.render(<TextForms groups={groups} language="fr" onClose={() => {}} />)
    })

    expect(rootEl.textContent).toContain('+3 biçim daha')
  })
})
