import type { ChangeEvent } from 'react'
import { applyAccentShortcuts } from '../engine/accents'
import type { TargetLanguage } from '../engine/types'
import { prefs } from './prefs'

/**
 * onChange for a text field that applies the accent shortcuts (e' → é) as you type, keeping
 * the caret where it was.
 */
export function accentChange(language: TargetLanguage, set: (value: string) => void) {
  return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const el = e.target
    const typed = el.value
    const next = prefs.accentShortcuts ? applyAccentShortcuts(typed, language) : typed
    const caret = (el.selectionStart ?? typed.length) - (typed.length - next.length)
    set(next)
    if (next !== typed) requestAnimationFrame(() => el.setSelectionRange(caret, caret))
  }
}

/** Inserts `ch` at the caret of `el`, returning the new value. */
export function insertAt(el: HTMLInputElement | HTMLTextAreaElement, ch: string): string {
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? start
  const value = el.value.slice(0, start) + ch + el.value.slice(end)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + ch.length, start + ch.length)
  })
  return value
}
