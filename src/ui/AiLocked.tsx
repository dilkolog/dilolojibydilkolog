import { LockIcon } from './icons'
import { lockedText, type Helper } from './aiLockText'


/** The locked state of a paid helper (AI, pronunciation scoring, natural voice) where it would be used. */
export function AiLocked({ helper = 'ai', text }: { helper?: Helper; text?: string }) {
  return (
    <p className="note ai-locked" role="status">
      <LockIcon size={16} className="ai-locked-icon" />
      <span>{text ?? lockedText(helper)}</span>
    </p>
  )
}
