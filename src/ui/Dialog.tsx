import { useEffect, useRef, type ReactNode } from 'react'

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
  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onCancel()
      }
    }
    // Capture phase, so the dialog handles Esc before any screen-level shortcut.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onCancel])

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title" className="section-title">
          {title}
        </h2>
        {children && <div className="muted">{children}</div>}
        <div className="dialog-actions">
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
