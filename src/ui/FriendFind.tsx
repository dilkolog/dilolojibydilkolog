import { useEffect, useState } from 'react'
import type { Profile } from '../data/db'
import { cleanHandle, findFriend, FriendsError, HANDLE_RULE, loadHandle, requestFriend, saveHandle, type FoundFriend, type HandleInfo } from '../data/friends'
import { Avatar } from './Avatar'
import { Toggle } from './settingsWidgets'
import { showToast } from './toastFeed'

const SAVE_REASONS: Record<string, string> = {
  taken: 'Bu ad başkasında. Başka bir ad dene.',
  bad_handle: 'Ad 3–20 karakter olmalı: küçük harf, rakam ve alt çizgi.',
}
const REQUEST_REASONS: Record<string, string> = {
  unknown: 'Bu adla bulunabilir biri yok.',
  self: 'Bu sen oldun.',
  already: 'Zaten arkadaşsınız.',
}

/**
 * Finding a friend by a chosen @name: the search shows a person only when they picked a name and switched
 * "findable" on, and finding them only sends a request that they accept in their inbox. Below it, the own name.
 */
export function FriendFind({ onSent }: { onSent?: () => void }) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [found, setFound] = useState<FoundFriend | null>(null)
  const [missed, setMissed] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [mine, setMine] = useState<HandleInfo | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let live = true
    void loadHandle()
      .then((info) => {
        if (!live) return
        setMine(info)
        setDraft(info.handle)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])

  const search = async () => {
    const name = cleanHandle(query)
    if (!HANDLE_RULE.test(name)) {
      setFound(null)
      setMissed(true)
      return
    }
    setSearching(true)
    setSent(null)
    try {
      const person = await findFriend(name)
      setFound(person)
      setMissed(!person)
    } catch {
      showToast('Arama şu an yapılamadı, biraz sonra yine dene.', undefined, 4000, 'info')
    } finally {
      setSearching(false)
    }
  }

  const request = async (person: FoundFriend) => {
    try {
      await requestFriend(person.handle)
      setSent(person.handle)
      showToast(`${person.name} adlı kişiye istek gönderildi.`)
      onSent?.()
    } catch (e) {
      showToast(e instanceof FriendsError ? (REQUEST_REASONS[e.reason] ?? 'İstek gönderilemedi, biraz sonra yine dene.') : 'İstek gönderilemedi, biraz sonra yine dene.', undefined, 5000, 'info')
    }
  }

  const save = async (handle: string, findable: boolean) => {
    setSaving(true)
    try {
      const info = await saveHandle(handle, findable)
      setMine(info)
      setDraft(info.handle)
      showToast(findable ? `@${info.handle} adıyla bulunabilirsin.` : 'Artık aramada görünmüyorsun.')
    } catch (e) {
      showToast(e instanceof FriendsError ? (SAVE_REASONS[e.reason] ?? 'Kaydedilemedi, biraz sonra yine dene.') : 'Kaydedilemedi, biraz sonra yine dene.', undefined, 5000, 'info')
    } finally {
      setSaving(false)
    }
  }

  const draftName = cleanHandle(draft)
  const findable = mine?.findable === true
  return (
    <div className="stack gap-2 friends-find">
      <form
        className="friends-find-form"
        onSubmit={(e) => {
          e.preventDefault()
          void search()
        }}
      >
        <input
          className="input friends-find-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setMissed(false)
          }}
          placeholder="@kullanıcı adıyla ara"
          aria-label="Arkadaşının kullanıcı adı"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={21}
        />
        <button type="submit" className="btn btn-sm" disabled={searching || !query.trim()}>
          {searching ? 'Aranıyor…' : 'Ara'}
        </button>
      </form>
      {missed && <p className="small muted">Bu adla bulunabilir biri yok. Arkadaşın önce “Seni bulabilsinler” ayarını açmış olmalı.</p>}
      {found && (
        <div className="friends-found">
          <Avatar profile={{ name: found.name, emoji: found.avatar || '🙂', color: found.color, motto: '' } as Profile} size={36} />
          <span className="friends-found-text">
            <strong>{found.name}</strong>
            <span className="small muted">
              @{found.handle} · Sv. {found.level}
            </span>
          </span>
          <button type="button" className="btn btn-sm" disabled={sent === found.handle} onClick={() => void request(found)}>
            {sent === found.handle ? 'İstek gitti' : 'İstek gönder'}
          </button>
        </div>
      )}
      <div className="friends-find-mine stack gap-2">
        <Toggle
          checked={findable}
          onChange={(v) => {
            if (v && !mine?.handle) {
              // A name is needed first.
              if (HANDLE_RULE.test(draftName)) void save(draftName, true)
              else showToast('Önce 3–20 karakterlik bir kullanıcı adı yaz.', undefined, 4000, 'info')
            } else if (mine?.handle) void save(mine.handle, v)
          }}
          label="Seni bulabilsinler"
          help="Açıkken, kullanıcı adını tam yazan biri seni bulup arkadaşlık isteği gönderebilir. E-postan ve gerçek adın aramada kullanılmaz; istek, sen kabul edene kadar XP'ni göstermez."
        />
        <form
          className="friends-find-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (HANDLE_RULE.test(draftName)) void save(draftName, findable)
            else showToast(SAVE_REASONS.bad_handle, undefined, 4000, 'info')
          }}
        >
          <input
            className="input friends-find-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Senin kullanıcı adın (örn: ayse_fr)"
            aria-label="Senin kullanıcı adın"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={21}
          />
          <button type="submit" className="btn btn-sm" disabled={saving || !draftName || draftName === mine?.handle}>
            Kaydet
          </button>
        </form>
      </div>
    </div>
  )
}
