import { useEffect, useState, type CSSProperties } from 'react'
import { CheckIcon, InfoIcon, UndoIcon } from './icons'

export type ToastKind = 'success' | 'info' | 'undo'

interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => unknown }
  ms: number
  kind: ToastKind
}

let listener: ((t: Toast | null) => void) | null = null
let nextId = 1

/** A short message at the bottom of the screen; a newer one replaces it. */
export function showToast(text: string, action?: Toast['action'], ms = 4000, kind: ToastKind = action ? 'info' : 'success') {
  listener?.({ id: nextId++, text, action, ms, kind })
}

/**
 * Deleting goes ahead right away and can be taken back for a few seconds, everywhere in the app
 * the same way (instead of asking "are you sure?" first). A thin line shows the time left.
 */
export function undoable(text: string, undo: () => unknown) {
  showToast(text, { label: 'Geri al', run: undo }, 7000, 'undo')
}

const ICON = { success: CheckIcon, info: InfoIcon, undo: UndoIcon }

export function Toaster() {
  const [toast, setToast] = useState<Toast | null>(null)
  useEffect(() => {
    listener = setToast
    return () => {
      listener = null
    }
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), toast.ms)
    return () => clearTimeout(t)
  }, [toast])
  if (!toast) return null
  const Icon = ICON[toast.kind]
  return (
    <div className={`toast toast-${toast.kind}`} role="status" key={toast.id} style={{ '--toast-ms': `${toast.ms}ms` } as CSSProperties}>
      <span className="toast-icon" aria-hidden>
        <Icon size={15} />
      </span>
      <span className="toast-text">{toast.text}</span>
      {toast.action && (
        <button
          className="toast-btn"
          onClick={() => {
            setToast(null)
            void toast.action!.run()
          }}
        >
          {toast.action.label}
        </button>
      )}
      {toast.kind === 'undo' && <span className="toast-timer" aria-hidden />}
    </div>
  )
}
