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
import { PageHeader } from './PageHeader'
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

function PeopleCard() {
  const [filter, setFilter] = useState<PeopleFilter>('pending')
  const [query, setQuery] = useState('')
  const [asked, setAsked] = useState('')
  const [data, setData] = useState<{ people: Person[]; levels: boolean; pending: number } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError('')
    try {
      setData(await loadPeople(filter, asked))
    } catch (e) {
      setError(failText(e))
    }
  }, [filter, asked])
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
    <section className="card stack admin-card" aria-labelledby="admin-people">
      <h2 className="section-title" id="admin-people">
        Kişiler{data && data.pending > 0 ? ` · ${data.pending} onay bekliyor` : ''}
      </h2>
      <div className="seg-group" role="radiogroup" aria-label="Hangi kişiler">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="radio" className="seg-btn" aria-checked={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <form className="admin-search" onSubmit={search} role="search">
        <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="E-posta ya da ad ara" aria-label="Kişi ara" autoComplete="off" />
        <button type="submit" className="btn btn-sm btn-quiet">
          Ara
        </button>
      </form>
      {error && (
        <p className="note" role="alert">
          Yüklenemedi: {error}
        </p>
      )}
      {data && data.people.length === 0 && <p className="small muted">{asked ? `“${asked}” ile eşleşen kimse yok.` : filter === 'pending' ? 'Onay bekleyen kimse yok.' : 'Burada kimse yok.'}</p>}
      {data && data.people.length > 0 && (
        <div className="account-group admin-people">
          {data.people.map((p) => (
            <div key={p.id} className="account-row admin-person">
              <div className="account-row-text admin-person-text">
                <strong>{p.username || p.email.split('@')[0] || 'Adsız'}</strong>
                <span className="small muted">{p.email}</span>
                <span className="small muted">
                  {when(p.createdAt)} · {p.approved ? 'Onaylı' : p.rejected ? 'Reddedildi' : 'Onay bekliyor'}
                </span>
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
            </div>
          ))}
        </div>
      )}
      {data && !data.levels && <p className="small muted">YZ düzeyi seçmek için Supabase'te 0007 göçünü çalıştır.</p>}
      <p className="small muted">Bir değişiklik bu sunucuda hemen, öbürlerinde birkaç dakika içinde geçerli olur. En yeni 200 kişi gösterilir; aramayla daralt.</p>
    </section>
  )
}

function ReportsCard() {
  const [reports, setReports] = useState<OwnerReport[] | null>(null)
  const [error, setError] = useState('')
  const [gone, setGone] = useState<Set<string>>(new Set())
  useEffect(() => {
    loadReports(7)
      .then((r) => setReports(r.reports))
      .catch((e: unknown) => setError(failText(e)))
  }, [])
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
    <section className="card stack admin-card" aria-labelledby="admin-reports">
      <h2 className="section-title" id="admin-reports">
        Şikâyetler · son 7 gün
      </h2>
      {error && (
        <p className="note" role="alert">
          Yüklenemedi: {error}
        </p>
      )}
      {reports && reports.length === 0 && <p className="small muted">Son 7 günde şikâyet yok.</p>}
      {reports && reports.length > 0 && (
        <ul className="plain stack admin-reports">
          {reports.map((r) => (
            <li key={r.id} className="admin-report">
              <p className="small muted">
                {when(r.at)} · {KIND[r.kind]} · {REASON[r.reason] ?? r.reason}
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

function SystemCard() {
  const [state, setState] = useState<SystemState | null>(null)
  const [error, setError] = useState('')
  const [moving, setMoving] = useState<{ copied: number; at: string } | null>(null)

  const load = useCallback(() => {
    loadSystem()
      .then(setState)
      .catch((e: unknown) => setError(failText(e)))
  }, [])
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
    <li>
      {name}: <strong>{s === 'ok' ? 'çalışıyor' : s === 'down' ? 'ulaşılamıyor' : 'kurulu değil'}</strong>
    </li>
  )

  return (
    <section className="card stack admin-card" aria-labelledby="admin-system">
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
          <ul className="plain small">
            {part('Supabase', state.health.supabase)}
            {part('Cloudflare R2', state.health.storage)}
          </ul>
          {state.problems.length > 0 ? (
            <div className="note" role="status">
              <strong>Dikkat edilecekler</strong>
              <ul>
                {state.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="small muted">Saatlik denetimde sorun yok.</p>
          )}
          <div className="stack admin-move">
            <strong>Küçük sunucu belgeleri Supabase'te</strong>
            {state.docs === 'on' ? (
              <p className="small muted">Taşındı: adlar, istekler, engellemeler, şikâyetler ve eski kayıtlar artık yalnızca Supabase'ten okunuyor.</p>
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

export function AdminScreen() {
  return (
    <div className="stack admin-page">
      <PageHeader title="Yönetim" sub="Yalnızca sana görünür: onaylar, YZ düzeyleri, şikâyetler ve sistemin durumu." />
      <PeopleCard />
      <ReportsCard />
      <SystemCard />
    </div>
  )
}
