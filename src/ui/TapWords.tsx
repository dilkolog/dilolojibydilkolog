import type { ReactNode } from 'react'
import { wordSegments } from '../engine/phrase'
import type { TapState } from './useTapGloss'

/** A piece of a sentence with each word tappable (plain text when taps are not supported for the language). */
export function TapWords({ text, tap }: { text: string; tap: TapState }): ReactNode {
  if (!tap.supported) return text
  return wordSegments(text).map((seg, i) =>
    seg.word ? (
      <span
        key={i}
        role="button"
        tabIndex={-1}
        className={`tap-word${tap.open === seg.text ? ' is-open' : ''}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => tap.setOpen(tap.open === seg.text ? null : seg.text)}
      >
        {seg.text}
      </span>
    ) : (
      seg.text
    ),
  )
}

/** The small line with the tapped word's meaning; nothing until a word is tapped. */
export function TapNote({ tap }: { tap: TapState }) {
  const { info } = tap
  return (
    <p className="tap-note small" role="status" aria-live="polite" hidden={!info}>
      {info && (
        <>
          <strong>{info.word}</strong>
          {info.lemma && info.lemma !== info.word.toLocaleLowerCase() ? <span className="muted"> ← {info.lemma}</span> : null}
          {' · '}
          {info.gloss ?? <span className="muted">{tap.ready ? 'sözlükte bulunamadı' : 'sözlük yükleniyor…'}</span>}
        </>
      )}
    </p>
  )
}
