import { Popover } from './Popover'
import { READER_SIZES, type ReaderPrefs } from './readerSettings'

type Change = (f: (p: ReaderPrefs) => ReaderPrefs) => void

/** The reading look in labelled rows: size, column width, and three switches (line spacing, plain type, sepia). */
export function ReaderControls({ prefs, onChange }: { prefs: ReaderPrefs; onChange: Change }) {
  return (
    <div className="reader-view stack gap-3">
      <div className="reader-view-row">
        <span className="small muted">Yazı boyutu</span>
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
      </div>
      <div className="reader-view-row">
        <span className="small muted">Sütun</span>
        <div className="segmented reader-seg" role="group" aria-label="Sütun genişliği">
          {(['Dar', 'Orta', 'Geniş'] as const).map((label, i) => (
            <button key={label} className="segmented-btn" aria-pressed={prefs.width === i} onClick={() => onChange((r) => ({ ...r, width: i as ReaderPrefs['width'] }))}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="reader-view-row reader-view-chips">
        <button className="chip chip-sm" aria-pressed={prefs.airy} onClick={() => onChange((r) => ({ ...r, airy: !r.airy }))}>
          Seyrek satır
        </button>
        <button className="chip chip-sm" aria-pressed={prefs.sans} onClick={() => onChange((r) => ({ ...r, sans: !r.sans }))}>
          Sade yazı
        </button>
        <button className="chip chip-sm" aria-pressed={prefs.sepia} onClick={() => onChange((r) => ({ ...r, sepia: !r.sepia }))}>
          Sepya
        </button>
      </div>
    </div>
  )
}

/** One "Aa Görünüm" button that opens the reading look, so the tool row above the text stays short. */
export function ReaderViewMenu({ prefs, onChange }: { prefs: ReaderPrefs; onChange: Change }) {
  return (
    <Popover button={<><span className="reader-aa" aria-hidden>Aa</span> Görünüm</>} buttonClassName="chip chip-sm" label="Okuma görünümü" align="end">
      {() => <ReaderControls prefs={prefs} onChange={onChange} />}
    </Popover>
  )
}
