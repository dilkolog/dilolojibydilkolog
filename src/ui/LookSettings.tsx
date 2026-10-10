import { useState } from 'react'
import type { Settings } from '../data/db'
import { getDensity, setDensity, type Density } from './density'
import { HIDEABLE_TABS, partsSummary, readUsage, SCREEN_LABEL, trackedSince, usageLabel, usageSummary, type ScreenUse } from './screenUsage'
import { Chips, Row, Toggle } from './settingsWidgets'

export function LookSettings({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (s: Settings) => void
}) {
  const [density, setDensityState] = useState<Density>(getDensity)
  const lang = settings.activeLanguage
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })

  return (
    <>
      <section className="card stack">
        <h2 className="section-title">Görünüm</h2>
        <Row label="Tema" help="Sakin: koyu tema, renkleri kısılmış; geceleri ve uzun çalışmada gözü yormaz. Kontrast: beyaz zemin, siyah yazı, belirgin çerçeveler.">
          <Chips<Settings['theme']> options={['system', 'light', 'dark', 'calm', 'contrast']} value={settings.theme} onChange={(v) => set('theme', v)} format={(t) => ({ system: 'Sistem', light: 'Açık', dark: 'Koyu', calm: 'Sakin', contrast: 'Kontrast' })[t]} />
        </Row>
        <Row label="Liste sıklığı" help="Yoğun: kelime listesi, hatalar ve tabloda satırlar daralır, ekrana iki kat kelime sığar. Bu cihaza özel.">
          <Chips<Density> options={['comfortable', 'compact']} value={density} onChange={(v) => (setDensity(v), setDensityState(v))} format={(d) => ({ comfortable: 'Rahat', compact: 'Yoğun' })[d]} />
        </Row>
        <Row label="Yazı boyutu" help="Bütün uygulamayı büyütür; uzun okumalarda ve telefonda rahatlatır.">
          <Chips<NonNullable<Settings['textScale']>>
            options={['normal', 'large', 'xlarge']}
            value={settings.textScale ?? 'normal'}
            onChange={(v) => set('textScale', v)}
            format={(t) => ({ normal: 'Normal', large: 'Büyük', xlarge: 'Çok büyük' })[t]}
          />
        </Row>
        <Toggle label="Titreşim" help="Telefonda doğru cevapta kısa, yanlışta çift titreşim (Android; iPhone tarayıcıları desteklemiyor)." checked={settings.haptics ?? true} onChange={(v) => set('haptics', v)} />
        <div className="desktop-only">
          <Toggle label="Klavye kısayollarını göster" help="Oturum ekranının altındaki kısayol listesi." checked={settings.showKeyLegend} onChange={(v) => set('showKeyLegend', v)} />
        </div>
      </section>
      <UsageCard hidden={settings.hiddenTabs ?? []} english={lang === 'en'} onChange={(tabs) => set('hiddenTabs', tabs)} />
    </>
  )
}

/**
 * Which screens are opened, counted on this device only, and the tabs that can leave the menu:
 * a tab never opened in a month is worth hiding (⌘K and links still open it).
 */
function UsageCard({ hidden, english, onChange }: { hidden: string[]; english: boolean; onChange: (tabs: string[]) => void }) {
  const [log] = useState(readUsage)
  const now = new Date()
  const uses = usageSummary(log, now)
  const lab = english ? [] : partsSummary(log, 'verbs', now)
  const since = trackedSince(log)
  const tabs = HIDEABLE_TABS.filter((t) => t !== 'verbs' || !english)
  const unused = (t: string) => !uses.some((u) => u.screen === t)
  // "Never opened" says something only after a couple of weeks of counting.
  const longEnough = !!since && now.getTime() - new Date(`${since}T00:00:00`).getTime() >= 14 * 86_400_000
  return (
    <section className="card stack">
      <h2 className="section-title">Kullanım</h2>
      <p className="small muted">Son 30 günde hangi ekranı kaç kez açtığın. Yalnızca bu cihazda sayılır; hiçbir yere gönderilmez.</p>
      {uses.length > 0 ? <UsageList uses={uses.slice(0, 8)} /> : <p className="small muted">Henüz sayılmış bir şey yok.</p>}
      {lab.length > 0 && (
        <>
          <h3 className="subhead">Fiil laboratuvarı</h3>
          <p className="small muted">Hangi sekme ve alıştırmayı kullandığın; hiç açılmayanlar sadeleştirilebilir.</p>
          <UsageList uses={lab.slice(0, 10)} />
        </>
      )}
      <h3 className="subhead">Menüdeki sekmeler</h3>
      <p className="small muted">Kullanmadığın sekmeleri menüden kaldırabilirsin; ⌘K ile ya da bağlantılardan yine açılırlar.</p>
      {tabs.map((t) => (
        <Toggle
          key={t}
          label={`${SCREEN_LABEL[t]}${longEnough && unused(t) && !hidden.includes(t) ? ' · 30 gündür açılmadı' : ''}`}
          checked={!hidden.includes(t)}
          onChange={(show) => onChange(show ? hidden.filter((x) => x !== t) : [...hidden, t])}
        />
      ))}
    </section>
  )
}

function UsageList({ uses }: { uses: readonly ScreenUse[] }) {
  const max = Math.max(1, ...uses.map((u) => u.opens))
  return (
    <ul className="hour-list">
      {uses.map((u) => (
        <li key={u.screen}>
          <span className="hour-label">{usageLabel(u.screen)}</span>
          <span className="hour-bar">
            <span style={{ width: `${(u.opens / max) * 100}%` }} />
          </span>
          <span className="hour-pct">{u.opens}</span>
          <span className="small muted">{u.days} gün</span>
        </li>
      ))}
    </ul>
  )
}
