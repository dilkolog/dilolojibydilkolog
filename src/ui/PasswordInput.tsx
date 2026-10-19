import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'

/**
 * A password field with its show/hide switch inside it, as an eye icon (a text link under the field took a line
 * and read as a second action). The two fields of a sign-up can share one switch: pass `shown` and `onShownChange`.
 */
export function PasswordInput({
  value,
  onChange,
  autoComplete,
  autoFocus,
  shown,
  onShownChange,
}: {
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  autoFocus?: boolean
  shown?: boolean
  onShownChange?: (shown: boolean) => void
}) {
  const [own, setOwn] = useState(false)
  const visible = shown ?? own
  const toggle = () => (onShownChange ? onShownChange(!visible) : setOwn(!visible))
  return (
    <span className="password-field">
      <input className="input" type={visible ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} autoFocus={autoFocus} autoCapitalize="off" spellCheck={false} />
      <button
        type="button"
        className="password-toggle"
        aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        aria-pressed={visible}
        // Keeps the focus (and the keyboard on a phone) in the field.
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggle}
      >
        {visible ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
      </button>
    </span>
  )
}
