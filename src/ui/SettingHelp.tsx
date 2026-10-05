import { useState } from 'react'
import { InfoIcon } from './icons'

/**
 * A setting's explanation: the first sentence always, the rest behind ⓘ. Every setting carrying
 * three lines of small print made the page a wall of text nobody could scan.
 */
export function splitHelp(help: string): [string, string] {
  const m = help.match(/^(.+?[.!?])\s+(\S.*)$/s)
  return m && m[1].length >= 24 ? [m[1], m[2]] : [help, '']
}

export function Help({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const [first, rest] = splitHelp(text)
  return (
    <span className="setting-help small muted">
      {first}
      {rest && (
        <>
          {' '}
          <button
            type="button"
            className="help-more"
            aria-expanded={open}
            aria-label={open ? 'Ayrıntıyı gizle' : 'Ayrıntı'}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpen((o) => !o)
            }}
          >
            <InfoIcon size={14} />
          </button>
          {open && <span className="help-rest">{rest}</span>}
        </>
      )}
    </span>
  )
}

