import { useEffect, useMemo, useRef, useState } from 'react'
import { displayForm } from '../engine/exercises'
import type { VocabularyEntry } from '../engine/types'

export interface Command {
  id: string
  label: string
  hint?: string
  icon?: string
  run: () => void
}

/**
 * ⌘K / Ctrl+K: jump anywhere or open any word from the keyboard. Words match on the word, its
 * meanings and notes; commands match on their label.
 */
export function CommandPalette({
  commands,
  vocabulary,
  onOpenWord,
  onClose,
}: {
  commands: Command[]
  vocabulary: VocabularyEntry[]
  onOpenWord: (id: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => input.current?.focus(), [])

  const items = useMemo(() => {
    const query = q.trim().toLocaleLowerCase('tr')
    const cmds = commands.filter((c) => !query || c.label.toLocaleLowerCase('tr').includes(query))
    const words = query
      ? vocabulary
          .filter((v) => [v.lemma, v.senses[0].gloss, ...(v.senses[0].altGlosses ?? []), v.notes ?? ''].some((t) => t.toLocaleLowerCase('tr').includes(query)))
          // Words starting with the query first.
          .sort((a, b) => Number(!a.lemma.toLocaleLowerCase('tr').startsWith(query)) - Number(!b.lemma.toLocaleLowerCase('tr').startsWith(query)))
          .slice(0, 8)
          .map<Command>((v) => ({ id: `word:${v.id}`, label: displayForm(v), hint: v.senses[0].gloss, icon: '📖', run: () => onOpenWord(v.id) }))
      : []
    return [...words, ...cmds]
  }, [q, commands, vocabulary, onOpenWord])

  useEffect(() => setActive(0), [q])
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = (c: Command | undefined) => {
    if (!c) return
    onClose()
    c.run()
  }

  return (
    <div className="dialog-backdrop palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Komut paleti">
        <input
          ref={input}
          className="palette-input"
          placeholder="Kelime ara ya da bir komut yaz…"
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
        <ul className="palette-list" ref={list} role="listbox">
          {items.length === 0 && <li className="palette-empty">Sonuç yok</li>}
          {items.map((c, i) => (
            <li
              key={c.id}
              data-i={i}
              role="option"
              aria-selected={i === active}
              className={`palette-item${i === active ? ' is-active' : ''}${c.id.startsWith('word:') ? ' is-word' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                run(c)
              }}
            >
              <span className="palette-icon">{c.icon ?? '›'}</span>
              <span className="palette-label">{c.label}</span>
              {c.hint && <span className="palette-hint">{c.hint}</span>}
            </li>
          ))}
        </ul>
        <p className="palette-foot small muted">
          <kbd>↑</kbd> <kbd>↓</kbd> seç &nbsp; <kbd>Enter</kbd> aç &nbsp; <kbd>Esc</kbd> kapat
        </p>
      </div>
    </div>
  )
}
