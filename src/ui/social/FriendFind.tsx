import { useState } from 'react'
import type { Profile } from '../../data/db'
import { cleanHandle, findFriend, FriendsError, HANDLE_RULE, requestFriend, type FoundFriend } from '../../data/friends'
import { Avatar } from '../profile/Avatar'
import { showToast } from '../shared/toastFeed'

const REQUEST_REASONS: Record<string, string> = {
  unknown: 'Bu adla bulunabilir biri yok.',
  self: 'Bu sen oldun.',
  already: 'Zaten arkadaşsınız.',
}

/**
 * Finding a friend by a chosen @name: the search shows a person only when they picked a name and switched
 * "findable" on (Gizlilik, FindableSetting), and finding them only sends a request that they accept in their inbox.
 */
export function FriendFind({ onSent }: { onSent?: () => void }) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [found, setFound] = useState<FoundFriend | null>(null)
  const [missed, setMissed] = useState(false)
  const [sent, setSent] = useState<string | null>(null)

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
    </div>
  )
}
