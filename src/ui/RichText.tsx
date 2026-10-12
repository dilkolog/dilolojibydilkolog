import { useRef, type RefObject } from 'react'
import { parseRich, wrapSelection } from '../engine/richText'

/** A note or extra field with its **bold**, _italic_ and ==highlight== shown (as React nodes, never as HTML). */
export function RichText({ text }: { text: string }) {
  return (
    <span className="rich">
      {parseRich(text).map((r, i) => {
        let node: React.ReactNode = r.text
        if (r.mark) node = <mark>{node}</mark>
        if (r.italic) node = <em>{node}</em>
        if (r.bold) node = <strong>{node}</strong>
        return <span key={i}>{node}</span>
      })}
    </span>
  )
}

/** Three small buttons that wrap the selected text of a textarea in the marks (and take them off again). */
export function FormatBar({ target, value, onChange }: { target: RefObject<HTMLTextAreaElement | null>; value: string; onChange: (v: string) => void }) {
  const caret = useRef<{ start: number; end: number } | null>(null)
  const apply = (mark: string) => {
    const el = target.current
    if (!el) return
    const next = wrapSelection(value, el.selectionStart ?? value.length, el.selectionEnd ?? value.length, mark)
    onChange(next.value)
    caret.current = { start: next.start, end: next.end }
    requestAnimationFrame(() => {
      el.focus()
      if (caret.current) el.setSelectionRange(caret.current.start, caret.current.end)
    })
  }
  return (
    <div className="format-bar" role="group" aria-label="Biçim">
      <button type="button" className="icon-btn format-btn" aria-label="Kalın" title="Kalın (**metin**)" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('**')}>
        <strong>K</strong>
      </button>
      <button type="button" className="icon-btn format-btn" aria-label="Eğik" title="Eğik (_metin_)" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('_')}>
        <em>E</em>
      </button>
      <button type="button" className="icon-btn format-btn" aria-label="Vurgu" title="Vurgu (==metin==)" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('==')}>
        <mark>V</mark>
      </button>
    </div>
  )
}
