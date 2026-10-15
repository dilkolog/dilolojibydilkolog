import { topicName, type GrammarExercise } from '../../engine/grammar'
import type { TargetLanguage } from '../../engine/types'
import { grammarExercises } from '../grammar'
import { TOPIC_LESSONS } from './lessons'
import type { TopicLesson } from './lessonTypes'

export const lessonsOf = (language: TargetLanguage): TopicLesson[] => TOPIC_LESSONS.filter((l) => l.language === language)

/** The lesson that teaches a grammar topic: its own lesson, or the one its questions practise. */
export function lessonFor(language: TargetLanguage, topic: string): TopicLesson | undefined {
  const own = lessonsOf(language)
  return own.find((l) => l.topic === topic) ?? own.find((l) => l.practice === topic)
}

/** A grammar topic's lesson is named as its questions name it; a basic lesson by its own title. */
export const lessonTitle = (l: TopicLesson): string => (l.topic.startsWith('basics_') ? l.title : topicName(l.topic) || l.title)

/** The grammar topic whose questions go with a lesson. */
export const practiceTopic = (l: TopicLesson): string => l.practice ?? l.topic

/** English has no verb lab: its tense lessons are lessons of the guide, in the order the tenses are learnt. */
const EN_TENSES = [
  'basics_en_present_simple',
  'basics_en_present_continuous',
  'basics_en_past_simple',
  'basics_en_past_continuous',
  'basics_en_used_to',
  'present_perfect',
  'basics_en_present_perfect_continuous',
  'basics_en_past_perfect',
  'basics_en_past_perfect_continuous',
  'basics_en_future',
  'basics_en_future_continuous',
  'basics_en_future_perfect',
  'basics_en_future_perfect_continuous',
]

export const englishTenseLessons = (): TopicLesson[] => EN_TENSES.map((t) => lessonFor('en', t)).filter((l): l is TopicLesson => !!l && l.language === 'en')

/** One question of a lesson's check, from the lesson itself or from the grammar questions of its topic. */
export interface CheckItem {
  prompt: string
  options: string[]
  answer: number
  why: string
}

const shuffle = <T,>(list: T[], rng: () => number): T[] => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/** The choice questions of a topic that make a fair check item (their options hold the answer once). */
function fromExercises(list: GrammarExercise[], topic: string, rng: () => number): CheckItem[] {
  return list
    .filter((e) => e.topic === topic && e.type === 'choice' && e.options && e.options.filter((o) => o === e.answer).length === 1)
    .map((e) => {
      const options = shuffle(e.options!, rng)
      return { prompt: e.prompt, options, answer: options.indexOf(e.answer), why: e.explanation }
    })
}

/** How many questions a check asks. */
export const CHECK_SIZE = 3

/**
 * The lesson's check: its own questions when it has them, else up to three of its topic's choice
 * questions picked at random; empty when there are fewer than two (no check, the lesson is just read).
 */
export function checkFor(lesson: TopicLesson, rng: () => number = Math.random, exercises?: GrammarExercise[]): CheckItem[] {
  const own = lesson.check?.map((c) => ({ prompt: c.prompt, options: c.options, answer: c.answer, why: c.why })) ?? []
  const pool = own.length ? own : fromExercises(exercises ?? grammarExercises(lesson.language), practiceTopic(lesson), rng)
  const picked = shuffle(pool, rng).slice(0, CHECK_SIZE)
  return picked.length >= 2 ? picked : []
}

/** The lessons of a language that have a check (only those come back for a review). */
export function checkableTopics(language: TargetLanguage): string[] {
  const exercises = grammarExercises(language)
  return lessonsOf(language)
    .filter((l) => checkFor(l, () => 0.5, exercises).length > 0)
    .map((l) => l.topic)
}
