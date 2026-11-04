import '../lazy.css'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  AdminError,
  announce,
  approveAll,
  block,
  changePerson,
  deletePerson,
  loadBlocks,
  loadPeople,
  loadPerson,
  loadReports,
  loadSettings,
  loadStats,
  loadUsage,
  loadSystem,
  moveStep,
  saveSettings,
  unblock,
  unpublishSet,
  type Block,
  type LimitName,
  type PersonDetail,
  type SettingsView,
  type Stats,
  type Usage,
  type AiLevel,
  type OwnerReport,
  type PeopleFilter,
  type Person,
  type SystemState,
} from '../data/adminApi'
import { CheckCircleIcon, ChevronRightIcon, SearchIcon } from './icons'
import { ConfirmDialog } from './Dialog'
import { PageHeader } from './PageHeader'
import { Toggle } from './settingsWidgets'
import { Sticker } from './Sticker'
import { Select, type SelectOption } from './Select'
import { showToast } from './toastFeed'

/**
 * The owner's admin screen (only for the signed-in OWNER_EMAIL; the server refuses anyone else): who waits for
 * approval and each person's AI level, the last reports, and the system's health with the move of the small server
 * documents to Supabase. What was done by hand in Supabase's Table Editor, now on one page.
 */

const FILTERS: { id: PeopleFilter; label: string }[] = [
  { id: 'pending', label: 'Bekleyenler' },
  { id: 'approved', label: 'Onaylılar' },
  { id: 'rejected', label: 'Reddedilenler' },
  { id: 'all', label: 'Tümü' },
]

type LevelChoice = AiLevel | 'default'
const LEVELS: SelectOption<LevelChoice>[] = [
  { value: 'default', label: 'Varsayılan', hint: 'Çalışma düzeyi' },
  { value: 'kapali', label: 'Kapalı', hint: 'YZ yok' },
  { value: 'kelime', label: 'Kelime', hint: 'Doldurma, öneri, ipucu' },
  { value: 'calisma', label: 'Çalışma', hint: '+ değerlendirme, hikâye, günlük' },
  { value: 'tam', label: 'Tam', hint: '+ Monki, fotoğraf, podcast' },
]

const REASON: Record<string, string> = {
  spam: 'Spam ya da reklam',
  sexual: 'Cinsel içerik',
  harassment: 'Taciz ya da nefret',
  violence: 'Şiddet ya da tehdit',
  personal: 'Kişisel bilgi',
  copyright: 'Telif',
  other: 'Başka bir sorun',
}
const KIND: Record<OwnerReport['kind'], string> = { user: 'Kullanıcı', message: 'İleti', set: 'Topluluk listesi', club: 'Okuma kulübü' }

