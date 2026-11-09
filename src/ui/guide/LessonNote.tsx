import { useEffect, useState } from 'react'

/**
 * "Kendi notun": A personal note or reminder for the lesson kept by the learner.
 * Saved in GuideMarks and synchronized across devices, and printed on the cheat sheet.
 */
export function LessonNote({ note, onSave }: { note: string; onSave: (note: string) => void }) {
  const [text, setText] = useState(note)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setText(note)
  }, [note])

  const handleSave = () => {
    onSave(text)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = () => {
    setText('')
    onSave('')
    setSaved(false)
  }

  return (
    <details className="card stack gap-2 guide-note-card" open={!!note}>
      <summary>
        <strong>Kendi notun</strong>{' '}
        <span className="muted small">
          {note ? '· 1 kişisel notun var' : '· bu konuya özel ipucunu kaydet'}
        </span>
      </summary>
      <div className="stack gap-2">
        <textarea
          className="input guide-note-input"
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setSaved(false)
          }}
          placeholder="Örnek: Sınavda şu istisnaya dikkat et, bağlaçtan sonra daima subjonctif gelir..."
          aria-label="Kendi ders notun"
          maxLength={1000}
        />
        <div className="row justify-between items-center">
          <span className="small muted">
            {text.length} / 1000 karakter{saved && <span className="guide-note-saved"> · Kaydedildi ✓</span>}
          </span>
          <div className="row gap-2">
            {text && (
              <button type="button" className="btn btn-sm btn-quiet" onClick={handleClear}>
                Temizle
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm"
              disabled={text === note}
              onClick={handleSave}
            >
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </details>
  )
}
