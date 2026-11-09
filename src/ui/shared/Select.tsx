import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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
  className,
  floating,
}: {
  value: T | undefined
  options: SelectOption<T>[]
  onChange: (value: T) => void
  label: string
  id?: string
  placeholder?: string
  className?: string
  /** The list is placed on the screen, not in the page: for a field inside a scrolling box (a table) that would cut it. */
  floating?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  // Opens upwards when there isn't room below (a field near the bottom of the screen).
  const [up, setUp] = useState(false)
  const [place, setPlace] = useState<CSSProperties | undefined>(undefined)
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
    // A list placed on the screen would stay behind when the box under it scrolls: it closes instead.
    const drop = (e: Event) => {
      if (!list.current?.contains(e.target as Node)) setOpen(false)
    }
    if (floating) {
      window.addEventListener('scroll', drop, true)
      window.addEventListener('resize', drop)
    }
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', drop, true)
      window.removeEventListener('resize', drop)
    }
  }, [open, floating])

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const openAt = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    const r = root.current?.getBoundingClientRect()
    const goesUp = !!r && window.innerHeight - r.bottom < 280 && r.top > window.innerHeight - r.bottom
    setUp(goesUp)
    setPlace(
      floating && r
        ? { position: 'fixed', left: r.left, minWidth: r.width, ...(goesUp ? { top: 'auto', bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }) }
        : undefined,
    )
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
    <div className={`select${className ? ` ${className}` : ''}`} ref={root}>
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
        <ul className={`select-list${up ? ' is-up' : ''}`} role="listbox" id={listId} ref={list} aria-label={label} style={place}>
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
