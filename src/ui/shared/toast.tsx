import { useEffect, useState, type CSSProperties } from 'react'
import { CheckIcon, InfoIcon, UndoIcon } from './icons'
import { setToastListener, type Toast, type ToastKind } from './toastFeed'

export type { ToastKind, Toast }

const ICON = { success: CheckIcon, info: InfoIcon, undo: UndoIcon }

export function Toaster() {
  const [toast, setToast] = useState<Toast | null>(null)
  useEffect(() => {
    setToastListener(setToast)
    return () => {
      setToastListener(null)
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
