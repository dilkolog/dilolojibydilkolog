import { useEffect, useState } from 'react'
import { gardenSummary } from '../engine/growth'
import { weeklyRace } from '../engine/race'
import type { TargetLanguage } from '../engine/types'
import type { Settings } from '../data/db'
import { db, scheduler } from '../data/instance'
import type { GameState } from './game'
import { LANGUAGE_NAME } from './labels'

/** Accent per language, as in the app (Tailwind blue / pink / amber). */
const ACCENT: Record<TargetLanguage, string> = { en: '#3b82f6', fr: '#ec4899', es: '#f59e0b' }

interface CardData {
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
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** The card as a standalone SVG (fixed colours and system fonts, so it renders anywhere). */
export function cardSvg(d: CardData): string {
  const a = ACCENT[d.language]
  const stat = (x: number, y: number, value: string, label: string) =>
    `<text x="${x}" y="${y}" font-size="88" font-weight="800" fill="#f8fafc">${esc(value)}</text><text x="${x}" y="${y + 52}" font-size="34" fill="#94a3b8">${esc(label)}</text>`
  const flower = (cx: number, cy: number, s: number, color: string) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})"><path d="M0 40 C-2 20 2 20 0 0" stroke="#34d399" stroke-width="4" fill="none"/><path d="M0 28 q-14 -10 -22 -4 q8 10 22 4z M0 22 q14 -10 22 -4 q-8 10 -22 4z" fill="#34d399"/>${[0, 72, 144, 216, 288]
      .map((r) => `<ellipse cx="0" cy="-9" rx="6" ry="10" fill="${color}" transform="rotate(${r})"/>`)
      .join('')}<circle r="6" fill="#fbbf24"/></g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" font-family="-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#1e293b"/></linearGradient></defs>
  <rect width="1080" height="1350" fill="url(#g)"/>
  <rect x="0" y="0" width="1080" height="14" fill="${a}"/>
  <rect x="80" y="96" width="76" height="76" rx="20" fill="${a}"/><text x="118" y="152" font-size="52" font-weight="800" fill="#fff" text-anchor="middle">k</text>
  <text x="180" y="148" font-size="44" font-weight="700" fill="#f8fafc">Kelime Koçu</text>
  <text x="80" y="290" font-size="64" font-weight="800" fill="#f8fafc">${esc(d.name || 'İlerlemem')}</text>
  <text x="80" y="352" font-size="38" fill="${a}">${esc(LANGUAGE_NAME[d.language])} · Seviye ${d.level} · ${esc(d.title)}</text>
  ${stat(80, 540, `${d.streak}`, 'günlük seri')}
  ${stat(580, 540, d.vocab ? `≈${d.vocab.toLocaleString('tr-TR')}` : String(d.words), d.vocab ? 'kelime dağarcığı' : 'çalıştığım kelime')}
  ${stat(80, 760, `${d.flowers}`, `çiçek açtı (${d.growing} büyüyor)`)}
  ${stat(580, 760, `${d.weekXp}`, 'bu hafta XP')}
  ${stat(80, 980, `${d.xp.toLocaleString('tr-TR')}`, 'toplam XP')}
  ${stat(580, 980, `${d.badges}`, 'rozet')}
  ${flower(820, 1150, 2.4, a)}${flower(930, 1190, 1.6, '#a78bfa')}${flower(720, 1200, 1.4, '#f472b6')}
  <text x="80" y="1250" font-size="30" fill="#64748b">${esc(new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }))}</text>
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

/** Builds the progress card for the active language, with download and share. */
export function ProgressCardButton({ settings, game }: { settings: Settings; game: GameState }) {
  const [png, setPng] = useState<{ blob: Blob; url: string } | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(
    () => () => {
      if (png) URL.revokeObjectURL(png.url)
    },
    [png],
  )

  const make = async () => {
    setBusy(true)
    const language = settings.activeLanguage
    const [{ vocabulary, states }, tests] = await Promise.all([db.loadLanguage(language), db.getVocabTests()])
    const garden = gardenSummary(vocabulary, states, scheduler, new Date())
    const svg = cardSvg({
      name: settings.profile.name,
      language,
      streak: game.streak,
      level: game.level.level,
      title: game.level.title,
      xp: game.xp.total,
      words: states.length,
      flowers: garden.byStage[5],
      growing: garden.byStage.slice(0, 5).reduce((a, b) => a + b, 0),
      vocab: tests.filter((t) => t.language === language).at(-1)?.estimate,
      weekXp: weeklyRace(game.xp.byDay, new Date()).thisWeek,
      badges: game.achievements.filter((x) => x.unlocked).length,
    })
    const blob = await svgToPng(svg)
    setPng({ blob, url: URL.createObjectURL(blob) })
    setBusy(false)
  }

  const file = () => new File([png!.blob], 'kelime-kocu-ilerleme.png', { type: 'image/png' })
  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare && png && navigator.canShare({ files: [file()] })

  return (
    <section className="section stack">
      <h2 className="section-title">İlerleme kartı</h2>
      {png ? (
        <>
          <img className="progress-card-img" src={png.url} alt="İlerleme kartı" />
          <div className="row">
            <a className="btn" href={png.url} download="kelime-kocu-ilerleme.png">
              İndir
            </a>
            {canShare && (
              <button className="btn btn-quiet" onClick={() => navigator.share({ files: [file()], title: 'Kelime Koçu ilerlemem' }).catch(() => {})}>
                Paylaş
              </button>
            )}
            <button className="link small" onClick={make}>
              Yenile
            </button>
          </div>
        </>
      ) : (
        <div>
          <button className="btn btn-quiet" onClick={make} disabled={busy}>
            {busy ? 'Hazırlanıyor…' : 'Kartımı oluştur'}
          </button>
        </div>
      )}
    </section>
  )
}
