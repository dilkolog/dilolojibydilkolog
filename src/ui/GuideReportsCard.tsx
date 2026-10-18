import { useEffect, useState } from 'react'
import { reportsText } from '../engine/guideReports'
import { clearReports, dropReport, loadReports } from './guideReportStore'
import { showToast } from './toastFeed'

/** Rehber → Konular: the flags the learner made, to copy for the author (nothing shows when there are none). */
export function GuideReportsCard() {
  const [reports, setReports] = useState(loadReports)
  useEffect(() => {
    const reload = () => setReports(loadReports())
    window.addEventListener('diloloji:guide-reports', reload)
    return () => window.removeEventListener('diloloji:guide-reports', reload)
  }, [])
  if (!reports.length) return null
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportsText(reports))
      showToast('Bildirdiklerin kopyalandı.')
    } catch {
      showToast('Kopyalanamadı: listeyi seçip elle kopyalayabilirsin.')
    }
  }
  return (
    <details className="card guide-reports">
      <summary>Bildirdiklerin ({reports.length})</summary>
      <ul className="stack gap-1 guide-reports-list">
        {reports.map((r) => (
          <li key={r.id} className="row justify-between items-center gap-2">
            <span className="small">
              <strong>{r.kind === 'question' ? 'Soru' : 'Ders'}</strong> · {r.topic}: {r.note || '(not yok)'}
              {r.prompt && <span className="muted"> — “{r.prompt}”</span>}
            </span>
            <button type="button" className="icon-btn icon-btn-sm" aria-label="Bildirimi sil" onClick={() => dropReport(r.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="row gap-2">
        <button type="button" className="btn btn-sm" onClick={() => void copy()}>
          Hepsini kopyala
        </button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={clearReports}>
          Temizle
        </button>
      </div>
    </details>
  )
}
