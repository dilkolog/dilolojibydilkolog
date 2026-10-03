import { useMemo, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { readTranslateExport, type TranslateImport as Parsed } from '../data/translateImport'
import { createEntry } from '../data/wordInput'
import type { TargetLanguage } from '../engine/types'
import { LANGUAGE_NAME } from './labels'
import { saveSentence } from './Sentences'

/** Google Translate's saved translations: words into the list, sentences into sentence cards. */
export function TranslateImport({ db, language, existing, onAdded }: { db: KelimeDB; language: TargetLanguage; existing: Set<string>; onAdded: () => void }) {
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const mine = useMemo(() => {
    const items = (parsed?.items ?? []).filter((i) => i.language === language)
    const words = items.filter((i) => i.kind === 'word')
    const fresh = words.filter((w) => {
      try {
        return !existing.has(createEntry({ word: w.text, meaning: w.turkish }, language, new Date()).id)
      } catch {
        return false
      }
    })
    return { words: fresh, already: words.length - fresh.length, sentences: items.filter((i) => i.kind === 'sentence'), other: (parsed?.items ?? []).length - items.length }
  }, [parsed, language, existing])

  const load = async (file: File) => {
    setMessage(null)
    const r = readTranslateExport(await file.text())
    if (!r.items.length) setMessage({ ok: false, text: 'Dosyada Türkçeli çeviri bulunamadı. Google Çeviri → Kaydedilenler → Google E-Tablolar\'a aktar, sonra CSV olarak indir.' })
    setParsed(r)
  }

  const run = async () => {
    setBusy(true)
    const now = new Date()
    const entries = mine.words.flatMap((w) => {
      try {
        return [createEntry({ word: w.text, meaning: w.turkish }, language, now, 'import')]
      } catch {
        return []
      }
    })
    await db.vocabulary.bulkPut(entries)
    let sentences = 0
    for (const s of mine.sentences) if (await saveSentence({ language, text: s.text, translation: s.turkish, source: 'Google Çeviri' })) sentences++
    setBusy(false)
    setParsed(null)
    setMessage({ ok: true, text: `${entries.length} kelime listene, ${sentences} cümle cümle kartlarına eklendi.` })
    onAdded()
  }

  return (
    <details className="card">
      <summary>Google Çeviri'den aktar</summary>
      <div className="stack mt-3">
        <p className="small muted">
          Google Çeviri'de yıldızladıkların: <strong>translate.google.com → Kaydedilenler → Google E-Tablolar'a aktar</strong>, açılan tabloyu{' '}
          <em>Dosya → İndir → CSV</em> ile indir ve buraya yükle. Kısa olanlar kelime, uzun olanlar cümle kartı olur; Türkçesi anlam olarak gelir.
        </p>
        <label className="btn btn-quiet file-btn">
          CSV dosyasını seç
          <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
        </label>
        {parsed && parsed.items.length > 0 && (
          <>
            <p className="small">
              {LANGUAGE_NAME[language]}: <strong>{mine.words.length}</strong> yeni kelime{mine.already ? ` (${mine.already} tanesi zaten listende)` : ''}, <strong>{mine.sentences.length}</strong>{' '}
              cümle.
              {mine.other > 0 && ` Diğer dillerde ${mine.other} çeviri daha var; o dile geçip yeniden yükleyebilirsin.`}
              {parsed.skipped > 0 && ` Türkçe içermeyen ${parsed.skipped} satır atlandı.`}
            </p>
            {mine.words.length > 0 && (
              <p className="small muted" lang={language}>
                {mine.words.slice(0, 12).map((w) => w.text).join(', ')}
                {mine.words.length > 12 ? '…' : ''}
              </p>
            )}
            <div>
              <button className="btn" onClick={run} disabled={busy || (!mine.words.length && !mine.sentences.length)}>
                {busy ? 'Ekleniyor…' : 'Hepsini ekle'}
              </button>
            </div>
          </>
        )}
        {message && <p className={message.ok ? 'notice' : 'error'}>{message.text}</p>}
      </div>
    </details>
  )
}
