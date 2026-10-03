import { useEffect, useState } from 'react'

/** Reading comfort, remembered on this device and shared by Reading and Story. */
const READER_KEY = 'kelime-koc:reader'
export const READER_SIZES = ['1.0625rem', '1.25rem', '1.4375rem', '1.625rem']

export interface ReaderPrefs {
  size: number
  airy: boolean
  sepia: boolean
}

function load(): ReaderPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(READER_KEY) ?? 'null') as Partial<ReaderPrefs> | null
    return { size: Math.min(READER_SIZES.length - 1, Math.max(0, v?.size ?? 1)), airy: !!v?.airy, sepia: !!v?.sepia }
  } catch {
    return { size: 1, airy: false, sepia: false }
  }
}

export function useReaderPrefs() {
  const [prefs, setPrefs] = useState(load)
  useEffect(() => {
    try {
      localStorage.setItem(READER_KEY, JSON.stringify(prefs))
    } catch {
      // Defaults next time; fine.
    }
  }, [prefs])
  return [prefs, setPrefs] as const
}

/** Class names and the size variable for a text that follows the reader's settings. */
export function readerStyle(p: ReaderPrefs) {
  return {
    className: `${p.sepia ? ' reader-sepia' : ''}${p.airy ? ' reader-airy' : ''}`,
    style: { ['--reader-size' as string]: READER_SIZES[p.size] },
  }
}

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
        Geniş satır
      </button>
      <button className="chip chip-sm" aria-pressed={prefs.sepia} onClick={() => onChange((r) => ({ ...r, sepia: !r.sepia }))}>
        Sepya
      </button>
    </>
  )
}
