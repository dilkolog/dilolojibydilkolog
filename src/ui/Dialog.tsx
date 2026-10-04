import { useEffect, useRef, type ReactNode } from 'react'
import { AlertIcon, CheckIcon } from './icons'

/**
 * Modal confirmation. The safe choice (cancel) has focus, Esc cancels, and clicks outside cancel,
 * so an accidental keypress never throws away what the user was doing.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Vazgeç',
  danger,
  onConfirm,
  onCancel,
}: {
  title: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onCancel()
        return
      }
      // Arrow keys move between the buttons (Tab works too); Enter presses the focused one.
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const buttons = [...(actionsRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
        if (!buttons.length) return
        e.preventDefault()
        e.stopImmediatePropagation()
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1
        buttons[(at + step + buttons.length) % buttons.length].focus()
      }
    }
    // Capture phase, so the dialog handles Esc before any screen-level shortcut.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onCancel])

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-head">
          <span className={`dialog-badge${danger ? ' is-danger' : ''}`} aria-hidden>
            {danger ? <AlertIcon size={20} /> : <CheckIcon size={20} />}
          </span>
          <h2 id="dialog-title" className="section-title">
            {title}
          </h2>
        </div>
        {children && <div className="muted dialog-body">{children}</div>}
        <div className="dialog-actions" ref={actionsRef}>
          <button ref={cancelRef} className="btn btn-quiet" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={danger ? 'btn btn-bad' : 'btn'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
