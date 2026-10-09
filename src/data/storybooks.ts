import type { TargetLanguage } from '../engine/types'

/** An easy illustrated story read aloud (see storybooks/SOURCE.md; built by scripts/build-storybooks.ts). */
export interface Storybook {
  id: string
  language: 'fr' | 'es'
  title: string
  /** Global Storybooks level, 1 (a few words a page) to 5. */
  level: number
  words: number
  url: string
  audio: string
  credit: { writer?: string; illustrator?: string; translator?: string; reader?: string }
  license: { name: string; url: string }
  pages: string[]
  images: string[]
  turkish?: string[]
}

const LOADERS: Partial<Record<TargetLanguage, () => Promise<{ default: unknown }>>> = {
  fr: () => import('./storybooks/fr.json'),
  es: () => import('./storybooks/es.json'),
}

/** The language's stories (none for English), easiest first; loaded on first use. */
export async function loadStorybooks(language: TargetLanguage): Promise<Storybook[]> {
  const load = LOADERS[language]
  return load ? ((await load()).default as Storybook[]) : []
}

/** The credit line an open licence asks for. */
export function storyCredit(s: Storybook): string {
  const c = s.credit
  const who = [c.writer && `Yazan: ${c.writer}`, c.illustrator && `Çizen: ${c.illustrator}`, c.translator && `Çeviren: ${c.translator}`, c.reader && `Okuyan: ${c.reader}`].filter(Boolean)
  const version = s.license.url.match(/\/by\/(\d\.\d)/)?.[1]
  return `${who.join(' · ')} · Global Storybooks · ${version ? `CC BY ${version}` : s.license.name}`
}
