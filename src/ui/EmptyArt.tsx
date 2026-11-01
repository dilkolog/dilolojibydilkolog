/**
 * Small illustrations for empty screens, drawn in the icon set's hand: 1.8px rounded lines over a
 * soft fill, in the language's colour, on a soft round ground. One picture per kind of emptiness.
 */
import emptyOffline from '../assets/art/empty-offline.webp'
import emptyRest from '../assets/art/empty-rest.webp'
import emptySearch from '../assets/art/empty-search.webp'
import emptyShelf from '../assets/art/empty-shelf.webp'
import sceneCardbox from '../assets/art/scene-cardbox.webp'
import sceneClean from '../assets/art/scene-clean.webp'
import sceneLabels from '../assets/art/scene-labels.webp'
import sceneTogether from '../assets/art/scene-together.webp'

export type ArtKind = 'garden' | 'library' | 'journal' | 'sentences' | 'clear' | 'search'

/**
 * The drawn pictures: a bookshelf waiting for its first word, a magnifier that found nothing, a cloud
 * that lost its plug, a calendar asleep; and Monki's scenes: a board swept clean (no mistakes left),
 * an empty card box (no sentences), tags pinned on a picture (labelling), two Monkis over one notebook.
 */
export type PictureKind = 'shelf' | 'nothing-found' | 'offline' | 'rest' | 'clean' | 'cardbox' | 'labels' | 'together'
const PICTURE: Record<PictureKind, string> = {
  shelf: emptyShelf,
  'nothing-found': emptySearch,
  offline: emptyOffline,
  rest: emptyRest,
  clean: sceneClean,
  cardbox: sceneCardbox,
  labels: sceneLabels,
  together: sceneTogether,
}

export function EmptyPicture({ kind }: { kind: PictureKind }) {
  return <img className="empty-picture" src={PICTURE[kind]} alt="" draggable={false} />
}

const Soft = ({ d }: { d: string }) => <path d={d} fill="var(--lang-soft)" stroke="none" />

export function EmptyArt({ kind }: { kind: ArtKind }) {
  return (
    <svg className="empty-illustration" width="112" height="96" viewBox="0 0 112 96" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <ellipse cx="56" cy="86" rx="40" ry="5" fill="var(--track)" stroke="none" opacity="0.7" />
      {ART[kind]}
      {/* Two small sparks, the same in every picture: something can start here. */}
      <path className="art-twinkle" d="M92 18v6M89 21h6" opacity="0.5" />
      <circle className="art-twinkle art-twinkle-late" cx="20" cy="30" r="1.6" fill="currentColor" stroke="none" opacity="0.45" />
    </svg>
  )
}

