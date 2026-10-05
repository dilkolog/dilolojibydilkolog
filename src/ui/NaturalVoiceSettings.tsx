import { Help } from './SettingHelp'
import { useEffect, useState, type FormEvent } from 'react'
import { monthKey } from '../ai/usage'
import { db } from '../data/instance'
import { natural, testNaturalKey } from './naturalVoice'
import { speak } from './speech'
import type { TargetLanguage } from '../engine/types'

/** Free monthly characters for Neural2/WaveNet voices on Google Cloud TTS. */
const FREE_CHARS = 1_000_000

/** Natural voices (Google Cloud TTS): key entry, test, monthly character use. */
export function NaturalVoiceSettings({ language }: { language: TargetLanguage }) {
  const [key, setKey] = useState<string | null>(natural.key)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [chars, setChars] = useState(0)

  useEffect(() => {
    db.getTtsUsage().then((u) => setChars(u[monthKey(new Date())] ?? 0))
  }, [key])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const k = draft.trim()
    if (!k) return
    setBusy(true)
    setStatus(null)
    try {
      await testNaturalKey(k)
      await db.saveTtsKey(k)
      natural.key = k
      setKey(k)
      setDraft('')
      setStatus({ ok: true, text: 'Doğal sesler açıldı.' })
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : 'Anahtar doğrulanamadı.' })
    } finally {
      setBusy(false)
    }
  }

  const off = async () => {
    await db.saveTtsKey(null)
    natural.key = null
    setKey(null)
    setStatus(null)
  }

  return (
    <div className="stack natural-voice">
      <span className="setting-text">
        <strong>Doğal sesler (Google Cloud)</strong>
        <Help
          text={`Sistem seslerinin yerine gerçek insana yakın sesler. Her metin bir kez seslendirilip bu cihazda saklanır, tekrar dinlemek ücretsizdir. Google'ın aylık ${FREE_CHARS.toLocaleString('tr-TR')} karakterlik ücretsiz kotası tek kişilik kullanıma genellikle yeter.`}
        />
      </span>
      {key ? (
        <div className="row">
          <span className="pill stage-5">Açık</span>
          <span className="small muted">
            Anahtar ••••{key.slice(-4)} · bu ay {chars.toLocaleString('tr-TR')} karakter
          </span>
          <button className="btn btn-quiet btn-sm" onClick={() => speak({ en: 'Practice makes perfect.', fr: "C'est en forgeant qu'on devient forgeron.", es: 'La práctica hace al maestro.' }[language], language)}>
            Dene
          </button>
          <button className="link small" onClick={off}>
            Kapat
          </button>
        </div>
      ) : (
        <form className="row" onSubmit={save}>
          <input className="input" type="password" autoComplete="off" placeholder="Google Cloud API anahtarı" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ flex: 1, minWidth: '14rem' }} />
          <button className="btn" type="submit" disabled={busy || !draft.trim()}>
            {busy ? 'Kontrol ediliyor…' : 'Kaydet ve dene'}
          </button>
        </form>
      )}
      {!key && (
        <Help text='Anahtar bu cihazda kalır, yedeğe yazılmaz. Nasıl alınır: console.cloud.google.com → yeni proje → "Cloud Text-to-Speech API"yi etkinleştir → Kimlik bilgileri → API anahtarı oluştur. Anahtarı yalnızca bu API ile ve kelime-koc.vercel.app adresiyle sınırlaman önerilir.' />
      )}
      {status && (
        <p className={status.ok ? 'notice' : 'error'} role="status">
          {status.text}
        </p>
      )}
    </div>
  )
}
