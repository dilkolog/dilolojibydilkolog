import type { TargetLanguage } from '../../engine/types'

/**
 * The guide's shelf of places outside the app ("Rehber" → Dış kaynaklar): where to practise grammar,
 * listen, read, look words up and prepare for an exam. Links only: these sites keep their own rights
 * (docs/kaynaklar/gramer-alistirmalari.md sorts open-licensed from all-rights-reserved). Free to use
 * unless `paid` says otherwise.
 */
export type ResourceKind = 'grammar' | 'listening' | 'reading' | 'dictionary' | 'pronunciation' | 'exam'

export interface GuideResource {
  name: string
  url: string
  kind: ResourceKind
  /** One line in Turkish: what is there and how to use it. */
  note: string
  /** The levels it suits best. */
  levels: string
  /** Open licence (its exercises may one day come into the app). */
  open?: boolean
  /** Part of it is behind a subscription. */
  paid?: boolean
}

export const KIND_NAME: Record<ResourceKind, string> = {
  grammar: 'Dilbilgisi alıştırmaları',
  listening: 'Dinleme',
  reading: 'Okuma',
  dictionary: 'Sözlükler',
  pronunciation: 'Telaffuz',
  exam: 'Sınavlar',
}

export const KIND_ORDER: ResourceKind[] = ['grammar', 'listening', 'reading', 'dictionary', 'pronunciation', 'exam']

