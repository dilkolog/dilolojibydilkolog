import { displayForm } from '../engine/exercises'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { sourceName, withArticle } from '../data/wiktionary'
import { LANGUAGE_SHORT } from './labels'
import { useCrossLinks, useEquivalents } from './useCrossLanguage'

/** Viewbox: narrow enough that a phone shows the labels near full size. */
const W = 360
const CX = W / 2
const CY = 180
const MAX_FAMILY = 6
const MAX_CHILDREN = 3

interface MapNode {
  key: string
  label: string
  x: number
  y: number
  /** In the learner's list: drawn solid and opens the word. */
  entryId?: string
  lang?: TargetLanguage
  from: { x: number; y: number }
  kind: 'family' | 'language' | 'child'
}

const short = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const at = (angle: number, r: number, from = { x: CX, y: CY }) => ({ x: from.x + r * Math.cos((angle * Math.PI) / 180), y: from.y + r * Math.sin((angle * Math.PI) / 180) })
/** `n` angles spread evenly between `a` and `b` (degrees; 0 = right, 90 = down). */
const spread = (n: number, a: number, b: number) => Array.from({ length: n }, (_, i) => (n === 1 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1)))

/**
 * The word's family on one picture: its relatives in this language above (solid: in your list,
 * dashed: suggested), the same word in the other languages below, and their relatives when those
 * are in your list too. A family learned together costs one stem and a few endings, and the other
 * languages usually share the stem (décider → décision · decide · decidir).
 */
export function WordFamilyMap({ entry, vocabulary, onOpen }: { entry: VocabularyEntry; vocabulary: VocabularyEntry[]; onOpen?: (entryId: string) => void }) {
  const eq = useEquivalents(entry)
  const links = useCrossLinks(entry)
  const known = new Set(vocabulary.map((v) => v.id))

  const family = [
    ...entry.wordFamily.map((m) => ({ label: m.lemma, entryId: m.entryId && known.has(m.entryId) ? m.entryId : undefined })),
    ...(entry.familyCandidates ?? []).filter((c) => !entry.wordFamily.some((m) => m.lemma.toLocaleLowerCase() === c.toLocaleLowerCase())).map((label) => ({ label, entryId: undefined })),
  ].slice(0, MAX_FAMILY)

  const others = eq && eq !== 'loading' ? eq.forms.filter((f) => f.language !== entry.language) : []
  const nodes: MapNode[] = []
  spread(family.length, 205, 335).forEach((angle, i) => nodes.push({ key: `f${i}`, ...family[i], ...at(angle, 125), from: { x: CX, y: CY }, kind: 'family' }))
  spread(others.length, others.length > 1 ? 125 : 90, 55).forEach((angle, i) => {
    const f = others[i]
    const linked = links.find((l) => l.entry.language === f.language)?.entry
    const p = at(angle, 100)
    nodes.push({ key: `l${f.language}`, label: withArticle(f.word, f.language, f.gender), lang: f.language, entryId: linked?.id, ...p, from: { x: CX, y: CY }, kind: 'language' })
    // That word's own family, when it is in the list too.
    const kids = (linked?.wordFamily ?? []).slice(0, MAX_CHILDREN)
    spread(kids.length, angle - 24, angle + 24).forEach((a, j) =>
      nodes.push({ key: `c${f.language}${j}`, label: kids[j].lemma, lang: f.language, entryId: kids[j].entryId, ...at(a, 95, p), from: p, kind: 'child' }),
    )
  })
  if (nodes.length < 2) return null
  // Framed to what is drawn (pills are about 30 wide per 4 letters), so no empty band is left.
  const half = (n: MapNode) => pillWidth(`${n.kind === 'language' ? 'EN ' : ''}${short(n.label)}`) / 2 + 4
  const xs = [CX - 60, CX + 60, ...nodes.flatMap((n) => [n.x - half(n), n.x + half(n)])]
  const ys = [CY - 20, CY + (eq && eq !== 'loading' && eq.shared ? 40 : 20), ...nodes.flatMap((n) => [n.y - 18, n.y + 18])]
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }

  return (
    <section className="section stack">
      <h2 className="section-title">Kelime ailesi haritası</h2>
      <p className="small muted">Üstte bu dildeki akrabaları, altta diğer dillerdeki karşılığı. Düz çizgili olanlar listende (bu dildekiler dokununca açılır), kesikli olanlar öneri.</p>
      <svg className="family-map" viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} role="group" aria-label={`${displayForm(entry)}: kelime ailesi ve diğer dillerdeki karşılıkları`}>
        {nodes.map((n) => (
          <line key={`e${n.key}`} x1={n.from.x} y1={n.from.y} x2={n.x} y2={n.y} className={`fm-edge fm-${n.kind}`} />
        ))}
        <g className="fm-node fm-center" transform={`translate(${CX} ${CY})`}>
          <Pill label={short(displayForm(entry), 20)} />
        </g>
        {eq && eq !== 'loading' && eq.shared && (
          <text className="fm-root" x={CX} y={CY + 30} textAnchor="middle">
            ortak kök: {sourceName(eq.shared.lang)} {eq.shared.word}
          </text>
        )}
        {nodes.map((n) => {
          // Only this language's words open here: the word page shows the active language's list.
          const open = n.entryId && onOpen && !n.lang ? () => onOpen(n.entryId!) : undefined
          return (
            <g
              key={n.key}
              className={`fm-node fm-${n.kind}${n.entryId ? ' is-known' : ' is-suggested'}`}
              transform={`translate(${n.x} ${n.y})`}
              role={open ? 'link' : undefined}
              tabIndex={open ? 0 : undefined}
              aria-label={open ? `${n.label} sayfasını aç` : undefined}
              onClick={open}
              onKeyDown={open ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open()) : undefined}
            >
              <Pill label={short(n.label)} tag={n.kind === 'language' && n.lang ? LANGUAGE_SHORT[n.lang] : undefined} />
            </g>
          )
        })}
      </svg>
    </section>
  )
}

/** A rounded label centred on the node; width estimated from the text (no layout pass). */
const pillWidth = (text: string) => Math.max(44, text.length * 7.4 + 18)

function Pill({ label, tag }: { label: string; tag?: string }) {
  const w = pillWidth(tag ? `${tag} ${label}` : label)
  return (
    <>
      <rect x={-w / 2} y={-14} width={w} height={28} rx={14} />
      <text textAnchor="middle" dy="0.35em">
        {tag && <tspan className="fm-tag">{tag} </tspan>}
        {label}
      </text>
    </>
  )
}
