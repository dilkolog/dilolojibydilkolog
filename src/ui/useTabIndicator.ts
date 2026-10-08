import { useLayoutEffect, useState } from 'react'

/**
 * One indicator that slides to the chosen tab instead of jumping: a bar under the tab (`ind-line`)
 * or a pill behind it (`ind-pill`). Returns a callback ref for the tab list; the chosen tab is the
 * child with aria-selected="true" or aria-current="page", measured again when `chosen` changes and
 * when the tabs resize (fonts loading, a count badge appearing). The first placement doesn't
 * animate; reduced motion turns the slide off with every other transition.
 */
export function useTabIndicator(chosen: unknown) {
  const [list, setList] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    if (!list) return
    const place = () => {
      const active = list.querySelector<HTMLElement>(':scope > [aria-selected="true"], :scope > [aria-current="page"]')
      list.classList.toggle('has-ind', !!active)
      if (!active) return
      list.style.setProperty('--ind-x', `${active.offsetLeft}px`)
      list.style.setProperty('--ind-y', `${active.offsetTop}px`)
      list.style.setProperty('--ind-w', `${active.offsetWidth}px`)
      list.style.setProperty('--ind-h', `${active.offsetHeight}px`)
    }
    place()
    const ready = requestAnimationFrame(() => list.classList.add('ind-ready'))
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
    if (resize) for (const el of [list, ...list.children]) resize.observe(el)
    return () => {
      cancelAnimationFrame(ready)
      resize?.disconnect()
    }
  }, [list, chosen])
  return setList
}
