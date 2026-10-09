export type ToastKind = 'success' | 'info' | 'undo'

export interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => unknown }
  ms: number
  kind: ToastKind
}

let listener: ((t: Toast | null) => void) | null = null
let nextId = 1

export function setToastListener(fn: ((t: Toast | null) => void) | null) {
  listener = fn
}

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
