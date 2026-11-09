/**
 * One focus rule for every modal (anything with aria-modal="true"): while it is open, focus stays
 * inside it — Tab wraps around and focus that lands behind it (a late autofocus, a click) is brought
 * back — and when it closes, focus returns to where it was before it opened.
 */
const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

const topModal = (): HTMLElement | null => {
  const all = document.querySelectorAll<HTMLElement>('[aria-modal="true"]')
  return all.length ? all[all.length - 1] : null
}
const focusables = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)

export function installFocusTrap(doc: Document = document) {
  let before: HTMLElement | null = null
  let open = false
  doc.addEventListener('focusin', (e) => {
    const modal = topModal()
    const target = e.target as HTMLElement
    if (!modal) {
      before = target
      return
    }
    if (!modal.contains(target)) (focusables(modal)[0] ?? modal).focus()
  })
  doc.addEventListener('keydown', (e) => {
    const modal = topModal()
    if (!modal || e.key !== 'Tab') return
    const list = focusables(modal)
    if (!list.length) return
    const first = list[0]
    const last = list[list.length - 1]
    if (e.shiftKey && (doc.activeElement === first || !modal.contains(doc.activeElement))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && doc.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  })
  new MutationObserver(() => {
    const now = !!topModal()
    if (open && !now && before?.isConnected && (doc.activeElement === doc.body || !doc.activeElement)) before.focus()
    open = now
  }).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal'] })
}
