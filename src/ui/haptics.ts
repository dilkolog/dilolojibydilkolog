/**
 * Defensive haptic feedback helpers for mobile touch interactions.
 * Fails safely on desktop or unsupported environments.
 */
export const haptics = {
  /** Brief subtle tick on button press or card drag commit. */
  tap: () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12)
      }
    } catch {
      // Ignored
    }
  },
  /** Clean double-pulse on correct answers. */
  success: () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([15, 40, 25])
      }
    } catch {
      // Ignored
    }
  },
  /** Single firm pulse on mistake. */
  error: () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(35)
      }
    } catch {
      // Ignored
    }
  },
  /** Orchestrated rhythmic celebration on high scores, records, and stage level-ups. */
  victory: () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([25, 50, 30, 60, 45])
      }
    } catch {
      // Ignored
    }
  },
}
