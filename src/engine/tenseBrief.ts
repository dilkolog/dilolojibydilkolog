import type { Tense } from './tenses'

/** A tense said briefly: its name and what it is for. */
export interface TenseBrief {
  /** Name as the language calls it. */
  name: string
  /** Short Turkish label: "Geçmiş (-di)". */
  tr: string
  short: string
}

/**
 * Each tense's name and use in a line. Kept apart from the full guide (tenseGuide.ts, formation
 * notes and examples) so that sessions and the verb list can name a tense without loading the
 * whole guide at start.
 */
export const TENSE_BRIEF: Record<Tense, TenseBrief> = {
  present: {
    name: 'présent',
    tr: 'Şimdiki / geniş zaman',
    short: 'Şu an olanı, alışkanlıkları ve genel doğruları anlatır: hem "yapıyorum" hem "yaparım".',
  },
  'passe-compose': {
    name: 'passé composé',
    tr: 'Geçmiş (-di)',
    short: 'Geçmişte olup biten eylem: "yaptım". Konuşmada en çok kullanılan geçmiş zaman.',
  },
  imparfait: {
    name: 'imparfait',
    tr: 'Süren geçmiş (-iyordu, -erdi)',
    short: 'Geçmişte süren durum, alışkanlık ya da arka plan: "yapıyordum, yapardım". Olup biten tek olay için passé composé.',
  },
  futur: {
    name: 'futur simple',
    tr: 'Gelecek (-ecek)',
    short: 'Gelecekte olacak eylem, tahmin ya da niyet: "yapacağım".',
  },
  conditionnel: {
    name: 'conditionnel présent',
    tr: 'Şart kipi (-erdi, -ardı)',
    short: 'Bir koşula bağlı olan, nazik bir istek ya da hayal: "yapardım, ister miydiniz".',
  },
  subjonctif: {
    name: 'subjonctif présent',
    tr: 'Dilek kipi (-mesi, -sin)',
    short: 'İstek, duygu, gereklilik ya da şüphe bildiren bir ifadeden sonra "que" ile: "gelmeni istiyorum, gelmesi gerek".',
  },
  presente: {
    name: 'presente',
    tr: 'Şimdiki / geniş zaman',
    short: 'Şu an olanı, alışkanlıkları ve genel doğruları anlatır: hem "yapıyorum" hem "yaparım".',
  },
  preterito: {
    name: 'pretérito indefinido',
    tr: 'Geçmiş (-di)',
    short: 'Geçmişte belli bir anda olup biten eylem: "yaptım". Bitmiş bir zamanla kullanılır (ayer, el año pasado).',
  },
  perfecto: {
    name: 'pretérito perfecto',
    tr: 'Yakın geçmiş (-di / -miş)',
    short: 'Henüz bitmemiş bir zaman diliminde olan ya da hayat deneyimi: "bugün yedim, hiç gitmedim".',
  },
  imperfecto: {
    name: 'pretérito imperfecto',
    tr: 'Süren geçmiş (-iyordu, -erdi)',
    short: 'Geçmişte süren durum, alışkanlık ya da arka plan: "yapıyordum, yapardım". Olup biten tek olay için indefinido.',
  },
  futuro: {
    name: 'futuro simple',
    tr: 'Gelecek (-ecek)',
    short: 'Gelecekte olacak eylem, tahmin ya da niyet: "yapacağım".',
  },
  condicional: {
    name: 'condicional simple',
    tr: 'Şart kipi (-erdi, -ardı)',
    short: 'Bir koşula bağlı olan, nazik bir istek ya da tavsiye: "yapardım, ister miydin".',
  },
  subjuntivo: {
    name: 'presente de subjuntivo',
    tr: 'Dilek kipi (-mesi, -sin)',
    short: 'İstek, duygu, gereklilik ya da şüphe bildiren bir ifadeden sonra "que" ile: "gelmeni istiyorum", ve "ojalá" ile.',
  },
  'passe-simple': {
    name: 'passé simple',
    tr: 'Yazı dilinde geçmiş (-di)',
    short: 'Romanlarda, masallarda ve tarih yazılarında olup biten eylem: "yaptı". Konuşmada yerini passé composé alır; okurken tanıman yeter.',
  },
  imperatif: {
    name: 'impératif',
    tr: 'Emir (-sana, -in)',
    short: 'Birine bir şey yapmasını söylemek: "konuş!", "konuşalım!", "konuşun!". Öznesi yoktur.',
  },
  'plus-que-parfait': {
    name: 'plus-que-parfait',
    tr: 'Geçmişte geçmiş (-mişti)',
    short: 'Geçmişteki başka bir olaydan önce tamamlanmış eylem: "yapmıştım".',
  },
  'futur-anterieur': {
    name: 'futur antérieur',
    tr: 'Bitmiş gelecek (-miş olacak)',
    short: 'Gelecekte belli bir andan önce tamamlanmış olacak eylem: "yapmış olacağım".',
  },
  'conditionnel-passe': {
    name: 'conditionnel passé',
    tr: 'Geçmiş şart (-miş olurdu)',
    short: 'Geçmişte gerçekleşmemiş bir şeyin sonucu ya da pişmanlık: "yapmış olurdum".',
  },
  'subjonctif-passe': {
    name: 'subjonctif passé',
    tr: 'Dilek kipi, tamamlanmış (-miş olması)',
    short: 'Dilek kipi gerektiren bir ifadeden sonra, tamamlanmış eylem: "başarmış olmana sevindim".',
  },
  'infinitif-passe': {
    name: 'infinitif passé',
    tr: 'Tamamlanmış mastar (-dikten sonra, -miş olmak)',
    short: 'Başka bir eylemden önce bitmiş olanı söyleyen mastar: "yemek yedikten sonra", "zamanında gelmiş olmaktan memnun".',
  },
  'participe-compose': {
    name: 'participe composé',
    tr: 'Tamamlanmış ortaç (-ince, -ip)',
    short: 'Bir eylem bitmişken öbürünü anlatır, çoğunlukla yazıda: "ödevini bitirince çıktı".',
  },
  'infinitivo-compuesto': {
    name: 'infinitivo compuesto',
    tr: 'Tamamlanmış mastar (-dikten sonra, -miş olmak)',
    short: 'Başka bir eylemden önce bitmiş olanı söyleyen mastar: "yemek yedikten sonra", "hiçbir şey görmediğini söylüyor".',
  },
  'gerundio-compuesto': {
    name: 'gerundio compuesto',
    tr: 'Tamamlanmış ulaç (-ince, -ip)',
    short: 'Bir eylem bitmişken öbürünü anlatır, çoğunlukla yazıda: "işi bitirince eve gitti".',
  },
  imperativo: {
    name: 'imperativo',
    tr: 'Emir (-sana, -in)',
    short: 'Birine bir şey yapmasını söylemek: "konuş!", "konuşun!". tú, usted, nosotros, vosotros, ustedes için; öznesi yoktur.',
  },
  pluscuamperfecto: {
    name: 'pretérito pluscuamperfecto',
    tr: 'Geçmişte geçmiş (-mişti)',
    short: 'Geçmişteki başka bir olaydan önce tamamlanmış eylem: "yapmıştım".',
  },
  'futuro-perfecto': {
    name: 'futuro perfecto',
    tr: 'Bitmiş gelecek (-miş olacak)',
    short: 'Gelecekte belli bir andan önce bitmiş olacak eylem, ya da geçmişe dair tahmin: "yapmış olacağım, yapmış olmalı".',
  },
  'condicional-perfecto': {
    name: 'condicional perfecto',
    tr: 'Geçmiş şart (-miş olurdu)',
    short: 'Geçmişte gerçekleşmemiş bir şeyin sonucu ya da pişmanlık: "yapmış olurdum".',
  },
  'subjuntivo-imperfecto': {
    name: 'pretérito imperfecto de subjuntivo',
    tr: 'Dilek kipi, geçmiş (-seydi, -sa)',
    short: 'Geçmişteki bir istek ya da gerçek dışı koşul: "gelmeni istiyordum", "olsaydı".',
  },
  'subjuntivo-perfecto': {
    name: 'pretérito perfecto de subjuntivo',
    tr: 'Dilek kipi, tamamlanmış (-miş olması)',
    short: 'Dilek kipi gerektiren bir ifadeden sonra, tamamlanmış eylem: "gelmiş olmana sevindim".',
  },
  'subjuntivo-pluscuamperfecto': {
    name: 'pluscuamperfecto de subjuntivo',
    tr: 'Dilek kipi, geçmişte geçmiş (-seydi)',
    short: 'Geçmişte gerçekleşmemiş koşul ya da pişmanlık: "bilseydim, keşke yapsaydım".',
  },
}
