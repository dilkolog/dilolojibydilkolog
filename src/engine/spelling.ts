import { splitArticle } from './answerCheck'
import { shuffle, type Rng } from './rng'
import type { TargetLanguage } from './types'

/**
 * Spelling aloud ("Comment ça s'écrit ?"): a word or a name is said letter by letter with the letters' own names (bé, o,
 * enne…), accents and doubled letters the way the language says them, and the learner types the word. Hotels, forms,
 * phone calls: spelling a name is a skill of its own, and the letters' names are not the sounds.
 */

const FR: Record<string, string> = {
  a: 'a', b: 'bé', c: 'cé', d: 'dé', e: 'e', f: 'effe', g: 'gé', h: 'ache', i: 'i', j: 'ji', k: 'ka', l: 'elle', m: 'emme', n: 'enne', o: 'o',
  p: 'pé', q: 'ku', r: 'erre', s: 'esse', t: 'té', u: 'u', v: 'vé', w: 'double vé', x: 'ixe', y: 'i grec', z: 'zède',
  é: 'e accent aigu', è: 'e accent grave', ê: 'e accent circonflexe', ë: 'e tréma', à: 'a accent grave', â: 'a accent circonflexe',
  î: 'i accent circonflexe', ï: 'i tréma', ô: 'o accent circonflexe', ù: 'u accent grave', û: 'u accent circonflexe', ç: 'cé cédille',
  '-': 'trait d’union', "'": 'apostrophe',
}
const ES: Record<string, string> = {
  a: 'a', b: 'be', c: 'ce', d: 'de', e: 'e', f: 'efe', g: 'ge', h: 'hache', i: 'i', j: 'jota', k: 'ka', l: 'ele', m: 'eme', n: 'ene', ñ: 'eñe',
  o: 'o', p: 'pe', q: 'cu', r: 'erre', s: 'ese', t: 'te', u: 'u', v: 'uve', w: 'uve doble', x: 'equis', y: 'i griega', z: 'zeta',
  á: 'a con tilde', é: 'e con tilde', í: 'i con tilde', ó: 'o con tilde', ú: 'u con tilde', ü: 'u con diéresis', '-': 'guion',
}
/** English letters written the way they sound, so a voice reads "bee" and not the word "b". */
const EN: Record<string, string> = {
  a: 'ay', b: 'bee', c: 'see', d: 'dee', e: 'ee', f: 'ef', g: 'gee', h: 'aitch', i: 'eye', j: 'jay', k: 'kay', l: 'el', m: 'em', n: 'en', o: 'oh',
  p: 'pee', q: 'cue', r: 'ar', s: 'ess', t: 'tee', u: 'you', v: 'vee', w: 'double you', x: 'ex', y: 'why', z: 'zed', '-': 'hyphen', "'": 'apostrophe',
}
const NAMES: Record<TargetLanguage, Record<string, string>> = { fr: FR, es: ES, en: EN }
/** How a doubled letter is said: "deux elle", "doble ele", "double el" (letter names take no plural). */
const DOUBLE: Record<TargetLanguage, (name: string) => string> = {
  fr: (n) => `deux ${n}`,
  es: (n) => `doble ${n}`,
  en: (n) => `double ${n}`,
}

/** Can every letter of the word be said? */
export const spellable = (language: TargetLanguage, word: string) => [...word.toLowerCase()].every((ch) => ch in NAMES[language])

/** The word said letter by letter, doubled letters as a pair: "bé, o, enne, ji, o, u, erre". */
export function spellOut(language: TargetLanguage, word: string): string {
  const letters = [...word.toLowerCase()]
  const out: string[] = []
  for (let i = 0; i < letters.length; i++) {
    const name = NAMES[language][letters[i]!]
    if (!name) continue
    if (letters[i + 1] === letters[i] && /\p{L}/u.test(letters[i]!)) {
      out.push(DOUBLE[language](name))
      i++
    } else out.push(name)
  }
  return out.join(', ')
}

/** Names, places and words people are asked to spell, with the letters the language's alphabet is tricky on. */
const BUILT_IN: Record<TargetLanguage, readonly string[]> = {
  fr: ['Dubois', 'Lefèvre', 'Girard', 'Rousseau', 'Mercier', 'Garnier', 'Chevalier', 'Bordeaux', 'Grenoble', 'Montpellier', 'Strasbourg', 'Nantes', 'Joséphine', 'Hélène', 'Yannick', 'Quentin', 'Wagner', 'Kévin', 'François', 'Zoé'],
  es: ['García', 'Rodríguez', 'Martínez', 'Sánchez', 'Jiménez', 'Muñoz', 'Vázquez', 'Guerrero', 'Valladolid', 'Zaragoza', 'Málaga', 'Bilbao', 'Cádiz', 'Ximena', 'Begoña', 'Joaquín', 'Yolanda', 'Wenceslao', 'Quintana', 'Hernández'],
  en: ['Smith', 'Johnson', 'Williams', 'Taylor', 'Wright', 'Hughes', 'Phillips', 'Murphy', 'Edinburgh', 'Leicester', 'Worcester', 'Norwich', 'Quentin', 'Yvonne', 'Zachary', 'Graham', 'Kathryn', 'Joseph', 'Vaughan', 'Gwen'],
}

export const SPELL_ROUND = 10

/**
 * A round: half the learner's own words (without the article, 3–10 letters, every letter sayable), half names and places;
 * fewer own words than that, more names.
 */
export function spellingRound(language: TargetLanguage, lemmas: readonly string[], rng: Rng, size = SPELL_ROUND): string[] {
  const own = shuffle(
    [...new Set(lemmas.map((l) => splitArticle(l.trim().normalize('NFC').replace(/^L'/, "l'"), language).rest.trim()))].filter((w) => w.length >= 3 && w.length <= 10 && !/\s/.test(w) && spellable(language, w)),
    rng,
  )
  const mine = own.slice(0, Math.ceil(size / 2))
  const names = shuffle(BUILT_IN[language], rng).filter((w) => !mine.some((m) => m.toLowerCase() === w.toLowerCase()))
  return shuffle([...mine, ...names].slice(0, size), rng)
}

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '')
/** Lower case as typed on any keyboard: curly apostrophes (iOS) and the Turkish İ/ı count as ' and i. */
const fold = (s: string) => s.normalize('NFC').replace(/[’`´]/g, "'").replace(/İ/g, 'I').replace(/ı/g, 'i').toLowerCase()

/** Right (letter for letter; capitals do not count), near (only an accent off), or wrong. */
export function checkSpelling(word: string, typed: string): 'right' | 'near' | 'wrong' {
  const a = fold(typed.trim())
  const b = fold(word)
  if (!a) return 'wrong'
  if (a === b) return 'right'
  return plain(a) === plain(b) ? 'near' : 'wrong'
}
