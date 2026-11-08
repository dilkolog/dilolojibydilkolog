/**
 * Comparing a bearer token with the server's secrets without leaking, through timing, how much of it matched:
 * both sides are hashed first (equal length, no early exit on the first differing character) and compared byte by byte.
 */

const digest = async (text: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))

/** Whether `given` equals `secret`, in time that does not depend on where they differ. An empty secret never matches. */
export async function secretMatches(given: string, secret: string): Promise<boolean> {
  if (!secret) return false
  const [a, b] = await Promise.all([digest(secret), digest(given)])
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/** Whether `given` equals any of `secrets` (a rotation keeps the old and the new key for a while); every one is compared. */
export async function anySecretMatches(given: string, secrets: string[]): Promise<boolean> {
  const results = await Promise.all(secrets.map((s) => secretMatches(given, s)))
  return results.some(Boolean)
}

/** The token of an `Authorization: Bearer …` header, or '' when there is none. */
export const bearerOf = (request: Request) => /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]?.trim() ?? ''
