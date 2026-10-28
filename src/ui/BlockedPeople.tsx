import { useState } from 'react'
import '../lazy.css'
import { loadBlocked, unblockFriend, type BlockedPerson } from '../data/friends'
import type { Profile } from '../data/db'
import { Avatar } from './Avatar'
import { showToast } from './toastFeed'

/**
 * The block list (Arkadaşlar → Arkadaş ekle): whom the learner blocked or took off their friends, read when it is
 * opened. Lifting a block lets them find and ask the learner again; nothing comes back by itself.
 */
export default function BlockedPeople({ onChanged }: { onChanged?: () => void }) {
  const [people, setPeople] = useState<BlockedPerson[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    setFailed(false)
    try {
      setPeople(await loadBlocked())
    } catch {
      setFailed(true)
    }
  }
  const lift = async (p: BlockedPerson) => {
    setBusy(p.code)
    try {
      await unblockFriend(p.code)
      setPeople((cur) => cur?.filter((x) => x.code !== p.code) ?? null)
      showToast(`${p.name || 'Engel'} kaldırıldı.`)
      onChanged?.()
    } catch {
      showToast('Engel kaldırılamadı, biraz sonra yine dene.', undefined, 5000, 'info')
    } finally {
      setBusy(null)
    }
  }

  return (
    <details className="blocked-people" onToggle={(e) => e.currentTarget.open && people === null && void load()}>
      <summary className="small">Engellediklerin</summary>
      {failed && (
        <p className="small error" role="alert">
          Liste açılamadı.{' '}
          <button type="button" className="link small" onClick={() => void load()}>
            Yine dene
          </button>
        </p>
      )}
      {!failed && people === null && <p className="small muted">Yükleniyor…</p>}
      {people && people.length === 0 && <p className="small muted">Kimseyi engellemedin. Arkadaşlarından çıkardığın ya da engellediğin kişiler burada görünür.</p>}
      {people && people.length > 0 && (
        <ul className="plain blocked-list">
          {people.map((p) => (
            <li key={p.code}>
              <Avatar profile={{ name: p.name || '?', emoji: p.avatar || '🙂', color: p.color, motto: '' } as Profile} size={26} />
              <span className="grow">{p.name || 'Adı görünmüyor'}</span>
              <button type="button" className="btn btn-sm btn-quiet" disabled={busy !== null} onClick={() => void lift(p)}>
                Engeli kaldır
              </button>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
