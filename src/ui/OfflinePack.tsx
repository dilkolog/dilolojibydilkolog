import { useState } from 'react'
import { Help } from './SettingHelp'
import { cacheAudio } from '../data/audioCache'
import { fetchCorpus } from '../data/corpus'
import { quietly, type Settings } from '../data/db'
import { db } from '../data/instance'
import { fillEntries } from '../data/wordInfo'
import { displayForm } from '../engine/exercises'
import type { VocabularyEntry } from '../engine/types'
import { LANGUAGE_NAME } from './labels'
import { naturalEnabled, naturalUrl } from './naturalVoice'
import { speechPrefs } from './speech'

const DAYS = [3, 7, 14]

/**
 * Before a trip: everything the coming days' reviews and next new words need, downloaded now:
 * native recordings, natural-voice audio, real sentences and Wiktionary info. Reviews then work
 * the same without internet (cached audio plays offline; the app itself is always installed).
 */
export function OfflinePack({ settings }: { settings: Settings }) {
  const lang = settings.activeLanguage
  const [days, setDays] = useState(7)
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null)
  const [result, setResult] = useState('')

  const run = async () => {
    setResult('')
    const until = Date.now() + days * 86_400_000
    const [vocabulary, states] = await Promise.all([db.vocabulary.where('language').equals(lang).toArray(), db.wordStates.where('language').equals(lang).toArray()])
    const started = new Set(states.map((s) => s.entryId))
    const dueIds = new Set(states.filter((s) => Object.values(s.skills).some((c) => c.due.getTime() <= until)).map((s) => s.entryId))
    const upcomingNew = vocabulary.filter((e) => e.source !== 'sample' && !started.has(e.id)).slice(0, settings.newWordsPerDay * days)
    const words: VocabularyEntry[] = [...vocabulary.filter((e) => dueIds.has(e.id)), ...upcomingNew]

    // First fill what's missing (two requests per 20 words), then the audio.
    const missing = words.filter((e) => !e.wiktAt)
    for (let i = 0; i < missing.length; i += 20) await fillEntries(db, missing.slice(i, i + 20), lang)
    for (const e of words.filter((w) => w.corpus === undefined).slice(0, 40)) {
      await fetchCorpus(e)
        .then((corpus) => quietly(() => db.vocabulary.update(e.id, { corpus })))
        .catch(() => {})
    }
    const fresh = (await db.vocabulary.bulkGet(words.map((w) => w.id))).filter((e): e is VocabularyEntry => !!e)
    const tasks: (() => Promise<boolean>)[] = []
    for (const e of fresh) {
      if (e.audioUrl && !e.audioId) tasks.push(() => cacheAudio(e.audioUrl!))
      if (naturalEnabled()) tasks.push(() => naturalUrl(displayForm(e), lang, speechPrefs.rate).then(() => true, () => false))
    }
    let done = 0
    let failed = 0
    setProgress({ done, total: tasks.length, failed })
    for (const t of tasks) {
      if (!(await t())) failed++
      done++
      setProgress({ done, total: tasks.length, failed })
    }
    const estimate = await navigator.storage?.estimate?.().catch(() => undefined)
    setProgress(null)
    setResult(
      `${words.length} kelime hazır${failed ? ` (${failed} ses indirilemedi)` : ''}.${estimate?.usage ? ` Uygulamanın cihazda kapladığı yer: ${Math.round(estimate.usage / 1_048_576)} MB.` : ''}`,
    )
  }

  return (
    <section className="card stack">
      <h2 className="section-title">Çevrimdışı paket</h2>
      <Help
        text={`Yolculuktan önce indir, internet olmadan da aynı şekilde çalış. Önümüzdeki günlerin ${LANGUAGE_NAME[lang].toLocaleLowerCase('tr-TR')} tekrarları ve sıradaki yeni kelimeler için sesler, gerçek cümleler ve kelime bilgileri şimdi indirilir. Gerçek cümlelerdeki insan sesleri indirilemiyor, onların yerine cihaz sesi okur.`}
      />
      <div className="row">
        <div className="seg-group" role="radiogroup" aria-label="Kaç gün">
          {DAYS.map((d) => (
            <button key={d} type="button" role="radio" className="seg-btn" aria-checked={days === d} onClick={() => setDays(d)} disabled={!!progress}>
              {d} gün
            </button>
          ))}
        </div>
        <button className="btn" onClick={run} disabled={!!progress || !navigator.onLine}>
          {progress ? `İndiriliyor… ${progress.done}/${progress.total}` : 'Paketi hazırla'}
        </button>
      </div>
      {progress && progress.total > 0 && (
        <div className="known-bar" role="progressbar" aria-label="Paketin indirilmesi" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
          <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
      )}
      {result && <p className="notice small">{result}</p>}
      {!navigator.onLine && <p className="small muted">Şu an internet yok; paket internete bağlıyken hazırlanır.</p>}
    </section>
  )
}
