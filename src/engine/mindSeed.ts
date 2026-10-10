import type { TargetLanguage } from './types'

/**
 * "Mind seeds": a small prompt a day to think (or say) in the language being learned, away from
 * the screen: describe what is around you, say what you will do tomorrow. Language lives in the
 * head, not only in the exercises. `{dil}` is the language's name in Turkish.
 */
export const MIND_SEEDS = [
  'Bugün seni en çok ne güldürdü? İki cümleyle {dil} anlat.',
  'Yarın yapacağın ilk üç işi {dil} sırala.',
  'Şu an odanda gördüğün üç nesneyi, sıfatlarıyla birlikte {dil} tarif et.',
  'Bugün ne yedin? Tadı nasıldı? Bir iki cümleyle {dil} söyle.',
  'Dışarıya bak: hava nasıl? İki cümleyle {dil} anlat.',
  'Bugün kiminle konuştun, ne hakkında? {dil} özetle.',
  'Şu an ne hissediyorsun? Nedenini de ekleyerek {dil} söyle.',
  'Hafta sonu için bir plan yap ve üç cümleyle {dil} anlat.',
  'Bugün yaptığın en zor şeyi {dil} anlat.',
  'En sevdiğin yemeğin tarifini iki üç cümleyle {dil} ver.',
  'Bugün yolda gördüğün bir şeyi {dil} tarif et.',
  'Bir arkadaşına bugün olanları {dil} anlatıyormuş gibi düşün.',
  'Yarın hava çok güzel olsa ne yapardın? "Eğer" ile başlayan bir cümleyi {dil} kur.',
  'Bugün öğrendiğin bir kelimeyi bir cümlenin içinde {dil} kullan.',
  'Sabah rutinini {dil} sırala: önce, sonra, en sonunda.',
  'Şu an yapmak istediğin bir şeyi ve nedenini {dil} söyle.',
  'Telefonundaki son fotoğrafı {dil} tarif et.',
  'Birine {dil} yol tarif et: evinden en yakın markete nasıl gidilir?',
  'Bugün canını sıkan küçük bir şeyi {dil} anlat, sonra bir çözüm öner.',
  'Geçen hafta sonu ne yaptığını geçmiş zamanda {dil} anlat.',
  'Bir yıl sonra nerede olmak istiyorsun? {dil} söyle.',
  'Şu an duyduğun sesleri {dil} say.',
  'En sevdiğin şarkıyı ya da filmi birkaç cümleyle {dil} tanıt.',
  'Bugün bir şey satın aldıysan ne aldığını ve ne kadar tuttuğunu {dil} söyle.',
  'Kendini üç cümleyle {dil} tanıt: adın, işin, sevdiğin bir şey.',
  'Bugün şikâyet ettiğin bir şeyi nazik bir dille {dil} söyle.',
  'Bir arkadaşını yarın akşam yemeğe davet et: mesajı zihninde {dil} yaz.',
  'Ailenden birini iki üç cümleyle {dil} anlat.',
  'Bugün için üç şükür sebebini {dil} sırala.',
  'Dünkü günü tek cümleyle {dil} özetle.',
] as const

const NAME: Record<TargetLanguage, string> = { en: 'İngilizce', fr: 'Fransızca', es: 'İspanyolca' }

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** Index of the day's seed: the same all day, a new one each day (no repeat for as many days as there are seeds), another order per language; `skip` asks for another. */
export function seedIndex(day: string, language: TargetLanguage, skip = 0) {
  const [y, m, d] = day.split('-').map(Number)
  const days = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
  return (((days + hash(language) + skip) % MIND_SEEDS.length) + MIND_SEEDS.length) % MIND_SEEDS.length
}

/** The prompt with the language filled in. */
export const seedText = (index: number, language: TargetLanguage) => MIND_SEEDS[((index % MIND_SEEDS.length) + MIND_SEEDS.length) % MIND_SEEDS.length].replace('{dil}', NAME[language])
