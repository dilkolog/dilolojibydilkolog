import { useEffect, useState } from 'react'
import { gardenSummary } from '../engine/growth'
import { weeklyRace } from '../engine/race'
import type { Settings } from '../data/db'
import { BANNER_COLORS, daysUntil, pinnedBadges, titleName } from '../engine/profileStyle'
import { db, scheduler } from '../data/instance'
import type { GameState } from './game'
import { CARD_STATS, cardSvg, type CardData, type CardStat, type CardTheme } from './progressCardSvg'

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
    }).catch(() => {
      // No picture (no canvas, or the image would not decode): the card stays empty rather than failing.
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
