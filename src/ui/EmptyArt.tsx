/**
 * Small illustrations for empty screens, drawn in the icon set's hand: 1.8px rounded lines over a
 * soft fill, in the language's colour, on a soft round ground. One picture per kind of emptiness.
 */
export type ArtKind = 'garden' | 'library' | 'journal' | 'sentences' | 'clear' | 'search'

const Soft = ({ d }: { d: string }) => <path d={d} fill="var(--lang-soft)" stroke="none" />

export function EmptyArt({ kind }: { kind: ArtKind }) {
  return (
    <svg className="empty-illustration" width="112" height="96" viewBox="0 0 112 96" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <ellipse cx="56" cy="86" rx="40" ry="5" fill="var(--track)" stroke="none" opacity="0.7" />
      {ART[kind]}
      {/* Two small sparks, the same in every picture: something can start here. */}
      <path d="M92 18v6M89 21h6" opacity="0.5" />
      <circle cx="20" cy="30" r="1.6" fill="currentColor" stroke="none" opacity="0.45" />
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
      <Soft d="M56 42c0-7-5-11-13-11 0 7 5 11 13 11zM56 38c0-6.5 4.6-10.5 11.5-10.5 0 6.5-4.6 10.5-11.5 10.5z" />
      <path d="M56 42c0-7-5-11-13-11 0 7 5 11 13 11zM56 38c0-6.5 4.6-10.5 11.5-10.5 0 6.5-4.6 10.5-11.5 10.5z" />
    </>
  ),
  // An open book on a short stack.
  library: (
    <>
      <Soft d="M30 70h52v10H30zM34 62h44v8H34z" />
      <path d="M30 70h52v10H30zM34 62h44v8H34zM40 66h20M36 75h24" />
      <Soft d="M56 34c-6-4-14-5-22-3v26c8-2 16-1 22 3 6-4 14-5 22-3V31c-8-2-16-1-22 3z" />
      <path d="M56 34c-6-4-14-5-22-3v26c8-2 16-1 22 3 6-4 14-5 22-3V31c-8-2-16-1-22 3zM56 34v26M40 39h10M40 45h10M62 39h10M62 45h10" />
    </>
  ),
  // A notebook with a pen across it.
  journal: (
    <>
      <Soft d="M36 22h36a4 4 0 0 1 4 4v52a4 4 0 0 1-4 4H36z" />
      <path d="M36 22h36a4 4 0 0 1 4 4v52a4 4 0 0 1-4 4H36zM36 22v60M44 34h22M44 42h22M44 50h14" />
      <path d="M31 30h10M31 42h10M31 54h10M31 66h10" />
      <path d="M64 72l18-18 5 5-18 18-7 2z" fill="var(--surface)" />
      <path d="M78 58l5 5" />
    </>
  ),
  // Two speech bubbles: a sentence and its translation.
  sentences: (
    <>
      <Soft d="M24 26h40a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H38l-9 7v-7h-5a5 5 0 0 1-5-5V31a5 5 0 0 1 5-5z" />
      <path d="M24 26h40a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H38l-9 7v-7h-5a5 5 0 0 1-5-5V31a5 5 0 0 1 5-5zM29 35h30M29 43h20" />
      <path d="M48 52h40a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5h-5v6l-8-6H48a5 5 0 0 1-5-5" fill="var(--surface)" />
      <path d="M53 63h30M53 70h18" opacity="0.7" />
    </>
  ),
  // A flower in bloom with a tick: nothing left to fix.
  clear: (
    <>
      <path d="M50 84V54" />
      <Soft d="M50 66c-8 0-13-4-14-11 7-1 13 3 14 11z" />
      <path d="M50 66c-8 0-13-4-14-11 7-1 13 3 14 11z" />
      <Soft d="M50 22a7 7 0 0 1 7 7 7 7 0 0 1 9 10.5 7 7 0 0 1-3.5 13A7 7 0 0 1 50 58a7 7 0 0 1-12.5-5.5 7 7 0 0 1-3.5-13A7 7 0 0 1 43 29a7 7 0 0 1 7-7z" />
      <path d="M50 22a7 7 0 0 1 7 7 7 7 0 0 1 9 10.5 7 7 0 0 1-3.5 13A7 7 0 0 1 50 58a7 7 0 0 1-12.5-5.5 7 7 0 0 1-3.5-13A7 7 0 0 1 43 29a7 7 0 0 1 7-7z" />
      <circle cx="50" cy="40" r="5" fill="var(--gold)" stroke="none" />
      <circle cx="78" cy="62" r="11" fill="var(--ok)" stroke="none" />
      <path d="m73 62 3.5 3.5L83 59" stroke="var(--on-color)" strokeWidth="2.4" />
    </>
  ),
  // A magnifier over an empty page.
  search: (
    <>
      <Soft d="M30 24h34l10 10v46H30z" />
      <path d="M30 24h34l10 10v46H30zM64 24v10h10M38 44h20M38 52h14" opacity="0.8" />
      <circle cx="68" cy="60" r="12" fill="var(--surface)" />
      <path d="m77 69 10 10" strokeWidth="3" />
    </>
  ),
}
