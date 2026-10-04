import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { CheckIcon, ChevronDownIcon } from './icons'

export interface SelectOption<T extends string> {
  value: T
  label: string
  /** Optional second line, e.g. a voice's language. */
  hint?: string
  icon?: ReactNode
}

/**
 * Custom dropdown (the native <select> popup can't be styled). Keyboard: arrows move, Enter or
 * Space picks, Esc closes, typing a letter jumps to the first option starting with it.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  id,
  placeholder = 'Seç',
}: {
  value: T | undefined
  options: SelectOption<T>[]
  onChange: (value: T) => void
  label: string
  id?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  // Opens upwards when there isn't room below (a field near the bottom of the screen).
  const [up, setUp] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const listId = useId()
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const openAt = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    const r = root.current?.getBoundingClientRect()
    setUp(!!r && window.innerHeight - r.bottom < 280 && r.top > window.innerHeight - r.bottom)
    setOpen(true)
  }

  const choose = (i: number) => {
    onChange(options[i].value)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openAt()
      }
      return
    }
    if (e.key === 'ArrowDown') setActive((i) => Math.min(options.length - 1, i + 1))
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(options.length - 1)
    else if (e.key === 'Enter' || e.key === ' ') choose(active)
    else if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
    } else if (e.key === 'Tab') setOpen(false)
    else if (e.key.length === 1) {
      const i = options.findIndex((o) => o.label.toLocaleLowerCase('tr').startsWith(e.key.toLocaleLowerCase('tr')))
      if (i >= 0) setActive(i)
      return
    } else return
    e.preventDefault()
  }

  return (
    <div className="select" ref={root}>
      <button
        type="button"
        id={id}
        className={`select-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${current?.label ?? placeholder}`}
        onClick={() => (open ? setOpen(false) : openAt())}
        onKeyDown={onKeyDown}
      >
        {current?.icon}
        <span className={current ? '' : 'muted'}>{current?.label ?? placeholder}</span>
        <ChevronDownIcon size={16} className="select-chevron" />
      </button>
      {open && (
        <ul className={`select-list${up ? ' is-up' : ''}`} role="listbox" id={listId} ref={list} aria-label={label}>
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              data-index={i}
              aria-selected={o.value === value}
              className={`select-option${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(i)
              }}
            >
              {o.icon}
              <span>
                {o.label}
                {o.hint && <span className="select-hint">{o.hint}</span>}
              </span>
              {o.value === value && <CheckIcon size={16} className="select-check" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
