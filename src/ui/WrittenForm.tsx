import { genderOfArticle } from '../engine/answerCheck'
import type { VocabularyEntry } from '../engine/types'

const GENDER_NAME = { m: 'eril', f: 'dişil' } as const

/** The article, tinted by the gender it shows (masculine / feminine); l' and les stay neutral. The title says it in words too. */
export function ArticleTag({ article, entry }: { article: string; entry: Pick<VocabularyEntry, 'language' | 'gender'> }) {
  const g = genderOfArticle(article, entry.language) ?? (entry.gender === 'm' || entry.gender === 'f' ? entry.gender : undefined)
  return (
    <span className={`article${g ? ` gender-${g}` : ''}`} title={g ? GENDER_NAME[g] : undefined}>
      {article}
    </span>
  )
}

/** The word's written form with a gender-tinted article (inline, for lists and headings). */
export function WrittenForm({ entry }: { entry: VocabularyEntry }) {
  if (!entry.article) return <>{entry.lemma}</>
  return (
    <>
      <ArticleTag article={entry.article} entry={entry} />
      {entry.article.endsWith("'") ? '' : ' '}
      {entry.lemma}
    </>
  )
}