const ART: Record<ArtKind, React.ReactNode> = {
  // A pot with a seed just sprouting.
  garden: (
    <>
      <Soft d="M34 58h44l-5 26H39z" />
      <path d="M34 58h44l-5 26H39zM31 52h50v6H31z" />
      <path d="M56 52V38" />
      {/* The leaves sway from the stem; now and then a drop falls on the soil. */}
      <g className="art-sway">
        <Soft d="M56 42c0-7-5-11-13-11 0 7 5 11 13 11zM56 38c0-6.5 4.6-10.5 11.5-10.5 0 6.5-4.6 10.5-11.5 10.5z" />
        <path d="M56 42c0-7-5-11-13-11 0 7 5 11 13 11zM56 38c0-6.5 4.6-10.5 11.5-10.5 0 6.5-4.6 10.5-11.5 10.5z" />
      </g>
      <path className="art-drop" d="M80 12c-2 3-3.2 4.6-3.2 6.2a3.2 3.2 0 0 0 6.4 0c0-1.600-1.200-3.200-3.200-6.200z" fill="#38bdf8" stroke="none" />
    </>
  ),
  // An open book on a short stack.
  library: (
    <>
      <Soft d="M30 70h52v10H30zM34 62h44v8H34z" />
      <path d="M30 70h52v10H30zM34 62h44v8H34zM40 66h20M36 75h24" />
      <Soft d="M56 34c-6-4-14-5-22-3v26c8-2 16-1 22 3 6-4 14-5 22-3V31c-8-2-16-1-22 3z" />
      <path d="M56 34c-6-4-14-5-22-3v26c8-2 16-1 22 3 6-4 14-5 22-3V31c-8-2-16-1-22 3zM56 34v26M40 39h10M40 45h10M62 39h10M62 45h10" />
      {/* A butterfly drifts over the pages. */}
      <g className="art-fly" stroke="none">
        <ellipse className="art-wing art-wing-l" cx="82" cy="22" rx="3.4" ry="4.4" fill="var(--lang)" />
        <ellipse className="art-wing art-wing-r" cx="88" cy="22" rx="3.4" ry="4.4" fill="var(--lang)" />
        <rect x="84.3" y="18.6" width="1.4" height="7.4" rx="0.7" fill="currentColor" />
      </g>
    </>
  ),
  // A notebook with a pen across it.
  journal: (
    <>
      <Soft d="M36 22h36a4 4 0 0 1 4 4v52a4 4 0 0 1-4 4H36z" />
      <path d="M36 22h36a4 4 0 0 1 4 4v52a4 4 0 0 1-4 4H36zM36 22v60" />
      {/* The lines write themselves, one after the other. */}
      <path className="art-write" pathLength={1} d="M44 34h22" />
      <path className="art-write art-write-2" pathLength={1} d="M44 42h22" />
      <path className="art-write art-write-3" pathLength={1} d="M44 50h14" />
      <path d="M31 30h10M31 42h10M31 54h10M31 66h10" />
      <g className="art-pen">
        <path d="M64 72l18-18 5 5-18 18-7 2z" fill="var(--surface)" />
        <path d="M78 58l5 5" />
      </g>
    </>
  ),
  // Two speech bubbles: a sentence and its translation.
  sentences: (
    <>
      <g className="art-pop">
        <Soft d="M24 26h40a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H38l-9 7v-7h-5a5 5 0 0 1-5-5V31a5 5 0 0 1 5-5z" />
        <path d="M24 26h40a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H38l-9 7v-7h-5a5 5 0 0 1-5-5V31a5 5 0 0 1 5-5zM29 35h30M29 43h20" />
      </g>
      <g className="art-pop art-pop-late">
        <path d="M48 52h40a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5h-5v6l-8-6H48a5 5 0 0 1-5-5" fill="var(--surface)" />
        <path d="M53 63h30M53 70h18" opacity="0.7" />
      </g>
    </>
  ),
  // A flower in bloom with a tick: nothing left to fix.
  clear: (
    <>
      <path d="M50 84V54" />
      <Soft d="M50 66c-8 0-13-4-14-11 7-1 13 3 14 11z" />
      <path d="M50 66c-8 0-13-4-14-11 7-1 13 3 14 11z" />
      <g className="art-breathe">
        <Soft d="M50 22a7 7 0 0 1 7 7 7 7 0 0 1 9 10.5 7 7 0 0 1-3.5 13A7 7 0 0 1 50 58a7 7 0 0 1-12.5-5.5 7 7 0 0 1-3.5-13A7 7 0 0 1 43 29a7 7 0 0 1 7-7z" />
        <path d="M50 22a7 7 0 0 1 7 7 7 7 0 0 1 9 10.5 7 7 0 0 1-3.5 13A7 7 0 0 1 50 58a7 7 0 0 1-12.5-5.5 7 7 0 0 1-3.5-13A7 7 0 0 1 43 29a7 7 0 0 1 7-7z" />
        <circle cx="50" cy="40" r="5" fill="var(--gold)" stroke="none" />
      </g>
      <circle cx="78" cy="62" r="11" fill="var(--ok)" stroke="none" />
      <path d="m73 62 3.5 3.5L83 59" stroke="var(--on-color)" strokeWidth="2.4" />
    </>
  ),
  // A magnifier over an empty page.
  search: (
    <>
      <Soft d="M30 24h34l10 10v46H30z" />
      <path d="M30 24h34l10 10v46H30zM64 24v10h10M38 44h20M38 52h14" opacity="0.8" />
      <g className="art-scan">
        <circle cx="68" cy="60" r="12" fill="var(--surface)" />
        <path d="m77 69 10 10" strokeWidth="3" />
      </g>
    </>
  ),
}
