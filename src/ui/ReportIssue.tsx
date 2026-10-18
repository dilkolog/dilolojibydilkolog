import { useState } from 'react'
import { MAX_NOTE, type GuideReport } from '../engine/guideReports'
import { fileReport } from './guideReportStore'

/**
 * "Hata bildir": a small link that opens a note box. What is written is kept on this device in the guide's list of
 * reports (Rehber → Bildirdiklerin), from where it is copied to whoever corrects the lesson.
 */
export function ReportIssue({ language, topic, kind, prompt, label = 'Hata bildir' }: { language: string; topic: string; kind: GuideReport['kind']; prompt?: string; label?: string }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  if (sent) return <span className="small muted" role="status">Not alındı. Rehber’de “Bildirdiklerin”den kopyalayabilirsin.</span>
  if (!open)
    return (
      <button type="button" className="link small" onClick={() => setOpen(true)}>
        {label}
      </button>
    )
  return (
    <form
      className="stack gap-1 report-issue"
      onSubmit={(e) => {
        e.preventDefault()
        fileReport({ language, topic, kind, ...(prompt ? { prompt } : {}), note: note.trim() })
        setSent(true)
      }}
    >
      <label className="small" htmlFor={`report-${topic}`}>
        Neyi yanlış ya da eksik buldun?
      </label>
      <textarea id={`report-${topic}`} className="textarea" rows={2} maxLength={MAX_NOTE} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
      <div className="row gap-2">
        <button type="submit" className="btn btn-sm">
          Kaydet
        </button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(false)}>
          Vazgeç
        </button>
      </div>
    </form>
  )
}
