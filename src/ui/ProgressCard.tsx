import { useEffect, useState } from 'react'
import { gardenSummary } from '../engine/growth'
import { weeklyRace } from '../engine/race'
import type { TargetLanguage } from '../engine/types'
import type { Settings } from '../data/db'
import { BANNER_COLORS, daysUntil, pinnedBadges, titleName } from '../engine/profileStyle'
import { db, scheduler } from '../data/instance'
import type { GameState } from './game'
import { LANGUAGE_NAME } from './labels'

/** Accent per language, as in the app (Tailwind blue / pink / amber). */
const ACCENT: Record<TargetLanguage, string> = { en: '#3b82f6', fr: '#ec4899', es: '#f59e0b' }

export interface CardData {
  name: string
  language: TargetLanguage
  streak: number
  level: number
  title: string
  xp: number
  words: number
  flowers: number
  growing: number
  vocab?: number
  weekXp: number
  badges: number
  /** "Hedef B2 · 124 gün kaldı", when the learner set one. */
  goal?: string
  interests?: string[]
  /** Titles of the badges the learner put on show. */
  pinned?: string[]
}

export type CardStat = 'streak' | 'words' | 'flowers' | 'weekXp' | 'xp' | 'badges'
export const CARD_STATS: { id: CardStat; name: string }[] = [
  { id: 'streak', name: 'Seri' },
  { id: 'words', name: 'Kelimeler' },
  { id: 'flowers', name: 'Çiçekler' },
  { id: 'weekXp', name: 'Bu hafta' },
  { id: 'xp', name: 'Toplam XP' },
  { id: 'badges', name: 'Rozetler' },
]

export type CardTheme = 'dark' | 'light' | 'banner'

export interface CardStyle {
  stats?: CardStat[]
  theme?: CardTheme
  /** The banner's two colours, for the 'banner' theme. */
  colors?: [string, string]
}

