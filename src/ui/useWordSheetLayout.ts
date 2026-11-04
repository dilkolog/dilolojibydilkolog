import { useEffect, useState } from 'react'

/**
 * The word card of the reader, as a bottom sheet on a narrow screen: where it stands (as wide as
 * the text column, since a sidebar may take the left of the screen), and keeping the tapped word
 * from ending up behind it.
 */
export function useWordSheetLayout(openKey: string | undefined, openAt: string | undefined): { left: number; width: number } | null {
  const [sheetBox, setSheetBox] = useState<{ left: number; width: number } | null>(null)
  useEffect(() => {
    if (!openKey) return
    const measure = () => {
      const layout = document.querySelector<HTMLElement>('.reader-layout')
      if (layout) setSheetBox({ left: Math.round(layout.getBoundingClientRect().left), width: Math.round(layout.getBoundingClientRect().width) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [openKey])
  useEffect(() => {
    if (!openKey) return
    let cancelled = false
    let attempts = 0
    let lastHeight = 0
    const adjust = () => {
      if (cancelled) return
      const card = document.querySelector<HTMLElement>('.word-pop')
      // The word in the lit sentence (the same word may stand earlier in the text).
      const key = CSS.escape(openKey)
      const word = document.querySelector<HTMLElement>(`.rs.is-lit [data-key="${key}"]`) ?? document.querySelector<HTMLElement>(`[data-key="${key}"]`)
      if (!card || !word) {
        if (++attempts < 15) requestAnimationFrame(adjust)
        return
      }
      const pos = getComputedStyle(card).position
      if (pos !== 'fixed') {
        if (++attempts < 15) requestAnimationFrame(adjust)
        return
      }
      const h = card.offsetHeight
      // If card content is still rendering/expanding, wait for next frame
      if (h < 50 || (h !== lastHeight && attempts < 4)) {
        lastHeight = h
        if (++attempts < 15) requestAnimationFrame(adjust)
        return
      }
      // Where the sheet will stand (it is still rising into place, so its rectangle is not the answer yet).
      const top = innerHeight - parseFloat(getComputedStyle(card).bottom) - h
      const covered = word.getBoundingClientRect().bottom - (top - 12)
      if (covered > 0) window.scrollBy({ top: covered + 8, behavior: 'instant' })
    }
    const frame = requestAnimationFrame(adjust)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [openKey, openAt])
  return sheetBox
}
