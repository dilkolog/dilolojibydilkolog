import type { ComponentType } from 'react'
import {
  BookIcon, BoltIcon, EarIcon, GaugeIcon, HandIcon, MessageIcon, PuzzleIcon, ScaleIcon, TagIcon, BoxIcon, BrainIcon, BriefcaseIcon, CalendarIcon, CheckCircleIcon, FilmIcon, FlameIcon, FlowerIcon, GlobeIcon, HeadphonesIcon, HomeIcon,
  ImageIcon, KeyboardIcon, MicIcon, MountainIcon, PenIcon, SparkleIcon, SpeakerIcon, SproutIcon, StarIcon, StethoscopeIcon, SuitcaseIcon, SwordsIcon,
  TargetIcon, TrophyIcon, UtensilsIcon,
} from './icons'

type IconC = ComponentType<{ size?: number; className?: string; solid?: boolean }>

/**
 * The engine names quests, badges and scenes with an emoji (a short, readable key); the interface
 * draws them with the app's own icons. Unknown keys fall back to the emoji itself.
 */
const BY_EMOJI: Record<string, IconC> = {
  '✍': PenIcon, '🖋': PenIcon, '🎯': TargetIcon, '🔥': FlameIcon, '⌨': KeyboardIcon, '🌱': SproutIcon, '🎧': HeadphonesIcon, '🧠': BrainIcon,
  '⚔': SwordsIcon, '🐉': SwordsIcon, '📅': CalendarIcon, '🗓': CalendarIcon, '📖': BookIcon, '📚': BookIcon, '🏛': BookIcon, '⚡': BoltIcon, '🚀': BoltIcon,
  '⭐': StarIcon, '🌟': StarIcon, '🌍': GlobeIcon, '🌸': FlowerIcon, '🎙': MicIcon, '🏆': TrophyIcon, '🥇': TrophyIcon, '🥈': TrophyIcon, '🥉': TrophyIcon,
  '🖼': ImageIcon, '💯': CheckCircleIcon, '💎': SparkleIcon, '🌌': SparkleIcon, '🏔': MountainIcon, '🔊': SpeakerIcon,
  '👆': HandIcon, '💬': MessageIcon, '👂': EarIcon, '🧩': PuzzleIcon, '🏎': GaugeIcon, '🏷': TagIcon, '⚖': ScaleIcon,
  '🍽': UtensilsIcon, '🎬': FilmIcon, '🏠': HomeIcon, '💼': BriefcaseIcon, '📦': BoxIcon, '🧳': SuitcaseIcon, '🩺': StethoscopeIcon,
}

export const glyphFor = (emoji: string): IconC | undefined => BY_EMOJI[emoji.replace(/️/g, '')]

export function Glyph({ emoji, size = 20, className, solid }: { emoji: string; size?: number; className?: string; solid?: boolean }) {
  const C = glyphFor(emoji)
  return C ? <C size={size} className={className} solid={solid} /> : <span className={className} aria-hidden>{emoji}</span>
}
