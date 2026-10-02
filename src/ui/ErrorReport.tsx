import { useEffect, useMemo, useState } from 'react'
import { AiError, monthlyReport, type ErrorReport } from '../ai'
import type { KelimeDB } from '../data/db'
import { errorDigest, type ErrorDigest } from '../engine/errorDigest'
import type { ReviewEvent, TargetLanguage, VocabularyEntry } from '../engine/types'
import { useAi } from './aiContext'
import { ERROR_NAME, PROMPT_TEXT } from './labels'

interface SavedReport {
  language: TargetLanguage
  at: string
  report: ErrorReport
}

/**
 * The month's errors: what kind they are and which keep coming back (always shown), and, with
 * AI, the patterns behind them with drills aimed at each.
 */
export function ErrorReportCard({ db, language, vocabulary }: { db: KelimeDB; language: TargetLanguage; vocabulary: VocabularyEntry[] }) {
  const { apiKey } = useAi()
  const [events, setEvents] = useState<ReviewEvent[] | null>(null)
  const [saved, setSaved] = useState<SavedReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const since = new Date(Date.now() - 30 * 86_400_000)
    void db.eventsSince(since, language).then(setEvents)
    void db.meta.get('errorReports').then((r) => setSaved(((r?.value as SavedReport[] | undefined) ?? []).filter((x) => x.language === language).at(-1) ?? null))
  }, [db, language])

  const digest: ErrorDigest | null = useMemo(() => (events ? errorDigest(events, vocabulary, language, new Date()) : null), [events, vocabulary, language])
  if (!digest || digest.answers < 20) return null

  const generate = async () => {
    if (!apiKey) return
    setBusy(true)
    setError('')
    try {
      const report = await monthlyReport(apiKey, { language, lines: digest.lines, answers: digest.answers, wrong: digest.wrong })
      const entry: SavedReport = { language, at: new Date().toISOString(), report }
      const all = ((await db.meta.get('errorReports'))?.value as SavedReport[] | undefined) ?? []
      await db.meta.put({ key: 'errorReports', value: [...all, entry].slice(-12) })
      setSaved(entry)
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Rapor hazırlanamadı.')
    } finally {
      setBusy(false)
    }
  }

  const fresh = saved && Date.now() - new Date(saved.at).getTime() < 7 * 86_400_000
  return (
    <section className="section stack">
      <h2 className="section-title">Son 30 günün hataları</h2>
      <p className="small muted">
        {digest.answers} cevaptan {digest.wrong} tanesi tam doğru değildi (%{Math.round((digest.wrong / digest.answers) * 100)}).
      </p>
      {digest.byType.length > 0 && (
        <div className="error-types">
          {digest.byType.slice(0, 6).map((t) => (
            <span key={t.type} className="pill">
              {ERROR_NAME[t.type]} <strong>{t.count}</strong>
            </span>
          ))}
        </div>
      )}
      {digest.byExercise[0] && digest.byExercise[0].wrong / digest.byExercise[0].total >= 0.3 && (
        <p className="small">
          En zorlandığın soru türü: <strong>{PROMPT_TEXT[digest.byExercise[0].type] ?? digest.byExercise[0].type}</strong> (%{Math.round((digest.byExercise[0].wrong / digest.byExercise[0].total) * 100)} hatalı).
        </p>
      )}
      {digest.recurring.length > 0 && (
        <>
          <h3 className="subhead">Tekrar eden hatalar</h3>
          <ul className="recurring">
            {digest.recurring.map((r) => (
              <li key={`${r.entryId}|${r.given}`}>
                <span className="strike" lang={language}>
                  {r.given || '(boş)'}
                </span>{' '}
                → <strong lang={language}>{r.expected}</strong> <span className="small muted">×{r.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {saved && (
        <section className="card stack report">
          <p>{saved.report.summary}</p>
          {saved.report.patterns.map((p) => (
            <div key={p.title} className="stack report-pattern">
              <strong>{p.title}</strong>
              <p className="small">{p.explanation}</p>
              {p.examples.length > 0 && (
                <p className="small muted" lang={language}>
                  {p.examples.join(' · ')}
                </p>
              )}
              <p className="small">💡 {p.tip}</p>
            </div>
          ))}
          {saved.report.drills.length > 0 && (
            <>
              <h3 className="subhead">Alıştırmalar</h3>
              <ol className="drills">
                {saved.report.drills.map((d) => (
                  <Drill key={d.prompt} drill={d} language={language} />
                ))}
              </ol>
            </>
          )}
          <p className="small muted">{new Date(saved.at).toLocaleDateString('tr-TR')} tarihli rapor.</p>
        </section>
      )}
      {apiKey ? (
        <div className="row">
          <button className="btn btn-quiet" onClick={generate} disabled={busy || digest.lines.length < 5}>
            {busy ? 'Hazırlanıyor…' : saved ? (fresh ? 'Raporu yenile' : 'Yeni rapor hazırla') : 'AI ile hata raporu hazırla'}
          </button>
          <span className="small muted">Hatalarındaki kalıpları bulur, her biri için alıştırma verir.</span>
        </div>
      ) : (
        <p className="small muted">AI anahtarını girersen bu hatalardaki kalıpları ("-age ile biten kelimelerin cinsiyeti" gibi) bulan aylık bir rapor hazırlanır.</p>
      )}
      {error && <p className="error small">{error}</p>}
    </section>
  )
}

function Drill({ drill, language }: { drill: ErrorReport['drills'][number]; language: TargetLanguage }) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <span lang={language}>{drill.prompt}</span>{' '}
      {open ? (
        <span>
          → <strong lang={language}>{drill.answer}</strong> <span className="small muted">{drill.note}</span>
        </span>
      ) : (
        <button className="link small" onClick={() => setOpen(true)}>
          Cevap
        </button>
      )}
    </li>
  )
}
