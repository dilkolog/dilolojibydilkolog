import { useEffect, useState } from 'react'
import { FriendsError, loadHandle, saveHandle, type HandleInfo } from '../data/friends'
import { Toggle } from './settingsWidgets'
import { showToast } from './toastFeed'

const SAVE_REASONS: Record<string, string> = {
  taken: 'Bu ad başkasında. Başka bir ad dene.',
  locked: 'Kullanıcı adı bir kez seçilir, değiştirilemez.',
  bad_handle: 'Ad 3–20 karakter olmalı: küçük harf, rakam ve alt çizgi.',
}

/** "Seni bulabilsinler": whether a stranger who types the exact @name can find the learner and send a friend request. */
export function FindableSetting() {
  const [mine, setMine] = useState<HandleInfo | null>(null)

  useEffect(() => {
    let live = true
    void loadHandle()
      .then((info) => {
        if (live) setMine(info)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])

  const save = async (handle: string, findable: boolean) => {
    try {
      const info = await saveHandle(handle, findable)
      setMine(info)
      showToast(findable ? `@${info.handle} adıyla bulunabilirsin.` : 'Artık aramada görünmüyorsun.')
    } catch (e) {
      showToast(e instanceof FriendsError ? (SAVE_REASONS[e.reason] ?? 'Kaydedilemedi, biraz sonra yine dene.') : 'Kaydedilemedi, biraz sonra yine dene.', undefined, 5000, 'info')
    }
  }

  return (
    <div className="friends-find-mine stack gap-2">
      <Toggle
        checked={mine?.findable === true}
        onChange={(v) => {
          if (!mine?.handle) showToast("Önce Ayarlar → Hesap'tan bir kullanıcı adı seç.", undefined, 4000, 'info')
          else void save(mine.handle, v)
        }}
        label="Seni bulabilsinler"
        help="Açıkken, kullanıcı adını tam yazan biri seni bulup arkadaşlık isteği gönderebilir. E-postan ve gerçek adın aramada kullanılmaz; istek, sen kabul edene kadar XP'ni göstermez."
      />
      {mine && (
        <p className="small muted friends-find-name">
          {mine.handle ? (
            <>
              Kullanıcı adın: <strong>@{mine.handle}</strong>. Hesap açarken seçilir, sonradan değişmez.
            </>
          ) : (
            "Henüz bir kullanıcı adın yok. Ayarlar → Hesap'tan seç; bir kez seçilir ve sonradan değişmez."
          )}
        </p>
      )}
    </div>
  )
}
