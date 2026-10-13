import type { ReactNode } from 'react'
import storybook from '../assets/art/src-storybook.webp'
import news from '../assets/art/src-news.webp'
import audiobook from '../assets/art/src-audiobook.webp'
import classic from '../assets/art/src-classic.webp'
import wiki from '../assets/art/src-wiki.webp'
import podcast from '../assets/art/src-podcast.webp'

const SOURCE_ART = { storybook, news, audiobook, classic, wiki, podcast }
export type SourceKind = keyof typeof SOURCE_ART

/** A reading source's heading with its small drawn cover beside it (decorative: the title says it). */
export function SourceTitle({ kind, children }: { kind: SourceKind; children: ReactNode }) {
  return (
    <h2 className="section-title source-title">
      <img className="source-art" src={SOURCE_ART[kind]} alt="" width={36} height={36} draggable={false} />
      <span>{children}</span>
    </h2>
  )
}
