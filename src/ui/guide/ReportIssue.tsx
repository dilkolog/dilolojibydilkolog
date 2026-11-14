import { useState } from 'react'
import { MAX_NOTE, type GuideReport } from '../../engine/guideReports'
import { fileReport } from './guideReportStore'

/**
 * "Hata bildir": a small link that opens a note box. What is written is kept on this device in the guide's list of
 * reports (Rehber → Bildirdiklerin) and, with an account, sent to the owner as a content report with the item's id
 * (api/_reports.ts `content`), so the owner can fix it or retire it until fixed. Without an account (or offline) the
 * note stays on the device, to copy from the list.
 */
export function ReportIssue({ language, topic, kind, prompt, item, label = 'Hata bildir' }: { language: string; topic: string; kind: GuideReport['kind']; prompt?: string; item?: string; label?: string }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'kept'>('idle')
  if (state === 'sent') return <span className="small muted" role="status">Teşekkürler, bildirimin iletildi. Bir kopyası Rehber’de “Bildirdiklerin”de.</span>
  if (state === 'kept') return <span className="small muted" role="status">Not alındı. Rehber’de “Bildirdiklerin”den kopyalayabilirsin.</span>
  if (!open)
    return (
      <button type="button" className="link small" onClick={() => setOpen(true)}>
        {label}
      </button>
    )
  // A guide question has no id of its own: its lesson's, with the question's text in `shown`.
  const id = item ?? `${language}-lesson-${topic}`
  return (
    <form
      className="stack gap-1 report-issue"
      onSubmit={async (e) => {
        e.preventDefault()
        const text = note.trim()
        fileReport({ language, topic, kind, ...(prompt ? { prompt } : {}), ...(id ? { item: id } : {}), note: text })
        setState('sending')
        try {
          // Without an account there is no one to send it as: no request at all.
          const { getStoredAccount } = await import('../../data/access')
          if (!(await getStoredAccount().catch(() => null))) return setState('kept')
          const { sendReport } = await import('../../data/friends')
          await sendReport({ kind: 'content', target: id, reason: 'mistake', note: text, shown: prompt ?? `${kind === 'lesson' ? 'Ders' : 'Soru'}: ${topic}` })
          setState('sent')
        } catch {
          // No account, offline or the day's reports used up: the note is on the device.
          setState('kept')
        }
      }}
    >
      <label className="small" htmlFor={`report-${id}`}>
        Neyi yanlış ya da eksik buldun?
      </label>
      <textarea id={`report-${id}`} className="textarea" rows={2} maxLength={MAX_NOTE} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
      <div className="row gap-2">
        <button type="submit" className="btn btn-sm" disabled={state === 'sending'}>
          {state === 'sending' ? 'Gönderiliyor…' : 'Gönder'}
        </button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(false)}>
          Vazgeç
        </button>
      </div>
    </form>
  )
}
