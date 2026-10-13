import type { MonkiMode } from '../../ai'

/** A question for Monki from elsewhere in the app: shown in the chat, sent at once when `send` is set. */
export interface MonkiAsk {
  text: string
  mode?: MonkiMode
  scenario?: string
  send?: boolean
}

type Listener = (ask: MonkiAsk) => void
let listener: Listener | null = null
let waiting: MonkiAsk | null = null

/** The chat (a lazy chunk) listens while it is mounted; a question asked before it is there waits for it. */
export function setMonkiListener(next: Listener | null) {
  listener = next
  if (next && waiting) {
    const ask = waiting
    waiting = null
    next(ask)
  }
}

export function askMonki(ask: MonkiAsk) {
  if (listener) listener(ask)
  else waiting = ask
}
