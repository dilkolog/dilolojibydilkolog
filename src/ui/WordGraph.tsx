import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force'
import { useEffect, useMemo, useRef, useState } from 'react'
import { displayForm } from '../engine/exercises'
import { buildWordGraph, type LinkKind } from '../engine/graph'
import { MASTERY_STAGES, masteryStage } from '../engine/mastery'
import type { UserWordState, VocabularyEntry } from '../engine/types'
import { CloseIcon } from './icons'
import { STAGE_NAME } from './labels'
import { EmptyState } from './EmptyState'

interface Node extends SimulationNodeDatum {
  id: string
  label: string
  stage: number
}
type Link = SimulationLinkDatum<Node> & { kind: LinkKind }

const W = 900
const H = 560
const MAX_NODES = 160

const LINK_LABEL: Record<LinkKind, string> = {
  confusable: 'Karıştırılan',
  synonym: 'Eş anlamlı',
  antonym: 'Zıt anlamlı',
  related: 'İlişkili',
  family: 'Kelime ailesi',
  root: 'Aynı kök',
  tag: 'Aynı etiket',
}

/**
 * Personal vocabulary map: words as nodes sized and coloured by mastery, joined by their
 * relations. Watching a new word attach to what you already know makes progress tangible.
 */
export function WordGraph({ vocabulary, states, onOpen }: { vocabulary: VocabularyEntry[]; states: UserWordState[]; onOpen: (id: string) => void }) {
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const { nodes, links, fit } = useMemo(() => {
    // Learned words first, then the rest, capped so the picture stays readable.
    const all = [...vocabulary].sort((a, b) => Number(stateById.has(b.id)) - Number(stateById.has(a.id)))
    // Only words with at least one connection: lone words would just float around.
    const linked = new Set(buildWordGraph(all).flatMap((l) => [l.source, l.target]))
    const words = all.filter((w) => linked.has(w.id)).slice(0, MAX_NODES)
    const nodes: Node[] = words.map((w) => {
      const st = stateById.get(w.id)
      return { id: w.id, label: displayForm(w), stage: st ? MASTERY_STAGES.indexOf(masteryStage(st)) : -1 }
    })
    const links: Link[] = buildWordGraph(words).map((l) => ({ ...l }))
    // A static layout: run the simulation to rest once instead of animating every frame.
    forceSimulation(nodes)
      .force('link', forceLink<Node, Link>(links).id((d) => d.id).distance(70).strength(0.6))
      .force('charge', forceManyBody().strength(-220))
      .force('collide', forceCollide<Node>().radius((d) => radius(d.stage) + 18))
      .force('center', forceCenter(W / 2, H / 2))
      .force('x', forceX(W / 2).strength(0.025))
      .force('y', forceY(H / 2).strength(0.05))
      .stop()
      .tick(300)
    // Initial view framing every node (and its label) with some padding.
    const xs = nodes.map((n) => n.x ?? 0)
    const ys = nodes.map((n) => n.y ?? 0)
    const pad = 50
    const minX = Math.min(...xs) - pad
    const minY = Math.min(...ys) - pad
    const k = Math.min(1.6, W / (Math.max(...xs) + pad - minX), H / (Math.max(...ys) + pad + 20 - minY))
    const fit = nodes.length ? { k, x: minX - (W / k - (Math.max(...xs) + pad - minX)) / 2, y: minY - (H / k - (Math.max(...ys) + pad + 20 - minY)) / 2 } : { x: 0, y: 0, k: 1 }
    return { nodes, links, fit }
  }, [vocabulary, stateById])

  const [view, setView] = useState(fit)
  useEffect(() => setView(fit), [fit])
  const [hover, setHover] = useState<string | null>(null)
  // A click selects a word (its links stay lit, its card opens below); the card opens the word.
  const [selected, setSelected] = useState<string | null>(null)
  const focus = hover ?? selected
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const svg = useRef<SVGSVGElement>(null)

  // Wheel zoom needs a non-passive listener so the page doesn't scroll at the same time.
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      setView((v) => {
        const k = Math.min(4, Math.max(0.5, v.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
        // Keep the point under the pointer fixed.
        const fx = (e.clientX - r.left) / r.width
        const fy = (e.clientY - r.top) / r.height
        const px = v.x + fx * (W / v.k)
        const py = v.y + fy * (H / v.k)
        return { k, x: px - fx * (W / k), y: py - fy * (H / k) }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const neighbours = useMemo(() => {
    if (!focus) return null
    const set = new Set([focus])
    for (const l of links) {
      const s = (l.source as Node).id
      const t = (l.target as Node).id
      if (s === focus) set.add(t)
      if (t === focus) set.add(s)
    }
    return set
  }, [focus, links])
  const byId = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary])
  const picked = selected ? byId.get(selected) : undefined
  const pickedLinks = useMemo(
    () =>
      selected
        ? links
            .filter((l) => (l.source as Node).id === selected || (l.target as Node).id === selected)
            .map((l) => ({ kind: l.kind, node: ((l.source as Node).id === selected ? l.target : l.source) as Node }))
        : [],
    [selected, links],
  )

  const kinds = [...new Set(links.map((l) => l.kind))]

  if (!nodes.length) {
    return (
      <EmptyState art="together" title="Kelime ağın henüz boş">
        Ağ, kelimeler arasındaki bağlardan oluşur: aynı kökten kelimeler (kelime ailesi), eş ve zıt anlamlılar,
        karıştırılabilir kelimeler ve ortak etiketler. Bir kelimenin sayfasından aile üyesi ekle ya da kelimelerine etiket ver (iş, seyahat…); bağlar oluştukça ağ burada canlanır.
      </EmptyState>
    )
  }

  return (
    <div className="graph-wrap">
      <svg
        ref={svg}
        className="graph"
        viewBox={`${view.x} ${view.y} ${W / view.k} ${H / view.k}`}
        onMouseDown={(e) => (drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y })}
        onMouseMove={(e) => {
          if (!drag.current) return
          const r = svg.current!.getBoundingClientRect()
          const scale = W / view.k / r.width
          setView((v) => ({ ...v, x: drag.current!.vx - (e.clientX - drag.current!.x) * scale, y: drag.current!.vy - (e.clientY - drag.current!.y) * scale }))
        }}
        onMouseUp={() => (drag.current = null)}
        onMouseLeave={() => (drag.current = null)}
        role="img"
        aria-label="Kelime ağı"
      >
        {links.map((l, i) => {
          const s = l.source as Node
          const t = l.target as Node
          const dim = neighbours && !(neighbours.has(s.id) && neighbours.has(t.id))
          const hot = focus && (s.id === focus || t.id === focus)
          return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} className={`edge edge-${l.kind}${dim ? ' is-dim' : ''}${hot ? ' is-hot' : ''}`} />
        })}
        {nodes.map((n) => {
          // Zoomed out, only strong words and the lit neighbourhood keep their labels, so they don't pile up.
          const labelled = view.k >= 1.25 || n.stage >= 3 || neighbours?.has(n.id) || nodes.length <= 40
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              className={`node stage-${n.stage}${neighbours && !neighbours.has(n.id) ? ' is-dim' : ''}${n.id === selected ? ' is-selected' : ''}`}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => (n.id === selected ? onOpen(n.id) : setSelected(n.id))}
            >
              <circle r={radius(n.stage)} />
              {labelled && <text y={radius(n.stage) + 15}>{n.label}</text>}
            </g>
          )
        })}
      </svg>
      {picked && (
        <section className="card graph-pick" aria-live="polite">
          <div className="row justify-between items-center">
            <div>
              <strong className="graph-pick-word" lang={picked.language}>
                {displayForm(picked)}
              </strong>{' '}
              <span className="muted">{picked.senses[0].gloss}</span>
            </div>
            <div className="row gap-2">
              <button className="btn btn-sm" onClick={() => onOpen(picked.id)}>
                Kelimeyi aç
              </button>
              <button className="icon-btn" onClick={() => setSelected(null)} aria-label="Seçimi kaldır">
                <CloseIcon size={16} />
              </button>
            </div>
          </div>
          {pickedLinks.length > 0 && (
            <ul className="graph-pick-links">
              {pickedLinks.map((l) => (
                <li key={`${l.kind}-${l.node.id}`}>
                  <button className="chip chip-sm" onClick={() => setSelected(l.node.id)}>
                    <i className={`line edge-${l.kind}`} aria-hidden /> {l.node.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <div className="graph-legend small">
        <span>
          <i className="dot stage--1" /> Sırada
        </span>
        <span>
          <i className="dot stage-1" /> Öğreniliyor
        </span>
        <span>
          <i className="dot stage-3" /> {STAGE_NAME.strong}
        </span>
        <span>
          <i className="dot stage-5" /> {STAGE_NAME.mastered}
        </span>
        {kinds.map((k) => (
          <span key={k}>
            <i className={`line edge-${k}`} /> {LINK_LABEL[k]}
          </span>
        ))}
        <span className="muted">Tekerlek: yakınlaştır · sürükle: kaydır · tıkla: seç, bir daha tıkla: aç</span>
        <button className="link small" onClick={() => setView(fit)}>
          Sığdır
        </button>
      </div>
      {vocabulary.length > MAX_NODES && <p className="small muted">İlk {MAX_NODES} kelime gösteriliyor (öğrenilenler önce).</p>}
    </div>
  )
}

const radius = (stage: number) => 7 + Math.max(0, stage + 1) * 2.5
