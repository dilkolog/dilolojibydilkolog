import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { showToast } from './toast'
import { relativeWorkload } from '../engine/scheduler'
import { shortcutHelp } from '../engine/accents'
import { TARGET_LANGUAGES } from '../engine/types'
import { parseBackup, restoreBackup, type Backup, type Settings } from '../data/db'
import { downloadBackup } from './backup'
import { PANE_KEY } from './settingsPane'
import { db } from '../data/instance'
import { AiSettings } from './AiSettings'
import { ConfirmDialog } from './Dialog'
import { MemoryModel } from './MemoryModel'
import { AccountSettings } from './AccountSettings'
import type { AuthMode } from './AuthScreen'
import { OfflinePack } from './OfflinePack'
import { IosShortcut } from './IosShortcut'
import { JumpNav } from './JumpNav'
import { ReminderSuggestion, useUsualStudyHour } from './BestHours'
import { reminderTime } from '../engine/hours'
import { StudyCalendar } from './StudyCalendar'
import { disablePush, enablePush, pushSubscription, pushSupported, type PushState } from './pushReminders'
import { NaturalVoiceSettings } from './NaturalVoiceSettings'
import { BellIcon, DataIcon, PaletteIcon, PenIcon, SearchIcon, SpeakerIcon, TargetIcon, ToolIcon, UserIcon } from './icons'
import { Help } from './SettingHelp'
import { LANGUAGE_NAME } from './labels'
import { badgeSupported } from './appBadge'
import { askClipboard, clipboardSupported } from './clipboardSuggest'
import { calendarFile, notificationsSupported, requestNotifications, showReminder } from './reminders'
import { Select } from './Select'
import { canSpeak, speak, voicesFor } from './speech'
import { canListen } from './speechInput'
import { dictionaryHtml, toCsv } from '../data/exportList'
import { forecastWorkload, monthlyMinutes, recommendedNewWords } from '../engine/workloadForecast'
import { bookmarkletCode } from './incoming'
import { PageHeader } from './PageHeader'
import type { TypingShare } from '../engine/session'
import { getDensity, setDensity, type Density } from './density'
import { AzureSpeechSettings } from './AzureSpeechSettings'