const PALETTE = {
  dark: { top: '#0f172a', bottom: '#1e293b', ink: '#f8fafc', label: '#94a3b8', muted: '#64748b', veil: 0 },
  light: { top: '#f8fafc', bottom: '#e2e8f0', ink: '#0f172a', label: '#475569', muted: '#64748b', veil: 0 },
  banner: { top: '#0f172a', bottom: '#1e293b', ink: '#f8fafc', label: '#cbd5e1', muted: '#94a3b8', veil: 0.55 },
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** The card as a standalone SVG (fixed colours and system fonts, so it renders anywhere). */
export function cardSvg(d: CardData, style: CardStyle = {}): string {
  const theme = style.theme ?? 'dark'
  const p = PALETTE[theme]
  const chosen = CARD_STATS.map((s) => s.id).filter((id) => (style.stats ?? CARD_STATS.map((s) => s.id)).includes(id))
  const [c1, c2] = style.colors ?? [ACCENT[d.language], ACCENT[d.language]]
  // On the banner's own colours the accent would vanish into the background: it turns white there.
  const a = theme === 'banner' ? '#ffffff' : ACCENT[d.language]
  const onAccent = theme === 'banner' ? c1 : '#fff'
  const value: Record<CardStat, [string, string]> = {
    streak: [`${d.streak}`, 'günlük seri'],
    words: [d.vocab ? `≈${d.vocab.toLocaleString('tr-TR')}` : String(d.words), d.vocab ? 'kelime dağarcığı' : 'çalıştığım kelime'],
    flowers: [`${d.flowers}`, `çiçek açtı (${d.growing} büyüyor)`],
    weekXp: [`${d.weekXp}`, 'bu hafta XP'],
    xp: [`${d.xp.toLocaleString('tr-TR')}`, 'toplam XP'],
    badges: [`${d.badges}`, 'rozet'],
  }
  const stat = (i: number, id: CardStat) => {
    const x = i % 2 === 0 ? 80 : 580
    const y = 610 + Math.floor(i / 2) * 215
    return `<text x="${x}" y="${y}" font-size="88" font-weight="800" fill="${p.ink}">${esc(value[id][0])}</text><text x="${x}" y="${y + 52}" font-size="34" fill="${p.label}">${esc(value[id][1])}</text>`
  }
  const flower = (cx: number, cy: number, s: number, color: string) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})"><path d="M0 40 C-2 20 2 20 0 0" stroke="#34d399" stroke-width="4" fill="none"/><path d="M0 28 q-14 -10 -22 -4 q8 10 22 4z M0 22 q14 -10 22 -4 q-8 10 -22 4z" fill="#34d399"/>${[0, 72, 144, 216, 288]
      .map((r) => `<ellipse cx="0" cy="-9" rx="6" ry="10" fill="${color}" transform="rotate(${r})"/>`)
      .join('')}<circle r="6" fill="#fbbf24"/></g>`
  const lines: string[] = []
  let y = 410
  if (d.goal) {
    lines.push(`<text x="80" y="${y}" font-size="36" font-weight="700" fill="${a}">${esc(d.goal)}</text>`)
    y += 50
  }
  if (d.interests?.length) lines.push(`<text x="80" y="${y}" font-size="32" fill="${p.label}">${esc(d.interests.join(' · '))}</text>`)
  const pins = d.pinned?.length ? `<text x="80" y="1255" font-size="32" font-weight="600" fill="${p.label}">${esc(`Rozetlerim: ${d.pinned.join(' · ')}`)}</text>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" font-family="-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${theme === 'banner' ? c1 : p.top}"/><stop offset="1" stop-color="${theme === 'banner' ? c2 : p.bottom}"/></linearGradient></defs>
  <rect width="1080" height="1350" fill="url(#g)"/>
  ${p.veil ? `<rect width="1080" height="1350" fill="#0f172a" fill-opacity="${p.veil}"/>` : ''}
  <rect x="0" y="0" width="1080" height="14" fill="${a}"/>
  <rect x="80" y="96" width="76" height="76" rx="20" fill="${a}"/><text x="118" y="152" font-size="52" font-weight="800" fill="${onAccent}" text-anchor="middle">k</text>
  <text x="180" y="148" font-size="44" font-weight="700" fill="${p.ink}">Kelime Koçu</text>
  <text x="80" y="290" font-size="64" font-weight="800" fill="${p.ink}">${esc(d.name || 'İlerlemem')}</text>
  <text x="80" y="352" font-size="38" fill="${a}">${esc(LANGUAGE_NAME[d.language])} · Seviye ${d.level} · ${esc(d.title)}</text>
  ${lines.join('\n  ')}
  ${chosen.map((id, i) => stat(i, id)).join('\n  ')}
  ${flower(820, 1150, 2.4, a)}${flower(930, 1190, 1.6, '#a78bfa')}${flower(720, 1200, 1.4, '#f472b6')}
  ${pins}
  <text x="80" y="1315" font-size="30" fill="${p.muted}">${esc(new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }))}</text>
