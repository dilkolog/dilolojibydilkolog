import type { TargetLanguage } from '../../engine/types'
import type { TopicLesson } from './lessonTypes'

/** One stretch of a lesson read aloud: Turkish (the explanations) or the language being learnt (the examples). */
export interface Utterance {
  lang: 'tr' | TargetLanguage
  text: string
}

/** The marks of light formatting a rule may carry: not read out. */
const plain = (s: string) => s.replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim()

/**
 * A lesson as it is read aloud: its name and summary, the rules, each example in its language then in Turkish, the
 * warnings and the tip, with a short Turkish heading before each part. In Turkish and the target language only, so that
 * each stretch gets the right voice.
 */
export function lessonScript(lesson: TopicLesson, title: string): Utterance[] {
  const out: Utterance[] = [{ lang: 'tr', text: plain(`${title}. ${lesson.summary}`) }]
  if (lesson.rules.length) out.push({ lang: 'tr', text: 'Kurallar.' }, ...lesson.rules.map((r) => ({ lang: 'tr' as const, text: plain(r) })))
  if (lesson.examples.length) out.push({ lang: 'tr', text: 'Örnekler.' }, ...lesson.examples.flatMap((x) => [{ lang: lesson.language, text: plain(x.text) }, { lang: 'tr' as const, text: plain(x.tr) }]))
  if (lesson.watch.length) out.push({ lang: 'tr', text: 'Dikkat.' }, ...lesson.watch.map((w) => ({ lang: 'tr' as const, text: plain(w) })))
  if (lesson.tip) out.push({ lang: 'tr', text: `İpucu. ${plain(lesson.tip)}` })
  return out.filter((u) => u.text)
}
