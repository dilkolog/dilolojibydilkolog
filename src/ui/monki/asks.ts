import type { VocabularyEntry } from '../../engine/types'
import { displayForm } from '../../engine/exercises'
import type { MonkiAsk } from './monkiBus'

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** On a word's page: what it means, how it is used, what it is mixed up with. */
export function wordAsk(entry: VocabularyEntry): MonkiAsk {
  const sense = entry.senses[0]
  const example = sense.examples.find((e) => e.text)?.text
  return {
    text: clip(
      `“${displayForm(entry)}” (${sense.gloss}) kelimesini anlatır mısın? Nasıl ve ne zaman kullanılır, hangi kelimelerle karışır, aynı aileden birkaç kelime var mı?${example ? ` Örnek: ${example}` : ''}`,
      600,
    ),
    send: true,
  }
}

/** After a miss: why it might have gone wrong and how to keep the right one. `forgot` = the learner asked to see the answer. */
export function missAsk(entry: VocabularyEntry, given: string | undefined, expected: string, forgot?: boolean): MonkiAsk {
  const word = `“${displayForm(entry)}” (${entry.senses[0].gloss})`
  return {
    text: clip(
      forgot
        ? `${word} kelimesini hatırlayamadım, doğrusu “${expected}”. Aklımda tutmam için bir ipucu ve kısa bir örnek verir misin?`
        : `${word} sorusunda yanlış yaptım${given ? `: “${given}” yazdım` : ''}, doğrusu “${expected}”. Neden karıştırmış olabilirim, nasıl hatırlarım?`,
      600,
    ),
    send: true,
  }
}

/** In the reader: the sentence and the word that was tapped. */
export function sentenceAsk(sentence: string, word: string): MonkiAsk {
  return {
    text: clip(`Bu cümleyi açıklar mısın: “${sentence}” Özellikle “${word}” burada ne anlama geliyor ve cümlenin dil bilgisi nasıl işliyor?`, 700),
    send: true,
  }
}
