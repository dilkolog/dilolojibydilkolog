import type { ReactNode } from 'react'
import { localDate } from '../engine/progress'
import type { ReviewEvent } from '../engine/types'
import type { weekReport } from '../engine/insights'
import { TargetIcon } from './icons'

function Delta({ now, before, suffix = '' }: { now: number; before: number; suffix?: string }) {
  if (before === 0 && now === 0) return null
  const diff = now - before
  if (diff === 0) return <span className="delta">=</span>
  return (
    <span className={`delta ${diff > 0 ? 'up' : 'down'}`}>
      {diff > 0 ? '▲' : '▼'} {Math.abs(Math.round(diff))}
      {suffix}
    </span>
  )
}

const FOCUS_TEXT: Record<string, string> = {
  recognition: 'Tanıma zayıf: yeni kelimeleri daha sık tekrar et.',
  recall: 'Hatırlama zayıf: yazarak hatırlama sorularına ağırlık ver; ipucunu geç aç.',
  production: 'Üretme zayıf: boşluk doldurma ve kendi cümleni kurma alıştırmaları yap.',
  listening: 'Dinleme zayıf: dikte ve dinleme sorularıyla kulağını alıştır.',
  collocation: 'Kalıplar zayıf: kelimeleri birlikte kullanıldıkları kelimelerle çalış.',
}

/** A thin trend line; the last point (this week) is marked. */
function Sparkline({ values }: { values: (number | null)[] }) {
  const nums = values.map((v) => v ?? 0)
  const max = Math.max(...nums, 1e-9)
  const W = 96
  const H = 24
  const pts = nums.map((v, i) => [(i / Math.max(1, nums.length - 1)) * W, H - 2 - (v / max) * (H - 4)] as const)
  const last = pts[pts.length - 1]
  return (
    <svg className="sparkline" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <polyline points={pts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="currentColor" />
    </svg>
  )
}

const WEEKDAY = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct']

/**
 * The page opens on the week: a sentence on how it compares with the last one, the seven days as
 * dots, the figures with their change, and the one thing to focus on.
 */
export function WeekHero({
  report,
  events,
  now,
  weeks,
  streak,
  active,
  focus,
}: {
  report: ReturnType<typeof weekReport>
  events: readonly ReviewEvent[]
  now: Date
  weeks: { answers: number; accuracy: number }[]
  streak: ReactNode
  active: number
  focus: string | null
}) {
  const t = report.thisWeek
  const l = report.lastWeek
  const studied = new Set(events.filter((e) => e.mode === 'normal').map((e) => localDate(e.timestamp)))
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    return { key: localDate(d), label: WEEKDAY[d.getDay()], today: i === 6 }
  })
  const headline =
    t.answers === 0
      ? 'Bu hafta henüz çalışmadın'
      : l.answers === 0
        ? `Bu hafta ${t.answers} cevap verdin`
        : t.answers >= l.answers
          ? `Geçen haftadan %${Math.round(((t.answers - l.answers) / l.answers) * 100)} daha fazla cevap`
          : `Geçen haftanın %${Math.round((t.answers / l.answers) * 100)}'i kadar cevap`
  return (
    <section className="week-hero span-2">
      <div className="week-hero-main">
        <span className="small week-hero-kicker">Son 7 gün</span>
        <h2 className="week-hero-title">{headline}</h2>
        <ol className="week-dots" aria-label={`7 günün ${t.daysStudied} gününde çalıştın`}>
          {days.map((d) => (
            <li key={d.key} className={`${studied.has(d.key) ? 'is-on' : ''}${d.today ? ' is-today' : ''}`}>
              <span className="week-dot" aria-hidden />
              <span className="small">{d.label}</span>
            </li>
          ))}
        </ol>
        {focus && FOCUS_TEXT[focus] && (
          <p className="small week-hero-focus">
            <TargetIcon size={15} className="inline-icon" />
            {FOCUS_TEXT[focus]}
          </p>
        )}
      </div>
      <dl className="week-hero-figures">
        <div>
          <dt>cevap</dt>
          <dd>
            {t.answers} <Delta now={t.answers} before={l.answers} />
          </dd>
          {weeks.some((w) => w.answers) && <Sparkline values={weeks.map((w) => w.answers)} />}
        </div>
        <div>
          <dt>doğruluk</dt>
          <dd>
            {t.answers ? `%${Math.round(t.accuracy * 100)}` : '—'} {t.answers > 0 && <Delta now={t.accuracy * 100} before={l.accuracy * 100} />}
          </dd>
        </div>
        <div>
          <dt>yeni kelime</dt>
          <dd>
            {t.newWords} <Delta now={t.newWords} before={l.newWords} />
          </dd>
        </div>
        <div>
          <dt>XP</dt>
          <dd>
            {t.xp} <Delta now={t.xp} before={l.xp} />
          </dd>
        </div>
        <div>
          <dt>günlük seri</dt>
          <dd>{streak}</dd>
        </div>
        <div>
          <dt>aktif kelime</dt>
          <dd>{active}</dd>
        </div>
      </dl>
    </section>
  )
}
