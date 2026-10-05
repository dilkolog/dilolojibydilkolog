import type { PlanReason } from '../engine/dailyPlan'
import type { MasteryStage } from '../engine/mastery'
import type { ErrorType, PartOfSpeech, Skill, TargetLanguage } from '../engine/types'

export const LANGUAGE_NAME: Record<TargetLanguage, string> = { en: 'İngilizce', fr: 'Fransızca', es: 'İspanyolca' }
export const LANGUAGE_SHORT: Record<TargetLanguage, string> = { en: 'EN', fr: 'FR', es: 'ES' }
export const SPEECH_LANG: Record<TargetLanguage, string> = { en: 'en-US', fr: 'fr-FR', es: 'es-ES' }

export const SKILL_NAME: Record<Skill, string> = {
  recognition: 'Tanıma',
  recall: 'Hatırlama',
  production: 'Üretme',
  listening: 'Dinleme',
  collocation: 'Kalıplar',
  gender: 'Artikel',
}

export const STAGE_NAME: Record<MasteryStage, string> = {
  introduced: 'Yeni tanıştı',
  familiar: 'Tanıdık',
  recallable: 'Hatırlanıyor',
  strong: 'Sağlam',
  production_ready: 'Kullanılabiliyor',
  mastered: 'Oturdu',
}

export const REASON_TEXT: Record<PlanReason, (n: number) => string> = {
  forgotten: (n) => `${n} unutulmaya yüz tutmuş kelime`,
  mistake: (n) => `${n} kelimede yaptığın hatalar`,
  weak: (n) => `${n} zayıf kelime`,
  due: (n) => `${n} tekrar zamanı gelen kelime`,
  new: (n) => `${n} yeni kelime`,
  practice: (n) => `${n} serbest pratik sorusu`,
}

export const ERROR_NAME: Record<ErrorType, string> = {
  meaning: 'Anlam',
  accent: 'Aksan',
  typo: 'Yazım',
  article: 'Artikel eksik',
  gender: 'Cinsiyet (artikel)',
  form: 'Kelime biçimi',
  confusion: 'Karıştırılan kelime',
  collocation: 'Kalıp (collocation)',
  false_friend: 'Sahte dost',
  cross_language: 'Diller arası karışma',
}

/** Shown after a near miss / error, explaining what was off rather than just "wrong". */
export const ERROR_HINT: Record<ErrorType, string> = {
  meaning: '',
  accent: 'Aksan işaretleri eksik ya da yanlış.',
  typo: 'Küçük bir yazım hatası var.',
  article: 'Artikeliyle birlikte öğren.',
  gender: 'Artikel yanlış: kelimenin cinsiyetine dikkat.',
  form: 'Doğru kelime ailesi, ama başka bir biçim gerekiyor.',
  confusion: 'Bu, sık karıştırılan diğer kelime.',
  collocation: 'Bu kalıp bu dilde doğal değil.',
  false_friend: 'Sahte dost: başka bir dildeki benzer kelimenin anlamını verdin.',
  cross_language: 'Başka bir dilindeki kelimeyle cevap verdin.',
}

export const POS_NAME: Record<PartOfSpeech, string> = {
  noun: 'isim',
  verb: 'fiil',
  adjective: 'sıfat',
  adverb: 'zarf',
  preposition: 'edat',
  conjunction: 'bağlaç',
  pronoun: 'zamir',
  phrase: 'deyim / kalıp',
  other: 'diğer',
}

export const PROMPT_TEXT: Record<string, string> = {
  mc_meaning: 'Anlamı ne?',
  listen_choose: 'Duyduğun kelimenin anlamı ne?',
  mc_context: 'Boşluğa hangisi gelir?',
  discriminate: 'Hangisi doğru?',
  collocation_choice: 'Doğal olan hangisi?',
  cloze_typed: 'Boşluğu doğru biçimle doldur',
  word_form: 'Bu biçimi yaz',
  listen_type: 'Duyduğunu yaz',
  free_sentence: 'Kendi cümleni kur',
  picture_choice: 'Bu resim hangi kelime?',
  dictation: 'Duyduğun cümleyi yaz',
  speak_word: 'Söyle: hedef dildeki karşılığı',
  article_choice: 'Artikeli hangisi?',
  conjugation: 'Fiili çek',
  idiom_complete: 'Eksik kelime hangisi?',
  family_choice: 'Doğru eki seç',
  back_translation: 'Bu cümleyi çevir',
  aspect_choice: 'Hangi geçmiş zaman uyar?',
}

/** "-tion ile biten isimler dişildir (la)" / "İstisna: …" for a gender rule match. */
export function genderRuleText(match: { rule: { suffix: string; gender: 'm' | 'f'; language: 'fr' | 'es' }; exception: boolean }, word: string): string {
  const { suffix, gender, language } = match.rule
  const art = gender === 'f' ? 'la' : language === 'fr' ? 'le' : 'el'
  const name = gender === 'f' ? 'dişil' : 'eril'
  return match.exception
    ? `İstisna: -${suffix} ile biten isimler genelde ${name} (${art}), ama "${word}" değil.`
    : `Kural: -${suffix} ile biten isimler ${name}dir (${art}).`
}
