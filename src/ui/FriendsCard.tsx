import { useCallback, useEffect, useState } from 'react'
import type { Profile } from '../data/db'
import { addFriend, FriendsError, loadFriends, publishFriendCard, recentDays, removeFriend, showCode, type FriendView } from '../data/friends'
import { localDate } from '../engine/progress'
import { useAccess } from './accessContext'
import { Avatar } from './Avatar'
import { CloseIcon, CopyIcon, FlameIcon, PlusIcon } from './icons'
import type { GameState } from './game'
import { showToast } from './toastFeed'
import { NEW_ART } from './drawnArt'

/** The last card published from this device, so an unchanged one is not written again. */
const SENT_KEY = 'diloloji:friend-card'

const REASONS: Record<string, string> = {
  unknown: 'Bu kodla bir arkadaş bulunamadı. Kodu bir daha kontrol et.',
  self: 'Bu senin kendi kodun.',
  full: 'En çok 50 arkadaş eklenebiliyor.',
}

/**
 * Today's friends card: the day's or the week's XP of the learner and the friends who added each
 * other's codes, as a small leaderboard. Adding a friend is their code; one's own code is shown to
 * pass on. Only for an approved account (the cards live on the server).
 */
export function FriendsCard({ game, profile }: { game: GameState | null; profile: Profile }) {
  const access = useAccess()
  const [range, setRange] = useState<'today' | 'week'>('today')
  const [data, setData] = useState<{ me: FriendView; friends: FriendView[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [code, setCode] = useState('')
  const [adding, setAdding] = useState(false)
  const today = localDate(new Date())

  const refresh = useCallback(async () => {
    try {
      setData(await loadFriends(today))
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [today])

  // The own card goes up when it changed (a session's XP, a new avatar), then the board is read.
  useEffect(() => {
    if (!access.approved || !game) return
    let live = true
    const card = { name: profile.name.trim() || 'Arkadaş', avatar: profile.emoji, color: profile.color, days: recentDays(game.xp.byDay, today), streak: game.streak, level: game.level.level }
    const key = JSON.stringify(card)
    let sent: string | null = null
    try {
      sent = localStorage.getItem(SENT_KEY)
    } catch {
      // Sent again, which costs one write.
    }
    void (async () => {
      if (sent !== key) {
        await publishFriendCard(card, today).catch(() => undefined)
        try {
          localStorage.setItem(SENT_KEY, key)
        } catch {
          // Not remembered: the next visit sends it again.
        }
      }
      if (live) await refresh()
    })()
    return () => {
      live = false
    }
  }, [access.approved, game?.xp.total, game?.streak, profile.name, profile.emoji, profile.color, today]) // eslint-disable-line react-hooks/exhaustive-deps

  if (access.status === 'unknown') return null
  if (!access.approved)
    return (
      <section className="card stack gap-2 friends-card">
        <h2 className="section-title">Arkadaşlar</h2>
        <p className="small muted">
          {access.status === 'signedOut'
            ? 'Arkadaşlarınla günlük XP yarışı için bir hesap aç: Ayarlar → Hesap.'
            : 'Arkadaşlarınla yarış, onaylanan hesaplarda açılıyor; hesabın onay bekliyor.'}
        </p>
      </section>
    )

  const add = async () => {
    const c = code.trim()
    if (!c) return
    setAdding(true)
    try {
      await addFriend(c)
      setCode('')
      showToast('Arkadaşın eklendi.')
      await refresh()
    } catch (e) {
      showToast(e instanceof FriendsError ? (REASONS[e.reason] ?? 'Eklenemedi, biraz sonra yine dene.') : 'Eklenemedi, biraz sonra yine dene.', undefined, 5000, 'info')
    } finally {
      setAdding(false)
    }
  }
  const remove = async (f: FriendView) => {
    await removeFriend(f.code).catch(() => undefined)
    showToast(`${f.name} listenden çıkarıldı.`)
    await refresh()
  }
  const copy = async () => {
    if (!data) return
    const text = `Diloloji'de arkadaş kodum: ${showCode(data.me.code)}`
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(showCode(data.me.code))
        showToast('Kodun kopyalandı.')
      }
    } catch {
      // Closed the share sheet.
    }
  }

  const xpOf = (f: FriendView) => (range === 'today' ? f.today : f.week)
  const board = data ? [{ ...data.me, me: true }, ...data.friends.map((f) => ({ ...f, me: false }))].sort((a, b) => xpOf(b) - xpOf(a) || Number(b.me) - Number(a.me)) : []
  return (
    <section className="card stack gap-2 friends-card" aria-label="Arkadaşlar">
      <div className="friends-head">
        <h2 className="section-title friends-title">
          <img className="friends-art" src={NEW_ART.friendsTogether} alt="" height={44} draggable={false} />
          Arkadaşlar
        </h2>
        <div className="friends-range" role="group" aria-label="Süre">
          <button type="button" className="chip chip-sm" aria-pressed={range === 'today'} onClick={() => setRange('today')}>
            Bugün
          </button>
          <button type="button" className="chip chip-sm" aria-pressed={range === 'week'} onClick={() => setRange('week')}>
            Bu hafta
          </button>
        </div>
      </div>
      {failed && !data && <p className="small muted">Arkadaş listesi şu an alınamadı.</p>}
      {data && (
        <ol className="friends-board">
          {board.map((f, i) => (
            <li key={f.code} className={f.me ? 'friends-me' : undefined}>
              <span className="friends-rank">{i + 1}</span>
              <Avatar profile={{ name: f.name, emoji: f.avatar || '🙂', color: f.color, motto: '' } as Profile} size={32} />
              <span className="friends-name">
                {f.me ? 'Sen' : f.name}
                {f.streak > 0 && (
                  <span className="friends-streak" title={`${f.streak} günlük seri`}>
                    <FlameIcon size={12} solid /> {f.streak}
                  </span>
                )}
              </span>
              <span className="friends-xp">{xpOf(f).toLocaleString('tr-TR')} XP</span>
              {!f.me && (
                <button type="button" className="icon-btn icon-btn-sm friends-remove" onClick={() => void remove(f)} aria-label={`${f.name} arkadaşını çıkar`} title="Çıkar">
                  <CloseIcon size={14} />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      {data && data.friends.length === 0 && (
        <p className="small muted friends-empty">
          <img className="friends-art" src={NEW_ART.friendsCode} alt="" height={56} draggable={false} />
          <span>Arkadaşının kodunu ekle; birbirinizin günlük XP'sini görüp yarışın.</span>
        </p>
      )}
      {data && (
        <details className="friends-add" open={data.friends.length === 0}>
          <summary className="small">
            <PlusIcon size={14} className="inline-icon" /> Arkadaş ekle
          </summary>
          <div className="stack gap-2">
            <div className="friends-code small">
              Senin kodun: <code>{showCode(data.me.code)}</code>
              <button type="button" className="link small" onClick={() => void copy()}>
                <CopyIcon size={14} className="inline-icon" /> Paylaş
              </button>
            </div>
            <form
              className="friends-form"
              onSubmit={(e) => {
                e.preventDefault()
                void add()
              }}
            >
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Arkadaşının kodu" aria-label="Arkadaşının kodu" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={12} />
              <button type="submit" className="btn btn-sm" disabled={adding || !code.trim()}>
                Ekle
              </button>
            </form>
          </div>
        </details>
      )}
    </section>
  )
}
