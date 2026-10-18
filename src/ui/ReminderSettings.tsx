import { useEffect, useState } from 'react'
import type { Settings } from '../data/db'
import { db } from '../data/instance'
import { reminderTime } from '../engine/hours'
import { badgeSupported } from './appBadge'
import { disableMail, enableMail, getMail, mailStatus, refreshMail, type MailReminder } from './emailReminders'
import { ReminderSuggestion } from './BestHours'
import { disablePush, enablePush, pushSubscription, pushSupported, type PushState } from './pushReminders'
import { calendarFile, notificationsSupported, requestNotifications, showReminder } from './reminders'
import { Select } from './Select'
import { kindOff, NOTICE_GROUPS } from '../engine/notices'
import { Row, Toggle } from './settingsWidgets'
import { useUsualStudyHour } from './useUsualStudyHour'

const TIMES = Array.from({ length: 36 }, (_, i) => {
  const h = 6 + Math.floor(i / 2)
  return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`
})

/** Reminders while the app is closed, sent by the server (see pushReminders.ts). */
function PushToggle({ state }: { state: PushState }) {
  const [on, setOn] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void pushSubscription().then((s) => setOn(!!s))
  }, [])
  if (on === null) return null
  return (
    <>
      <Toggle
        label="Uygulama kapalıyken de hatırlat"
        help={
          pushSupported()
            ? 'O gün hiç çalışmadıysan hatırlatma saatinde (yukarıda) telefonuna ya da bilgisayarına bildirim gelir. Eşitleme açıksa başka cihazda çalışman da sayılır.'
            : "Bu tarayıcı desteklemiyor. iPhone'da Paylaş → Ana Ekrana Ekle ile yükleyip oradan açınca kullanılabilir."
        }
        checked={on}
        onChange={async (v) => {
          if (busy) return
          setBusy(true)
          setError(null)
          try {
            if (v) await enablePush(state)
            else await disablePush()
            setOn(v)
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Açılamadı.')
          } finally {
            setBusy(false)
          }
        }}
      />
      {error && <p className="error small">{error}</p>}
    </>
  )
}

/** Reminders by mail: the address is registered, a confirmation mail goes out, and the reminders start once its link is opened. */
function MailReminder({ state }: { state: PushState }) {
  const [available, setAvailable] = useState(false)
  const [sandbox, setSandbox] = useState(false)
  const [mail, setMail] = useState<MailReminder | null>(null)
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    void mailStatus().then((s) => {
      if (!live) return
      setAvailable(s.available)
      setSandbox(s.sandbox)
    })
    void getMail().then((m) => live && setMail(m))
    // The link may have been opened (or the unsubscribe link used) since this was last open.
    void refreshMail().then((m) => live && setMail(m))
    return () => {
      live = false
    }
  }, [])
  if (!available && !mail) return null
  const run = async (work: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await work()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Açılamadı.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="stack">
      <h3 className="subhead">E-posta ile hatırlat</h3>
      <p className="small muted">
        O gün çalışmadıysan hatırlatma saatinde bir mail gelir. Adresin yalnızca bunun için sunucuda saklanır; ilk mailde onay bağlantısı, her mailde kapatma bağlantısı var. Hesabının onaylı olması gerekir.
      </p>
      {mail ? (
        <>
          <p className="small">
            <strong>{mail.email}</strong> — {mail.state === 'on' ? 'açık' : 'onay bekliyor (mailindeki bağlantıya dokun)'}
          </p>
          <div className="row">
            {mail.state === 'pending' && (
              <button
                className="btn btn-sm btn-quiet"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await enableMail(mail.email, state, true)
                    setNote('Onay maili tekrar gönderildi (saatte bir kez).')
                  })
                }
              >
                Onay mailini tekrar gönder
              </button>
            )}
            <button className="btn btn-sm btn-quiet" disabled={busy} onClick={() => run(async () => void (await disableMail(), setMail(null)))}>
              {mail.state === 'on' ? 'Kapat' : 'Vazgeç'}
            </button>
          </div>
        </>
      ) : (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            void run(async () => {
              await enableMail(address, state)
              setMail(await getMail())
              setAddress('')
            })
          }}
        >
          <input className="input" type="email" inputMode="email" autoComplete="email" placeholder="ornek@mail.com" aria-label="E-posta adresi" value={address} onChange={(e) => setAddress(e.target.value)} required />
          <button className="btn btn-quiet" type="submit" disabled={busy || !address.includes('@')}>
            Onay maili gönder
          </button>
        </form>
      )}
      {sandbox && (
        <p className="note small">
          Sunucu hâlâ Resend’in deneme göndereniyle yolluyor: mailler spama düşer ve yalnızca Resend hesabının kendi adresine gider. Vercel’de RESEND_FROM’u doğrulanmış bir alan adıyla ayarla.
        </p>
      )}
      {note && <p className="small muted">{note}</p>}
      {error && <p className="error small">{error}</p>}
    </div>
  )
}

export function ReminderSettings({
  settings,
  onChange,
  pushState,
}: {
  settings: Settings
  onChange: (s: Settings) => void
  pushState: PushState
}) {
  const usualHour = useUsualStudyHour(db)
  const [permission, setPermission] = useState(() => (notificationsSupported() ? Notification.permission : 'denied'))
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })

  const calendar = () => {
    const url = URL.createObjectURL(new Blob([calendarFile(reminderTime(settings.reminder, usualHour ?? null), location.origin)], { type: 'text/calendar' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'diloloji-hatirlatma.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="card stack">
      <h2 className="section-title">Hatırlatıcı</h2>
      <Toggle
        label="Günlük hatırlatma"
        help="O gün çalışmadıysan seçtiğin saatte bildirim gelir (uygulama açıkken, arka planda olsa bile)."
        checked={settings.reminder.enabled}
        onChange={async (v) => {
          if (v) setPermission(await requestNotifications())
          set('reminder', { ...settings.reminder, enabled: v })
        }}
      />
      <Toggle
        label="Çalıştığım saate göre"
        help="Son 30 günde genelde hangi saatte çalışmaya başladığına bakar; hatırlatma (uygulama kapalıyken gelen dahil) o saatte gelir. Kapatırsan aşağıda seçtiğin saat kullanılır."
        checked={settings.reminder.auto !== false}
        onChange={(v) => set('reminder', { ...settings.reminder, auto: v })}
      />
      {settings.reminder.auto !== false && usualHour != null ? (
        <p className="small muted">
          Genelde {String(usualHour).padStart(2, '0')}:00 civarında çalışmaya başlıyorsun; hatırlatma o saatte gelir.
        </p>
      ) : (
        <>
          {settings.reminder.auto !== false && usualHour === null && (
            <p className="small muted">Alışkanlık saatin en az 5 gün çalışınca belli olur; o zamana kadar seçtiğin saat kullanılır.</p>
          )}
          <Row label="Saat">
            <div className="settings-time-select">
              <Select label="Saat" value={settings.reminder.time} onChange={(t) => set('reminder', { ...settings.reminder, time: t })} options={TIMES.map((t) => ({ value: t, label: t }))} />
            </div>
          </Row>
          <ReminderSuggestion db={db} current={settings.reminder.time} onApply={(t) => set('reminder', { ...settings.reminder, time: t, auto: false })} />
        </>
      )}
      {settings.reminder.enabled && permission !== 'granted' && (
        <p className="error small">
          Bildirim izni yok. Tarayıcının site ayarlarından bu sayfaya bildirim izni ver.{' '}
          <button className="link" onClick={async () => setPermission(await requestNotifications())}>
            Tekrar iste
          </button>
        </p>
      )}
      <PushToggle state={pushState} />
      <MailReminder state={pushState} />
      {badgeSupported() && (
        <Toggle
          label="Simgede tekrar sayısı"
          help="Ana ekrana eklenmiş uygulamanın simgesinde bekleyen tekrar sayısı görünür; hepsi bitince kaybolur."
          checked={settings.appBadge ?? true}
          onChange={(v) => set('appBadge', v)}
        />
      )}
      <div className="row">
        <button className="btn btn-quiet" onClick={calendar}>
          Takvime ekle (.ics)
        </button>
        {permission === 'granted' && (
          <button className="btn btn-quiet" onClick={() => showReminder(0)}>
            Bildirimi dene
          </button>
        )}
      </div>
      <p className="small muted">Takvim dosyası her gün bu saatte uyaran bir etkinlik ekler; uygulama kapalıyken de çalışır.</p>
    </section>
  )
}

/** What the bell lists, kind by kind: a kind turned off is neither listed nor (for a friend's message) pushed. */
export function NoticeSettings({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const off = settings.noticeOff ?? []
  return (
    <section className="card stack">
      <h2 className="section-title">Bildirimler (çan)</h2>
      <p className="small muted">Üst çubuktaki çan, sen başka yerdeyken olanları listeler. Burada hangilerinin listeleneceğini seçersin.</p>
      {NOTICE_GROUPS.map((g) => (
        <Toggle
          key={g.id}
          label={g.label}
          help={g.help}
          checked={!g.kinds.every((k) => kindOff(off, k))}
          onChange={(v) => {
            const rest = off.filter((k) => !g.kinds.includes(k))
            onChange({ ...settings, noticeOff: v ? rest : [...rest, ...g.kinds] })
          }}
        />
      ))}
    </section>
  )
}
