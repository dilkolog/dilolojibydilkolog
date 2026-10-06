import { normalize, splitArticle, stripDiacritics } from './answerCheck'
import type { TargetLanguage, VocabularyEntry } from './types'

/**
 * Words Turkish took from French, English or Spanish: the Turkish word is the memory hook
 * (a "pantalon" is a "pantolon"). A short hand-checked list of common words whose spelling
 * and meaning really match; where the Turkish meaning has narrowed or shifted, `note` says so,
 * because a false hook is worse than none.
 */
interface Kin {
  /** The word in the language being learned (no article). */
  word: string
  /** The Turkish word that came from it. */
  tr: string
  /** Where the Turkish meaning differs. */
  note?: string
}

const FR: [string, string, string?][] = [
  ['pantalon', 'pantolon'], ['bifteck', 'biftek'], ['billet', 'bilet'], ['blouse', 'bluz'], ['bouquet', 'buket'],
  ['bureaucratie', 'bürokrasi'], ['chauffeur', 'şoför'], ['chance', 'şans'], ['coiffeur', 'kuaför'], ['camion', 'kamyon'],
  ['canapé', 'kanepe'], ['croquis', 'kroki'], ['coupon', 'kupon'], ['cravate', 'kravat'], ['coulisse', 'kulis'],
  ['maquillage', 'makyaj'], ['maillot', 'mayo', 'Türkçede mayo: yüzme giysisi'], ['menu', 'menü'], ['modèle', 'model'],
  ['mode', 'moda'], ['montage', 'montaj'], ['pardessus', 'pardösü', 'Türkçede pardösü: ince palto'], ['paquet', 'paket'],
  ['passage', 'pasaj'], ['pension', 'pansiyon', 'Türkçede pansiyon: küçük otel'], ['pilote', 'pilot'], ['paletot', 'palto'],
  ['parfum', 'parfüm'], ['plage', 'plaj'], ['retard', 'rötar', 'Türkçede rötar: özellikle ulaşımda gecikme'], ['surprise', 'sürpriz'],
  ['saison', 'sezon'], ['toilette', 'tuvalet'], ['vitrine', 'vitrin'], ['valse', 'vals'], ['virage', 'viraj'], ['volant', 'volan'],
  ['ascenseur', 'asansör'], ['emballage', 'ambalaj'], ['archives', 'arşiv'], ['béret', 'bere'], ['bicyclette', 'bisiklet'],
  ['bonnet', 'bone'], ['boulevard', 'bulvar'], ['bureau', 'büro'], ['buffet', 'büfe'], ['défilé', 'defile'], ['dépôt', 'depo'],
  ['détail', 'detay'], ['douche', 'duş'], ['décor', 'dekor'], ['équipe', 'ekip'], ['étiquette', 'etiket'], ['façon', 'fason'],
  ['garage', 'garaj'], ['guichet', 'gişe'], ['grippe', 'grip'], ['gendarme', 'jandarma'], ['jury', 'jüri'], ['qualité', 'kalite'],
  ['camouflage', 'kamuflaj'], ['carrière', 'kariyer'], ['carnet', 'karne', 'Türkçede karne: okul belgesi'], ['cachet', 'kaşe', 'Türkçede kaşe: mühür'],
  ['collège', 'kolej', 'Türkçede kolej: genelde özel okul'], ['confort', 'konfor'], ['costume', 'kostüm'], ['contrôle', 'kontrol'],
  ['coupe', 'kupa', 'Türkçede kupa: ödül ya da bardak'], ['luxe', 'lüks'], ['machine', 'makine'], ['marque', 'marka'],
  ['masseur', 'masör'], ['nuance', 'nüans'], ['pile', 'pil'], ['rendez-vous', 'randevu'], ['réception', 'resepsiyon'],
  ['reportage', 'röportaj', 'Türkçede röportaj: görüşme'], ['stagiaire', 'stajyer'], ['tableau', 'tablo'], ['tulle', 'tül'],
  ['vase', 'vazo'], ['parachute', 'paraşüt'], ['saucisse', 'sosis'], ['charcuterie', 'şarküteri'], ['cheminée', 'şömine'],
  ['gare', 'gar'], ['perron', 'peron'], ['abat-jour', 'abajur'], ['coupure', 'kupür'], ['lycée', 'lise'], ['écran', 'ekran'],
  ['casquette', 'kasket'], ['réservation', 'rezervasyon'], ['cours', 'kurs', 'Türkçede kurs: kısa eğitim'], ['campagne', 'kampanya'],
  ['camp', 'kamp'], ['cabine', 'kabin'], ['cabaret', 'kabare'], ['ambulance', 'ambulans'], 
  ['avenue', 'avenü'], ['balcon', 'balkon'], ['bagage', 'bagaj'], ['bijouterie', 'bijuteri', 'Türkçede bijuteri: takı'], ['broche', 'broş', 'Türkçede broş: iğneli takı'],
  ['chef', 'şef'], ['cinéma', 'sinema'], ['courrier', 'kurye', 'Türkçede kurye: ulak'], ['dossier', 'dosya'], 
  ['journal', 'jurnal', 'Türkçede jurnal: ihbar'], ['lavabo', 'lavabo'], ['mannequin', 'manken'], ['marmelade', 'marmelat'],
  ['orchestre', 'orkestra'], ['paravent', 'paravan'], ['pyjama', 'pijama'], ['restaurant', 'restoran'], ['salon', 'salon'], ['silhouette', 'siluet'],
  ['vitesse', 'vites'],
]

const EN: [string, string, string?][] = [
  ['cake', 'kek'], ['match', 'maç'], ['goal', 'gol'], ['coach', 'koç'], ['hobby', 'hobi'], ['stress', 'stres'], ['sandwich', 'sandviç'],
  ['picnic', 'piknik'], ['spray', 'sprey'], ['champion', 'şampiyon'], ['foul', 'faul'], ['shampoo', 'şampuan'], ['tennis', 'tenis'], ['biscuit', 'bisküvi'],
]

const ES: [string, string, string?][] = [
  ['cigarro', 'sigara', 'Türkçeye Fransızca cigare üzerinden geçti'], ['guerrilla', 'gerilla'], ['tango', 'tango'], ['siesta', 'siesta'],
]

const bare = (word: string, language: TargetLanguage) => stripDiacritics(splitArticle(normalize(word).toLocaleLowerCase(language), language).rest)

const INDEX = new Map<string, Kin>()
for (const [language, list] of [['fr', FR], ['en', EN], ['es', ES]] as const) {
  for (const [word, tr, note] of list) INDEX.set(`${language}:${bare(word, language)}`, { word, tr, note })
}

/** The Turkish word that came from this one, if the list knows it. */
export function turkishKin(entry: Pick<VocabularyEntry, 'language' | 'lemma'>): { tr: string; note?: string } | undefined {
  const lemma = bare(entry.lemma, entry.language)
  const k = INDEX.get(`${entry.language}:${lemma}`) ?? INDEX.get(`${entry.language}:${lemma.replace(/^(se |s['’])/, '').replace(/^to /, '')}`)
  return k && { tr: k.tr, note: k.note }
}

/** The kin lists, for the test that checks they hold no duplicates. */
export const KIN_COUNT = INDEX.size
