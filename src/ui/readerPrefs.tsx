import { READER_SIZES, type ReaderPrefs } from './readerSettings'

export function ReaderControls({ prefs, onChange }: { prefs: ReaderPrefs; onChange: (f: (p: ReaderPrefs) => ReaderPrefs) => void }) {
  return (
    <>
      <div className="segmented reader-seg" role="group" aria-label="Yazı boyutu">
        <button className="segmented-btn" onClick={() => onChange((r) => ({ ...r, size: Math.max(0, r.size - 1) }))} disabled={prefs.size === 0} aria-label="Yazıyı küçült">
          A−
        </button>
        <button
          className="segmented-btn"
          onClick={() => onChange((r) => ({ ...r, size: Math.min(READER_SIZES.length - 1, r.size + 1) }))}
          disabled={prefs.size === READER_SIZES.length - 1}
          aria-label="Yazıyı büyüt"
        >
          A+
        </button>
      </div>
      <button className="chip chip-sm" aria-pressed={prefs.airy} onClick={() => onChange((r) => ({ ...r, airy: !r.airy }))}>
        Seyrek satır
      </button>
      <button className="chip chip-sm" aria-pressed={prefs.sans} onClick={() => onChange((r) => ({ ...r, sans: !r.sans }))}>
        Sade yazı
      </button>
      <div className="segmented reader-seg" role="group" aria-label="Sütun genişliği">
        {(['Dar', 'Orta', 'Geniş'] as const).map((label, i) => (
          <button key={label} className="segmented-btn" aria-pressed={prefs.width === i} onClick={() => onChange((r) => ({ ...r, width: i as ReaderPrefs['width'] }))}>
            {label}
          </button>
        ))}
      </div>
      <button className="chip chip-sm" aria-pressed={prefs.sepia} onClick={() => onChange((r) => ({ ...r, sepia: !r.sepia }))}>
        Sepya
      </button>
    </>
  )
}
