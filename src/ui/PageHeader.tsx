import type { ReactNode } from 'react'
import actListen from '../assets/art/act-listen.webp'
import actLook from '../assets/art/act-look.webp'
import actRead from '../assets/art/act-read.webp'
import actSpeak from '../assets/art/act-speak.webp'
import actTime from '../assets/art/act-time.webp'
import actWrite from '../assets/art/act-write.webp'

/** Monki doing what the screen is for, beside its title (wide screens only). */
const ART = { listen: actListen, look: actLook, read: actRead, speak: actSpeak, time: actTime, write: actWrite }
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
