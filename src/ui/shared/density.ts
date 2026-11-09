/**
 * List density, per device (a laptop may want compact lists, a phone roomy ones): set on <html> as
 * data-density so every list follows it.
 */
const KEY = 'kelime-koc:density'
export type Density = 'comfortable' | 'compact'

export function getDensity(): Density {
  try {
    return localStorage.getItem(KEY) === 'compact' ? 'compact' : 'comfortable'
  } catch {
    return 'comfortable'
  }
}

export function setDensity(d: Density) {
  try {
    localStorage.setItem(KEY, d)
  } catch {
    // Applies for this visit only.
  }
  applyDensity(d)
}

export function applyDensity(d: Density = getDensity()) {
  if (typeof document === 'undefined') return
  if (d === 'compact') document.documentElement.dataset.density = 'compact'
  else delete document.documentElement.dataset.density
}