const MINUTES = [5, 10, 15, 20, 30, 45]
const NEW_WORDS = [0, 3, 5, 8, 12, 20]
const XP_GOALS = [30, 50, 100, 200, 300]
const SESSION_MAX = [0, 10, 20, 30, 50]
const HINT_DELAYS = [0, 3, 6, 10]
const RATES = [0.7, 0.8, 0.9, 1, 1.1]
const RETENTIONS = [0.85, 0.88, 0.9, 0.93, 0.95]
const TIMES = Array.from({ length: 36 }, (_, i) => {
  const h = 6 + Math.floor(i / 2)
  return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`
})

/** One choice among a few, as one segmented control (calmer than a row of separate chips). */
function Chips<T extends string | number>({ options, value, onChange, format = String, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; format?: (v: T) => string; label?: string }) {
  // Keep a stored non-preset value selectable, in numeric order.
  const list = options.includes(value) ? options : [...options, value].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : 0))
  return (
    <div className="seg-group" role="radiogroup" aria-label={label}>
      {list.map((o) => (
        <button key={o} type="button" role="radio" className="seg-btn" aria-checked={o === value} onClick={() => onChange(o)}>
          {format(o)}
        </button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string }) {
  // The whole row toggles (the label points at the switch, not at the ⓘ button inside it).
  const id = useId()
  return (
    <label className="toggle-row" htmlFor={id}>
      <span className="setting-text">
        <strong>{label}</strong>
        {help && <Help text={help} />}
      </span>
      <button id={id} type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
        <span />
      </button>
    </label>
  )
}

function Row({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <div className="setting-row">
      <div className="setting-text">
        <strong>{label}</strong>
        {help && <Help text={help} />}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )
}

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

/**
 * The pace's cost in plain sight, under the choice: what a day will take a month on, and when that
 * outgrows the daily minutes, the pace that fits (one tap). Too many new words a day is the most
 * common reason study stops feeling useful: reviews pile up and new words stop coming.
 */
function PaceNote({ settings: s, onApply }: { settings: Settings; onApply: (n: number) => void }) {
  if (!s.newWordsPerDay) return null
  const minutes = Math.round(monthlyMinutes(s.newWordsPerDay, s.retention, s.fsrsWeights))
  const fits = recommendedNewWords(NEW_WORDS, s.dailyMinutes, s.retention, s.fsrsWeights)
  if (minutes <= s.dailyMinutes)
    return <p className="small muted">Bu hızla bir ay sonra günlük çalışma yaklaşık {minutes} dakika sürer; {s.dailyMinutes} dakikana sığıyor.</p>
  return (
    <p className="note">
      Bu hızla bir ay sonra günlük çalışma yaklaşık {minutes} dakika sürer, günlük süren {s.dailyMinutes} dakika: tekrarlar birikir ve yeni kelimeler çoğu gün gelmez.
      {fits > 0 && fits !== s.newWordsPerDay && (
        <>
          {' '}Bu süreye günde {fits} yeni kelime sığar.{' '}
          <button type="button" className="link" onClick={() => onApply(fits)}>
            {fits} yap
          </button>
        </>
      )}
    </p>
  )
}

/** The pace's cost, so the choice is an informed one (as in FSRS's workload simulator). */
function newWordsHelp(s: Settings): string {
  const f = forecastWorkload(s.newWordsPerDay, s.retention, s.fsrsWeights)
  const reviews = Math.round(f.reviewsAt(30) / 5) * 5
  const minutes = Math.max(1, Math.round(f.minutesAt(30)))
  return `Tekrarlar birikmişse o gün yeni kelime gelmez. Bu hızla bir ay sonra yeni kelimelerden günde yaklaşık ${reviews} tekrar (~${minutes} dk) gelir; seçimini günlük süreyle dengele.`
}

type GroupId = 's-account' | 's-study' | 's-answers' | 's-sound' | 's-look' | 's-remind' | 's-tools' | 's-data'

interface Group {
  id: GroupId
  name: string
  sub: string
  icon: ReactNode
}

/** The cards of the study group, for its row of shortcuts. */
const STUDY_CARDS = [
  ['st-goal', 'Günlük hedef'],
  ['st-words', 'Kelimeler'],
  ['st-memory', 'Hafıza modeli'],
  ['st-calendar', 'Takvim'],
] as const

/** The settings in groups, one shown at a time (all of them while searching). */
const GROUP_LIST: Group[] = [
  { id: 's-account', name: 'Hesap', sub: 'Giriş ve cihazlar arası eşitleme', icon: <UserIcon size={18} /> },
  { id: 's-study', name: 'Çalışma', sub: 'Günlük tempo, yeni kelimeler ve tekrar takvimi', icon: <TargetIcon size={18} /> },
  { id: 's-answers', name: 'Sorular', sub: 'Yazma, ipuçları ve cevapların kontrolü', icon: <PenIcon size={18} /> },
  { id: 's-sound', name: 'Ses', sub: 'Seslendirme, sesler ve konuşarak cevap', icon: <SpeakerIcon size={18} /> },
  { id: 's-look', name: 'Görünüm', sub: 'Tema, yazı boyutu ve liste sıklığı', icon: <PaletteIcon size={18} /> },
  { id: 's-remind', name: 'Bildirimler', sub: 'Günlük hatırlatma ve takvim', icon: <BellIcon size={18} /> },
  { id: 's-tools', name: 'Araçlar', sub: 'Yapay zekâ, kısayollar ve çevrimdışı paket', icon: <ToolIcon size={18} /> },
  { id: 's-data', name: 'Veriler', sub: 'Yedek, dışa aktarma ve sıfırlama', icon: <DataIcon size={18} /> },
]
const GROUP_BY_ID = Object.fromEntries(GROUP_LIST.map((g) => [g.id, g])) as Record<GroupId, Group>

function Pane({ group, active, children }: { group: Group; active: boolean; children: ReactNode }) {
  return (
    <div className="settings-pane" id={group.id} data-active={active || undefined}>
      <header className="settings-pane-head">
        <span className="settings-pane-icon">{group.icon}</span>
        <div>
          <h2 className="settings-pane-title">{group.name}</h2>
          <p className="small muted">{group.sub}</p>
        </div>
      </header>
      {children}
    </div>
  )
}

/** Who is signed in to this device's profile, a tap away from the profile page. */
export function SettingsScreen({
  settings,
  onChange,
  onDataChanged,
  pushState,
  onOpenAuth,
}: {
  settings: Settings
  onChange: (s: Settings) => void
  onDataChanged: () => void
  pushState: PushState
  onOpenAuth?: (mode: AuthMode) => void
}) {
  const [density, setDensityState] = useState<Density>(getDensity)
  const [active, setActive] = useState<GroupId>(() => {
    try {
      const saved = localStorage.getItem(PANE_KEY) as GroupId | null
      return saved && saved in GROUP_BY_ID ? saved : 's-study'
    } catch {
      return 's-study'
    }
  })
  const choose = (id: GroupId) => {
    setActive(id)
    try {
      localStorage.setItem(PANE_KEY, id)
    } catch {
      // Remembering the group is only a convenience.
    }
    // Back to the top only if the page was scrolled down; never past the page title.
    if (window.scrollY > 0) window.scrollTo({ top: 0 })
  }
  // Search: looks through every group and hides the settings (rows, then whole cards and groups)
  // that don't match; without a query, only the chosen group shows.
  const root = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [noMatch, setNoMatch] = useState(false)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const q = query.trim().toLocaleLowerCase('tr-TR')
    const has = (n: Element) => (n.textContent ?? '').toLocaleLowerCase('tr-TR').includes(q)
    let any = false
    for (const pane of el.querySelectorAll<HTMLElement>('.settings-pane')) {
      let paneHit = false
      for (const card of pane.querySelectorAll<HTMLElement>(':scope > section, :scope > .card, :scope > div.card')) {
        const rows = [...card.querySelectorAll<HTMLElement>('.setting-row, .toggle-row')]
        const title = card.querySelector('.section-title')
        const titleHit = !q || (title ? has(title) : false)
        let cardHit = titleHit || (!rows.length && has(card))
        for (const r of rows) {
          const hit = !q || titleHit || has(r)
          r.hidden = !hit
          if (hit) cardHit = true
        }
        card.hidden = !cardHit
        // A card kept closed (instructions) opens when the search lands in it.
        if (q && cardHit && card instanceof HTMLDetailsElement) card.open = true
        if (cardHit) paneHit = true
      }
      pane.hidden = q ? !paneHit : pane.id !== active
      if (q && paneHit) any = true
    }
    setNoMatch(!!q && !any)
  }, [query, active])

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [voices, setVoices] = useState(() => voicesFor(settings.activeLanguage))
  const [danger, setDanger] = useState<'language' | 'all' | null>(null)
  const [pendingRestore, setPendingRestore] = useState<Backup | null>(null)
  const usualHour = useUsualStudyHour(db)
  const [clipboardOk, setClipboardOk] = useState(false)
  useEffect(() => {
    void clipboardSupported().then(setClipboardOk)
  }, [])
  const [permission, setPermission] = useState(() => (notificationsSupported() ? Notification.permission : 'denied'))
  const lang = settings.activeLanguage

  // Voices load asynchronously in most browsers.
  useEffect(() => {
    if (!canSpeak()) return
    const update = () => setVoices(voicesFor(lang))
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [lang])

  const download = async () => {
    await downloadBackup(db)
    showToast('Yedek indirildi.')
  }

  const restore = async (file: File) => {
    setMessage(null)
    try {
      setPendingRestore(parseBackup(await file.text()))
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Dosya okunamadı.' })
    }
  }

  const confirmRestore = async () => {
    const backup = pendingRestore
    setPendingRestore(null)
    if (!backup) return
    await restoreBackup(db, backup)
    showToast(`Yedek geri yüklendi: ${backup.vocabulary.length} kelime.`)
    onDataChanged()
  }

  const exportCsv = async (all: boolean) => {
    const [vocabulary, states] = await Promise.all([db.vocabulary.toArray(), db.wordStates.toArray()])
    const words = vocabulary.filter((e) => e.source !== 'sample' && (all || e.language === lang))
    const url = URL.createObjectURL(new Blob([toCsv(words, states)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `kelime-kocu-${all ? 'kelimeler' : lang}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`${words.length} kelime CSV olarak indirildi.`)
  }

  const printDictionary = async () => {
    const words = (await db.vocabulary.where('language').equals(lang).toArray()).filter((e) => e.source !== 'sample')
    const w = window.open('', '_blank')
    if (!w) {
      setMessage({ ok: false, text: 'Yeni pencere açılamadı; tarayıcı açılır pencereleri engelliyor olabilir.' })
      return
    }
    w.document.write(dictionaryHtml(words, lang, `${LANGUAGE_NAME[lang]} sözlüğüm`))
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  const calendar = () => {
    const url = URL.createObjectURL(new Blob([calendarFile(reminderTime(settings.reminder, usualHour ?? null), location.origin)], { type: 'text/calendar' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'kelime-kocu-hatirlatma.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetLanguage = async () => {
    const ids = (await db.vocabulary.where('language').equals(lang).primaryKeys()) as string[]
    await db.transaction('rw', [db.wordStates, db.events, db.mistakes], async () => {
      await db.wordStates.where('language').equals(lang).delete()
      await db.events.where('language').equals(lang).delete()
      await db.mistakes.where('entryId').anyOf(ids).delete()
    })
    setDanger(null)
    showToast(`${LANGUAGE_NAME[lang]} ilerlemesi sıfırlandı; kelimelerin duruyor.`)
    onDataChanged()
  }

  const deleteAll = async () => {
    await db.delete()
    location.reload()
  }

  const searching = !!query.trim()
  const pane = (id: GroupId) => ({ group: GROUP_BY_ID[id], active: searching || active === id })

  return (
    <div className={`settings-page${searching ? ' is-searching' : ''}`} ref={root}>
      <PageHeader
        title="Ayarlar"
        action={
          <label className="settings-search">
            <SearchIcon size={18} />
            <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ayar ara" aria-label="Ayar ara" />
          </label>
        }
      />
      <div className="settings-layout">
        <aside className="settings-side">
          <nav className="settings-menu" aria-label="Ayar grupları">
            {GROUP_LIST.map((g) => (
              <button
                key={g.id}
                type="button"
                className="settings-menu-item"
                aria-current={!searching && active === g.id ? 'page' : undefined}
                onClick={() => {
                  setQuery('')
                  choose(g.id)
                }}
              >
                <span className="settings-menu-icon">{g.icon}</span>
                <span>{g.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="settings-content">
          {searching && noMatch && <p className="muted">“{query.trim()}” ile eşleşen bir ayar yok.</p>}

          <Pane {...pane('s-account')}>
            <AccountSettings onOpenAuth={onOpenAuth} />
          </Pane>

          <Pane {...pane('s-study')}>
            {/* Four cards, one thing each, with a row of shortcuts: the group was one long list. */}
            {!searching && <JumpNav groups={STUDY_CARDS} label="Çalışma ayarları" />}
            <section className="card stack" id="st-goal">
              <h2 className="section-title">Günlük hedef</h2>
            <Row label="Günlük süre" help="Günlük görev bu süreye sığacak şekilde hazırlanır.">
              <Chips options={MINUTES} value={settings.dailyMinutes} onChange={(v) => set('dailyMinutes', v)} format={(m) => `${m} dk`} />
            </Row>
            <Row label="Günde en fazla yeni kelime" help={newWordsHelp(settings)}>
              <Chips options={NEW_WORDS} value={settings.newWordsPerDay} onChange={(v) => set('newWordsPerDay', v)} />
            </Row>
            <PaceNote settings={settings} onApply={(n) => set('newWordsPerDay', n)} />
            <Row label="Günlük XP hedefi" help="Ana sayfada hedef çubuğu olarak görünür.">
              <Chips options={XP_GOALS} value={settings.dailyXpGoal} onChange={(v) => set('dailyXpGoal', v)} format={(x) => `${x} XP`} />
            </Row>
            <Row label="Bir oturumda en fazla" help="Uzun görevleri parçalara böler; kalanı sonraki oturuma kalır.">
              <Chips options={SESSION_MAX} value={settings.sessionMax} onChange={(v) => set('sessionMax', v)} format={(n) => (n ? `${n} soru` : 'Sınırsız')} />
            </Row>
            <Row label="Çalışma planın" help="Ne zaman ve nerede çalışacağını önceden belirlemek, alışkanlığa dönüşmesini belirgin şekilde kolaylaştırır. Hatırlatma bildiriminde de görünür.">
              <input className="input" value={settings.studyPlan} onChange={(e) => onChange({ ...settings, studyPlan: e.target.value, studyPlanAsked: true })} placeholder="Sabah kahvemi içerken" />
            </Row>
            </section>
            <section className="card stack" id="st-words">
              <h2 className="section-title">Kelimeler ve hatırlama</h2>
            <Row
              label="Hedef hatırlama oranı"
              help={`Tekrar geldiğinde kelimeyi hatırlıyor olma ihtimalin. Yüksek oran daha sağlam ama daha çok tekrar demek. ${
                settings.retention === 0.9
                  ? 'Varsayılan, çoğu kişi için en iyi denge.'
                  : `Tekrar yükü varsayılanın yaklaşık ${relativeWorkload(settings.retention).toFixed(1).replace('.', ',')} katı.`
              }`}
            >
              <Chips options={RETENTIONS} value={settings.retention} onChange={(v) => set('retention', v)} format={(r) => `%${Math.round(r * 100)}`} />
            </Row>
            <Toggle
              label="Yeni kelimeleri sık olanlardan başlat"
              help="Açıkken eklediğin kelimeler eklenme sırası yerine sıklığa göre tanıtılır (önce en sık olanlar). Sıklık verisi: FrequencyWords (Hermit Dave), OpenSubtitles 2018, CC BY-SA 4.0."
              checked={settings.frequencyFirst}
              onChange={(v) => set('frequencyFirst', v)}
            />
            <Toggle
              label="Çok iyi bildiğin kelimeleri emekliye ayır"
              help="Tamamen öğrendiğin ve aylarca akılda kalacak kelimeler rutin tekrarlardan çıkar; günde en fazla 2 sürpriz kontrol gelir, yanılırsan kelime geri döner. Kelime sayfasından elle de yapabilirsin."
              checked={settings.autoRetire}
              onChange={(v) => set('autoRetire', v)}
            />
            </section>
            <MemoryModel settings={settings} onChange={onChange} id="st-memory" />
            <StudyCalendar settings={settings} onChange={onChange} id="st-calendar" />
          </Pane>

          <Pane {...pane('s-answers')}>
            <section className="card stack">
              <h2 className="section-title">Cevaplar ve ipuçları</h2>
            <Row label="Yazma oranı" help="Daha önce gördüğün kelimelerde çoktan seçmeli soruların bir kısmı yazarak cevaplanır. Yazmak, seçmekten daha kalıcı öğretir.">
              <Chips<TypingShare>
                options={['low', 'balanced', 'high']}
                value={settings.typingShare ?? 'balanced'}
                onChange={(v) => set('typingShare', v)}
                format={(v) => ({ low: 'Az', balanced: 'Dengeli', high: 'Çok' })[v]}
              />
            </Row>
            <Row label="İpucu gecikmesi" help="İpuçları ancak bu süre sonra açılır; önce hatırlamaya çalışırsın.">
              <Chips options={HINT_DELAYS} value={settings.hintDelaySec} onChange={(v) => set('hintDelaySec', v)} format={(s) => (s ? `${s} sn` : 'Hemen')} />
            </Row>
            <Toggle
              label="Aksan kısa yolları"
              help={`Yazarken harfin ardından işaret koyunca aksanlı harfe dönüşür. FR: ${shortcutHelp('fr').join(', ')}… ES: ${shortcutHelp('es').slice(0, 4).join(', ')}, n~ → ñ. Cevap kutusunun altındaki harf çubuğu her zaman açık.`}
              checked={settings.accentShortcuts}
              onChange={(v) => set('accentShortcuts', v)}
            />
            <Toggle
              label="Emin değilim seçeneği"
              help="Cevaplamadan önce emin olmadığını işaretleyebilirsin (Shift + cevap). Emin değilken doğru bilinen kelime daha erken tekrar gelir; emin olduğun bir yanlış ise ayrıca vurgulanır ve hatalarda öne alınır."
              checked={settings.confidence}
              onChange={(v) => set('confidence', v)}
            />
            <Toggle
              label="İspanyolcada vosotros'u sorma"
              help="Latin Amerika İspanyolcasında vosotros yerine ustedes kullanılır. Açıkken vosotros biçimleri çekim sorularında çıkmaz ve tablolarda soluk görünür."
              checked={settings.hideVosotros ?? false}
              onChange={(v) => set('hideVosotros', v)}
            />
            <Toggle
              label="Aksanlarda katı ol"
              help="Açıkken 'decision' yerine 'décision' yazmamak yanlış sayılır; kapalıyken 'neredeyse'."
              checked={settings.accentStrict}
              onChange={(v) => set('accentStrict', v)}
            />
            </section>
            <section className="card stack">
              <h2 className="section-title">Yeni kelimeler</h2>
            <Toggle
              label="Yeni kelimede önce tahmin et"
              help="Anlamı göstermeden önce bir tahmin istenir. Yanlış tahmin bile kelimeyi daha iyi akılda tutmanı sağlar; tahmin puanlanmaz."
              checked={settings.pretest}
              onChange={(v) => set('pretest', v)}
            />
            <Toggle
              label="Anlamı hedef dilde göster"
              help="Türkçe anlam yerine kelimenin kendi dilindeki tanımı sorulur (Wiktionary'den; tanımı olan kelimelerde). Çeviri yapmadan o dilde düşünmeye alıştırır; Türkçesi bir dokunuşla görünür."
              checked={settings.targetDefinitions}
              onChange={(v) => set('targetDefinitions', v)}
            />
            </section>
          </Pane>

          <Pane {...pane('s-sound')}>
            <section className="card stack">
              <h2 className="section-title">Ses</h2>
            <Toggle label="Kelimeleri otomatik seslendir" help="Yeni kelimede ve dinleme sorularında ses kendiliğinden çalar." checked={settings.autoPlayAudio} onChange={(v) => set('autoPlayAudio', v)} />
            <Toggle label="Ses efektleri" help="Doğru, yanlış, seri ve seviye atlama sesleri; destekleyen telefonlarda kısa titreşim." checked={settings.soundEffects} onChange={(v) => set('soundEffects', v)} />
            <Toggle
              label="Konuşarak cevap soruları"
              help={canListen() ? 'Bazı sorularda kelimeyi sesli söylemen istenir; yazılı sorularda mikrofonla da cevaplayabilirsin.' : 'Bu tarayıcı konuşma tanımayı desteklemiyor (Safari ya da Chrome kullan).'}
              checked={settings.speechExercises && canListen()}
              onChange={(v) => set('speechExercises', v)}
            />
            <Toggle
              label="Dinlemede farklı sesler"
              help={`Dinleme sorularında her seferinde sistemdeki başka bir ses konuşur; kelimeyi her konuşmacıdan tanımayı öğrenirsin. ${voices.length < 2 ? `Şu an ${LANGUAGE_NAME[lang]} için tek ses var; macOS'te Ayarlar → Erişilebilirlik → Okunan İçerik'ten başka sesler indirebilirsin.` : `${LANGUAGE_NAME[lang]} için ${voices.length} ses var.`}`}
              checked={settings.varyVoices}
              onChange={(v) => set('varyVoices', v)}
            />
            <Row label="Konuşma hızı">
              <Chips options={RATES} value={settings.speechRate} onChange={(v) => set('speechRate', v)} format={(r) => `${r}×`} />
            </Row>
            <Row label={`${LANGUAGE_NAME[lang]} sesi`} help="Sistemdeki seslerden seç. macOS'te Ayarlar → Erişilebilirlik → Okunan İçerik'ten yenilerini indirebilirsin.">
              <div className="row nowrap">
                <div style={{ flex: 1, minWidth: '12rem' }}>
                  <Select
                    label="Ses"
                    value={settings.voices[lang] ?? '__auto'}
                    onChange={(v) => set('voices', { ...settings.voices, [lang]: v === '__auto' ? undefined : v })}
                    options={[
                      { value: '__auto', label: 'Otomatik (en iyi yerel ses)' },
                      ...voices.map((v) => ({ value: v.voiceURI, label: v.name, hint: `${v.lang}${v.localService ? '' : ' · çevrimiçi'}` })),
                    ]}
                  />
                </div>
                <button className="btn btn-quiet" onClick={() => speak({ en: 'Practice makes perfect.', fr: "C'est en forgeant qu'on devient forgeron.", es: 'La práctica hace al maestro.' }[lang], lang)}>
                  Dene
                </button>
              </div>
            </Row>
            {/* Cloud voices and scoring need keys and are set once: after the everyday choices, not before. */}
            <NaturalVoiceSettings language={lang} />
            <AzureSpeechSettings />
            </section>
          </Pane>

          <Pane {...pane('s-look')}>
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
          </Pane>

          <Pane {...pane('s-remind')}>
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
                  <div style={{ width: '9rem' }}>
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
          </Pane>

          <Pane {...pane('s-tools')}>
            <AiSettings settings={settings} onChange={onChange} />
            {clipboardOk && (
              <section className="card stack">
                <h2 className="section-title">Panodan kelime ekle</h2>
                <Toggle
                  label="Kopyaladığım kelimeyi öner"
                  help="Başka bir uygulamada bir kelimeyi kopyalayıp buraya dönünce, listende yoksa eklemeyi önerir. Pano yalnızca bu cihazda okunur, hiçbir yere gönderilmez."
                  checked={settings.clipboardSuggest ?? false}
                  onChange={async (v) => {
                    if (v && !(await askClipboard())) {
                      showToast('Pano izni verilmedi; tarayıcının site ayarlarından açabilirsin.', undefined, 5000, 'info')
                      return
                    }
                    set('clipboardSuggest', v)
                  }}
                />
              </section>
            )}
            <IosShortcut />
            <section className="card stack desktop-only">
              <h2 className="section-title">Web'den kelime ekle</h2>
            <p className="small muted">
              Aşağıdaki butonu tarayıcının yer imleri çubuğuna sürükle. Bir makale okurken kelimeyi seçip bu yer imine tıkla:
              kelime, geçtiği cümle ve kaynağıyla birlikte ekleme formunda açılır. Sayfanın dili İngilizce, Fransızca ya da
              İspanyolca ise doğru dile kendiliğinden geçer.
            </p>
            <div className="row">
              <Bookmarklet />
              <span className="small muted">← yer imleri çubuğuna sürükle (Safari: ⌘⇧B ile çubuğu göster)</span>
            </div>
            </section>
            <OfflinePack settings={settings} />
          </Pane>

          <Pane {...pane('s-data')}>
            <section className="card stack">
              <h2 className="section-title">Yedek</h2>
            <p className="small muted">Veriler yalnızca bu cihazda duruyor. Yedek; kelimeleri, ilerlemeyi, görselleri ve ses kayıtlarını içerir.</p>
            <div className="row">
              <button className="btn btn-quiet" onClick={download}>
                Yedeği indir
              </button>
              <label className="btn btn-quiet">
                Yedekten geri yükle
                <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
              </label>
            </div>
            <h3 className="subhead">Kelime listesini dışa aktar</h3>
            <p className="small muted">CSV, Excel ya da Google E-Tablolar'da açılır. Sözlük, yazdırma penceresinden PDF olarak da kaydedilebilir.</p>
            <div className="row">
              <button className="btn btn-quiet" onClick={() => exportCsv(false)}>
                {LANGUAGE_NAME[lang]} listesi (CSV)
              </button>
              <button className="btn btn-quiet" onClick={() => exportCsv(true)}>
                Üç dil (CSV)
              </button>
              <button className="btn btn-quiet" onClick={printDictionary}>
                Yazdırılabilir sözlük
              </button>
            </div>
            </section>
            <section className="card stack danger-zone">
              <h2 className="section-title">Sıfırlama</h2>
              <p className="small muted">Önce yedek almanı öneririm. Bu işlemler geri alınamaz.</p>
            <div className="row">
              <button className="btn btn-danger" onClick={() => setDanger('language')}>
                {LANGUAGE_NAME[lang]} ilerlemesini sıfırla
              </button>
              <button className="btn btn-danger" onClick={() => setDanger('all')}>
                Tüm verileri sil
              </button>
            </div>
            </section>
          </Pane>

          {message && (
            <p className={message.ok ? 'notice' : 'error'} role="status">
              {message.text}
            </p>
          )}
        </div>
      </div>

      {danger === 'language' && (
        <ConfirmDialog title={`${LANGUAGE_NAME[lang]} ilerlemesi sıfırlansın mı?`} confirmLabel="Sıfırla" danger onConfirm={resetLanguage} onCancel={() => setDanger(null)}>
          Kelimelerin kalır; tekrar takvimi, cevap geçmişi ve hatalar silinir. Diğer dillere dokunulmaz.
        </ConfirmDialog>
      )}
      {pendingRestore && (
        <ConfirmDialog title="Yedek geri yüklensin mi?" confirmLabel="Geri yükle" danger onConfirm={confirmRestore} onCancel={() => setPendingRestore(null)}>
          Bu cihazdaki tüm veriler {new Date(pendingRestore.exportedAt).toLocaleString('tr-TR')} tarihli yedekle ({pendingRestore.vocabulary.length} kelime) değiştirilecek.
        </ConfirmDialog>
      )}
      {danger === 'all' && (
        <ConfirmDialog title="Tüm veriler silinsin mi?" confirmLabel="Hepsini sil" danger onConfirm={deleteAll} onCancel={() => setDanger(null)}>
          {TARGET_LANGUAGES.map((l) => LANGUAGE_NAME[l]).join(', ')} için tüm kelimeler, ilerleme, görseller, ses kayıtları, profil ve ayarlar bu cihazdan silinir.
        </ConfirmDialog>
      )}
    </div>
  )
}

/** React refuses javascript: URLs in href, so the bookmarklet link is set directly on the element. */
function Bookmarklet() {
  const ref = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    ref.current?.setAttribute('href', bookmarkletCode(location.origin))
  }, [])
  return (
    <a ref={ref} className="btn bookmarklet" onClick={(e) => e.preventDefault()} title="Yer imleri çubuğuna sürükle">
      + Kelime Koçu'na ekle
    </a>
  )
}
