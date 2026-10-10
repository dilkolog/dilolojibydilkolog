import { useEffect, type ReactNode } from 'react'
import type { Settings } from '../../data/db'
import type { TypingShare } from '../../engine/session'
import { CloseIcon, GearIcon } from '../icons'

/**
 * Study settings from inside a session (like Memrise and Quizlet): how questions are asked and
 * answered. Changes apply from the next question; the same options live in Ayarlar.
 */
export function SessionSettings({ settings, onChange, onClose }: { settings: Settings; onChange: (s: Settings) => void; onClose: () => void }) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog dialog-wide session-settings" role="dialog" aria-modal="true" aria-labelledby="ss-title">
        <header className="ss-head">
          <span className="ss-head-icon" aria-hidden>
            <GearIcon size={18} />
          </span>
          <div className="grow">
            <h2 id="ss-title" className="ss-title">
              Çalışma ayarları
            </h2>
            <p className="small muted">Sonraki sorudan itibaren geçerli</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <CloseIcon size={18} />
          </button>
        </header>

        <div className="ss-body">

        <Group title="Sorular">
          <Choice<TypingShare>
            label="Yazma oranı"
            help="Gördüğün kelimelerde çoktan seçmeli yerine yazarak cevaplama."
            options={[
              ['low', 'Az'],
              ['balanced', 'Dengeli'],
              ['high', 'Çok'],
            ]}
            value={settings.typingShare ?? 'balanced'}
            onChange={(v) => set('typingShare', v)}
          />
          <Switch label="Yeni kelimede önce tahmin" help="Anlamı görmeden önce bir tahmin yaparsın; doğrusu daha iyi aklında kalır." checked={settings.pretest} onChange={(v) => set('pretest', v)} />
          <Switch label="Anlamı hedef dilde göster" help="Türkçe yerine kelimenin kendi dilindeki tanımı; Türkçesi bir dokunuşta." checked={settings.targetDefinitions} onChange={(v) => set('targetDefinitions', v)} />
          <Switch label="“Emin değilim” seçeneği" help="Tahminle bildiklerin daha erken tekrar gelir." checked={settings.confidence} onChange={(v) => set('confidence', v)} />
        </Group>

        <Group title="Cevaplar">
          <Choice<number>
            label="İpucu gecikmesi"
            options={[
              [0, 'Hemen'],
              [3, '3 sn'],
              [6, '6 sn'],
              [10, '10 sn'],
            ]}
            value={settings.hintDelaySec}
            onChange={(v) => set('hintDelaySec', v)}
          />
          <Switch label="Aksanları hata say" help="Kapalıyken eksik aksan “çok yakın” sayılır." checked={settings.accentStrict} onChange={(v) => set('accentStrict', v)} />
        </Group>

        <Group title="Ses ve ekran">
          <Choice<NonNullable<Settings['textScale']>>
            label="Yazı boyutu"
            options={[
              ['normal', 'Normal'],
              ['large', 'Büyük'],
              ['xlarge', 'Çok büyük'],
            ]}
            value={settings.textScale ?? 'normal'}
            onChange={(v) => set('textScale', v)}
          />
          <Switch label="Sesi otomatik çal" checked={settings.autoPlayAudio} onChange={(v) => set('autoPlayAudio', v)} />
          <Switch label="Ses efektleri" checked={settings.soundEffects} onChange={(v) => set('soundEffects', v)} />
          <Switch label="Kısayol listesi" help="Ekranın altında klavye kısayolları." checked={settings.showKeyLegend} onChange={(v) => set('showKeyLegend', v)} />
        </Group>

        </div>

        <footer className="ss-foot">
          <button className="btn" onClick={onClose} autoFocus>
            Çalışmaya dön
          </button>
        </footer>
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ss-group">
      <h3 className="ss-group-title">{title}</h3>
      <div className="ss-card">{children}</div>
    </section>
  )
}

function Switch({ label, help, checked, onChange }: { label: string; help?: string; checked: boolean; onChange: (v: boolean) => void }) {
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

function Choice<T extends string | number>({ label, help, options, value, onChange }: { label: string; help?: string; options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="toggle-row ss-choice">
      <span>
        <strong>{label}</strong>
        {help && <span className="small muted">{help}</span>}
      </span>
      <div className="choice-row" role="group" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={String(v)} type="button" className="chip chip-sm" aria-pressed={v === value} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
