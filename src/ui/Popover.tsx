import { useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

/**
 * A button that opens a small panel under it: for the few things a screen keeps one tap away rather than on
 * show all the time. Closes on Escape (focus goes back to the button), on a press outside, and when the
 * content asks (`close`). `kind="menu"` is a list of actions (see MenuItem), the default a panel with controls in it.
 */
export function Popover({
  button,
  buttonClassName = 'btn btn-quiet',
  buttonProps,
  label,
  kind = 'panel',
  align = 'start',
  children,
}: {
  button: ReactNode
  buttonClassName?: string
  buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>
  /** What a screen reader hears for the panel. */
  label: string
  kind?: 'panel' | 'menu'
  align?: 'start' | 'end'
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  // Where a long panel fits: under the button when there is room, else above it; never taller than that room.
  const [fit, setFit] = useState<{ above: boolean; maxHeight: number } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onPress = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', onPress)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPress)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !trigger.current) return void setFit(null)
    const r = trigger.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 16
    const above = r.top - 16
    // A phone's panel is a sheet at the bottom of the screen (see CSS): it brings its own height.
    if (window.matchMedia('(max-width: 30rem)').matches) return void setFit(null)
    setFit(below >= 260 || below >= above ? { above: false, maxHeight: below } : { above: true, maxHeight: above })
  }, [open])

  // A menu starts on its first item so the keyboard can go straight down it.
  useEffect(() => {
    if (open && kind === 'menu') root.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus()
  }, [open, kind])

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (kind !== 'menu' || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
    const items = [...(root.current?.querySelectorAll<HTMLElement>('[role=menuitem]:not(:disabled)') ?? [])]
    const at = items.indexOf(document.activeElement as HTMLElement)
    items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
    e.preventDefault()
  }

  return (
    <div className="popover" ref={root} onKeyDown={onMenuKey}>
      <button ref={trigger} type="button" className={buttonClassName} aria-haspopup={kind === 'menu' ? 'menu' : 'dialog'} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)} {...buttonProps}>
        {button}
      </button>
      {open && (
        <div id={id} className={`popover-panel is-${align}${kind === 'menu' ? ' is-menu' : ''}${fit?.above ? ' is-above' : ''}`} style={fit ? { maxHeight: fit.maxHeight } : undefined} role={kind === 'menu' ? 'menu' : 'dialog'} aria-label={label}>
          {children(close)}
        </div>
      )}
    </div>
  )
}

/** One action in a `kind="menu"` popover: a title and, under it, a line of help. */
export function MenuItem({
  icon,
  title,
  hint,
  onSelect,
  disabled,
  selected,
  className,
}: {
  icon?: ReactNode
  title: string
  hint?: string
  onSelect: () => void
  disabled?: boolean
  selected?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-selected={selected}
      className={`menu-item${selected ? ' is-selected' : ''}${className ? ` ${className}` : ''}`}
      disabled={disabled}
      onClick={onSelect}
    >
      {icon && <span className="menu-item-icon" aria-hidden>{icon}</span>}
      <span className="menu-item-text">
        <strong>{title}</strong>
        {hint && <span className="small muted">{hint}</span>}
      </span>
    </button>
  )
}
