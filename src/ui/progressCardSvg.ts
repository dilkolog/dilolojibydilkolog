import type { TargetLanguage } from '../engine/types'
import { LANGUAGE_NAME } from './labels'

/**
 * The app's language colours (DESIGN.md: --en / --fr / --es): the fill, the ink on it (amber takes
 * dark text), and the text shade for a dark or light card (--*-text of each theme).
 */
const ACCENT: Record<TargetLanguage, { fill: string; on: string; text: { dark: string; light: string } }> = {
  en: { fill: '#2f6de6', on: '#ffffff', text: { dark: '#a7cbff', light: '#2b58b1' } },
  fr: { fill: '#c6317c', on: '#ffffff', text: { dark: '#ffafce', light: '#9a2f62' } },
  es: { fill: '#e6a313', on: '#451a03', text: { dark: '#efc37e', light: '#844b00' } },
}

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
  const accent = ACCENT[d.language]
  const [c1, c2] = style.colors ?? [accent.fill, accent.fill]
  // On the banner's own colours the accent would vanish into the background: it turns white there.
  const a = theme === 'banner' ? '#ffffff' : accent.fill
  const aText = theme === 'banner' ? '#ffffff' : accent.text[theme === 'light' ? 'light' : 'dark']
  const onAccent = theme === 'banner' ? c1 : accent.on
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
    lines.push(`<text x="80" y="${y}" font-size="36" font-weight="700" fill="${aText}">${esc(d.goal)}</text>`)
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
  <text x="180" y="148" font-size="44" font-weight="700" fill="${p.ink}">Diloloji</text>
  <text x="80" y="290" font-size="64" font-weight="800" fill="${p.ink}">${esc(d.name || 'İlerlemem')}</text>
  <text x="80" y="352" font-size="38" fill="${aText}">${esc(LANGUAGE_NAME[d.language])} · Seviye ${d.level} · ${esc(d.title)}</text>
  ${lines.join('\n  ')}
  ${chosen.map((id, i) => stat(i, id)).join('\n  ')}
  ${flower(820, 1150, 2.4, a)}${flower(930, 1190, 1.6, '#a78bfa')}${flower(720, 1200, 1.4, '#f472b6')}
  ${pins}
  <text x="80" y="1315" font-size="30" fill="${p.muted}">${esc(new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }))}</text>
</svg>`
}
