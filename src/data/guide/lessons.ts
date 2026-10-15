import { EN_LESSONS } from './lessons-en'
import { ES_LESSONS } from './lessons-es'
import { FR_LESSONS } from './lessons-fr'
import type { TopicLesson } from './lessonTypes'

export type { GuideLevel, TopicLesson } from './lessonTypes'

/** Every lesson of the guide, the basics first within each language's level. */
export const TOPIC_LESSONS: TopicLesson[] = [...FR_LESSONS, ...ES_LESSONS, ...EN_LESSONS]
