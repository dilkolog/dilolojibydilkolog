/**
 * The @name picked on the sign-up form. The server can only hold it once there is an account it accepts (and the
 * mail confirmation may send the person away and back), so it waits on the device until HandleClaim uses it.
 */
const KEY = 'diloloji:pending-handle'

export function setPendingHandle(handle: string): void {
  try {
    localStorage.setItem(KEY, handle)
  } catch {
    // Storage blocked: the name can still be chosen later on the friends card.
  }
}

export function pendingHandle(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function clearPendingHandle(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
