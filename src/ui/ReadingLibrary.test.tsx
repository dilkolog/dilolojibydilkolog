// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReadingText } from '../data/db'
import { AddTextCard, LibraryItem } from './ReadingLibrary'

describe('ReadingLibrary components', () => {
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

  describe('LibraryItem', () => {
    const now = new Date('2026-01-10T12:00:00Z').getTime()

    it('renders "Yeni" badge when text has not been read yet', () => {
      const item: ReadingText = {
        id: 'item-1',
        language: 'fr',
        title: 'Le Renard',
        text: 'Un deux trois quatre cinq.',
        addedAt: '2026-01-01',
        history: [],
      }
      const onOpen = vi.fn()
      const onRemove = vi.fn()

      act(() => {
        root.render(<LibraryItem item={item} now={now} onOpen={onOpen} onRemove={onRemove} />)
      })

      expect(rootEl.textContent).toContain('Le Renard')
      const badge = rootEl.querySelector('.lib-status')
      expect(badge?.textContent).toBe('Yeni')
      expect(badge?.className).toContain('is-new')

      const openBtn = rootEl.querySelector<HTMLButtonElement>('.lib-open')
      act(() => {
        openBtn?.click()
      })
      expect(onOpen).toHaveBeenCalledWith(item)

      const removeBtn = rootEl.querySelector<HTMLButtonElement>('.lib-remove')
      act(() => {
        removeBtn?.click()
      })
      expect(onRemove).toHaveBeenCalledWith(item)
    })

    it('renders "Okundu" badge when read recently (< 7 days)', () => {
      const readAt = new Date('2026-01-08T12:00:00Z').toISOString() // 2 days ago
      const item: ReadingText = {
        id: 'item-2',
        language: 'fr',
        title: 'Le Petit Prince',
        text: 'Il était une fois...',
        addedAt: '2026-01-01',
        readAt,
        history: [{ at: readAt, coverage: 0.92 }],
      }

      act(() => {
        root.render(<LibraryItem item={item} now={now} onOpen={() => {}} onRemove={() => {}} />)
      })

      const badge = rootEl.querySelector('.lib-status')
      expect(badge?.textContent).toBe('Okundu')
      expect(badge?.className).toContain('is-done')
      expect(rootEl.textContent).toContain('2 gün önce')

      const ring = rootEl.querySelector('.lib-ring')
      expect(ring?.textContent).toContain('%92')
    })

    it('renders "Tekrar oku" badge when read 7 or more days ago', () => {
      const readAt = new Date('2026-01-01T12:00:00Z').toISOString() // 9 days ago
      const item: ReadingText = {
        id: 'item-3',
        language: 'fr',
        title: 'L’Étranger',
        text: 'Aujourd’hui, maman est morte.',
        addedAt: '2026-01-01',
        readAt,
        history: [{ at: readAt, coverage: 0.88 }],
      }

      act(() => {
        root.render(<LibraryItem item={item} now={now} onOpen={() => {}} onRemove={() => {}} />)
      })

      const badge = rootEl.querySelector('.lib-status')
      expect(badge?.textContent).toBe('Tekrar oku')
      expect(badge?.className).toContain('is-reread')
      expect(rootEl.textContent).toContain('9 gün önce')
    })

    it('displays video indicator when source is YouTube', () => {
      const item: ReadingText = {
        id: 'item-yt',
        language: 'fr',
        title: '▶️ Français avec Pierre',
        text: 'Bonjour à tous...',
        source: 'https://www.youtube.com/watch?v=12345',
        addedAt: '2026-01-01',
        history: [],
      }

      act(() => {
        root.render(<LibraryItem item={item} now={now} onOpen={() => {}} onRemove={() => {}} />)
      })

      expect(rootEl.querySelector('.lib-video')).not.toBeNull()
      // Prefix emoji should be stripped
      expect(rootEl.textContent).toContain('Français avec Pierre')
    })
  })

  describe('AddTextCard', () => {
    it('disables "Okumaya başla" button when draft is empty and enables when filled', () => {
      const onStart = vi.fn()
      const onDraft = vi.fn()
      const onTitle = vi.fn()

      // Empty draft
      act(() => {
        root.render(
          <AddTextCard
            language="fr"
            startOpen={true}
            title=""
            onTitle={onTitle}
            draft="   "
            onDraft={onDraft}
            onStart={onStart}
            onFile={() => {}}
            onBook={() => {}}
            youtube=""
            onYoutube={() => {}}
            onFetchYoutube={() => {}}
            ytBusy={false}
            bookError={null}
          />,
        )
      })

      const startBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.includes('Okumaya başla'),
      )
      expect(startBtn?.disabled).toBe(true)

      // Title and textarea change triggers
      const titleInput = rootEl.querySelector<HTMLInputElement>('input[placeholder="Başlık (isteğe bağlı)"]')
      act(() => {
        if (titleInput) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
          nativeSetter?.call(titleInput, 'Yeni Başlık')
          titleInput.dispatchEvent(new Event('input', { bubbles: true }))
        }
      })
      expect(onTitle).toHaveBeenCalledWith('Yeni Başlık')

      const draftTextarea = rootEl.querySelector<HTMLTextAreaElement>('textarea.reading-draft-textarea')
      act(() => {
        if (draftTextarea) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
          nativeSetter?.call(draftTextarea, 'Un nouveau texte.')
          draftTextarea.dispatchEvent(new Event('input', { bubbles: true }))
        }
      })
      expect(onDraft).toHaveBeenCalledWith('Un nouveau texte.')

      // Non-empty draft
      act(() => {
        root.render(
          <AddTextCard
            language="fr"
            startOpen={true}
            title="Başlık"
            onTitle={onTitle}
            draft="Metin burada"
            onDraft={onDraft}
            onStart={onStart}
            onFile={() => {}}
            onBook={() => {}}
            youtube=""
            onYoutube={() => {}}
            onFetchYoutube={() => {}}
            ytBusy={false}
            bookError={null}
          />,
        )
      })

      const activeStartBtn = Array.from(rootEl.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.includes('Okumaya başla'),
      )
      expect(activeStartBtn?.disabled).toBe(false)
      act(() => {
        activeStartBtn?.click()
      })
      expect(onStart).toHaveBeenCalledTimes(1)
    })

    it('handles YouTube link submission and loading state', () => {
      const onFetchYoutube = vi.fn()

      // Busy state
      act(() => {
        root.render(
          <AddTextCard
            language="fr"
            startOpen={true}
            title=""
            onTitle={() => {}}
            draft=""
            onDraft={() => {}}
            onStart={() => {}}
            onFile={() => {}}
            onBook={() => {}}
            youtube="https://youtube.com/watch?v=123"
            onYoutube={() => {}}
            onFetchYoutube={onFetchYoutube}
            ytBusy={true}
            bookError={null}
          />,
        )
      })

      expect(rootEl.textContent).toContain('Getiriliyor…')
      const ytBtn = rootEl.querySelector<HTMLButtonElement>('.add-youtube button')
      expect(ytBtn?.disabled).toBe(true)

      // Ready state
      act(() => {
        root.render(
          <AddTextCard
            language="fr"
            startOpen={true}
            title=""
            onTitle={() => {}}
            draft=""
            onDraft={() => {}}
            onStart={() => {}}
            onFile={() => {}}
            onBook={() => {}}
            youtube="https://youtube.com/watch?v=123"
            onYoutube={() => {}}
            onFetchYoutube={onFetchYoutube}
            ytBusy={false}
            bookError={null}
          />,
        )
      })

      expect(rootEl.textContent).toContain('Altyazıyı getir')
      const form = rootEl.querySelector<HTMLFormElement>('form.add-youtube')
      act(() => {
        form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      })
      expect(onFetchYoutube).toHaveBeenCalled()
    })

    it('renders book error / notice when provided', () => {
      act(() => {
        root.render(
          <AddTextCard
            language="fr"
            startOpen={true}
            title=""
            onTitle={() => {}}
            draft=""
            onDraft={() => {}}
            onStart={() => {}}
            onFile={() => {}}
            onBook={() => {}}
            youtube=""
            onYoutube={() => {}}
            onFetchYoutube={() => {}}
            ytBusy={false}
            bookError={{ ok: false, text: 'EPUB dosyası okunamadı.' }}
          />,
        )
      })

      const errorEl = rootEl.querySelector('.error')
      expect(errorEl?.textContent).toContain('EPUB dosyası okunamadı.')
    })
  })
})