const when = (at: string) => new Date(at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
const failText = (e: unknown) => (e instanceof AdminError ? e.message : 'Bağlantı kurulamadı')
const nameOf = (p: Person) => p.username || p.email.split('@')[0] || 'Adsız'
const stateOf = (p: Person) => (p.approved ? 'ok' : p.rejected ? 'no' : 'wait')
const STATE_TEXT = { ok: 'Onaylı', no: 'Reddedildi', wait: 'Bekliyor' } as const
const LEVEL_TEXT: Record<AiLevel, string> = { kapali: 'YZ kapalı', kelime: 'YZ: kelime', calisma: 'YZ: çalışma', tam: 'YZ: tam' }

/** What each card tells the summary at the top. */
export interface AdminSummary {
  pending?: number
  reports?: number
  healthy?: boolean
}
type Tell = (part: AdminSummary) => void
const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

function PeopleCard({ tell }: { tell: Tell }) {
  const [filter, setFilter] = useState<PeopleFilter>('pending')
  const [query, setQuery] = useState('')
  const [asked, setAsked] = useState('')
  const [data, setData] = useState<{ people: Person[]; levels: boolean; pending: number } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Person | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [approvingAll, setApprovingAll] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const next = await loadPeople(filter, asked)
      setData(next)
      tell({ pending: next.pending })
    } catch (e) {
      setError(failText(e))
    }
  }, [filter, asked, tell])
  useEffect(() => {
    void load()
  }, [load])

  const act = async (person: Person, change: { change?: 'approve' | 'reject' | 'wait'; level?: AiLevel | null }, done: string) => {
    setBusy(person.id)
    try {
      await changePerson(person.id, change)
      showToast(done)
      await load()
    } catch (e) {
      showToast(`Olmadı: ${failText(e)}`, undefined, 5000, 'info')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (person: Person, typed: string, blockToo: boolean) => {
    setBusy(person.id)
    try {
      const done = await deletePerson(person.id, typed, blockToo)
      setDeleting(null)
      showToast(blockToo && done.blocked !== 'ok' ? `${person.email} hesabı silindi; adres engellenemedi (0011 göçü çalıştı mı?).` : `${person.email} hesabı silindi.`)
      await load()
    } catch (e) {
      showToast(`Silinemedi: ${failText(e)}`, undefined, 6000, 'info')
    } finally {
      setBusy(null)
    }
  }

  const approveEveryone = async () => {
    setBusy('all')
    try {
      const { approved } = await approveAll()
      setApprovingAll(false)
      showToast(`${approved} kişi onaylandı.`)
      await load()
    } catch (e) {
      showToast(`Olmadı: ${failText(e)}`, undefined, 5000, 'info')
    } finally {
      setBusy(null)
    }
  }

  const search = (e: FormEvent) => {
    e.preventDefault()
    setAsked(query.trim())
  }

  return (
    <section className="card stack admin-card" aria-labelledby="admin-people" id="admin-people-card">
      <h2 className="section-title" id="admin-people">
        Kişiler
      </h2>
      <div className="admin-toolbar">
        <div className="seg-group" role="radiogroup" aria-label="Hangi kişiler">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="radio" className="seg-btn" aria-checked={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
              {f.id === 'pending' && data && data.pending > 0 && <span className="admin-count">{data.pending}</span>}
            </button>
          ))}
        </div>
        <form className="admin-search" onSubmit={search} role="search">
          <SearchIcon size={16} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} onBlur={() => setAsked(query.trim())} placeholder="E-posta ya da ad ara" aria-label="Kişi ara" autoComplete="off" />
        </form>
      </div>
      {error && (
        <p className="note" role="alert">
          Yüklenemedi: {error}
        </p>
      )}
      {filter === 'pending' && !asked && data && data.pending > 1 && (
        <div className="admin-bulk">
          <button type="button" className="btn btn-sm btn-quiet" disabled={busy === 'all'} onClick={() => setApprovingAll(true)}>
            Hepsini onayla ({data.pending})
          </button>
        </div>
      )}
      {approvingAll && data && (
        <ConfirmDialog title={`Bekleyen ${data.pending} kişinin hepsi onaylansın mı?`} confirmLabel={busy === 'all' ? 'Onaylanıyor…' : 'Hepsini onayla'} onConfirm={() => busy !== 'all' && void approveEveryone()} onCancel={() => setApprovingAll(false)}>
          <p className="small">Onaylanan herkes eşitleme, çeviri ve YZ'yi (varsayılan düzeyde) kullanabilir. Tek tek beklemeye geri alabilirsin.</p>
        </ConfirmDialog>
      )}
      {data && data.people.length === 0 && (
        <p className="small muted sticker-note admin-empty">
          <Sticker name={filter === 'pending' && !asked ? 'thumbs' : 'detective'} size={40} />
          {asked ? `“${asked}” ile eşleşen kimse yok.` : filter === 'pending' ? 'Onay bekleyen kimse yok. Hepsi tamam.' : 'Burada kimse yok.'}
        </p>
      )}
      {data && data.people.length > 0 && (
        <ul className="plain account-group admin-people">
          {data.people.map((p) => {
            const state = stateOf(p)
            return (
              <li key={p.id} className="admin-person">
                <span className="admin-initial" aria-hidden>
                  {nameOf(p).slice(0, 1).toLocaleUpperCase('tr')}
                </span>
                <div className="admin-person-text">
                  <div className="admin-person-name">
                    <strong>{nameOf(p)}</strong>
                    <span className="admin-state" data-state={state}>
                      {STATE_TEXT[state]}
                    </span>
                    {p.approved && data.levels && p.aiLevel && <span className="admin-state">{LEVEL_TEXT[p.aiLevel]}</span>}
                  </div>
                  <span className="small muted">{p.email}</span>
                  <span className="text-xs muted">Katıldı: {when(p.createdAt)}</span>
                </div>
                <div className="admin-person-actions">
                  {p.approved && data.levels && (
                    <Select<LevelChoice>
                      label={`${p.email} YZ düzeyi`}
                      value={p.aiLevel ?? 'default'}
                      options={LEVELS}
                      onChange={(v) => void act(p, { level: v === 'default' ? null : v }, 'YZ düzeyi kaydedildi.')}
                      className="admin-level"
                    />
                  )}
                  {!p.approved && (
                    <button type="button" className="btn btn-sm" disabled={busy === p.id} onClick={() => void act(p, { change: 'approve' }, `${p.email} onaylandı.`)}>
                      Onayla
                    </button>
                  )}
                  {!p.approved && !p.rejected && (
                    <button type="button" className="btn btn-sm btn-quiet" disabled={busy === p.id} onClick={() => void act(p, { change: 'reject' }, `${p.email} reddedildi.`)}>
                      Reddet
                    </button>
                  )}
                  {(p.approved || p.rejected) && (
                    <button type="button" className="btn btn-sm btn-quiet" disabled={busy === p.id} onClick={() => void act(p, { change: 'wait' }, `${p.email} beklemeye alındı.`)}>
                      Beklemeye al
                    </button>
                  )}
                  <button type="button" className="btn btn-sm btn-quiet" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>
                    Ayrıntı
                  </button>
                  <button type="button" className="btn btn-sm btn-quiet admin-delete" disabled={busy === p.id} onClick={() => setDeleting(p)}>
                    Hesabı sil
                  </button>
                </div>
                {open === p.id && <PersonInfo id={p.id} />}
              </li>
            )
          })}
        </ul>
      )}
      {deleting && <DeletePerson person={deleting} busy={busy === deleting.id} onDelete={(typed, blockToo) => void remove(deleting, typed, blockToo)} onCancel={() => setDeleting(null)} />}
      {data && !data.levels && <p className="small muted">YZ düzeyi seçmek için Supabase'te 0007 göçünü çalıştır.</p>}
      {data && data.people.length >= 200 && <p className="text-xs muted">En yeni 200 kişi gösteriliyor; aramayla daralt.</p>}
      {data && data.people.length > 0 && <p className="text-xs muted">Değişiklik birkaç dakika içinde her yerde geçerli olur.</p>}
    </section>
  )
}

