import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDownIcon } from './icons'

/** A long page in groups: a sticky row of shortcuts that jumps to each group's title and highlights the active section. */
export function JumpNav({
  groups,
  label,
  initialActive,
  onPick,
}: {
  groups: readonly (readonly [string, string])[]
  label: string
  initialActive?: string
  /** Called first, so a collapsed group can open before the page scrolls to it. */
  onPick?: (id: string) => void
}) {
  const [active, setActive] = useState<string>(initialActive || groups[0]?.[0] || '')
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: 0 }
    )
    for (const [id] of groups) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [groups])

  return (
    <nav ref={navRef} className="settings-nav" aria-label={label}>
      {groups.map(([id, name]) => {
        const isSelected = active === id
        return (
          <button
            key={id}
            type="button"
            className="chip chip-sm"
            aria-pressed={isSelected}
            onClick={(e) => {
              setActive(id)
              onPick?.(id)
              e.currentTarget.scrollIntoView?.({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
              // After the click's render, so a group that just opened is there to scroll to.
              requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }))
            }}
          >
            {name}
          </button>
        )
      })}
    </nav>
  )
}

/** A group title that opens and closes its group (the page keeps the group's content out of the DOM while closed). */
export function GroupToggle({ id, icon, open, onToggle, children }: { id: string; icon?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <h2 id={id} className="settings-group-title">
      <button type="button" className="group-toggle" aria-expanded={open} onClick={onToggle}>
        {icon && <span className="group-icon">{icon}</span>}
        {children}
        <ChevronDownIcon size={18} className="group-chevron" />
      </button>
    </h2>
  )
}
