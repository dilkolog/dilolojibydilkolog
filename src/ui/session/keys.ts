/** Keyboard helpers shared by the session screens. */

/** Shortcuts are paused while a dialog is open. */
export const modalOpen = () => !!document.querySelector('[aria-modal="true"]')

/** Typing into a field (or a button that handles Enter itself) owns the key. */
export const ownsKey = (t: EventTarget | null) => t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLButtonElement || t instanceof HTMLSelectElement
