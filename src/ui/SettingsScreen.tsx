import { useEffect, useRef, useState, type ReactNode } from 'react'
import { relativeWorkload } from '../engine/scheduler'
import { shortcutHelp } from '../engine/accents'
import { TARGET_LANGUAGES } from '../engine/types'
import { exportBackup, parseBackup, restoreBackup, type Settings } from '../data/db'
import { db } from '../data/instance'
import { AiSettings } from './AiSettings'
import { ConfirmDialog } from './Dialog'
import { MemoryModel } from './MemoryModel'
import { SyncSettings } from './SyncSettings'
import { NaturalVoiceSettings } from './NaturalVoiceSettings'
import { BellIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { calendarFile, notificationsSupported, requestNotifications, showReminder } from './reminders'
import { Select } from './Select'
import { canSpeak, speak, voicesFor } from './speech'
import { canListen } from './speechInput'
import { bookmarkletCode } from './incoming'

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

function Chips<T extends string | number>({ options, value, onChange, format = String }: { options: readonly T[]; value: T; onChange: (v: T) => void; format?: (v: T) => string }) {
  // Keep a stored non-preset value selectable, in numeric order.
  const list = options.includes(value) ? options : [...options, value].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : 0))
  return (
    <div className="choice-row">
      {list.map((o) => (
        <button key={o} type="button" className="chip chip-sm" aria-pressed={o === value} onClick={() => onChange(o)}>
          {format(o)}
        </button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string }) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {help && <span className="small muted">{help}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
        <span />
      </button>
    </label>
  )
}

function Row({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <div className="setting-row">
      <div>
        <strong>{label}</strong>
        {help && <p className="small muted">{help}</p>}
      </div>
      <div>{children}</div>
    </div>
  )
}

export function SettingsScreen({
  settings,
  onChange,
  onDataChanged,
}: {
  settings: Settings
  onChange: (s: Settings) => void
  onDataChanged: () => void
}) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [voices, setVoices] = useState(() => voicesFor(settings.activeLanguage))
  const [danger, setDanger] = useState<'language' | 'all' | null>(null)
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
    const json = await exportBackup(db)
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `kelime-kocu-yedek-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ ok: true, text: 'Yedek indirildi.' })
  }

  const restore = async (file: File) => {
    setMessage(null)
    try {
      const backup = parseBackup(await file.text())
      const when = new Date(backup.exportedAt).toLocaleString('tr-TR')
      if (!confirm(`Bu cihazdaki tüm veriler ${when} tarihli yedekle değiştirilecek. Devam edilsin mi?`)) return
      await restoreBackup(db, backup)
      setMessage({ ok: true, text: `Yedek geri yüklendi: ${backup.vocabulary.length} kelime.` })
      onDataChanged()
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Dosya okunamadı.' })
    }
  }

  const calendar = () => {
    const url = URL.createObjectURL(new Blob([calendarFile(settings.reminder.time, location.origin)], { type: 'text/calendar' }))
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
    setMessage({ ok: true, text: `${LANGUAGE_NAME[lang]} ilerlemesi sıfırlandı; kelimelerin duruyor.` })
    onDataChanged()
  }

  const deleteAll = async () => {
    await db.delete()
    location.reload()
  }

  return (
    <div className="stack">
      <h1 className="greeting">Ayarlar</h1>

      <section className="card stack">
        <h2 className="section-title">Çalışma</h2>
        <Row label="Günlük süre" help="Günlük görev bu süreye sığacak şekilde hazırlanır.">
          <Chips options={MINUTES} value={settings.dailyMinutes} onChange={(v) => set('dailyMinutes', v)} format={(m) => `${m} dk`} />
        </Row>
        <Row label="Günde en fazla yeni kelime" help="Tekrarlar birikmişse o gün yeni kelime gelmez.">
          <Chips options={NEW_WORDS} value={settings.newWordsPerDay} onChange={(v) => set('newWordsPerDay', v)} />
        </Row>
        <Row label="Günlük XP hedefi" help="Ana sayfada hedef çubuğu olarak görünür.">
          <Chips options={XP_GOALS} value={settings.dailyXpGoal} onChange={(v) => set('dailyXpGoal', v)} format={(x) => `${x} XP`} />
        </Row>
        <Row label="Bir oturumda en fazla" help="Uzun görevleri parçalara böler; kalanı sonraki oturuma kalır.">
          <Chips options={SESSION_MAX} value={settings.sessionMax} onChange={(v) => set('sessionMax', v)} format={(n) => (n ? `${n} soru` : 'Sınırsız')} />
        </Row>
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
        <Row label="Çalışma planın" help="Ne zaman ve nerede çalışacağını önceden belirlemek, alışkanlığa dönüşmesini belirgin şekilde kolaylaştırır. Hatırlatma bildiriminde de görünür.">
          <input className="input" value={settings.studyPlan} onChange={(e) => onChange({ ...settings, studyPlan: e.target.value, studyPlanAsked: true })} placeholder="Sabah kahvemi içerken" />
        </Row>
        <Toggle
          label="Yeni kelimede önce tahmin et"
          help="Anlamı göstermeden önce bir tahmin istenir. Yanlış tahmin bile kelimeyi daha iyi akılda tutmanı sağlar; tahmin puanlanmaz."
          checked={settings.pretest}
          onChange={(v) => set('pretest', v)}
        />
      </section>

      <MemoryModel settings={settings} onChange={onChange} />

      <section className="card stack">
        <h2 className="section-title">Ses</h2>
        <NaturalVoiceSettings language={lang} />
        <Toggle label="Kelimeleri otomatik seslendir" help="Yeni kelimede ve dinleme sorularında ses kendiliğinden çalar." checked={settings.autoPlayAudio} onChange={(v) => set('autoPlayAudio', v)} />
        <Toggle label="Ses efektleri" help="Doğru, yanlış, seri ve seviye atlama sesleri." checked={settings.soundEffects} onChange={(v) => set('soundEffects', v)} />
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
          <div className="row" style={{ flexWrap: 'nowrap' }}>
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
      </section>

      <section className="card stack">
        <h2 className="section-title">Cevaplar ve ipuçları</h2>
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
          label="Aksanlarda katı ol"
          help="Açıkken 'decision' yerine 'décision' yazmamak yanlış sayılır; kapalıyken 'neredeyse'."
          checked={settings.accentStrict}
          onChange={(v) => set('accentStrict', v)}
        />
      </section>

      <section className="card stack">
        <h2 className="section-title">Görünüm</h2>
        <Row label="Tema">
          <Chips<Settings['theme']> options={['system', 'light', 'dark']} value={settings.theme} onChange={(v) => set('theme', v)} format={(t) => ({ system: 'Sistem', light: 'Açık', dark: 'Koyu' })[t]} />
        </Row>
        <Toggle label="Klavye kısayollarını göster" help="Oturum ekranının altındaki kısayol listesi." checked={settings.showKeyLegend} onChange={(v) => set('showKeyLegend', v)} />
      </section>

      <section className="card stack">
        <h2 className="section-title row" style={{ gap: '0.5rem' }}>
          <BellIcon size={20} /> Hatırlatıcı
        </h2>
        <Toggle
          label="Günlük hatırlatma"
          help="O gün çalışmadıysan seçtiğin saatte bildirim gelir (uygulama açıkken, arka planda olsa bile)."
          checked={settings.reminder.enabled}
          onChange={async (v) => {
            if (v) setPermission(await requestNotifications())
            set('reminder', { ...settings.reminder, enabled: v })
          }}
        />
        <Row label="Saat">
          <div style={{ width: '9rem' }}>
            <Select label="Saat" value={settings.reminder.time} onChange={(t) => set('reminder', { ...settings.reminder, time: t })} options={TIMES.map((t) => ({ value: t, label: t }))} />
          </div>
        </Row>
        {settings.reminder.enabled && permission !== 'granted' && (
          <p className="error small">
            Bildirim izni yok. Tarayıcının site ayarlarından bu sayfaya bildirim izni ver.{' '}
            <button className="link" onClick={async () => setPermission(await requestNotifications())}>
              Tekrar iste
            </button>
          </p>
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

      <section className="card stack">
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

      <AiSettings settings={settings} onChange={onChange} />

      <SyncSettings />

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
      </section>

      <section className="card stack danger-zone">
        <h2 className="section-title">Sıfırlama</h2>
        <div className="row">
          <button className="btn btn-danger" onClick={() => setDanger('language')}>
            {LANGUAGE_NAME[lang]} ilerlemesini sıfırla
          </button>
          <button className="btn btn-danger" onClick={() => setDanger('all')}>
            Tüm verileri sil
          </button>
        </div>
        <p className="small muted">Önce yedek almanı öneririm. Bu işlemler geri alınamaz.</p>
      </section>

      {message && (
        <p className={message.ok ? 'notice' : 'error'} role="status">
          {message.text}
        </p>
      )}

      {danger === 'language' && (
        <ConfirmDialog title={`${LANGUAGE_NAME[lang]} ilerlemesi sıfırlansın mı?`} confirmLabel="Sıfırla" danger onConfirm={resetLanguage} onCancel={() => setDanger(null)}>
          Kelimelerin kalır; tekrar takvimi, cevap geçmişi ve hatalar silinir. Diğer dillere dokunulmaz.
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