export const RESOURCES: Record<TargetLanguage, GuideResource[]> = {
  fr: [
    { name: "Tex's French Grammar", url: 'https://www.laits.utexas.edu/tex/', kind: 'grammar', note: 'Teksas Üniversitesi’nin kural anlatımları; her konunun sonunda kendini puanlayan alıştırmalar.', levels: 'A1–C1', open: true },
    { name: 'Français inclusif', url: 'https://pressbooks.pub/francaisinclusif/', kind: 'grammar', note: 'Açık lisanslı ders kitabı: yüzlerce etkileşimli boşluk doldurma ve sürükle-bırak alıştırması.', levels: 'A1–B2', open: true },
    { name: 'Lawless French', url: 'https://www.lawlessfrench.com/', kind: 'grammar', note: 'Konu konu kısa anlatımlar ve testler; aradığın kuralı hızla bulmak için.', levels: 'A1–C1' },
    { name: 'TV5Monde Apprendre', url: 'https://apprendre.tv5monde.com/', kind: 'listening', note: 'Seviyeye göre kısa videolar ve hemen ardından anlama alıştırmaları.', levels: 'A1–C1' },
    { name: 'RFI Français facile', url: 'https://francaisfacile.rfi.fr/', kind: 'listening', note: 'Yavaş okunan günlük haberler ve metinleri; Diloloji’de “Sana göre haberler”de de var.', levels: 'A2–B2' },
    { name: 'Podcast Français Facile', url: 'https://www.podcastfrancaisfacile.com/', kind: 'listening', note: 'Gündelik diyaloglar, dikteler ve dinleme testleri.', levels: 'A1–B2' },
    { name: 'Global Storybooks', url: 'https://globalstorybooks.net/', kind: 'reading', note: 'Resimli kısa hikâyeler ve sesleri; Okuma → “Kolay resimli hikâyeler”in kaynağı.', levels: 'A1–A2', open: true },
    { name: '1jour1actu', url: 'https://www.1jour1actu.com/', kind: 'reading', note: 'Çocuklar için yazılmış güncel haberler: sade cümleler, gerçek konular.', levels: 'A2–B1' },
    { name: 'WordReference', url: 'https://www.wordreference.com/fren/', kind: 'dictionary', note: 'Fransızca–İngilizce sözlük ve forumlar; kalıplar ve deyimler için çok iyi.', levels: 'Her seviye' },
    { name: 'Larousse', url: 'https://www.larousse.fr/dictionnaires/francais', kind: 'dictionary', note: 'Tek dilli sözlük: tanımlar, eş anlamlılar ve çekim tabloları.', levels: 'B1+' },
    { name: 'Forvo', url: 'https://forvo.com/languages/fr/', kind: 'pronunciation', note: 'Ana dili Fransızca olanların seslendirdiği kelimeler.', levels: 'Her seviye' },
    { name: 'YouGlish', url: 'https://youglish.com/french', kind: 'pronunciation', note: 'Bir kelimeyi gerçek videolarda, cümle içinde dinle.', levels: 'Her seviye' },
    { name: 'DELF / DALF', url: 'https://www.france-education-international.fr/diplome/delf-tout-public', kind: 'exam', note: 'Resmî Fransızca sınavları: seviyeler, örnek sınavlar ve sınav merkezleri.', levels: 'A1–C2' },
  ],
  es: [
    { name: 'Spanish Grammar in Context', url: 'https://www.coerll.utexas.edu/spantex/', kind: 'grammar', note: 'Teksas Üniversitesi’nin konu anlatımları ve otomatik puanlanan alıştırmaları.', levels: 'A2–C1', open: true },
    { name: 'Lawless Spanish', url: 'https://www.lawlessspanish.com/', kind: 'grammar', note: 'Kısa kural anlatımları ve testler; subjuntivo ve zamanlar için pratik.', levels: 'A1–C1' },
    { name: 'Centro Virtual Cervantes', url: 'https://cvc.cervantes.es/', kind: 'grammar', note: 'Cervantes Enstitüsü’nün dil ve kültür sayfaları; "Pasatiempos de Rayuela" alıştırmaları.', levels: 'A1–C1' },
    { name: 'Hoy Hablamos', url: 'https://www.hoyhablamos.com/', kind: 'listening', note: 'Günlük İspanyolca podcast ve metinleri; Diloloji haberlerinde de var.', levels: 'B1–B2' },
    { name: 'Voz de América', url: 'https://www.vozdeamerica.com/', kind: 'listening', note: 'Latin Amerika İspanyolcasıyla haberler ve sesli bültenler.', levels: 'B1–C1' },
    { name: 'DELE Ahora', url: 'https://deleahora.com/', kind: 'exam', note: 'DELE sınav hazırlığı: örnek sorular, dinleme ve okuma çalışmaları.', levels: 'A2–C1' },
    { name: 'Global Storybooks', url: 'https://globalstorybooks.net/', kind: 'reading', note: 'Resimli kısa hikâyeler ve sesleri; Okuma → “Kolay resimli hikâyeler”in kaynağı.', levels: 'A1–A2', open: true },
    { name: 'Diccionario de la RAE', url: 'https://dle.rae.es/', kind: 'dictionary', note: 'İspanyol Kraliyet Akademisi’nin tek dilli sözlüğü: tanım ve çekimler.', levels: 'B1+' },
    { name: 'WordReference', url: 'https://www.wordreference.com/es/', kind: 'dictionary', note: 'İspanyolca–İngilizce sözlük ve forumlar; kalıplar için çok iyi.', levels: 'Her seviye' },
    { name: 'SpanishDict', url: 'https://www.spanishdict.com/', kind: 'dictionary', note: 'Sözlük, çekim tabloları ve örnek cümleler bir arada.', levels: 'Her seviye' },
    { name: 'Forvo', url: 'https://forvo.com/languages/es/', kind: 'pronunciation', note: 'Ana dili İspanyolca olanların seslendirdiği kelimeler (İspanya ve Latin Amerika).', levels: 'Her seviye' },
    { name: 'YouGlish', url: 'https://youglish.com/spanish', kind: 'pronunciation', note: 'Bir kelimeyi gerçek videolarda, cümle içinde dinle.', levels: 'Her seviye' },
    { name: 'DELE (Instituto Cervantes)', url: 'https://examenes.cervantes.es/es/dele/que-es', kind: 'exam', note: 'Resmî İspanyolca sınavı: seviyeler, örnek sınavlar ve tarihler.', levels: 'A1–C2' },
  ],
  en: [
    { name: 'British Council LearnEnglish', url: 'https://learnenglish.britishcouncil.org/', kind: 'grammar', note: 'Seviyeye göre dilbilgisi anlatımları, alıştırmalar, dinleme ve okuma.', levels: 'A1–C1' },
    { name: 'English Page', url: 'https://www.englishpage.com/', kind: 'grammar', note: 'Zamanlar, modal fiiller ve edatlar için yüzlerce alıştırma.', levels: 'A2–C1' },
    { name: 'BBC Learning English', url: 'https://www.bbc.co.uk/learningenglish', kind: 'listening', note: '6 Minute English ve kısa dersler; Diloloji haberlerinde de var.', levels: 'A2–C1' },
    { name: 'VOA Learning English', url: 'https://learningenglish.voanews.com/', kind: 'listening', note: 'Yavaş okunan haberler, metinleriyle; kamu malı içerik.', levels: 'A2–B2', open: true },
    { name: 'News in Levels', url: 'https://www.newsinlevels.com/', kind: 'reading', note: 'Aynı haber üç ayrı seviyede: önce kolayı, sonra zoru oku.', levels: 'A1–B2' },
    { name: 'Cambridge Dictionary', url: 'https://dictionary.cambridge.org/', kind: 'dictionary', note: 'Öğrenci sözlüğü: seviye etiketi, örnek cümle ve İngiliz/Amerikan telaffuz.', levels: 'Her seviye' },
    { name: 'Oxford Learner’s Dictionaries', url: 'https://www.oxfordlearnersdictionaries.com/', kind: 'dictionary', note: 'Öğrenci sözlüğü ve Oxford 3000/5000 sık kelime listeleri.', levels: 'Her seviye' },
    { name: 'YouGlish', url: 'https://youglish.com/', kind: 'pronunciation', note: 'Bir kelimeyi gerçek videolarda, cümle içinde dinle.', levels: 'Her seviye' },
    { name: 'Forvo', url: 'https://forvo.com/languages/en/', kind: 'pronunciation', note: 'Farklı aksanlardan kelime telaffuzları.', levels: 'Her seviye' },
    { name: 'Cambridge English Exams', url: 'https://www.cambridgeenglish.org/exams-and-tests/', kind: 'exam', note: 'B2 First, C1 Advanced ve diğerleri: örnek sınavlar ve seviye testi.', levels: 'A2–C2' },
  ],
}

/** Places for every language: sentences in use, and a tool for spaced review outside the app. */
export const SHARED_RESOURCES: GuideResource[] = [
  { name: 'Tatoeba', url: 'https://tatoeba.org/', kind: 'reading', note: 'Çevirileriyle milyonlarca örnek cümle; Diloloji’nin örnek cümlelerinin bir kısmı buradan.', levels: 'Her seviye', open: true },
]
