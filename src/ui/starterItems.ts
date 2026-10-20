import type { StarterList } from '../data/starterLists'
import { splitArticle } from '../engine/answerCheck'
import { formIn } from '../engine/inflection'
import type { TargetLanguage } from '../engine/types'
import type { KeyItem } from './keyWordsList'

/** A starter word as the card builder takes it: its form in the sentence, so the sentence can blank it out. */
export function starterItems(list: StarterList, language: TargetLanguage): KeyItem[] {
  return list.items.map((i) => {
    const bare = splitArticle(i.w.toLowerCase(), language).rest || i.w
    return {
      word: formIn(i.s, bare, language) ?? bare,
      lemma: i.w,
      turkish: i.t.split(/,\s*/).filter(Boolean),
      sentence: i.s,
      translation: i.tr,
      pos: i.p,
      gender: i.g,
    }
  })
}
