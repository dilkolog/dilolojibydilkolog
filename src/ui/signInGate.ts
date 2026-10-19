import { ACCOUNT_EVENT } from '../data/access'

let signing = 0

/** Whether a sign-in is completing (the account is set on this device, its first sync still running). */
export const signingIn = () => signing > 0

/**
 * Runs the work of completing a sign-in. The gate (useSignedIn) stays closed while it runs, so a new device does not
 * start Onboarding on top of the sync that is about to bring the person's own settings, and the sign-in page stays
 * until the account is truly ready. The gate is told when it ends.
 */
export async function whileSigningIn<T>(work: () => Promise<T>): Promise<T> {
  signing++
  try {
    return await work()
  } finally {
    signing--
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(ACCOUNT_EVENT))
  }
}
