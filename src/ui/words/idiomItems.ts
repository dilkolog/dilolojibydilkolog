import type { Idiom } from '../../data/idioms'
import type { WordExtra } from '../../engine/types'
import type { KeyItem } from '../reading/keyWordsList'

/** The one list every idiom of the pack goes to. */
export const IDIOM_LIST = 'Deyimler'

/** An idiom as the card builder takes it: its form in the sentence (so the sentence can blank it out), its word-for-word image, and how and where it is said. */
export function idiomItems(idioms: readonly Idiom[]): KeyItem[] {
  return idioms.map((i) => {
    const extras: WordExtra[] = []
    if (i.pat) extras.push({ label: 'Kalıp', text: i.pat })
    if (i.eq) extras.push({ label: 'Türkçe deyim', text: i.eq })
    if (i.area && i.area !== 'genel') extras.push({ label: 'Nerede', text: i.area })
    return {
      word: i.form,
      lemma: i.w,
      turkish: i.t.split(/,\s*/).filter(Boolean),
      sentence: i.s,
      translation: i.tr,
      pos: 'phrase',
      level: i.level,
      literal: i.lit,
      register: i.reg,
      extras,
    }
  })
}
