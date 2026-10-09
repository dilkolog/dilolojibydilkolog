import { useEffect, useRef, useState } from 'react'
import { translate, TranslateError, type TranslateLang } from '../data/translate'

/** One paragraph at a time across the text: the server is asked sentence after sentence, never in a burst. */
let queue: Promise<unknown> = Promise.resolve()
function inTurn<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job)
  queue = next.catch(() => undefined)
  return next
}

/**
 * A paragraph's Turkish under it ("Türkçesi" in the reader): the text's own when it came with one
 * (a story's Turkish edition), else translated sentence by sentence, only when the paragraph comes
 * near the screen, so a long text left half-read costs only what was read; sentences translated
 * before come from the translation memory at no cost.
 */
export function ParagraphTranslation({ sentences, from, given }: { sentences: string[]; from: TranslateLang; given?: string }) {
  if (given)
    return (
      <p className="reader-tr" lang="tr">
        {given}
      </p>
    )
  return <TranslatedParagraph sentences={sentences} from={from} />
}

/** A paragraph translated by the server, sentence by sentence, once near the screen. */
function TranslatedParagraph({ sentences, from }: { sentences: string[]; from: TranslateLang }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [near, setNear] = useState(false)
  const [done, setDone] = useState<string[]>([])
  const [error, setError] = useState('')
  const key = sentences.join('\n')

  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (typeof IntersectionObserver === 'undefined') return setNear(true)
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '300px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])

  useEffect(() => {
    if (!near) return
    let live = true
    setDone([])
    setError('')
    void inTurn(async () => {
      const out: string[] = []
      for (const s of key.split('\n')) {
        if (!live) return
        out.push(await translate(s, from))
        if (live) setDone([...out])
      }
    }).catch((e) => live && setError(e instanceof TranslateError ? e.message : 'Çeviri şu an alınamadı.'))
    return () => {
      live = false
    }
  }, [near, key, from])

  const pending = !error && done.length < sentences.length
  return (
    <p ref={ref} className="reader-tr" lang="tr" aria-busy={pending}>
      {done.join(' ')}
      {pending && <span className="muted">{done.length ? ' …' : 'Çevriliyor…'}</span>}
      {error && <span className="error"> {error}</span>}
    </p>
  )
}
