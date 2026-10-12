import { useEffect, useMemo, useRef, useState } from 'react'
import { addPoint, diagramRound, editPoint, isRight, labelled, MAX_POINTS, newDiagram, removePoint, studyable, type Diagram, type DiagramPoint } from '../../engine/diagram'
import { createRng } from '../../engine/rng'
import type { TargetLanguage, VocabularyEntry } from '../../engine/types'
import { db } from '../../data/instance'
import { createEntry } from '../../data/wordInput'
import { AccentBar } from '../AccentBar'
import { accentChange, insertAt } from '../accentCaret'
import { downscaleImage } from '../downscaleImage'
import { ConfirmDialog } from '../Dialog'
import { sfx } from '../sounds'
import { showToast } from '../toastFeed'
import { useMediaUrl } from '../useMedia'
import { GameResult } from './GameResult'

type View = { name: 'list' } | { name: 'edit'; diagram: Diagram; isNew: boolean } | { name: 'study'; diagram: Diagram }

/**
 * Labelled pictures: add a drawing, photo or map, tap to put a dot where a word belongs and name it, then
 * study it dot by dot (pick the word from the labels, or type it). The pictures sync like any other.
 */
export function DiagramGame({ language, vocabulary, onExit, onChanged }: { language: TargetLanguage; vocabulary: VocabularyEntry[]; onExit: () => void; onChanged: () => void }) {
  const [view, setView] = useState<View>({ name: 'list' })
  const [diagrams, setDiagrams] = useState<Diagram[]>([])
  const reload = () => void db.getDiagrams(language).then(setDiagrams)
  useEffect(reload, [language])
  const back = () => {
    reload()
    setView({ name: 'list' })
  }
  if (view.name === 'edit') return <DiagramEditor diagram={view.diagram} isNew={view.isNew} language={language} vocabulary={vocabulary} onDone={back} onChanged={onChanged} />
  if (view.name === 'study') return <DiagramStudy diagram={view.diagram} language={language} onDone={back} />
  return (
    <div className="stack">
      <button className="link" onClick={onExit}>← Oyunlar</button>
      <h1 className="greeting">Resim etiketleme</h1>
      <p className="greeting-sub">Bir çizim, fotoğraf ya da harita ekle; kelimelerin geçtiği yerlere nokta koyup adlandır. Sonra nokta nokta sorulur: etiketlerden seç ya da yaz.</p>
      <div>
        <label className="btn">
          Yeni resim
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                const imageId = await db.addMedia('image', await downscaleImage(file))
                setView({ name: 'edit', diagram: newDiagram(language, file.name.replace(/\.[^.]+$/, ''), imageId), isNew: true })
              } catch {
                showToast('Resim açılamadı. Başka bir dosya dene.', undefined, 5000, 'info')
              }
            }}
          />
        </label>
      </div>
      {diagrams.length === 0 ? (
        <p className="muted">Henüz resim yok. Örnek: insan vücudu, bir odanın fotoğrafı, şehir haritası.</p>
      ) : (
        <ul className="diagram-list">
          {diagrams.map((d) => (
            <li key={d.id} className="card row diagram-item">
              <Thumb imageId={d.imageId} />
              <div className="grow diagram-meta">
                <strong>{d.title}</strong>
                <p className="small muted">{labelled(d).length} etiket</p>
              </div>
              <button className="btn btn-sm" disabled={!studyable(d)} title={studyable(d) ? undefined : 'En az iki etiket gerekir'} onClick={() => setView({ name: 'study', diagram: d })}>
                Çalış
              </button>
              <button className="btn btn-sm btn-quiet" onClick={() => setView({ name: 'edit', diagram: d, isNew: false })}>
                Düzenle
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Thumb({ imageId }: { imageId: string }) {
  const url = useMediaUrl(imageId)
  return url ? <img className="diagram-thumb" src={url} alt="" /> : <span className="diagram-thumb" />
}

/** The picture with its dots; `onTap` receives where (0–1) when the picture itself is tapped. */
function Stage({
  imageId,
  points,
  onTap,
  render,
}: {
  imageId: string
  points: DiagramPoint[]
  onTap?: (x: number, y: number) => void
  render: (p: DiagramPoint, index: number) => React.ReactNode
}) {
  const url = useMediaUrl(imageId)
  const box = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={box}
      className="diagram-stage"
      onClick={(e) => {
        if (!onTap || (e.target as HTMLElement).closest('button')) return
        const r = box.current!.getBoundingClientRect()
        onTap((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
      }}
    >
      {url && <img src={url} alt="" draggable={false} />}
      {points.map((p, i) => (
        <span key={p.id} className="diagram-dot-wrap" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
          {render(p, i)}
        </span>
      ))}
    </div>
  )
}

function DiagramEditor({ diagram: initial, isNew, language, vocabulary, onDone, onChanged }: { diagram: Diagram; isNew: boolean; language: TargetLanguage; vocabulary: VocabularyEntry[]; onDone: () => void; onChanged: () => void }) {
  const [d, setD] = useState(initial)
  const [selected, setSelected] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const wordBox = useRef<HTMLInputElement>(null)
  const point = d.points.find((p) => p.id === selected)

  const save = async () => {
    await db.saveDiagram({ ...d, points: d.points.filter((p) => p.word.trim() || p.meaning?.trim()) })
    showToast('Resim kaydedildi.')
    onDone()
  }
  const discard = async () => {
    // A picture chosen for a diagram that was never saved is not kept.
    if (isNew) await db.media.delete(d.imageId)
    onDone()
  }
  const addToWords = async () => {
    const have = new Set(vocabulary.map((v) => v.lemma.toLowerCase()))
    const fresh = labelled(d).filter((p) => p.meaning?.trim() && !have.has(p.word.trim().toLowerCase()))
    const entries = fresh.flatMap((p) => {
      try {
        return [createEntry({ word: p.word.trim(), meaning: p.meaning!.trim(), tags: d.title }, language, new Date(), 'user')]
      } catch {
        return []
      }
    })
    if (entries.length) await db.vocabulary.bulkPut(entries)
    showToast(entries.length ? `${entries.length} kelime eklendi.` : 'Eklenecek yeni kelime yok (anlamı yazılmış ve listende olmayan etiket gerekir).', undefined, 5000, 'info')
    onChanged()
  }
  const del = async () => {
    await db.deleteDiagram(d.id)
    onChanged()
    onDone()
  }

  return (
    <div className="stack">
      <button className="link" onClick={discard}>← Vazgeç</button>
      <h1 className="greeting">{isNew ? 'Yeni resim' : 'Resmi düzenle'}</h1>
      <div className="field">
        <label htmlFor="dg-title">Başlık</label>
        <input id="dg-title" className="input" value={d.title} maxLength={60} onChange={(e) => setD({ ...d, title: e.target.value })} />
      </div>
      <p className="small muted">Kelimenin geçtiği yere dokun: nokta konur. En çok {MAX_POINTS} etiket.</p>
      <Stage
        imageId={d.imageId}
        points={d.points}
        onTap={(x, y) => {
          const next = addPoint(d, x, y)
          if (next === d) return
          setD(next)
          setSelected(next.points[next.points.length - 1].id)
          setTimeout(() => wordBox.current?.focus(), 0)
        }}
        render={(p, i) => (
          <button type="button" className={`diagram-dot${selected === p.id ? ' is-current' : ''}`} aria-label={`${i + 1}. nokta${p.word ? `: ${p.word}` : ''}`} onClick={() => setSelected(p.id)}>
            {i + 1}
          </button>
        )}
      />
      {point && (
        <section className="card stack gap-2">
          <strong>{d.points.indexOf(point) + 1}. nokta</strong>
          <input ref={wordBox} className="input" lang={language} aria-label="Kelime" placeholder="Kelime (örn. la tête)" value={point.word} onChange={accentChange(language, (v) => setD(editPoint(d, point.id, { word: v })))} />
          <AccentBar language={language} onInsert={(ch) => wordBox.current && setD(editPoint(d, point.id, { word: insertAt(wordBox.current, ch) }))} />
          <input className="input" aria-label="Anlamı" placeholder="Türkçesi (isteğe bağlı)" value={point.meaning ?? ''} onChange={(e) => setD(editPoint(d, point.id, { meaning: e.target.value }))} />
          <div>
            <button
              type="button"
              className="link small"
              onClick={() => {
                setD(removePoint(d, point.id))
                setSelected(null)
              }}
            >
              Noktayı sil
            </button>
          </div>
        </section>
      )}
      <div className="row">
        <button className="btn" onClick={save}>Kaydet</button>
        {labelled(d).some((p) => p.meaning?.trim()) && (
          <button className="btn btn-quiet" onClick={addToWords}>Etiketleri kelimelerime ekle</button>
        )}
        {!isNew && <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>Resmi sil</button>}
      </div>
      {confirmDelete && (
        <ConfirmDialog title="Resim silinsin mi?" confirmLabel="Sil" danger onConfirm={del} onCancel={() => setConfirmDelete(false)}>
          Resim ve etiketleri silinir; kelime listene eklediklerin kalır.
        </ConfirmDialog>
      )}
    </div>
  )
}

function DiagramStudy({ diagram, language, onDone }: { diagram: Diagram; language: TargetLanguage; onDone: () => void }) {
  const [mode, setMode] = useState<'pick' | 'type' | null>(null)
  const [round, setRound] = useState(() => diagramRound(diagram, createRng(Date.now())))
  const [index, setIndex] = useState(0)
  const [used, setUsed] = useState<string[]>([])
  const [done, setDone] = useState<Record<string, 'ok' | 'wrong'>>({})
  const [shown, setShown] = useState<{ ok: boolean } | null>(null)
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const current = round.order[index]
  const finished = mode !== null && index >= round.order.length

  const answer = (said: string) => {
    if (!current || shown) return
    const ok = isRight(current, said)
    if (ok) sfx.correct()
    else sfx.wrong()
    setDone((m) => ({ ...m, [current.id]: ok ? 'ok' : 'wrong' }))
    if (ok && mode === 'pick') setUsed((u) => [...u, current.word.trim()])
    setShown({ ok })
  }
  const next = () => {
    setShown(null)
    setText('')
    setIndex((i) => i + 1)
  }
  useEffect(() => {
    if (!shown) return
    const onKey = (e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), next())
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const restart = () => {
    setRound(diagramRound(diagram, createRng(Date.now())))
    setIndex(0)
    setUsed([])
    setDone({})
    setShown(null)
    setText('')
  }
  const bankLeft = useMemo(() => {
    const spent = [...used]
    return round.bank.filter((w) => {
      const i = spent.indexOf(w)
      if (i >= 0) {
        spent.splice(i, 1)
        return false
      }
      return true
    })
  }, [round, used])

  if (mode === null) {
    return (
      <div className="stack">
        <button className="link" onClick={onDone}>← Resimler</button>
        <h1 className="greeting">{diagram.title}</h1>
        <p className="greeting-sub">{labelled(diagram).length} etiket. Nasıl çalışmak istersin?</p>
        <div className="row">
          <button className="btn btn-lg" onClick={() => setMode('pick')}>Etiketlerden seç</button>
          <button className="btn btn-lg btn-quiet" onClick={() => setMode('type')}>Yazarak</button>
        </div>
      </div>
    )
  }

  if (finished) {
    const right = Object.values(done).filter((v) => v === 'ok').length
    const total = round.order.length
    return (
      <GameResult
        title="Tamamlandı"
        headline={`${right} / ${total}`}
        accuracy={total ? right / total : 0}
        stats={[
          { label: 'doğru', value: right },
          { label: 'yanlış', value: total - right },
        ]}
        missed={round.order.filter((p) => done[p.id] !== 'ok').map((p) => (p.meaning ? `${p.word} — ${p.meaning}` : p.word))}
        language={language}
        onAgain={restart}
        onExit={onDone}
      />
    )
  }

  return (
    <div className="stack diagram-study">
      <div className="row justify-between">
        <button className="link" onClick={onDone}>← Bitir</button>
        <span className="small muted">{index + 1} / {round.order.length}</span>
      </div>
      <Stage
        imageId={diagram.imageId}
        points={labelled(diagram)}
        render={(p) => {
          const state = done[p.id]
          return (
            <span className={`diagram-dot${p.id === current?.id ? ' is-current' : ''}${state ? ` is-${state}` : ''}`} aria-hidden>
              {state === 'ok' ? <span className="diagram-label">{p.word}</span> : null}
            </span>
          )
        }}
      />
      <p className="small muted">Vurgulu noktada ne var?</p>
      {shown ? (
        <div className="stack gap-2">
          <p className={shown.ok ? 'notice' : 'error'} role="status">
            {shown.ok ? 'Doğru' : `Doğrusu: ${current.word}`}
            {current.meaning ? ` (${current.meaning})` : ''}
          </p>
          <button className="btn" onClick={next} autoFocus>{index + 1 < round.order.length ? 'Sonraki' : 'Sonucu gör'}</button>
        </div>
      ) : mode === 'pick' ? (
        <div className="choice-row" role="group" aria-label="Etiketler">
          {bankLeft.map((w, i) => (
            <button key={`${w}-${i}`} type="button" className="chip" lang={language} onClick={() => answer(w)}>
              {w}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) answer(text)
          }}
        >
          <input ref={input} className="answer-input" lang={language} autoFocus autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="done" placeholder="Kelimeyi yaz" aria-label="Kelime" value={text} onChange={accentChange(language, setText)} />
          <AccentBar language={language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />
        </form>
      )}
    </div>
  )
}
