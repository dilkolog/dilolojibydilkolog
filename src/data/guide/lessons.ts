import { EN_LESSONS } from './lessons-en'
import { EN_LESSONS_2 } from './lessons-en-2'
import { EN_LESSONS_3 } from './lessons-en-3'
import { EN_LESSONS_4 } from './lessons-en-4'
import { EN_LESSONS_5 } from './lessons-en-5'
import { ES_LESSONS } from './lessons-es'
import { ES_LESSONS_2 } from './lessons-es-2'
import { ES_LESSONS_3 } from './lessons-es-3'
import { ES_LESSONS_4 } from './lessons-es-4'
import { ES_LESSONS_5 } from './lessons-es-5'
import { FR_LESSONS } from './lessons-fr'
import { FR_LESSONS_2 } from './lessons-fr-2'
import { FR_LESSONS_3 } from './lessons-fr-3'
import { FR_LESSONS_4 } from './lessons-fr-4'
import { FR_LESSONS_5 } from './lessons-fr-5'
import { PRON_LESSONS } from './lessons-pron'
import type { TopicLesson } from './lessonTypes'

export type { GuideLevel, LessonCheck, LessonTable, TopicLesson } from './lessonTypes'

/** Every lesson of the guide, the basics first within each language's level. */
export const TOPIC_LESSONS: TopicLesson[] = [
  ...FR_LESSONS,
  ...FR_LESSONS_2,
  ...FR_LESSONS_3,
  ...FR_LESSONS_4,
  ...FR_LESSONS_5,
  ...ES_LESSONS,
  ...ES_LESSONS_2,
  ...ES_LESSONS_3,
  ...ES_LESSONS_4,
  ...ES_LESSONS_5,
  ...EN_LESSONS,
  ...EN_LESSONS_2,
  ...EN_LESSONS_3,
  ...EN_LESSONS_4,
  ...EN_LESSONS_5,
  ...PRON_LESSONS,
]
