import type { TargetLanguage } from '../engine/types'

export interface MonologueSeed {
  id: string
  language: TargetLanguage
  prompt: string
  translation: string
  category: 'reflection' | 'creative' | 'routine' | 'observation'
}

export const MONOLOGUE_SEEDS: MonologueSeed[] = [
  // Fransızca
  {
    id: 'fr-smile',
    language: 'fr',
    prompt: "Aujourd'hui, qu'est-ce qui t'a fait sourire ? Imagine la scène en deux phrases simples.",
    translation: 'Bugün seni ne güldürdü? O anı iki basit Fransızca cümleyle zihninde canlandır.',
    category: 'reflection',
  },
  {
    id: 'fr-objects',
    language: 'fr',
    prompt: 'Regarde autour de toi : choisis trois objets et décris leur couleur et leur matière.',
    translation: 'Etrafına bak: üç nesne seç ve renkleri ile yapıldıkları maddeleri zihninde tarif et.',
    category: 'observation',
  },
  {
    id: 'fr-tomorrow',
    language: 'fr',
    prompt: 'Quelles sont les trois premières choses que tu feras demain matin ?',
    translation: 'Yarın sabah yapacağın ilk üç eylemi sırasıyla Fransızca düşün.',
    category: 'routine',
  },
  {
    id: 'fr-travel',
    language: 'fr',
    prompt: 'Si tu pouvais voyager n’importe où ce soir, où irais-tu et avec qui ?',
    translation: 'Bu akşam istediğin yere uçabilecek olsaydın nereye ve kiminle giderdin?',
    category: 'creative',
  },
  {
    id: 'fr-meal',
    language: 'fr',
    prompt: 'Quel est ton plat préféré ? Décris son goût, sa température et pourquoi tu l’aimes.',
    translation: 'En sevdiğin yemek nedir? Tadını, sıcaklığını ve neden sevdiğini tarif et.',
    category: 'reflection',
  },
  {
    id: 'fr-friend',
    language: 'fr',
    prompt: 'Pense à un ami cher et trouve deux qualités qui le définissent le mieux.',
    translation: 'Değer verdiğin bir arkadaşını düşün ve onu en iyi tanımlayan iki özelliği söyle.',
    category: 'reflection',
  },
  {
    id: 'fr-weather',
    language: 'fr',
    prompt: 'Comment est le temps aujourd’hui ? Quel vêtement est idéal pour sortir ?',
    translation: 'Bugün hava nasıl? Dışarı çıkmak için en uygun kıyafet hangisi?',
    category: 'observation',
  },

  // İspanyolca
  {
    id: 'es-smile',
    language: 'es',
    prompt: '¿Qué es lo más bonito que te ha pasado hoy? Descríbelo en dos frases en español.',
    translation: 'Bugün başına gelen en güzel şey neydi? İki İspanyolca cümleyle zihninde anlat.',
    category: 'reflection',
  },
  {
    id: 'es-objects',
    language: 'es',
    prompt: 'Mira a tu alrededor: nombra tres cosas que ves y di para qué sirven.',
    translation: 'Etrafına bak: gördüğün üç nesneyi adlandır ve ne işe yaradıklarını söyle.',
    category: 'observation',
  },
  {
    id: 'es-tomorrow',
    language: 'es',
    prompt: '¿Cuáles son las tres primeras cosas que vas a hacer mañana?',
    translation: 'Yarın yapacağın ilk üç işi İspanyolca olarak aklında sırala.',
    category: 'routine',
  },
  {
    id: 'es-superpower',
    language: 'es',
    prompt: 'Si pudieras tener un superpoder solo por hoy, ¿cuál elegirías y por qué?',
    translation: 'Yalnızca bugüne özel bir süper gücün olsaydı hangisini seçerdin ve neden?',
    category: 'creative',
  },
  {
    id: 'es-cafe',
    language: 'es',
    prompt: 'Imagina que pides un café y algo para comer en un restaurante en Madrid.',
    translation: 'Madrid’de bir kafede kahve ve atıştırmalık sipariş ettiğini hayal et.',
    category: 'routine',
  },
  {
    id: 'es-place',
    language: 'es',
    prompt: 'Piensa en tu lugar favorito en el mundo y describe cómo es.',
    translation: 'Dünyadaki en sevdiğin yeri düşün ve oranın nasıl bir yer olduğunu tarif et.',
    category: 'reflection',
  },
  {
    id: 'es-weather',
    language: 'es',
    prompt: '¿Qué tiempo hace hoy y qué sensaciones te produce?',
    translation: 'Bugün hava nasıl ve sana nasıl hissettiriyor?',
    category: 'observation',
  },

  // İngilizce
  {
    id: 'en-smile',
    language: 'en',
    prompt: 'What was the highlight of your day so far? Describe it in two simple sentences.',
    translation: 'Gününün şu ana kadarki en güzel anı neydi? İki basit cümleyle zihninde canlandır.',
    category: 'reflection',
  },
  {
    id: 'en-objects',
    language: 'en',
    prompt: 'Look around you: pick three objects and describe them using two adjectives each.',
    translation: 'Etrafındaki üç nesneyi seç ve her birini ikişer sıfatla İngilizce nitele.',
    category: 'observation',
  },
  {
    id: 'en-tomorrow',
    language: 'en',
    prompt: 'What are the three most important tasks on your to-do list for tomorrow?',
    translation: 'Yarın yapılacaklar listendeki en önemli üç maddeyi İngilizce sırala.',
    category: 'routine',
  },
  {
    id: 'en-dinner',
    language: 'en',
    prompt: 'If you could have dinner with any historical figure, who would it be and why?',
    translation: 'Tarihi bir figürle akşam yemeği yiyebilseydin kim olurdu ve neden?',
    category: 'creative',
  },
  {
    id: 'en-routine',
    language: 'en',
    prompt: 'Describe your morning routine from the moment you wake up until you leave home.',
    translation: 'Uyanışından evden çıkana kadar geçen sabah rutinini zihninde özetle.',
    category: 'routine',
  },
  {
    id: 'en-movie',
    language: 'en',
    prompt: 'Think of a movie or book you enjoyed recently. What made it memorable?',
    translation: 'Son zamanlarda sevdiğin bir film veya kitabı düşün. Onu özel kılan neydi?',
    category: 'reflection',
  },
  {
    id: 'en-hobby',
    language: 'en',
    prompt: 'Imagine explaining your favorite hobby to someone you just met.',
    translation: 'En sevdiğin hobini yeni tanıştığın birine İngilizce anlattığını hayal et.',
    category: 'creative',
  },
]

/** Returns deterministic daily seed for the given language and date. */
export function dailyMonologueSeed(language: TargetLanguage, date: Date = new Date()): MonologueSeed {
  const items = MONOLOGUE_SEEDS.filter((s) => s.language === language)
  if (items.length === 0) {
    throw new Error(`No monologue seeds found for language: ${language}`)
  }
  // Days since epoch
  const dayIndex = Math.floor(date.getTime() / (1000 * 60 * 60 * 24))
  return items[Math.abs(dayIndex) % items.length]
}
