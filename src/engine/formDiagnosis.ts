import { levenshtein, normalize, stripDiacritics } from './answerCheck'
import { answersFor, irregularForms, labTensesOf, type Tense } from './tenses'

/**
 * What kind of slip a wrong conjugation was, so practice can say where the trouble is (a pattern
 * of mixing up persons is a different problem from not knowing an irregular form) and the lab can
 * count them. Said by name, a mistake teaches more than the right answer alone.
 */
export type ErrorKind = 'person' | 'tense' | 'accent' | 'irregular' | 'typo' | 'other'

export const ERROR_TEXT: Record<ErrorKind, { name: string; hint: string }> = {
  person: { name: 'Kişi karıştırma', hint: 'Yazdığın biçim doğru ama başka bir kişiye ait.' },
  tense: { name: 'Zaman karıştırma', hint: 'Yazdığın biçim bu fiilin başka bir zamanına ait.' },
  accent: { name: 'Aksan', hint: 'Harfler doğru, aksan eksik ya da yanlış.' },
  irregular: { name: 'Düzensiz biçim', hint: 'Bu biçim kuralın dışında: kuralı uygulamak yetmez, kalıbı ya da biçimi bilmek gerekir.' },
  typo: { name: 'Yazım', hint: 'Biçim neredeyse doğru: bir iki harf farklı.' },
  other: { name: 'Diğer', hint: 'Yazdığın biçim bu fiilde yok.' },
}

type Verb = { language: 'fr' | 'es'; lemma: string; partOfSpeech: 'verb' }

const norm = (language: string, s: string) => normalize(s).toLocaleLowerCase(language)

/** Said of a wrong answer: the first reason that fits, from the most specific to the most general. */
export function diagnose(entry: Verb, tense: Tense, person: number, typed: string): ErrorKind {
  const language = entry.language
  const given = norm(language, typed)
  const expected = answersFor(entry, tense, person).map((a) => norm(language, a))
  // The right form for another person of the same tense.
  for (let p = 0; p < 6; p++) if (p !== person && answersFor(entry, tense, p).some((a) => norm(language, a) === given) && !expected.includes(given)) return 'person'
  // The right form in another tense of the verb.
  for (const t of labTensesOf(entry))
    if (t !== tense) for (let p = 0; p < 6; p++) if (answersFor(entry, t, p).some((a) => norm(language, a) === given) && !expected.includes(given)) return 'tense'
  const best = expected[0] ?? ''
  if (stripDiacritics(given) === stripDiacritics(best)) return 'accent'
  if (irregularForms(entry, tense)[person]) return levenshtein(given, best) <= 2 && given.length > 3 ? 'typo' : 'irregular'
  if (levenshtein(given, best) <= 2) return 'typo'
  return 'other'
}