/** Deleting someone's account asks for their e-mail, typed: the server checks it too. */
function DeletePerson({ person, busy, onDelete, onCancel }: { person: Person; busy: boolean; onDelete: (typed: string, blockToo: boolean) => void; onCancel: () => void }) {
  const [typed, setTyped] = useState('')
  const [blockToo, setBlockToo] = useState(false)
  const [wrong, setWrong] = useState(false)
  const matches = typed.trim().toLowerCase() === person.email.trim().toLowerCase()
  const confirm = () => {
    if (busy) return
    if (!matches) return setWrong(true)
    onDelete(typed, blockToo)
  }
  return (
    <ConfirmDialog title={`${nameOf(person)} hesabı silinsin mi?`} confirmLabel={busy ? 'Siliniyor…' : 'Hesabı sil'} danger onConfirm={confirm} onCancel={onCancel}>
      <div className="stack admin-delete-body">
        <p className="small">
          Kelimeleri, cevapları, okuma metinleri, dosyaları, arkadaşlıkları ve hatırlatmaları sunucudan silinir; giriş yapamaz. Geri alınamaz. Cihazındaki kopya bir sonraki açılışa dek kalır.
        </p>
        <label className="stack admin-delete-field">
          <span className="small">
            Onaylamak için e-postasını yaz: <strong>{person.email}</strong>
          </span>
          <input
            className="input"
            type="email"
            value={typed}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={wrong && !matches}
            onChange={(e) => {
              setTyped(e.target.value)
              setWrong(false)
            }}
            onKeyDown={(e) => e.key === 'Enter' && confirm()}
          />
        </label>
        <label className="admin-check-row">
          <input type="checkbox" checked={blockToo} onChange={(e) => setBlockToo(e.target.checked)} />
          <span className="small">Bu adres yeniden kayıt olamasın</span>
        </label>
        {wrong && !matches && (
          <p className="small admin-delete-wrong" role="alert">
            E-posta tutmuyor.
          </p>
        )}
      </div>
    </ConfirmDialog>
  )
}

