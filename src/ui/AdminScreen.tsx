import '../lazy.css'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  AdminError,
  changePerson,
  loadPeople,
  loadReports,
  loadSystem,
  moveStep,
  unpublishSet,
  type AiLevel,
  type OwnerReport,
  type PeopleFilter,
  type Person,
  type SystemState,
} from '../data/adminApi'
import { CheckCircleIcon, ChevronRightIcon, SearchIcon } from './icons'
import { PageHeader } from './PageHeader'
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
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {data && !data.levels && <p className="small muted">YZ düzeyi seçmek için Supabase'te 0007 göçünü çalıştır.</p>}
      {data && data.people.length >= 200 && <p className="text-xs muted">En yeni 200 kişi gösteriliyor; aramayla daralt.</p>}
      {data && data.people.length > 0 && <p className="text-xs muted">Değişiklik birkaç dakika içinde her yerde geçerli olur.</p>}
    </section>
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
      <PeopleCard tell={tell} />
      <ReportsCard tell={tell} />
      <SystemCard tell={tell} />
    </div>
  )
}
