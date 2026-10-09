import { ACCENT_KEYS } from '../engine/accents'
import type { TargetLanguage } from '../engine/types'
export function AccentBar({ language, onInsert, disabled }: { language: TargetLanguage; onInsert: (ch: string) => void; disabled?: boolean }) {
  const keys = ACCENT_KEYS[language]
  if (!keys.length) return null
  return (
    <div className="accent-bar" role="toolbar" aria-label="Aksanlı harfler">
      {keys.map((k) => (
        <button key={k} type="button" className="accent-key" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => onInsert(k)} lang={language}>
          {k}
        </button>
      ))}
    </div>
  )
}
