import type { EngineOptions, ExerciseType } from './types'

/** What the learner wants of a question type: asked less often, or not at all (normal = no entry). */
export type ExercisePref = 'less' | 'off'
export type ExercisePrefs = Partial<Record<ExerciseType, ExercisePref>>

export interface PrefType {
  type: ExerciseType
  name: string
  /** One line of what it asks, with an example. */
  hint: string
  group: 'typed' | 'choice' | 'voice'
}

/**
 * The question types the learner can tune (Settings → Sorular). Left out: the meaning choice, what every
 * new word starts with, so a word can always be asked. Typing the word from its meaning can be switched
 * off too (its share otherwise is "Yazma oranı"): the recognition card then stands in for recall in
 * `unlockedSkills`, so the other skills still open; a word just stops growing past "Tanıdık".
 */
export const PREF_TYPES: PrefType[] = [
  { type: 'typed_translation', name: 'Anlamdan kelimeyi yaz', hint: 'Anlamı ya da tanımı görür, kelimeyi yazarsın. Kapatırsan kelimeler “Tanıdık” aşamasından öteye büyümez (yazarak hatırlama sayılmaz).', group: 'typed' },
  { type: 'cloze_typed', name: 'Cümlede boşluğu yaz', hint: 'Cümledeki eksik kelimeyi anlamından hatırlayıp yazarsın.', group: 'typed' },
  { type: 'word_form', name: 'Kelime biçimini yaz', hint: 'decide → decision gibi, kelimenin başka hâlini yazarsın.', group: 'typed' },
  { type: 'conjugation', name: 'Fiili çek', hint: 'Fiili özneye göre çekip yazarsın.', group: 'typed' },
  { type: 'listen_type', name: 'Duyduğun kelimeyi yaz', hint: 'Kelimeyi dinler, yazarsın.', group: 'typed' },
  { type: 'dictation', name: 'Duyduğun cümleyi yaz', hint: 'Bir örnek cümleyi dinler, tamamını yazarsın.', group: 'typed' },
  { type: 'mc_context', name: 'Cümlede boşluk (seçenekli)', hint: 'Boşluğa uyan kelimeyi dört seçenekten seçersin.', group: 'choice' },
  { type: 'discriminate', name: 'Karışan kelimeler', hint: 'Birbirine benzeyen kelimeler arasından cümleye uyanı seçersin.', group: 'choice' },
  { type: 'collocation_choice', name: 'Doğal eşdizim', hint: 'Hangi kelimeyle birlikte kullanıldığını seçersin (poser une question).', group: 'choice' },
  { type: 'idiom_complete', name: 'Deyimin eksik kelimesi', hint: 'Deyimde eksik olan kelimeyi seçersin.', group: 'choice' },
  { type: 'family_choice', name: 'Doğru eki seç', hint: 'Kelimenin doğru türevini seçersin (décision, décidement değil).', group: 'choice' },
  { type: 'aspect_choice', name: 'Hangi geçmiş zaman', hint: 'Cümlenin zaman ipucuna göre uygun geçmiş zamanı seçersin.', group: 'choice' },
  { type: 'article_choice', name: 'Artikeli seç', hint: 'İsmin le/la, el/la gibi artikelini seçersin.', group: 'choice' },
  { type: 'listen_choose', name: 'Duyduğun kelimenin anlamı', hint: 'Kelimeyi dinler, anlamını seçersin.', group: 'choice' },
  { type: 'picture_choice', name: 'Resimden kelime', hint: 'Resme bakıp kelimeyi seçersin.', group: 'choice' },
  { type: 'speak_word', name: 'Söyle', hint: 'Türkçesini görür, kelimeyi sesli söylersin.', group: 'voice' },
]

/** `typedBlanks: false` is how the first version of this setting (just the typed blank) was saved. */
export function effectivePrefs(prefs: ExercisePrefs | undefined, legacyTypedBlanks?: boolean): ExercisePrefs {
  const out: ExercisePrefs = { ...prefs }
  if (legacyTypedBlanks === false && !out.cloze_typed) out.cloze_typed = 'off'
  return out
}

/** The engine's options from the saved preferences. */
export function engineFlags(prefs: ExercisePrefs | undefined, legacyTypedBlanks?: boolean): Pick<EngineOptions, 'off' | 'less'> {
  const all = effectivePrefs(prefs, legacyTypedBlanks)
  const only = (want: ExercisePref) => {
    const list = (Object.keys(all) as ExerciseType[]).filter((t) => all[t] === want && PREF_TYPES.some((p) => p.type === t))
    return list.length ? list : undefined
  }
  return { off: only('off'), less: only('less') }
}

/** How much a type is asked next to the others when set to "less". */
export const LESS_WEIGHT = 0.3
