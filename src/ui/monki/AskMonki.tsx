import { useAi } from '../aiContext'
import { MonkiFace } from './MonkiMascot'
import { askMonki, type MonkiAsk } from './monkiBus'

/**
 * A small "ask Monki" button for a place in the app: sends its question to the chat, which opens.
 * Only there with a YZ key: the chat explains the setup itself, but a button on every word page
 * that leads to a setup note would be clutter.
 */
export function AskMonki({ ask, label = "Monki'ye sor", variant = 'button' }: { ask: () => MonkiAsk; label?: string; variant?: 'button' | 'link' }) {
  const { apiKey } = useAi()
  if (!apiKey) return null
  return (
    <button type="button" className={variant === 'link' ? 'link small ask-monki' : 'btn btn-sm btn-quiet ask-monki'} onClick={() => askMonki(ask())}>
      <MonkiFace face="happy" size={variant === 'link' ? 16 : 20} /> {label}
    </button>
  )
}
