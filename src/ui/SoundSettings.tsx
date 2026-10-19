import { useEffect, useState } from 'react'
import type { Settings } from '../data/db'
import { AzureSpeechSettings } from './AzureSpeechSettings'
import { LANGUAGE_NAME } from './labels'
import { NaturalVoiceSettings } from './NaturalVoiceSettings'
import { Select } from './Select'
import { canSpeak, speak, voicesFor } from './speech'
import { canListen } from './speechInput'
import { Chips, Row, Toggle } from './settingsWidgets'

const RATES = [0.7, 0.8, 0.9, 1, 1.1]

export function SoundSettings({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (s: Settings) => void
}) {
  const lang = settings.activeLanguage
  const [voices, setVoices] = useState(() => voicesFor(lang))

  // Voices load asynchronously in most browsers.
  useEffect(() => {
    if (!canSpeak()) return
    const update = () => setVoices(voicesFor(lang))
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [lang])

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })

  return (
    <section className="card stack">
      <h2 className="section-title">Ses</h2>
      <Toggle label="Kelimeleri otomatik seslendir" help="Yeni kelimede ve dinleme sorularında ses kendiliğinden çalar." checked={settings.autoPlayAudio} onChange={(v) => set('autoPlayAudio', v)} />
      <Toggle label="Ses efektleri" help="Doğru, yanlış, seri ve seviye atlama sesleri." checked={settings.soundEffects} onChange={(v) => set('soundEffects', v)} />
      <Toggle label="Dokunsal titreşim (Haptik)" help="Doğru, yanlış, seri ve kart çevirmelerde destekleyen telefonlarda kısa titreşim." checked={settings.haptics ?? true} onChange={(v) => set('haptics', v)} />
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
          <div className="settings-voice-select">
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
  )
}
