import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, type Profile } from '../data/db'
import { db } from '../data/instance'
import { addFriend, clearInbox, FriendsError, loadFriends, loadInbox, publishFriendCard, recentDays, removeFriend, showCode, type FriendView, type InboxItem } from '../data/friends'
import { localDate } from '../engine/progress'
import { useAccess } from './accessContext'
import { Avatar } from './Avatar'
import { ChevronDownIcon, CloseIcon, CopyIcon, FlameIcon, PlusIcon } from './icons'
import type { GameState } from './game'
import { getAccount } from './syncRunner'
import { showToast } from './toastFeed'
import { NEW_ART } from './drawnArt'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { FriendLeague } from './FriendLeague'
import { rewardInviter } from './inviteReward'
import { notify } from './noticeCenter'
import { friendNotice } from './noticeTexts'
import { inviteLink } from './invite'
// A friend's page (the chart, the gifts) is only needed when a name is tapped.
const FriendSheet = lazy(() => import('./FriendSheet').then((m) => ({ default: m.FriendSheet })))

/** The last card published from this device, so an unchanged one is not written again. */
const SENT_KEY = 'diloloji:friend-card'
const NICKNAMES_KEY = 'diloloji:friend-nicknames'

/** The nicknames the learner gave their friends (on this device). */
function storedNicknames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NICKNAMES_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

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
export function FriendsCard({ game, profile, vocabulary, language, onChanged, onDuel }: { game: GameState | null; profile: Profile; vocabulary?: VocabularyEntry[]; language?: TargetLanguage; onChanged?: () => void; onDuel?: () => void }) {
  const access = useAccess()
  const [range, setRange] = useState<'today' | 'week'>('today')
  const [data, setData] = useState<{ me: FriendView; friends: FriendView[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [code, setCode] = useState('')
  const [adding, setAdding] = useState(false)
  const [copied, setCopied] = useState(false)
  const [nicknames, setNicknames] = useState<Record<string, string>>(storedNicknames)
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const today = localDate(new Date())

  const refresh = useCallback(async () => {
    try {
      // The inbox is a small extra: if it cannot be read the board still shows. Both are asked at once.
      const [board, waiting] = await Promise.all([loadFriends(today), loadInbox().catch(() => [] as InboxItem[])])
      setData(board)
      setFailed(false)
      setInbox(waiting)
      // Each message is also a notice (the bell), once.
      for (const m of waiting) void notify(friendNotice(m, storedNicknames()[m.from.code] || m.from.name))
      // A friend who came in by your invite earns points, once each (and for the first few only).
      void rewardInviter(waiting.filter((m) => m.kind === 'joined').map((m) => m.from.code)).catch(() => undefined)
    } catch {
      setFailed(true)
    }
  }, [today])

  // The own card goes up when it changed (a session's XP, a new avatar), then the board is read.
  useEffect(() => {
    if (!access.approved || !game) return
    let live = true
    void (async () => {
      const account = await getAccount().catch(() => null)
      const storedUsername = account?.username?.trim() || ''
      const effectiveName = profile.name.trim() || storedUsername || 'Arkadaş'

      // If profile name is empty but account has a username, persist it to profile
      if (!profile.name.trim() && storedUsername) {
        try {
          const s = (await db.getSettings()) ?? DEFAULT_SETTINGS
          if (!s.profile.name.trim()) {
            await db.saveSettings({ ...s, profile: { ...s.profile, name: storedUsername } })
          }
        } catch {
          // ignore
        }
      }

      const card = { name: effectiveName, avatar: profile.emoji, color: profile.color, days: recentDays(game.xp.byDay, today), streak: game.streak, level: game.level.level }
      const key = JSON.stringify(card)
      let sent: string | null = null
      try {
        sent = localStorage.getItem(SENT_KEY)
      } catch {
        // Sent again, which costs one write.
      }
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
  const saveNickname = (code: string) => {
    const trimmed = editName.trim().slice(0, 24)
    setNicknames((prev) => {
      const next = { ...prev }
      if (trimmed) next[code] = trimmed
      else delete next[code]
      try {
        localStorage.setItem(NICKNAMES_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
    setEditingCode(null)
    setEditName('')
    showToast(trimmed ? 'Arkadaşının ismi güncellendi.' : 'Arkadaşının ismi sıfırlandı.')
  }

  const dismiss = async (ids: string[]) => {
    setInbox((cur) => cur.filter((m) => !ids.includes(m.id)))
    await clearInbox(ids).catch(() => undefined)
  }
  /** A gift word or a text taken: put in the list or the library, then the message goes. */
  const take = async (m: InboxItem) => {
    // Loaded on the first gift or text taken: the code that puts them in the words and the library is not for the first screen.
    const { acceptGift, acceptText } = await import('./friendGifts')
    if (m.kind === 'gift' && m.gift) {
      const result = await acceptGift(db, m.gift)
      showToast(result === 'added' ? `“${m.gift.lemma}” kelimelerine eklendi.` : result === 'had' ? `“${m.gift.lemma}” zaten kelimelerinde.` : 'Kelime eklenemedi.', undefined, 4000, result === 'failed' ? 'info' : undefined)
      if (result === 'failed') return
    } else if (m.kind === 'text' && m.text) {
      try {
        await acceptText(db, { ...m, text: m.text })
      } catch {
        // The library could not be written (the storage is full): the message stays, and the learner is told.
        showToast('Metin eklenemedi.', undefined, 4000, 'info')
        return
      }
      showToast(`“${m.text.title}” kütüphanene eklendi.`)
    } else return
    onChanged?.()
    await dismiss([m.id])
  }
  const remove = async (f: FriendView) => {
    const displayName = nicknames[f.code] || f.name
    await removeFriend(f.code).catch(() => undefined)
    showToast(`${displayName} listenden çıkarıldı.`)
    await refresh()
  }
  /** The invite link (/?davet=code): a friend with no account opens it, signs up and is added; one with an account is added at once. */
  const copy = async () => {
    if (!data) return
    const link = inviteLink(data.me.code, location.origin, data.me.name)
    try {
      if (navigator.share) await navigator.share({ title: 'Diloloji', text: "Diloloji'de kelime öğreniyorum. Katıl, birlikte çalışalım:", url: link })
      else {
        await navigator.clipboard.writeText(link)
        showToast('Davet bağlantın kopyalandı.')
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // Closed the share sheet.
    }
  }

  const xpOf = (f: FriendView) => (range === 'today' ? f.today : f.week)
  const board = data ? [{ ...data.me, me: true }, ...data.friends.map((f) => ({ ...f, me: false }))].sort((a, b) => xpOf(b) - xpOf(a) || Number(b.me) - Number(a.me)) : []
  const maxXp = Math.max(1, ...board.map((f) => xpOf(f)))
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
          {board.map((f, i) => {
            const nickname = nicknames[f.code]
            const displayName = f.me ? 'Sen' : (nickname || f.name)
            const isEditing = editingCode === f.code
            const xp = xpOf(f)
            const pct = xp > 0 ? Math.max(6, Math.round((xp / maxXp) * 100)) : 0
            return (
              <li key={f.code} className={f.me ? 'friends-me' : isEditing ? 'friends-editing-row' : undefined}>
                <span className={`friends-rank${i < 3 ? ` is-top-${i + 1}` : ''}`}>{i + 1}</span>
                <Avatar profile={{ name: displayName, emoji: f.avatar || '🙂', color: f.color, motto: '' } as Profile} size={36} />
                {isEditing ? (
                  <form
                    className="friends-edit-inline"
                    onSubmit={(e) => {
                      e.preventDefault()
                      saveNickname(f.code)
                    }}
                  >
                    <input
                      className="input input-sm friends-edit-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Arkadaşının adı"
                      aria-label="Arkadaşının adı"
                      maxLength={24}
                      autoFocus
                    />
                    <button type="submit" className="btn btn-sm btn-quiet" title="Kaydet" aria-label="Kaydet">
                      ✓
                    </button>
                    <button type="button" className="btn btn-sm btn-quiet" onClick={() => setEditingCode(null)} title="Vazgeç" aria-label="Vazgeç">
                      ✕
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="friends-user">
                      <div className="friends-user-top">
                        {f.me ? (
                          <span className="friends-name">{displayName}</span>
                        ) : (
                          <button type="button" className="friends-name friends-name-btn" onClick={() => setOpen(f.code)} aria-label={`${displayName} sayfasını aç`}>
                            {displayName}
                          </button>
                        )}
                        {!f.me && (
                          <button
                            type="button"
                            className={`link small friends-rename-btn ${f.name === 'Arkadaş' && !nickname ? 'friends-rename-highlight' : ''}`}
                            onClick={() => {
                              setEditingCode(f.code)
                              setEditName(nickname || (f.name === 'Arkadaş' ? '' : f.name))
                            }}
                            aria-label={`${displayName} arkadaşının ismini düzenle`}
                            title={f.name === 'Arkadaş' && !nickname ? 'Arkadaşına isim ver' : 'İsmi düzenle'}
                          >
                            {f.name === 'Arkadaş' && !nickname ? '✎ İsim ver' : '✎'}
                          </button>
                        )}
                        <span className="friends-xp">{xp.toLocaleString('tr-TR')} XP</span>
                      </div>
                      <div className="friends-user-sub">
                        {f.streak > 0 && (
                          <span className="friends-streak" title={`${f.streak} günlük seri`}>
                            <FlameIcon size={11} solid /> {f.streak}
                          </span>
                        )}
                        {f.level > 0 && (
                          <span className="friends-level" title={`Seviye ${f.level}`}>
                            Sv. {f.level}
                          </span>
                        )}
                        <span className="friends-xp-track" aria-hidden>
                          <span className="friends-xp-fill" style={{ width: `${pct}%` }} />
                        </span>
                      </div>
                    </div>
                    {!f.me && (
                      <button type="button" className="icon-btn icon-btn-sm friends-remove" onClick={() => void remove(f)} aria-label={`${displayName} arkadaşını çıkar`} title="Çıkar">
                        <CloseIcon size={14} />
                      </button>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {inbox.length > 0 && (
        <ul className="friends-inbox" aria-label="Arkadaşlarından gelenler">
          {inbox.slice(0, 3).map((m) => {
            const who = nicknames[m.from.code] || m.from.name
            const sender = data?.friends.find((x) => x.code === m.from.code)
            return (
              <li key={m.id} className={`friends-inbox-item is-${m.kind}`}>
                {sender && <Avatar profile={{ name: who, emoji: sender.avatar || '🙂', color: sender.color, motto: '' } as Profile} size={26} />}
                <span>
                  {m.kind === 'cheer' && `👏 ${who} seni tebrik etti`}
                  {m.kind === 'nudge' && `👋 ${who} seni dürttü: bugün biraz çalışmaya ne dersin?`}
                  {m.kind === 'joined' && `🎉 ${who} davetinle katıldı`}
                  {m.kind === 'gift' && m.gift && (
                    <>
                      🎁 {who} sana bir kelime gönderdi: <strong lang={m.gift.language}>{m.gift.lemma}</strong> = {m.gift.meaning}
                    </>
                  )}
                  {m.kind === 'text' && m.text && `📖 ${who} bir metin gönderdi: “${m.text.title}”`}
                </span>
                {m.kind === 'gift' && m.gift && (
                  <button type="button" className="btn btn-sm" onClick={() => void take(m)}>
                    Ekle
                  </button>
                )}
                {m.kind === 'text' && m.text && (
                  <button type="button" className="btn btn-sm" onClick={() => void take(m)}>
                    Kütüphaneme ekle
                  </button>
                )}
                <button type="button" className="icon-btn icon-btn-sm" aria-label={m.kind === 'gift' || m.kind === 'text' ? 'Geç' : 'Tamam'} title={m.kind === 'gift' || m.kind === 'text' ? 'Geç' : 'Tamam'} onClick={() => void dismiss([m.id])}>
                  <CloseIcon size={14} />
                </button>
              </li>
            )
          })}
          {inbox.length > 3 && (
            <li className="friends-inbox-more">
              <span>+{inbox.length - 3} mesaj daha</span>
              <button type="button" className="link small" onClick={() => void dismiss(inbox.map((m) => m.id))}>
                Hepsini temizle
              </button>
            </li>
          )}
        </ul>
      )}
      {data && open && (() => {
        const f = data.friends.find((x) => x.code === open)
        return f ? (
          <Suspense fallback={null}>
            <FriendSheet friend={f} name={nicknames[f.code] || f.name} today={today} vocabulary={vocabulary} language={language} onClose={() => setOpen(null)} onDuel={onDuel} />
          </Suspense>
        ) : null
      })()}
      {data && data.friends.length > 0 && <FriendLeague me={data.me} friends={data.friends} nicknames={nicknames} today={today} />}
      {data && data.friends.length === 0 && (
        <p className="small muted friends-empty">
          <img className="friends-art" src={NEW_ART.friendsCode} alt="" height={56} draggable={false} />
          <span>Arkadaşının kodunu ekle; birbirinizin günlük XP'sini görüp yarışın.</span>
        </p>
      )}
      {data && (
        <details className="friends-add" open={data.friends.length === 0}>
          <summary className="friends-accordion-summary small">
            <span className="friends-accordion-title">
              <PlusIcon size={14} className="friends-accordion-icon" />
              <span>Arkadaş ekle ve kodunu paylaş</span>
            </span>
            <ChevronDownIcon size={16} className="friends-accordion-arrow" />
          </summary>
          <div className="stack gap-2 friends-add-body">
            <div className="friends-code-card">
              <div className="friends-code-meta">
                <span className="friends-code-eyebrow">Senin davet kodun</span>
                <span className="small muted">Bağlantıyı gönder: hesabı olmayan arkadaşın da katılıp seni ekler</span>
              </div>
              <div className="friends-code-row">
                <div className="friends-code small">
                  <span className="friends-code-label">
                    <code>{showCode(data.me.code)}</code>
                  </span>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${copied ? 'btn-ok friends-copy-ok' : ''}`}
                  onClick={() => void copy()}
                  title="Davet bağlantısını paylaş"
                >
                  <CopyIcon size={14} className="inline-icon" />
                  <span>{copied ? 'Hazır!' : 'Davet et'}</span>
                </button>
              </div>
            </div>
            <form
              className="friends-form"
              onSubmit={(e) => {
                e.preventDefault()
                void add()
              }}
            >
              <input
                className="input friends-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Arkadaşının kodu (örn: ABCD-1234)"
                aria-label="Arkadaşının kodu"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={12}
              />
              <button type="submit" className="btn btn-sm friends-submit-btn" disabled={adding || !code.trim()}>
                {adding ? 'Ekleniyor…' : 'Ekle'}
              </button>
            </form>
          </div>
        </details>
      )}
    </section>
  )
}
