import { accessStatus, accountOf, approvalOn, claimAccount, clearAccessCache, ID, replaceAuth, requestPath, StorageError, TOKEN, writeJson } from './_account.js'
import { deleteAccountData, timed } from './_deleteAccount.js'
import { deleteSupabaseMedia, deleteSupabaseUser, ensureProfile, mirrorApproval, rest, saveVault, setVaultAuth, supabaseOn, supabaseUser, vaultOf } from './_supabase.js'
import { overLimit, tooMany } from './_rate.js'
import { noticeSignup } from './_signupNotice.js'
import { getSettings } from './_settings.js'

/** The Supabase sign-in's half of /api/access: the person's sync account and deleting it (listed in access.ts). */
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

export async function vaultGet(request: Request): Promise<Response> {
  if (!supabaseOn()) return json({ error: 'not configured' }, 503)
  if (overLimit(request, 'vault-read', 60)) return tooMany()
  const user = await supabaseUser(request)
  if (!user) return json({ error: 'signed_out' }, 401)
  try {
    const account = await vaultOf(user.id)
    // The owner may have approved the sync account the old way: the profile follows, so its data may be written.
    if (account) {
      // A storage hiccup must not read as "not approved": the profile is only written when the status was really read.
      const status = await accessStatus(account.id).catch(() => null)
      if (status) await mirrorApproval(account.id, status)
    }
    return json({ account })
  } catch {
    return json({ error: 'supabase unavailable' }, 502)
  }
}

export async function vaultLink(request: Request, body: Record<string, unknown>): Promise<Response> {
  if (!supabaseOn()) return json({ error: 'not configured' }, 503)
  if (overLimit(request, 'vault-write', 10)) return tooMany()
  const user = await supabaseUser(request)
  if (!user) return json({ error: 'signed_out' }, 401)
  // Only a confirmed address links an account (and so gets AI and translation, and goes to the owner as a new sign-up):
  // Supabase's "Confirm email" makes this so today, this keeps it so if the setting is ever turned off.
  if (!user.confirmed) return json({ error: 'email_unconfirmed' }, 403)
  const { id, enc, auth } = body
  if (typeof id !== 'string' || typeof enc !== 'string' || typeof auth !== 'string' || !ID.test(id) || !TOKEN.test(enc) || !TOKEN.test(auth)) return json({ error: 'bad request' }, 400)
  const username = typeof body.username === 'string' && /^[\p{L}\p{N}._-]{3,32}$/u.test(body.username.trim()) ? body.username.trim() : ''
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : ''
  try {
    const had = await vaultOf(user.id)
    if (had && had.id !== id) return json({ error: 'linked' }, 409)
    // A new sync account is claimed for this token; an old one must be the token's (its password was right).
    if (!(await claimAccount(id, auth))) return json({ error: 'wrong' }, 403)
    await ensureProfile(user)
    if ((await saveVault(user.id, { id, enc, auth, username })) === 'taken') return json({ error: 'taken' }, 409)
    // A person's first sign-in (their account was just linked): the owner hears of it.
    if (!had) await noticeSignup({ email: user.email, name: user.name, username })
    // The owner chose to let new people in at once (admin screen → Ayarlar): approved at their first sign-in.
    if (!had && approvalOn() && (await getSettings()).autoApprove) {
      await rest(`profiles?user_id=eq.${user.id}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ approved: true, rejected: false }) }).catch(() => null)
    }
    if (!approvalOn()) {
      await mirrorApproval(id, 'approved')
      return json({ status: 'approved' })
    }
    clearAccessCache()
    const status = await accessStatus(id)
    await mirrorApproval(id, status)
    // The owner sees the person on the Yönetici card too, as with the old sign-up.
    if (status !== 'approved' && status !== 'rejected') await writeJson(requestPath(id), { username: username || user.name, note: note || user.email, at: new Date().toISOString() })
    return json({ status: status === 'none' ? 'pending' : status })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    return json({ error: 'supabase unavailable' }, 502)
  }
}

/**
 * A new random token for the person's sync account, with their Supabase sign-in: the old one (a copied key, an old
 * device's backup) stops working. The encryption key and the id stay, so the data and the other devices' copies do not
 * change; a signed-in device that sends the old token is refused and fetches the new one (src/data/access.ts).
 */
export async function vaultRotate(request: Request): Promise<Response> {
  if (!supabaseOn()) return json({ error: 'not configured' }, 503)
  if (overLimit(request, 'vault-write', 10)) return tooMany()
  const user = await supabaseUser(request)
  if (!user) return json({ error: 'signed_out' }, 401)
  try {
    const had = await vaultOf(user.id)
    if (!had) return json({ account: null })
    const auth = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('')
    // The person's row first: a device that fetches it then gets the token the server is about to check. If the check's
    // hash cannot be written, the row goes back, so the devices never hold a token the server refuses.
    await setVaultAuth(user.id, had.id, auth)
    try {
      await replaceAuth(had.id, auth)
    } catch (e) {
      await setVaultAuth(user.id, had.id, had.auth).catch(() => undefined)
      throw e
    }
    return json({ account: { ...had, auth } })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    return json({ error: 'supabase unavailable' }, 502)
  }
}

export async function accountDelete(request: Request): Promise<Response> {
  if (overLimit(request, 'account-delete', 5)) return tooMany()
  try {
    // With Supabase the person's own sign-in is what deletes them: the legacy token alone would leave their Supabase data behind.
    if (supabaseOn() && !request.headers.has('authorization')) return json({ error: 'signed_out' }, 401)
    const user = request.headers.has('authorization') ? await supabaseUser(request) : null
    if (request.headers.has('authorization') && !user) return json({ error: 'signed_out' }, 401)
    const id = user ? ((await vaultOf(user.id))?.id ?? null) : await accountOf(request)
    if (!user && !id) return json({ error: 'account_required' }, 403)
    // The server's stores and the person's Supabase files are separate: they go side by side. The person themselves
    // go last, so a failure before that leaves the account to try again (nothing is orphaned without its sign-in).
    const steps: Record<string, number> = {}
    const [removed] = await Promise.all([
      id ? timed(steps, 'data', () => deleteAccountData(id, steps)) : Promise.resolve(0),
      user ? timed(steps, 'media', () => deleteSupabaseMedia(user.id)) : Promise.resolve(),
    ])
    if (user) await timed(steps, 'user', () => deleteSupabaseUser(user.id))
    // Where the time went, in the Worker's logs: a slow deletion names its slow step.
    console.log('[account-delete]', JSON.stringify(steps))
    return json({ ok: true, removed })
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    return json({ error: 'delete failed' }, 502)
  }
}

