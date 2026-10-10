import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../data/db'
import { AiSettings } from './AiSettings'
import { askClipboard, clipboardSupported } from './clipboardSuggest'
import { bookmarkletCode } from './incoming'
import { IosShortcut } from './IosShortcut'
import { OfflinePack } from './OfflinePack'
import { Toggle } from './settingsWidgets'
import { showToast } from './toastFeed'
import { TranslationSettings } from './TranslationSettings'

/** React refuses javascript: URLs in href, so the bookmarklet link is set directly on the element. */
function Bookmarklet() {
  const ref = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    ref.current?.setAttribute('href', bookmarkletCode(location.origin))
  }, [])
  return (
    <a ref={ref} className="btn bookmarklet" onClick={(e) => e.preventDefault()} title="Yer imleri çubuğuna sürükle">
      + Diloloji'ye ekle
    </a>
  )
}

export function ToolsSettings({
  settings,
  onChange,
  onDataChanged,
}: {
  settings: Settings
  onChange: (s: Settings) => void
  onDataChanged: () => void
}) {
  const [clipboardOk, setClipboardOk] = useState(false)
  useEffect(() => {
    void clipboardSupported().then(setClipboardOk)
  }, [])
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })

  return (
    <>
      <AiSettings settings={settings} onChange={onChange} />
      <TranslationSettings onFilled={onDataChanged} />
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
    </>
  )
}
