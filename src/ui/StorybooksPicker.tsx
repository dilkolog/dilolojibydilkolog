import { useEffect, useMemo, useState } from 'react'
import { loadStorybooks, type Storybook } from '../data/storybooks'
import { analyzeText, coverageLine } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { HeadphonesIcon } from './icons'
import { SourceTitle } from './SourceTitle'


/**
 * Easy illustrated stories read aloud (Global Storybooks, CC BY), French and Spanish: a picture and
 * a sentence or two a page, with the Turkish of every page. The gentlest start for reading and
 * listening together, before learner news or podcasts.
 */
export function StorybooksPicker({
  language,
  vocabulary,
  states,
  known,
  onRead,
}: {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  known: ReadonlySet<string>
  onRead: (story: Storybook) => void
}) {
  const [stories, setStories] = useState<Storybook[]>([])
  const [level, setLevel] = useState<number | 'all'>('all')
  useEffect(() => {
    let live = true
    void loadStorybooks(language).then((s) => live && setStories(s))
    return () => {
      live = false
    }
  }, [language])
  const levels = useMemo(() => [...new Set(stories.map((s) => s.level))].sort(), [stories])
  const rated = useMemo(
    () =>
      stories
        .filter((s) => level === 'all' || s.level === level)
        .map((s) => ({ s, cov: analyzeText(s.pages.join('\n'), language, vocabulary, states, known) })),
    [stories, level, language, vocabulary, states, known],
  )
  if (!stories.length) return null

  return (
    <section className="section stack">
      <SourceTitle kind="storybook">Kolay resimli hikâyeler</SourceTitle>
      <p className="small muted">Her sayfada bir resim ve bir iki cümle; seslendirilmiş ve her sayfanın Türkçesi hazır. Yeni başlayanlar için.</p>
      <div className="choice-row" role="group" aria-label="Hikâye seviyesi">
        <button type="button" className="chip chip-sm" aria-pressed={level === 'all'} onClick={() => setLevel('all')}>
          Tümü ({stories.length})
        </button>
        {levels.map((l) => (
          <button key={l} type="button" className="chip chip-sm" aria-pressed={level === l} onClick={() => setLevel(l)}>
            Seviye {l}
          </button>
        ))}
      </div>
      <ul className="library">
        {rated.map(({ s, cov }) => (
          <li key={s.id}>
            <button type="button" className="word-link library-open" onClick={() => onRead(s)}>
              <div className="row justify-between items-baseline gap-2">
                <strong lang={language}>{s.title}</strong>
                <span className="badge badge-sm">Seviye {s.level}</span>
              </div>
              <span className="small muted">
                <HeadphonesIcon size={14} className="inline-icon" /> {s.pages.length} sayfa · {s.words} kelime · {coverageLine(cov)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
