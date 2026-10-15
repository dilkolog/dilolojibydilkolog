import type { TargetLanguage } from '../../engine/types'

export type GuideLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

/**
 * One lesson of the guide ("Rehber"), in Turkish for a Turkish speaker. `topic` is a grammar topic of
 * the questions (a key of TOPIC_NAME: the lesson then leads to them) or `basics_<lang>_<name>` for a
 * basic lesson without questions of its own.
 */
export interface TopicLesson {
  topic: string
  language: TargetLanguage
  title: string
  level: GuideLevel
  /** One or two sentences: what the topic is for. */
  summary: string
  /** The rules, each one short, in the order they are learnt. */
  rules: string[]
  /** Sentences in the target language with their Turkish. */
  examples: { text: string; tr: string }[]
  /** Where a Turkish speaker typically goes wrong. */
  watch: string[]
  tip?: string
  /**
   * A short check after the lesson (three questions with one right option each). A lesson whose topic
   * has grammar questions may leave it out: those are asked instead.
   */
  check?: LessonCheck[]
  /** The grammar topic whose questions practise this lesson, when its own `topic` has none. */
  practice?: string
}

/** One question of a lesson's check: the option at `answer` is the only right one. */
export interface LessonCheck {
  /** The question in Turkish, or a sentence in the target language with its gap as "___". */
  prompt: string
  /** Three or four options, each different. */
  options: string[]
  answer: number
  /** Why, in Turkish, in one sentence. */
  why: string
}
