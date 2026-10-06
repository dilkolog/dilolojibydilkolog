import { useEffect, useRef, useState } from 'react'
import { ClipsError, fetchClips, type ClipsProblem } from '../data/clips'
import type { KelimeDB } from '../data/db'
import { addExample, markWord, WordInputError } from '../data/wordInput'
import { embedUrl, splitAround, type Clip } from '../engine/clips'
import { splitArticle } from '../engine/answerCheck'
import type { VocabularyEntry } from '../engine/types'
import { CloseIcon, PlayIcon } from './icons'
import { LinesSkeleton } from './Skeleton'

const PROBLEM: Record<ClipsProblem, string> = {
  nokey: 'Bu özellik için bir YouTube API anahtarı gerekiyor: Vercel’de YOUTUBE_API_KEY olarak ekle (docs/YOUTUBE.md).',
  quota: 'Bugünlük arama hakkı doldu; yarın tekrar dene.',
  unavailable: 'Videolar alınamadı; internet bağlantını kontrol et.',
}

/** The word as it is searched: without its article ("la maison" → "maison"). */
const searchWord = (entry: VocabularyEntry) => splitArticle(entry.lemma.toLocaleLowerCase(entry.language), entry.language).rest.trim()

/** A caption line with the word in it set in bold. */
function Line({ clip }: { clip: Pick<Clip, 'text' | 'form'> }) {
  const [a, w, b] = splitAround(clip.text, clip.form)
  return (
    <>
      {a}
      {w && <mark>{w}</mark>}
      {b}
    </>
  )
}

/**
 * "Videolarda duy": where the word is spoken in real videos (YouGlish-style). Searching costs part of a
 * daily quota, so it starts only when asked; each result is a caption line that opens the video at that moment.
 */
export function ClipsSection({ db, entry, onChanged }: { db: KelimeDB; entry: VocabularyEntry; onChanged: () => void }) {
  const [clips, setClips] = useState<Clip[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<ClipsProblem | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  const search = async () => {
    setBusy(true)
    setProblem(null)
    try {
      setClips(await fetchClips(searchWord(entry), entry.language))
    } catch (e) {
      setProblem(e instanceof ClipsError ? e.problem : 'unavailable')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section stack clips">
      <div className="field-head">
        <h2 className="section-title">
          Videolarda duy{clips?.length ? <span className="muted"> ({clips.length})</span> : null}
        </h2>
        <button type="button" className="btn btn-sm btn-quiet" onClick={search} disabled={busy}>
          <PlayIcon size={14} className="inline-icon" />
          {busy ? 'Aranıyor…' : clips ? 'Yeniden ara' : 'Videolarda ara'}
        </button>
      </div>
      <p className="small muted">Kelimenin gerçek konuşmada, YouTube videolarında geçtiği anlar. Dokununca video o saniyede açılır.</p>
      {busy && <LinesSkeleton lines={3} label="Videolar aranıyor" />}
      {problem && (
        <p className="error small" role="alert">
          {PROBLEM[problem]}
        </p>
      )}
      {clips?.length === 0 && !busy && <p className="small muted">Bu kelime için altyazısı uygun video bulunamadı.</p>}
      {clips && clips.length > 0 && (
        <ul className="clip-list">
          {clips.map((c, i) => (
            <li key={`${c.id}-${c.start}`}>
              <button type="button" className="clip" onClick={() => setOpen(i)}>
                <span className="clip-play" aria-hidden>
                  <PlayIcon size={16} />
                </span>
                <span className="clip-text">
                  <span className="clip-line" lang={entry.language}>
                    <Line clip={c} />
                  </span>
                  <span className="small muted">
                    {c.title}
                    {c.channel && ` · ${c.channel}`}
                    {c.auto && ' · otomatik altyazı'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {clips && open !== null && clips[open] && <ClipPlayer db={db} entry={entry} clips={clips} index={open} onIndex={setOpen} onClose={() => setOpen(null)} onChanged={onChanged} />}
    </section>
  )
}

function ClipPlayer({ db, entry, clips, index, onIndex, onClose, onChanged }: { db: KelimeDB; entry: VocabularyEntry; clips: Clip[]; index: number; onIndex: (i: number) => void; onClose: () => void; onChanged: () => void }) {
  const clip = clips[index]
  const [message, setMessage] = useState('')
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    setMessage('')
  }, [index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        closeRef.current()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const keep = async () => {
    try {
      const fresh = (await db.vocabulary.get(entry.id)) ?? entry
      await db.vocabulary.put(addExample(fresh, markWord(clip.text, clip.form), ''))
      setMessage('Örneklerine eklendi.')
      onChanged()
    } catch (e) {
      setMessage(e instanceof WordInputError ? e.message : 'Eklenemedi.')
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog dialog-wide clip-player" role="dialog" aria-modal="true" aria-labelledby="clip-title">
        <div className="dialog-head">
          <h2 id="clip-title" className="section-title grow">
            {clip.title}
          </h2>
          <span className="small muted">
            {index + 1} / {clips.length}
          </span>
          <button className="icon-btn" onClick={onClose} aria-label="Kapat">
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="clip-frame">
          <iframe key={`${clip.id}-${clip.start}`} src={embedUrl(clip, entry.language)} title={clip.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        </div>
        <p className="clip-now" lang={entry.language}>
          <Line clip={clip} />
        </p>
        {(clip.before || clip.after) && (
          <p className="small muted" lang={entry.language}>
            {clip.before} <strong>…</strong> {clip.after}
          </p>
        )}
        {message && <p className="small" role="status">{message}</p>}
        <div className="row">
          <button className="btn btn-quiet" disabled={index === 0} onClick={() => onIndex(index - 1)}>
            ‹ Önceki
          </button>
          <button className="btn btn-quiet" disabled={index === clips.length - 1} onClick={() => onIndex(index + 1)}>
            Sonraki ›
          </button>
          <button className="btn btn-quiet" onClick={keep}>
            + Örneklerime
          </button>
        </div>
      </div>
    </div>
  )
}
