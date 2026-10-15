import type { ReactNode } from 'react'
import actListen from '../assets/art/act-listen.webp'
import actLook from '../assets/art/act-look.webp'
import actRead from '../assets/art/act-read.webp'
import actSpeak from '../assets/art/act-speak.webp'
import actTime from '../assets/art/act-time.webp'
import actWrite from '../assets/art/act-write.webp'
import headDictionary from '../assets/art/head-dictionary.webp'
import headGames from '../assets/art/head-games.webp'
import headProduce from '../assets/art/head-produce.webp'
import headSentences from '../assets/art/head-sentences.webp'
import headSettings from '../assets/art/head-settings.webp'
import headStory from '../assets/art/head-story.webp'
import headTranslate from '../assets/art/head-translate.webp'
import headWords from '../assets/art/head-words.webp'
import headMistakes from '../assets/art/head-mistakes.webp'
import headEarmiss from '../assets/art/head-earmiss.webp'
import headBack from '../assets/art/head-back.webp'
import headExam from '../assets/art/head-exam.webp'
import headVocabtest from '../assets/art/head-vocabtest.webp'

/** Monki doing what the screen is for, beside its title (wide screens only). */
const ART = {
  listen: actListen,
  look: actLook,
  read: actRead,
  speak: actSpeak,
  time: actTime,
  write: actWrite,
  words: headWords,
  games: headGames,
  settings: headSettings,
  dictionary: headDictionary,
  translate: headTranslate,
  produce: headProduce,
  story: headStory,
  sentences: headSentences,
  mistakes: headMistakes,
  earmiss: headEarmiss,
  back: headBack,
  exam: headExam,
  vocabtest: headVocabtest,
}
export type HeaderArt = keyof typeof ART

/**
 * The top of every main screen, in one pattern: its name, one line on what it is for, and its main
 * action on the right (on phones, below).
 */
/** `inline`: the action stays beside the title even on a phone (a small button, not a wide one). `art`: Monki at work beside the title. */
export function PageHeader({ title, sub, action, inline = false, art }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; inline?: boolean; art?: HeaderArt }) {
  return (
    <header className={`page-header${inline ? ' is-inline' : ''}${art ? ' has-art' : ''}`}>
      {art && <img className="page-header-art" src={ART[art]} alt="" draggable={false} />}
      <div className="page-header-text">
        <h1 className="greeting">{title}</h1>
        {sub && <p className="greeting-sub">{sub}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  )
}
