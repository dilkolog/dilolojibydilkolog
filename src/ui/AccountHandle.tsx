import { useEffect, useState } from 'react'
import { cleanHandle, FriendsError, HANDLE_RULE, saveHandle } from '../data/friends'
import type { useAccountHandle } from './useAccountHandle'
import { pendingHandle } from './pendingHandle'
import { showToast } from './toastFeed'

const SAVE_REASONS: Record<string, string> = {
  taken: 'Bu ad başkasında. Başka bir ad dene.',
  locked: 'Kullanıcı adı bir kez seçilir, değiştirilemez.',
  bad_handle: 'Ad 3–20 karakter olmalı: küçük harf, rakam ve alt çizgi.',
}

type Handle = ReturnType<typeof useAccountHandle>

/** Beside the name: @name, chosen once (at sign-up or here) and fixed afterwards. */
export function HandleTag({ handle }: { handle: Handle }) {
  const { info } = handle
  if (!info?.handle) return null
  return (
    <span className="account-handle" title="Kullanıcı adın sonradan değişmez">
      @{info.handle}
    </span>
  )
}

/**
 * Below the email, when there is no @name yet (chosen once, never changed): a one-line form, the name picked at
 * sign-up already filled in. A first name is findable at once, as one picked at sign-up is: friends search by it.
 */
export function HandleForm({ handle }: { handle: Handle }) {
  const { info, setInfo } = handle
  const [draft, setDraft] = useState(() => info?.handle || pendingHandle() || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (info) setDraft(info.handle || pendingHandle() || '')
  }, [info])

  if (!info || info.handle) return null
  const name = cleanHandle(draft)
  const valid = HANDLE_RULE.test(name)

  const save = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError('')
    try {
      const saved = await saveHandle(name, true)
      setInfo(saved)
      showToast(`Kullanıcı adın @${saved.handle}.`)
    } catch (e) {
      setError(e instanceof FriendsError ? (SAVE_REASONS[e.reason] ?? 'Kaydedilemedi, biraz sonra yine dene.') : 'Kaydedilemedi, biraz sonra yine dene.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="account-handle-form"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div className="account-handle-row">
        <label className="account-handle-field">
          <span className="sr-only">Kullanıcı adı</span>
          <span className="account-handle-at" aria-hidden>
            @
          </span>
          <input
            className="input"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setError('')
            }}
            placeholder="kullanici_adi"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={21}
            aria-describedby="account-handle-hint"
          />
        </label>
        <button type="submit" className="btn btn-sm" disabled={!valid || saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
      <p id="account-handle-hint" className={error ? 'error small' : 'small muted'} role={error ? 'alert' : undefined}>
        {error || 'Bir kullanıcı adı seç: arkadaşların seni bu adla bulur. Bir kez seçilir, sonradan değişmez. 3–20 karakter: küçük harf, rakam ve alt çizgi.'}
      </p>
    </form>
  )
}
