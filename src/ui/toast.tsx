import { useEffect, useState } from 'react'

interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => unknown }
  ms: number
}

let listener: ((t: Toast | null) => void) | null = null
let nextId = 1

/** A short message at the bottom of the screen; a newer one replaces it. */
export function showToast(text: string, action?: Toast['action'], ms = 4000) {
  listener?.({ id: nextId++, text, action, ms })
}

/**
 * Deleting goes ahead right away and can be taken back for a few seconds, everywhere in the app
 * the same way (instead of asking "are you sure?" first).
 */
export function undoable(text: string, undo: () => unknown) {
  showToast(text, { label: 'Geri al', run: undo }, 7000)
}

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
  return (
    <div className="toast toast-action" role="status" key={toast.id}>
      <span>{toast.text}</span>
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
    </div>
  )
}