</svg>`
}

async function svgToPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1350
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

const OPTIONS_KEY = 'kelime-koc:share-card'
const DEFAULT_STATS: CardStat[] = ['streak', 'words', 'flowers', 'weekXp', 'xp', 'badges']

function savedOptions(): { stats: CardStat[]; theme: CardTheme } {
  try {
    const o = JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? 'null')
    const stats = Array.isArray(o?.stats) ? (o.stats as string[]).filter((x): x is CardStat => CARD_STATS.some((s) => s.id === x)) : DEFAULT_STATS
    const theme: CardTheme = o?.theme === 'light' || o?.theme === 'banner' ? o.theme : 'dark'
    return { stats: stats.length ? stats : DEFAULT_STATS, theme }
  } catch {
    return { stats: DEFAULT_STATS, theme: 'dark' }
  }
}

/**
 * The progress card for the active language: ready as soon as the tab opens, redrawn as the
 * learner picks what shows and in which colours; download and share when it looks right.
 */
export function ProgressCardButton({ settings, game }: { settings: Settings; game: GameState }) {
  const [options, setOptions] = useState(savedOptions)
  const [data, setData] = useState<CardData | null>(null)
  const [png, setPng] = useState<{ blob: Blob; url: string } | null>(null)
  const { profile } = settings
  const language = settings.activeLanguage

  // The numbers (the garden and the vocabulary estimate need the stored words).
  useEffect(() => {
    let live = true
    void (async () => {
      const [{ vocabulary, states }, tests] = await Promise.all([db.loadLanguage(language), db.getVocabTests()])
      const garden = gardenSummary(vocabulary, states, scheduler, new Date())
      const earned = new Set(game.achievements.filter((a) => a.unlocked).map((a) => a.id))
      const left = daysUntil(profile.goalDate, new Date())
      const unlockables = { level: game.level.level, stats: game.stats, badges: earned }
      if (!live) return
      setData({
        name: profile.name,
        language,
        streak: game.streak,
        level: game.level.level,
        title: titleName(profile.title, unlockables),
        xp: game.xp.total,
        words: states.length,
        flowers: garden.byStage[5],
        growing: garden.byStage.slice(0, 5).reduce((x, y) => x + y, 0),
        vocab: tests.filter((t) => t.language === language).at(-1)?.estimate,
        weekXp: weeklyRace(game.xp.byDay, new Date()).thisWeek,
        badges: earned.size,
        goal: profile.goalLevel ? `Hedef ${profile.goalLevel}${left === null ? '' : left > 0 ? ` · ${left} gün kaldı` : left === 0 ? ' · bugün' : ''}` : undefined,
        interests: profile.interests,
        pinned: pinnedBadges(profile.pinned, earned).map((id) => game.achievements.find((a) => a.id === id)?.title ?? '').filter(Boolean),
      })
    })()
    return () => {
      live = false
    }
  }, [language, game, profile])

  // The picture, redrawn when the data or the choices change.
  useEffect(() => {
    if (!data) return
    let live = true
    let made: string | null = null
    const colors = profile.banner && BANNER_COLORS[profile.banner] ? BANNER_COLORS[profile.banner] : ([profile.color, profile.color] as [string, string])
    void svgToPng(cardSvg(data, { ...options, colors })).then((blob) => {
      if (!live) return
      made = URL.createObjectURL(blob)
      setPng({ blob, url: made })
    })
    return () => {
      live = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [data, options, profile.banner, profile.color])

  const choose = (next: Partial<{ stats: CardStat[]; theme: CardTheme }>) => {
    const merged = { ...options, ...next }
    setOptions(merged)
    try {
      localStorage.setItem(OPTIONS_KEY, JSON.stringify(merged))
    } catch {
      // Not remembered; fine.
    }
  }
  const toggleStat = (id: CardStat) => {
    const on = options.stats.includes(id)
    // At least one number stays, and a card holds six at most.
    if (on && options.stats.length === 1) return
    choose({ stats: on ? options.stats.filter((x) => x !== id) : CARD_STATS.map((s) => s.id).filter((x) => x === id || options.stats.includes(x)) })
  }

  const file = () => new File([png!.blob], 'kelime-kocu-ilerleme.png', { type: 'image/png' })
  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare && png && navigator.canShare({ files: [file()] })

  return (
    <section className="section stack share-card">
      <h2 className="section-title">İlerleme kartı</h2>
      <p className="small muted">Neyin görüneceğini ve renklerini seç; kart anında yenilenir. Unvanın, hedefin, ilgi alanların ve vitrindeki rozetlerin de kartta yer alır.</p>
      <div className="stack gap-xs">
        <span className="small">Kartta görünsün</span>
        <div className="choice-row" role="group" aria-label="Kartta görünecek sayılar">
          {CARD_STATS.map((s) => (
            <button key={s.id} type="button" className="chip chip-sm" aria-pressed={options.stats.includes(s.id)} onClick={() => toggleStat(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
        <span className="small">Renkler</span>
        <div className="choice-row" role="radiogroup" aria-label="Kart renkleri">
          {(['dark', 'light', 'banner'] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={options.theme === t} className="chip chip-sm" aria-pressed={options.theme === t} onClick={() => choose({ theme: t })}>
              {t === 'dark' ? 'Koyu' : t === 'light' ? 'Açık' : 'Afişin renkleri'}
            </button>
          ))}
        </div>
      </div>
      {png ? <img className="progress-card-img" src={png.url} alt="İlerleme kartı" /> : <div className="progress-card-img progress-card-wait" aria-busy="true">Hazırlanıyor…</div>}
      <div className="row">
        <a className="btn" href={png?.url} download="kelime-kocu-ilerleme.png" aria-disabled={!png}>
          İndir
        </a>
        {canShare && (
          <button className="btn btn-quiet" onClick={() => navigator.share({ files: [file()], title: 'Kelime Koçu ilerlemem' }).catch(() => {})}>
            Paylaş
          </button>
        )}
      </div>
    </section>
  )
}
