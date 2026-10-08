import { useState } from 'react'
import { InfoIcon } from './icons'
import { splitHelp } from './splitHelp'

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

