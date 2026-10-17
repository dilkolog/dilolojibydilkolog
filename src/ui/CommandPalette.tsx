import '../lazy.css'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { stripDiacritics } from '../engine/answerCheck'
import { displayForm } from '../engine/exercises'
import type { VocabularyEntry } from '../engine/types'
import { CloseIcon, SearchIcon } from './icons'
import { commandArtIcon } from './paletteArt'

export interface Command {
  id: string
  label: string
  hint?: string
  icon?: ReactNode
  /** Where it is listed: İşlemler (do something), Ekranlar (go somewhere), Dil. */
  group?: string
  run: () => void
}

const RECENT_KEY = 'kelime-koc:palette-recent'
const GROUP_ORDER = ['Son kullanılanlar', 'Kelimeler', 'Sözlük', 'İşlemler', 'Oyunlar', 'Ekranlar', 'Dil', 'Yeni kelime']

/** The Option key on a Mac, Alt elsewhere. */
const ALT = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌥' : 'Alt+'

/** Matching ignores case and accents, so "cekim" finds "Çekim" and "decision" finds "décision". */
const fold = (s: string) => stripDiacritics(s.toLocaleLowerCase('tr')).replace(/ı/g, 'i')

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function remember(id: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...loadRecent().filter((x) => x !== id)].slice(0, 4)))
  } catch {
    // Not remembered; fine.
  }
}

/**
 * ⌘K / Ctrl+K: jump anywhere or open any word from the keyboard. Words match on the word, its
 * meanings and notes; commands match on their label. A word that isn't in the list yet can be
 * added from here.
 */
export function CommandPalette({
  commands,
  vocabulary,
  onOpenWord,
  onAddWord,
  onLookUp,
  onClose,
}: {
  commands: Command[]
  vocabulary: VocabularyEntry[]
  onOpenWord: (id: string) => void
  onAddWord?: (word: string) => void
  /** Any typed word, in the list or not, looked up in the dictionary. */
  onLookUp?: (query: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => input.current?.focus(), [])
  // Esc closes it wherever focus is (it may have left the input), before any screen shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || input.current?.contains(e.target as Node)) return
      e.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const items = useMemo(() => {
    const query = fold(q.trim())
    const cmds = commands.filter((c) => !query || fold(c.label).includes(query))
    const words = query
      ? vocabulary
          .filter((v) => [v.lemma, v.senses[0].gloss, ...(v.senses[0].altGlosses ?? []), v.notes ?? ''].some((t) => fold(t).includes(query)))
          // Words starting with the query first.
          .sort((a, b) => Number(!fold(a.lemma).startsWith(query)) - Number(!fold(b.lemma).startsWith(query)))
          .slice(0, 8)
          .map<Command>((v) => ({ id: `word:${v.id}`, label: displayForm(v), hint: v.senses[0].gloss, group: 'Kelimeler', run: () => onOpenWord(v.id) }))
      : []
    // Nothing typed yet: the last few commands first.
    const recent = query
      ? []
      : loadRecent()
          .map((id) => commands.find((c) => c.id === id))
          .filter((c): c is Command => !!c)
          .map((c) => ({ ...c, group: 'Son kullanılanlar' }))
    const rest = cmds.filter((c) => !recent.some((r) => r.id === c.id))
    // Not in the list yet: offer to add it, prefilled.
    const typed = q.trim()
    const add: Command[] =
      onAddWord && typed && !vocabulary.some((v) => fold(v.lemma) === query)
        ? [{ id: 'add-typed', label: `“${typed}” kelimesini ekle`, icon: '+', group: 'Yeni kelime', run: () => onAddWord(typed) }]
        : []
    const lookUp: Command[] = onLookUp && typed ? [{ id: 'look-up', label: `“${typed}” sözlükte ara`, icon: <SearchIcon size={18} />, group: 'Sözlük', run: () => onLookUp(typed) }] : []
    const all = [...recent, ...words, ...lookUp, ...rest, ...add]
    return all.sort((a, b) => GROUP_ORDER.indexOf(a.group ?? 'Ekranlar') - GROUP_ORDER.indexOf(b.group ?? 'Ekranlar'))
  }, [q, commands, vocabulary, onOpenWord, onAddWord, onLookUp])

  useEffect(() => setActive(0), [q])
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const executed = useRef(false)
  const run = (c: Command | undefined) => {
    if (!c || executed.current) return
    executed.current = true
    if (!c.id.startsWith('word:') && c.id !== 'add-typed') remember(c.id)
    onClose()
    c.run()
  }

  return (
    <div className="dialog-backdrop palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Komut paleti">
        <div className="palette-head">
          <SearchIcon size={18} className="palette-head-icon" />
          <input
            ref={input}
            className="palette-input"
            placeholder="Kelime ara ya da bir komut yaz…"
            // Safari's autocorrect bubble ("rehb" → "rehab") rewrote the query under the pointer, so the row aimed at moved away.
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setActive((i) => Math.min(items.length - 1, i + 1))
              else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1))
              else if (e.key === 'Enter') run(items[active])
              else if (e.key === 'Escape') {
                e.stopPropagation()
                onClose()
              } else return
              e.preventDefault()
            }}
            aria-label="Ara"
          />
          {q && (
            <button
              type="button"
              className="palette-clear-btn"
              onClick={() => {
                setQ('')
                input.current?.focus()
              }}
              aria-label="Aramayı temizle"
              title="Aramayı temizle"
            >
              <CloseIcon size={16} />
            </button>
          )}
          <button
            type="button"
            className="palette-close-btn"
            onClick={onClose}
            aria-label="Kapat"
            title="Kapat"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <ul className="palette-list" ref={list} role="listbox">
          {items.length === 0 && <li className="palette-empty">Sonuç yok</li>}
          {items.map((c, i) => [
            (c.group ?? 'Ekranlar') !== (items[i - 1]?.group ?? (i === 0 ? null : 'Ekranlar')) && (
              <li key={`g-${c.group}`} className="palette-group" role="presentation">
                {c.group ?? 'Ekranlar'}
              </li>
            ),
            <li
              key={`${c.group}-${c.id}`}
              data-i={i}
              role="option"
              aria-selected={i === active}
              className={`palette-item${i === active ? ' is-active' : ''}${c.id.startsWith('word:') ? ' is-word' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                run(c)
              }}
              onClick={() => run(c)}
            >
              {!c.id.startsWith('word:') && <span className="palette-icon">{commandArtIcon(c.id, c.icon) ?? '›'}</span>}
              <span className="palette-label">{c.label}</span>
              {c.hint && <span className="palette-hint">{c.hint}</span>}
              {i === active && (
                <kbd className="palette-enter" aria-hidden>
                  ↵
                </kbd>
              )}
            </li>,
          ])}
        </ul>
        <p className="palette-foot small muted">
          <kbd>↑</kbd> <kbd>↓</kbd> seç &nbsp; <kbd>Enter</kbd> aç &nbsp; <kbd>Esc</kbd> kapat &nbsp; <kbd>{ALT}S</kbd> sözlük &nbsp; <kbd>{ALT}V</kbd> fiil lab
        </p>
      </div>
    </div>
  )
}