function ReportsCard({ tell }: { tell: Tell }) {
  const [reports, setReports] = useState<OwnerReport[] | null>(null)
  const [error, setError] = useState('')
  const [gone, setGone] = useState<Set<string>>(new Set())
  useEffect(() => {
    loadReports(7)
      .then((r) => {
        setReports(r.reports)
        tell({ reports: r.reports.length })
      })
      .catch((e: unknown) => setError(failText(e)))
  }, [tell])
  const unpublish = async (r: OwnerReport) => {
    try {
      await unpublishSet(r.target)
      setGone((g) => new Set([...g, r.target]))
      showToast('Liste kütüphaneden kaldırıldı (silinmedi).')
    } catch (e) {
      showToast(`Olmadı: ${failText(e)}`, undefined, 5000, 'info')
    }
  }
  return (
    <section className="card stack admin-card" aria-labelledby="admin-reports" id="admin-reports-card">
      <h2 className="section-title" id="admin-reports">
        Şikâyetler · son 7 gün
      </h2>
      {error && (
        <p className="note" role="alert">
          Yüklenemedi: {error}
        </p>
      )}
      {reports && reports.length === 0 && (
        <p className="small muted sticker-note admin-empty">
          <Sticker name="heart" size={40} />
          Son 7 günde şikâyet yok.
        </p>
      )}
      {reports && reports.length > 0 && (
        <ul className="plain stack admin-reports">
          {reports.map((r) => (
            <li key={r.id} className="admin-report">
              <div className="admin-person-name">
                <strong>{REASON[r.reason] ?? r.reason}</strong>
                <span className="admin-state">{KIND[r.kind]}</span>
              </div>
              <p className="text-xs muted">
                {when(r.at)}
                {r.about?.name ? ` · ${r.about.name}` : ''}
              </p>
              {r.content && <blockquote className="admin-report-content">{r.content.length > 400 ? `${r.content.slice(0, 400)}…` : r.content}</blockquote>}
              {r.note && <p className="small">Not: {r.note}</p>}
              {r.kind === 'set' &&
                (r.hidden || gone.has(r.target) ? (
                  <p className="small muted">Kütüphaneden kaldırıldı.</p>
                ) : (
                  <button type="button" className="btn btn-sm btn-quiet" onClick={() => void unpublish(r)}>
                    Kütüphaneden kaldır
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SystemCard({ tell }: { tell: Tell }) {
  const [state, setState] = useState<SystemState | null>(null)
  const [error, setError] = useState('')
  const [moving, setMoving] = useState<{ copied: number; at: string } | null>(null)

  const load = useCallback(() => {
    loadSystem()
      .then((next) => {
        setState(next)
        tell({ healthy: next.health.ok && next.problems.length === 0 })
      })
      .catch((e: unknown) => setError(failText(e)))
  }, [tell])
  useEffect(load, [load])

  const move = async () => {
    let copied = 0
    let next: Awaited<ReturnType<typeof moveStep>>['next'] | undefined
    setMoving({ copied, at: '' })
    try {
      do {
        const step = await moveStep(next ?? undefined)
        copied += step.copied
        next = step.next
        setMoving({ copied, at: step.at })
      } while (next)
      showToast(`Taşıma bitti: ${copied} dosya Supabase'e geçti.`)
      load()
    } catch (e) {
      showToast(`Taşıma durdu (${copied} dosya geçti, yeniden başlatılabilir): ${failText(e)}`, undefined, 8000, 'info')
    } finally {
      setMoving(null)
    }
  }

  const part = (name: string, s: 'ok' | 'down' | 'off') => (
    <li className="admin-check">
      <span className="admin-dot" data-state={s} aria-hidden />
      <span>{name}</span>
      <span className="admin-check-state">{s === 'ok' ? 'çalışıyor' : s === 'down' ? 'ulaşılamıyor' : 'kurulu değil'}</span>
    </li>
  )

  return (
    <section className="card stack admin-card" aria-labelledby="admin-system" id="admin-system-card">
      <h2 className="section-title" id="admin-system">
        Sistem
      </h2>
      {error && (
        <p className="note" role="alert">
          Yüklenemedi: {error}
        </p>
      )}
      {state && (
        <>
          <ul className="plain account-group admin-checks">
            {part('Supabase', state.health.supabase)}
            {part('Cloudflare R2', state.health.storage)}
            <li className="admin-check">
              <span className="admin-dot" data-state={state.problems.length ? 'down' : 'ok'} aria-hidden />
              <span>Ayarlar ve gizliler</span>
              <span className="admin-check-state">{state.problems.length ? `${state.problems.length} eksik` : 'tamam'}</span>
            </li>
          </ul>
          {state.problems.length > 0 && (
            <div className="note" role="status">
              <strong>Dikkat edilecekler</strong>
              <ul>
                {state.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="stack admin-move">
            <strong>Küçük sunucu belgeleri Supabase'te</strong>
            {state.docs === 'on' ? (
              <p className="small muted admin-done">
                <CheckCircleIcon size={16} />
                Taşındı: adlar, istekler, engellemeler, şikâyetler ve eski kayıtlar artık yalnızca Supabase'ten okunuyor.
              </p>
            ) : state.docs === 'ready' ? (
              <>
                <p className="small muted">Yeni yazılanlar zaten Supabase'te; eski R2 dosyaları da taşınınca R2 bu iş için artık okunmaz. Yarıda kalırsa yeniden başlatmak güvenli.</p>
                <div>
                  <button type="button" className="btn btn-sm" disabled={!!moving} onClick={() => void move()}>
                    {moving ? `Taşınıyor… ${moving.copied} dosya${moving.at ? ` (${moving.at})` : ''}` : 'Eski dosyaları taşı'}
                  </button>
                </div>
              </>
            ) : (
              <p className="small muted">Önce Supabase'te 0010 göçünü çalıştır.</p>
            )}
          </div>
        </>
      )}
    </section>
  )
}

const count = (n: number) => n.toLocaleString('tr-TR')
const usd = (n: number) => `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
const sizeOf = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} MB`)
const dayName = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('tr-TR', { weekday: 'short' })
const PROVIDER: Record<string, string> = { email: 'E-posta', google: 'Google', facebook: 'Facebook' }

/** One person's figures, read when their row is opened. */
function PersonInfo({ id }: { id: string }) {
  const [detail, setDetail] = useState<PersonDetail | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    loadPerson(id)
      .then(setDetail)
      .catch((e: unknown) => setError(failText(e)))
  }, [id])
  if (error) return <p className="small muted admin-person-info">Ayrıntı yüklenemedi: {error}</p>
  if (!detail) return <p className="small muted admin-person-info">Yükleniyor…</p>
  // The synced figures are known only where sync is kept in Supabase.
  const synced = detail.words !== null
  const rows: [string, string][] = [
    ...(synced
      ? ([
          ['Kelime', count(detail.words ?? 0)],
          ['Cevap', count(detail.answers ?? 0)],
          ['Okuma metni', count(detail.texts ?? 0)],
          ['Eşitlenen veri', detail.bytes ? sizeOf(detail.bytes) : 'yok'],
          ['Son eşitleme', detail.lastSync ? when(detail.lastSync) : 'hiç'],
        ] as [string, string][])
      : []),
    ['Son giriş', detail.lastSignIn ? when(detail.lastSignIn) : 'bilinmiyor'],
    ['Giriş yolu', PROVIDER[detail.provider] ?? (detail.provider || 'bilinmiyor')],
  ]
  if (detail.today) rows.push(['Bugün', `YZ ${count(detail.today.aiCalls)} istek (${usd(detail.today.aiUsd)}) · çeviri ${count(detail.today.translateChars)} · ses ${count(detail.today.ttsChars)} karakter`])
  return (
    <dl className="admin-person-info">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** How many people, how many come back, and new sign-ups day by day. */
function StatsCard({ tell }: { tell: Tell }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    loadStats()
      .then((s) => {
        setStats(s)
        tell({ pending: s.pending })
      })
      .catch((e: unknown) => setError(failText(e)))
  }, [tell])
  const most = Math.max(1, ...(stats?.newByDay.map((d) => d.count) ?? [1]))
  const week = stats?.newByDay.reduce((n, d) => n + d.count, 0) ?? 0
  return (
    <section className="card stack admin-card" aria-labelledby="admin-stats" id="admin-stats-card">
      <h2 className="section-title" id="admin-stats">
        Sayılar
      </h2>
      {error && (
        <p className="note" role="alert">
          Yüklenemedi: {error}
        </p>
      )}
      {stats && (
        <>
          <dl className="admin-numbers">
            <div>
              <dt>Toplam kişi</dt>
              <dd>{count(stats.total)}</dd>
            </div>
            <div>
              <dt>Onay bekleyen</dt>
              <dd>{count(stats.pending)}</dd>
            </div>
            {stats.active7 !== null && (
              <div>
                <dt>Son 7 günde etkin</dt>
                <dd>{count(stats.active7)}</dd>
              </div>
            )}
            {stats.active30 !== null && (
              <div>
                <dt>Son 30 günde etkin</dt>
                <dd>{count(stats.active30)}</dd>
              </div>
            )}
          </dl>
          {stats.active7 === null && <p className="small muted">Eşitleme verisi R2’de tutulduğu için kimin ne zaman etkin olduğu burada sayılamıyor.</p>}
          <div className="stack admin-signups">
            <p className="small">
              Son 7 günde <strong>{count(week)}</strong> yeni hesap
            </p>
            <ul className="plain admin-days" aria-label="Günlük yeni hesaplar">
              {stats.newByDay.map((d) => (
                <li key={d.day} title={`${d.day}: ${d.count}`}>
                  <span className="admin-day-count">{d.count}</span>
                  <span className="admin-day-bar" aria-hidden>
                    <span style={{ height: `${Math.round((d.count / most) * 100)}%` }} />
                  </span>
                  <span className="admin-day-name">{dayName(d.day)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs muted">Etkin: verisi o süre içinde eşitlenen kişi.</p>
          </div>
        </>
      )}
    </section>
  )
}

const LIMIT_ROWS: { name: LimitName; label: string; unit: string; step: number }[] = [
  { name: 'aiDailyCalls', label: 'YZ isteği', unit: 'istek', step: 1 },
  { name: 'aiDailyBudgetUsd', label: 'YZ harcaması', unit: '$', step: 0.05 },
  { name: 'translateChars', label: 'Çeviri', unit: 'karakter', step: 500 },
  { name: 'ttsChars', label: 'Doğal ses', unit: 'karakter', step: 500 },
]

function UsageTotalsList({ title, t }: { title: string; t: Usage['today'] }) {
  return (
    <div className="stack admin-usage-col">
      <h3 className="small admin-sub">{title}</h3>
      <dl className="admin-usage">
        <div>
          <dt>YZ</dt>
          <dd>
            {count(t.aiCalls)} istek · {usd(t.aiUsd)}
          </dd>
        </div>
        <div>
          <dt>Çeviri</dt>
          <dd>{count(t.translateChars)} karakter</dd>
        </div>
        <div>
          <dt>Doğal ses</dt>
          <dd>{count(t.ttsChars)} karakter</dd>
        </div>
        <div>
          <dt>Telaffuz puanı</dt>
          <dd>{count(t.assessCalls)}</dd>
        </div>
        <div>
          <dt>Kullanan</dt>
          <dd>{count(t.people)} kişi</dd>
        </div>
      </dl>
    </div>
  )
}

/** What the paid services cost today and this month, who used most, and each account's daily limits. */
function UsageCard() {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [view, setView] = useState<SettingsView | null>(null)
  const [draft, setDraft] = useState<Partial<Record<LimitName, string>>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    loadUsage()
      .then(setUsage)
      .catch((e: unknown) => setError(failText(e)))
    loadSettings()
      .then(setView)
      .catch((e: unknown) => setError(failText(e)))
  }, [])
  const save = async (change: Partial<Record<LimitName, number | null>>) => {
    setSaving(true)
    try {
      setView(await saveSettings(change))
      setDraft({})
      showToast('Sınırlar kaydedildi; bir dakika içinde her yerde geçerli.')
    } catch (e) {
      showToast(`Olmadı: ${failText(e)}`, undefined, 5000, 'info')
    } finally {
      setSaving(false)
    }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!view) return
    const change: Partial<Record<LimitName, number>> = {}
    for (const row of LIMIT_ROWS) {
      const raw = draft[row.name]
      if (raw === undefined || raw.trim() === '') continue
      const n = Number(raw.replace(',', '.'))
      const { min, max } = view.ranges[row.name]
      if (!Number.isFinite(n) || n < min || n > max) {
        showToast(`${row.label}: ${count(min)} ile ${count(max)} arasında olmalı.`, undefined, 5000, 'info')
        return
      }
      change[row.name] = n
    }
    if (Object.keys(change).length) void save(change)
  }
  const custom = view ? LIMIT_ROWS.filter((r) => view.settings[r.name] !== undefined) : []
  return (
    <section className="card stack admin-card" aria-labelledby="admin-usage" id="admin-usage-card">
      <h2 className="section-title" id="admin-usage">
        Kullanım ve sınırlar
      </h2>
      {error && (
        <p className="note" role="alert">
          Yüklenemedi: {error}
        </p>
      )}
      {usage && !usage.available && <p className="small muted">Kullanım sayıları için Supabase'te 0009 göçünü çalıştır.</p>}
      {usage?.available && (
        <>
          <div className="admin-usage-cols">
            <UsageTotalsList title="Bugün" t={usage.today} />
            <UsageTotalsList title="Bu ay" t={usage.month} />
          </div>
          {usage.top.length > 0 && (
            <div className="stack">
              <h3 className="small admin-sub">Bugün en çok kullananlar</h3>
              <ol className="plain account-group admin-top">
                {usage.top.map((t) => (
                  <li key={t.email}>
                    <span className="admin-top-mail">{t.email}</span>
                    <span className="small muted">
                      YZ {count(t.aiCalls)} · {usd(t.aiUsd)} · çeviri {count(t.translateChars)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
      {view && (
        <form className="stack admin-limits" onSubmit={submit}>
          <h3 className="small admin-sub">Kişi başına günlük sınırlar</h3>
          {LIMIT_ROWS.map((row) => (
            <label key={row.name} className="admin-limit">
              <span>
                {row.label}
                <span className="text-xs muted">
                  {' '}
                  · şimdi {count(view.effective[row.name])} {row.unit}
                  {view.settings[row.name] === undefined ? ' (varsayılan)' : ` (varsayılan ${count(view.defaults[row.name])})`}
                </span>
              </span>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                min={view.ranges[row.name].min}
                max={view.ranges[row.name].max}
                step={row.step}
                placeholder={String(view.effective[row.name])}
                value={draft[row.name] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [row.name]: e.target.value }))}
              />
            </label>
          ))}
          <div className="row">
            <button type="submit" className="btn btn-sm" disabled={saving || !Object.values(draft).some((v) => v?.trim())}>
              Kaydet
            </button>
            {custom.length > 0 && (
              <button type="button" className="btn btn-sm btn-quiet" disabled={saving} onClick={() => void save(Object.fromEntries(custom.map((r) => [r.name, null])))}>
                Varsayılanlara dön
              </button>
            )}
          </div>
          <p className="text-xs muted">YZ harcaması tam düzeyin sınırıdır; kelime düzeyi %20'sini, çalışma düzeyi %50'sini kullanır.</p>
        </form>
      )}
    </section>
  )
}

/** Auto-approval and the announcement to everyone. */
function SettingsCard() {
  const [view, setView] = useState<SettingsView | null>(null)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    loadSettings()
      .then(setView)
      .catch((e: unknown) => setError(failText(e)))
  }, [])
  const change = async (settings: { autoApprove?: boolean; facebookLogin?: boolean }, done: string) => {
    setBusy(true)
    try {
      setView(await saveSettings(settings))
      showToast(done)
    } catch (e) {
      showToast(`Olmadı: ${failText(e)}`, undefined, 5000, 'info')
    } finally {
      setBusy(false)
    }
  }
  const send = async (value: string) => {
    setBusy(true)
    try {
      const { announcement } = await announce(value)
      setView((v) => (v ? { ...v, settings: { ...v.settings, announcement } } : v))
      setText('')
      showToast(announcement ? 'Duyuru gönderildi: herkes bir sonraki açılışta görür.' : 'Duyuru kaldırıldı.')
    } catch (e) {
      showToast(`Olmadı: ${failText(e)}`, undefined, 5000, 'info')
    } finally {
      setBusy(false)
    }
  }
  const current = view?.settings.announcement
  return (
    <section className="card stack admin-card" aria-labelledby="admin-settings" id="admin-settings-card">
      <h2 className="section-title" id="admin-settings">
        Ayarlar ve duyuru
      </h2>
      {error && (
        <p className="note" role="alert">
          Yüklenemedi: {error}
        </p>
      )}
      {view && (
        <>
          <Toggle
            label="Yeni kayıtları hemen onayla"
            help="Açıkken yeni bir kişi ilk girişinde onaylı olur, bekleme listesine düşmez. Var olan bekleyenler etkilenmez."
            checked={view.settings.autoApprove === true}
            onChange={(v) => !busy && void change({ autoApprove: v }, v ? 'Yeni kayıtlar artık hemen onaylanacak.' : 'Yeni kayıtlar onay bekleyecek.')}
          />
          <Toggle
            label="Facebook ile giriş"
            help="Giriş sayfasında “Facebook ile devam et” düğmesi görünür. Meta'daki uygulama yayınlanmadan (Live) yalnızca sen girebilirsin; önce kendinle dene."
            checked={view.settings.facebookLogin === true}
            onChange={(v) => !busy && void change({ facebookLogin: v }, v ? 'Facebook ile giriş açıldı; bir dakika içinde görünür.' : 'Facebook ile giriş kapatıldı.')}
          />
          <form
            className="stack admin-announce"
            onSubmit={(e) => {
              e.preventDefault()
              if (text.trim()) void send(text)
            }}
          >
            <label className="stack">
              <span className="small">
                <strong>Herkese duyuru</strong> <span className="muted">(zil bildirimine düşer, 30 gün durur)</span>
              </span>
              <textarea className="input textarea textarea-sm" maxLength={220} value={text} onChange={(e) => setText(e.target.value)} placeholder="Örnek: Bu gece 23.00'te kısa bir bakım yapılacak." />
            </label>
            <div className="row">
              <button type="submit" className="btn btn-sm" disabled={busy || !text.trim()}>
                {current ? 'Yenisini gönder' : 'Gönder'}
              </button>
              <span className="text-xs muted">{text.length}/220</span>
            </div>
          </form>
          {current && (
            <div className="note admin-current">
              <p className="small">
                <strong>Şu anki duyuru</strong> · {when(current.at)}
              </p>
              <p className="small">{current.text}</p>
              <button type="button" className="btn btn-sm btn-quiet" disabled={busy} onClick={() => void send('')}>
                Kaldır
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

/** The owner's list of addresses and domains that may not sign up again. */
function BlocksCard() {
  const [data, setData] = useState<{ available: boolean; blocks: Block[] } | null>(null)
  const [error, setError] = useState('')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    loadBlocks()
      .then(setData)
      .catch((e: unknown) => setError(failText(e)))
  }, [])
  useEffect(load, [load])
  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    setBusy(true)
    try {
      await block(value.trim())
      setValue('')
      showToast('Engellendi.')
      load()
    } catch (err) {
      showToast(err instanceof AdminError && err.message === 'bad request' ? 'Bir e-posta (ad@ornek.com) ya da alan adı (ornek.com) yaz.' : `Olmadı: ${failText(err)}`, undefined, 5000, 'info')
    } finally {
      setBusy(false)
    }
  }
  const remove = async (b: Block) => {
    setBusy(true)
    try {
      await unblock(b.kind, b.value)
      showToast('Engel kaldırıldı.')
      load()
    } catch (err) {
      showToast(`Olmadı: ${failText(err)}`, undefined, 5000, 'info')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card stack admin-card" aria-labelledby="admin-blocks" id="admin-blocks-card">
      <h2 className="section-title" id="admin-blocks">
        Engellenenler
      </h2>
      {error && (
        <p className="note" role="alert">
          Yüklenemedi: {error}
        </p>
      )}
      {data && !data.available && <p className="small muted">Engelleme için Supabase'te 0011 göçünü çalıştır.</p>}
      {data?.available && (
        <>
          <p className="small muted">Buradaki adresler ve alan adları yeni hesap açamaz. Var olan bir hesap etkilenmez; onu Kişiler'den sil.</p>
          <form className="admin-block-form" onSubmit={(e) => void add(e)}>
            <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="ad@ornek.com ya da ornek.com" aria-label="Engellenecek e-posta ya da alan adı" autoComplete="off" spellCheck={false} />
            <button type="submit" className="btn btn-sm" disabled={busy || !value.trim()}>
              Engelle
            </button>
          </form>
          {data.blocks.length === 0 ? (
            <p className="small muted">Engellenen yok.</p>
          ) : (
            <ul className="plain account-group admin-blocks">
              {data.blocks.map((b) => (
                <li key={`${b.kind}|${b.value}`}>
                  <span className="admin-block-text">
                    <strong>{b.value}</strong>
                    <span className="text-xs muted">
                      {b.kind === 'domain' ? 'Alan adı' : 'E-posta'} · {when(b.createdAt)}
                      {b.note ? ` · ${b.note}` : ''}
                    </span>
                  </span>
                  <button type="button" className="btn btn-sm btn-quiet" disabled={busy} onClick={() => void remove(b)}>
                    Kaldır
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

function Figure({ value, label, target, tone }: { value: string; label: string; target: string; tone?: 'due' | 'ok' | 'bad' }) {
  return (
    <button type="button" className="admin-figure" data-tone={tone} onClick={() => scrollTo(target)}>
      <span className="admin-figure-value">{value}</span>
      <span className="admin-figure-label">
        {label}
        <ChevronRightIcon size={14} />
      </span>
    </button>
  )
}

export function AdminScreen() {
  const [summary, setSummary] = useState<AdminSummary>({})
  const tell = useCallback<Tell>((part) => setSummary((s) => ({ ...s, ...part })), [])
  const { pending, reports, healthy } = summary
  return (
    <div className="stack admin-page">
      <PageHeader title="Yönetim" sub="Yalnızca sana görünür: onaylar, YZ düzeyleri, şikâyetler ve sistemin durumu." art="look" />
      <div className="admin-figures" aria-label="Özet">
        <Figure value={pending === undefined ? '…' : String(pending)} label="Onay bekleyen" target="admin-people-card" tone={pending ? 'due' : undefined} />
        <Figure value={reports === undefined ? '…' : String(reports)} label="Şikâyet (7 gün)" target="admin-reports-card" tone={reports ? 'bad' : undefined} />
        <Figure value={healthy === undefined ? '…' : healthy ? 'Sağlıklı' : 'Dikkat'} label="Sistem" target="admin-system-card" tone={healthy === undefined ? undefined : healthy ? 'ok' : 'bad'} />
      </div>
      <StatsCard tell={tell} />
      <PeopleCard tell={tell} />
      <ReportsCard tell={tell} />
      <UsageCard />
      <SettingsCard />
      <BlocksCard />
      <SystemCard tell={tell} />
    </div>
  )
}
