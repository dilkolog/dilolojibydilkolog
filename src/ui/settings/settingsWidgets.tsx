import { useId, type ReactNode } from 'react'
import { Help } from './SettingHelp'

/** One choice among a few, as one segmented control (calmer than a row of separate chips). */
export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  format = String,
  label,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  format?: (v: T) => string
  label?: string
}) {
  // Keep a stored non-preset value selectable, in numeric order.
  const list = options.includes(value) ? options : [...options, value].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : 0))
  return (
    <div className="seg-group" role="radiogroup" aria-label={label}>
      {list.map((o) => (
        <button key={o} type="button" role="radio" className="seg-btn" aria-checked={o === value} onClick={() => onChange(o)}>
          {format(o)}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, help, advanced }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string; advanced?: boolean }) {
  // The whole row toggles (the label points at the switch, not at the ⓘ button inside it).
  const id = useId()
  return (
    <label className="toggle-row" htmlFor={id} data-advanced={advanced || undefined}>
      <span className="setting-text">
        <strong>{label}</strong>
        {help && <Help text={help} />}
      </span>
      <button id={id} type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
        <span />
      </button>
    </label>
  )
}

export function Row({ label, help, children, advanced }: { label: string; help?: string; children: ReactNode; advanced?: boolean }) {
  return (
    <div className="setting-row" data-advanced={advanced || undefined}>
      <div className="setting-text">
        <strong>{label}</strong>
        {help && <Help text={help} />}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )
}

/**
 * Settings most people never change: out of sight until the group's "Gelişmiş ayarlar" switch is on
 * (SettingsScreen), and always found by the search. A row or card can also carry `data-advanced` itself.
 */
export function Extra({ children }: { children: ReactNode }) {
  return (
    <div className="settings-extra" data-advanced="">
      {children}
    </div>
  )
}
