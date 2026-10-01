import type { VocabularyEntry } from '../types'

const base = { register: 'neutral' as const, tags: [], source: 'sample' as const, relations: [], wordFamily: [], collocations: [] }

export const decision: VocabularyEntry = {
  ...base,
  id: 'en:decision',
  language: 'en',
  lemma: 'decision',
  partOfSpeech: 'noun',
  cefr: 'B1',
  frequencyRank: 400,
  senses: [
    {
      id: 'en:decision#1',
      gloss: 'karar',
      examples: [
        { text: 'It was a difficult decision.', translation: 'Zor bir karardı.', form: 'decision' },
        { text: 'We need to make a decision today.', translation: 'Bugün bir karar vermemiz gerekiyor.', form: 'decision' },
      ],
    },
  ],
  collocations: [
    { phrase: 'make a decision', translation: 'karar vermek', wrongVariants: ['do a decision', 'take a decision'] },
    { phrase: 'final decision', translation: 'nihai karar' },
  ],
  wordFamily: [
    { lemma: 'decide', partOfSpeech: 'verb', gloss: 'karar vermek', morphology: 'decision ← decide + -sion', entryId: 'en:decide' },
    { lemma: 'decisive', partOfSpeech: 'adjective', gloss: 'kararlı, belirleyici' },
  ],
}

export const decide: VocabularyEntry = {
  ...base,
  id: 'en:decide',
  language: 'en',
  lemma: 'decide',
  partOfSpeech: 'verb',
  cefr: 'A2',
  frequencyRank: 300,
  senses: [{ id: 'en:decide#1', gloss: 'karar vermek', examples: [{ text: 'She decided to stay.', translation: 'Kalmaya karar verdi.', form: 'decided' }] }],
}

export const affect: VocabularyEntry = {
  ...base,
  id: 'en:affect',
  language: 'en',
  lemma: 'affect',
  partOfSpeech: 'verb',
  cefr: 'B1',
  frequencyRank: 600,
  relations: [{ type: 'confusable', targetId: 'en:effect' }],
  senses: [{ id: 'en:affect#1', gloss: 'etkilemek', examples: [{ text: 'The weather can affect your mood.', translation: 'Hava ruh halini etkileyebilir.', form: 'affect' }] }],
}

export const effect: VocabularyEntry = {
  ...base,
  id: 'en:effect',
  language: 'en',
  lemma: 'effect',
  partOfSpeech: 'noun',
  cefr: 'B1',
  frequencyRank: 550,
  senses: [{ id: 'en:effect#1', gloss: 'etki', examples: [{ text: 'It had a strong effect on me.', translation: 'Üzerimde güçlü bir etkisi oldu.', form: 'effect' }] }],
}

export const abandon: VocabularyEntry = {
  ...base,
  id: 'en:abandon',
  language: 'en',
  lemma: 'abandon',
  partOfSpeech: 'verb',
  cefr: 'B2',
  frequencyRank: 2500,
  relations: [{ type: 'synonym', targetId: 'en:leave' }],
  senses: [{ id: 'en:abandon#1', gloss: 'terk etmek', examples: [{ text: 'She abandoned the project after three months.', translation: 'Üç ay sonra projeyi bıraktı.', form: 'abandoned' }] }],
}

export const leave: VocabularyEntry = {
  ...base,
  id: 'en:leave',
  language: 'en',
  lemma: 'leave',
  partOfSpeech: 'verb',
  cefr: 'A1',
  frequencyRank: 150,
  senses: [{ id: 'en:leave#1', gloss: 'ayrılmak', examples: [{ text: 'I leave at six.', translation: 'Altıda çıkarım.', form: 'leave' }] }],
}

export const improve: VocabularyEntry = {
  ...base,
  id: 'en:improve',
  language: 'en',
  lemma: 'improve',
  partOfSpeech: 'verb',
  cefr: 'B1',
  frequencyRank: 700,
  senses: [{ id: 'en:improve#1', gloss: 'geliştirmek', examples: [{ text: 'I want to improve my French.', translation: 'Fransızcamı geliştirmek istiyorum.', form: 'improve' }] }],
}

export const laDecision: VocabularyEntry = {
  ...base,
  id: 'fr:décision',
  language: 'fr',
  lemma: 'décision',
  partOfSpeech: 'noun',
  gender: 'f',
  article: 'la',
  cefr: 'A2',
  frequencyRank: 500,
  senses: [{ id: 'fr:décision#1', gloss: 'karar', examples: [{ text: "C'est une décision difficile.", translation: 'Bu zor bir karar.', form: 'décision' }] }],
  collocations: [{ phrase: 'prendre une décision', translation: 'karar vermek', wrongVariants: ['faire une décision'] }],
}

export const lArbre: VocabularyEntry = {
  ...base,
  id: 'fr:arbre',
  language: 'fr',
  lemma: 'arbre',
  partOfSpeech: 'noun',
  gender: 'm',
  article: "l'",
  cefr: 'A1',
  frequencyRank: 900,
  senses: [{ id: 'fr:arbre#1', gloss: 'ağaç', examples: [{ text: "L'arbre est grand.", translation: 'Ağaç büyük.', form: 'arbre' }] }],
}

export const elAno: VocabularyEntry = {
  ...base,
  id: 'es:año',
  language: 'es',
  lemma: 'año',
  partOfSpeech: 'noun',
  gender: 'm',
  article: 'el',
  cefr: 'A1',
  frequencyRank: 80,
  senses: [{ id: 'es:año#1', gloss: 'yıl', examples: [{ text: 'Este año viajo mucho.', translation: 'Bu yıl çok seyahat ediyorum.', form: 'año' }] }],
}

export const EN_CATALOG = [decision, decide, affect, effect, abandon, leave, improve]
export const CATALOG = [...EN_CATALOG, laDecision, lArbre, elAno]
