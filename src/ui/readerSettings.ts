import { useEffect, useState } from 'react'

/** Reading comfort, remembered on this device and shared by Reading and Story. */
const READER_KEY = 'kelime-koc:reader'
export const READER_SIZES = ['1.0625rem', '1.25rem', '1.4375rem', '1.625rem']

export interface ReaderPrefs {
  size: number
  airy: boolean
  sepia: boolean
  /** The plain sans-serif face instead of the book face. */
  sans: boolean
  /** Column width: 0 narrow, 1 as it was, 2 wide. */
  width: 0 | 1 | 2
}

function load(): ReaderPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(READER_KEY) ?? 'null') as Partial<ReaderPrefs> | null
    return { size: Math.min(READER_SIZES.length - 1, Math.max(0, v?.size ?? 1)), airy: !!v?.airy, sepia: !!v?.sepia, sans: !!v?.sans, width: v?.width === 0 || v?.width === 2 ? v.width : 1 }
  } catch {
    return { size: 1, airy: false, sepia: false, sans: false, width: 1 }
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
    className: `${p.sepia ? ' reader-sepia' : ''}${p.airy ? ' reader-airy' : ''}${p.sans ? ' reader-sans' : ''}${p.width === 0 ? ' reader-narrow' : p.width === 2 ? ' reader-wide' : ''}`,
    style: { ['--reader-size' as string]: READER_SIZES[p.size] },
  }
}
