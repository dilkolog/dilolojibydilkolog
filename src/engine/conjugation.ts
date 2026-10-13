import { normalize } from './answerCheck'
import type { VocabularyEntry } from './types'

/**
 * Present-tense conjugation for French and Spanish verbs. Teaching a wrong form is worse than
 * teaching none, so forms come from tables for irregular verbs and from rules only where the
 * rule is safe: French -er verbs without stem changes, -dre verbs and listed -ir (-iss-) verbs;
 * Spanish -ar verbs outside the stem-changing list and listed regular -er/-ir verbs. Beyond those,
 * forms from UniMorph for the verbs a learner is likely to meet (see addConjugations). Anything
 * else is not conjugated.
 */

export type Person = 0 | 1 | 2 | 3 | 4 | 5
export const PERSONS: readonly Person[] = [0, 1, 2, 3, 4, 5]

export const PRONOUNS: Record<'fr' | 'es', string[][]> = {
  fr: [['je'], ['tu'], ['il', 'elle', 'on'], ['nous'], ['vous'], ['ils', 'elles']],
  es: [['yo'], ['tú'], ['él', 'ella', 'usted'], ['nosotros', 'nosotras'], ['vosotros', 'vosotras'], ['ellos', 'ellas', 'ustedes']],
}

const t = (s: string) => s.split(' ')

const FR_TABLE: Record<string, string[]> = {
  être: t('suis es est sommes êtes sont'),
  avoir: t('ai as a avons avez ont'),
  aller: t('vais vas va allons allez vont'),
  faire: t('fais fais fait faisons faites font'),
  dire: t('dis dis dit disons dites disent'),
  pouvoir: t('peux peux peut pouvons pouvez peuvent'),
  vouloir: t('veux veux veut voulons voulez veulent'),
  savoir: t('sais sais sait savons savez savent'),
  devoir: t('dois dois doit devons devez doivent'),
  venir: t('viens viens vient venons venez viennent'),
  devenir: t('deviens deviens devient devenons devenez deviennent'),
  revenir: t('reviens reviens revient revenons revenez reviennent'),
  tenir: t('tiens tiens tient tenons tenez tiennent'),
  prendre: t('prends prends prend prenons prenez prennent'),
  comprendre: t('comprends comprends comprend comprenons comprenez comprennent'),
  apprendre: t('apprends apprends apprend apprenons apprenez apprennent'),
  surprendre: t('surprends surprends surprend surprenons surprenez surprennent'),
  mettre: t('mets mets met mettons mettez mettent'),
  permettre: t('permets permets permet permettons permettez permettent'),
  promettre: t('promets promets promet promettons promettez promettent'),
  voir: t('vois vois voit voyons voyez voient'),
  croire: t('crois crois croit croyons croyez croient'),
  boire: t('bois bois boit buvons buvez boivent'),
  connaître: t('connais connais connaît connaissons connaissez connaissent'),
  reconnaître: t('reconnais reconnais reconnaît reconnaissons reconnaissez reconnaissent'),
  paraître: t('parais parais paraît paraissons paraissez paraissent'),
  partir: t('pars pars part partons partez partent'),
  sortir: t('sors sors sort sortons sortez sortent'),
  dormir: t('dors dors dort dormons dormez dorment'),
  sentir: t('sens sens sent sentons sentez sentent'),
  servir: t('sers sers sert servons servez servent'),
  ouvrir: t('ouvre ouvres ouvre ouvrons ouvrez ouvrent'),
  offrir: t('offre offres offre offrons offrez offrent'),
  découvrir: t('découvre découvres découvre découvrons découvrez découvrent'),
  écrire: t('écris écris écrit écrivons écrivez écrivent'),
  lire: t('lis lis lit lisons lisez lisent'),
  vivre: t('vis vis vit vivons vivez vivent'),
  suivre: t('suis suis suit suivons suivez suivent'),
  recevoir: t('reçois reçois reçoit recevons recevez reçoivent'),
  courir: t('cours cours court courons courez courent'),
  conduire: t('conduis conduis conduit conduisons conduisez conduisent'),
  construire: t('construis construis construit construisons construisez construisent'),
  plaire: t('plais plais plaît plaisons plaisez plaisent'),
  rire: t('ris ris rit rions riez rient'),
  acheter: t('achète achètes achète achetons achetez achètent'),
  appeler: t('appelle appelles appelle appelons appelez appellent'),
  jeter: t('jette jettes jette jetons jetez jettent'),
  lever: t('lève lèves lève levons levez lèvent'),
  mener: t('mène mènes mène menons menez mènent'),
  emmener: t('emmène emmènes emmène emmenons emmenez emmènent'),
  préférer: t('préfère préfères préfère préférons préférez préfèrent'),
  espérer: t('espère espères espère espérons espérez espèrent'),
  répéter: t('répète répètes répète répétons répétez répètent'),
  payer: t('paie paies paie payons payez paient'),
  essayer: t('essaie essaies essaie essayons essayez essaient'),
  envoyer: t('envoie envoies envoie envoyons envoyez envoient'),
  nettoyer: t('nettoie nettoies nettoie nettoyons nettoyez nettoient'),
  employer: t('emploie emploies emploie employons employez emploient'),
  // Verbs neither the safe rules nor the dictionary cover (stem changes, irregular): written out by hand.
  mourir: t('meurs meurs meurt mourons mourez meurent'),
  souvenir: t('souviens souviens souvient souvenons souvenez souviennent'),
  régler: t('règle règles règle réglons réglez règlent'),
  enfuir: t('enfuis enfuis enfuit enfuyons enfuyez enfuient'),
  admettre: t('admets admets admet admettons admettez admettent'),
  repartir: t('repars repars repart repartons repartez repartent'),
  ressortir: t('ressors ressors ressort ressortons ressortez ressortent'),
  départir: t('dépars dépars départ départons départez départent'),
  abattre: t('abats abats abat abattons abattez abattent'),
  cuire: t('cuis cuis cuit cuisons cuisez cuisent'),
  naître: t('nais nais naît naissons naissez naissent'),
  apparaître: t('apparais apparais apparaît apparaissons apparaissez apparaissent'),
  geindre: t('geins geins geint geignons geignez geignent'),
  revaloir: t('revaux revaux revaut revalons revalez revalent'),
  noyer: t('noie noies noie noyons noyez noient'),
  broyer: t('broie broies broie broyons broyez broient'),
  intégrer: t('intègre intègres intègre intégrons intégrez intègrent'),
  péter: t('pète pètes pète pétons pétez pètent'),
  diéser: t('dièse dièses dièse diésons diésez dièsent'),
  mécher: t('mèche mèches mèche méchons méchez mèchent'),
  émécher: t('émèche émèches émèche éméchons éméchez émèchent'),
  morigéner: t('morigène morigènes morigène morigénons morigénez morigènent'),
  oxygéner: t('oxygène oxygènes oxygène oxygénons oxygénez oxygènent'),
  enténébrer: t('enténèbre enténèbres enténèbre enténébrons enténébrez enténèbrent'),
  engrener: t('engrène engrènes engrène engrenons engrenez engrènent'),
  harceler: t('harcèle harcèles harcèle harcelons harcelez harcèlent'),
  épeler: t('épelle épelles épelle épelons épelez épellent'),
  renouveler: t('renouvelle renouvelles renouvelle renouvelons renouvelez renouvellent'),
  amonceler: t('amoncelle amoncelles amoncelle amoncelons amoncelez amoncellent'),
  denteler: t('dentelle dentelles dentelle dentelons dentelez dentellent'),
  morceler: t('morcelle morcelles morcelle morcelons morcelez morcellent'),
  museler: t('muselle muselles muselle muselons muselez musellent'),
  panteler: t('pantelle pantelles pantelle pantelons pantelez pantellent'),
  écheveler: t('échevelle échevelles échevelle échevelons échevelez échevellent'),
  breveter: t('brevette brevettes brevette brevetons brevetez brevettent'),
  cliqueter: t('cliquette cliquettes cliquette cliquetons cliquetez cliquettent'),
  décolleter: t('décollette décollettes décollette décolletons décolletez décollettent'),
  hoqueter: t('hoquette hoquettes hoquette hoquetons hoquetez hoquettent'),
  pailleter: t('paillette paillettes paillette pailletons pailletez paillettent'),
  piqueter: t('piquette piquettes piquette piquetons piquetez piquettent'),
  voleter: t('volette volettes volette voletons voletez volettent'),
}

/** -ir verbs of the finir group (-iss- in the plural). */
const FR_ISS = new Set(
  'finir choisir réussir réfléchir grandir remplir obéir agir bâtir punir rougir vieillir maigrir grossir saisir établir fournir guérir nourrir unir bannir aplatir épanouir évanouir accroupir dépolir endolorir flétrir rabougrir tapir'.split(' '),
)

const ES_TABLE: Record<string, string[]> = {
  ser: t('soy eres es somos sois son'),
  estar: t('estoy estás está estamos estáis están'),
  ir: t('voy vas va vamos vais van'),
  tener: t('tengo tienes tiene tenemos tenéis tienen'),
  venir: t('vengo vienes viene venimos venís vienen'),
  hacer: t('hago haces hace hacemos hacéis hacen'),
  poder: t('puedo puedes puede podemos podéis pueden'),
  querer: t('quiero quieres quiere queremos queréis quieren'),
  decir: t('digo dices dice decimos decís dicen'),
  saber: t('sé sabes sabe sabemos sabéis saben'),
  ver: t('veo ves ve vemos veis ven'),
  dar: t('doy das da damos dais dan'),
  poner: t('pongo pones pone ponemos ponéis ponen'),
  salir: t('salgo sales sale salimos salís salen'),
  traer: t('traigo traes trae traemos traéis traen'),
  oír: t('oigo oyes oye oímos oís oyen'),
  caer: t('caigo caes cae caemos caéis caen'),
  conocer: t('conozco conoces conoce conocemos conocéis conocen'),
  parecer: t('parezco pareces parece parecemos parecéis parecen'),
  ofrecer: t('ofrezco ofreces ofrece ofrecemos ofrecéis ofrecen'),
  conducir: t('conduzco conduces conduce conducimos conducís conducen'),
  traducir: t('traduzco traduces traduce traducimos traducís traducen'),
  construir: t('construyo construyes construye construimos construís construyen'),
  incluir: t('incluyo incluyes incluye incluimos incluís incluyen'),
  seguir: t('sigo sigues sigue seguimos seguís siguen'),
  jugar: t('juego juegas juega jugamos jugáis juegan'),
  oler: t('huelo hueles huele olemos oléis huelen'),
  obtener: t('obtengo obtienes obtiene obtenemos obtenéis obtienen'),
  mantener: t('mantengo mantienes mantiene mantenemos mantenéis mantienen'),
  proponer: t('propongo propones propone proponemos proponéis proponen'),
  elegir: t('elijo eliges elige elegimos elegís eligen'),
  reír: t('río ríes ríe reímos reís ríen'),
  sonreír: t('sonrío sonríes sonríe sonreímos sonreís sonríen'),
  fluir: t('fluyo fluyes fluye fluimos fluís fluyen'),
  reproducir: t('reproduzco reproduces reproduce reproducimos reproducís reproducen'),
  relucir: t('reluzco reluces reluce relucimos relucís relucen'),
  restablecer: t('restablezco restableces restablece restablecemos restablecéis restablecen'),
  proveer: t('proveo provees provee proveemos proveéis proveen'),
  maldecir: t('maldigo maldices maldice maldecimos maldecís maldicen'),
  avergonzar: t('avergüenzo avergüenzas avergüenza avergonzamos avergonzáis avergüenzan'),
  interactuar: t('interactúo interactúas interactúa interactuamos interactuáis interactúan'),
}

/** Spanish stem-changing verbs: the last stem vowel changes in the singular and 3rd plural. */
const ES_STEM: Record<string, 'ie' | 'ue' | 'i'> = Object.fromEntries([
  ...'pensar empezar comenzar cerrar despertar sentar recomendar calentar atravesar confesar gobernar negar nevar enterrar desenterrar sembrar acertar enmendar digerir revertir entender perder encender defender atender extender preferir sentir mentir divertir convertir advertir consentir'
    .split(' ')
    .map((v) => [v, 'ie' as const]),
  ...'volver devolver dormir morir encontrar contar recordar mostrar probar costar soñar volar acostar almorzar mover resolver colgar aprobar llover doler'
    .split(' ')
    .map((v) => [v, 'ue' as const]),
  ...'pedir servir repetir vestir medir competir impedir despedir'.split(' ').map((v) => [v, 'i' as const]),
])

/** Common Spanish -er/-ir verbs known to be regular in the present. */
const ES_REGULAR_ER_IR = new Set(
  'comer beber vivir escribir abrir aprender leer creer correr vender deber comprender subir decidir recibir partir permitir existir ocurrir responder romper meter prometer temer coser barrer cubrir describir descubrir discutir sufrir unir asistir insistir depender sorprender cumplir compartir aburrir añadir atrever lamer tejer someter emprender irrumpir persuadir percibir dimitir evadir eludir pulir suprimir resumir desistir parir reabrir'.split(' '),
)

const FR_ENDINGS_ER = t('e es e ons ez ent')
const FR_ENDINGS_DRE = ['s', 's', '', 'ons', 'ez', 'ent']
const FR_ENDINGS_ISS = t('is is it issons issez issent')
const ES_ENDINGS: Record<'ar' | 'er' | 'ir', string[]> = {
  ar: t('o as a amos áis an'),
  er: t('o es e emos éis en'),
  ir: t('o es e imos ís en'),
}

function frRegular(v: string): string[] | undefined {
  if (FR_ISS.has(v)) return FR_ENDINGS_ISS.map((e) => v.slice(0, -2) + e)
  if (/(endre|andre|ondre|erdre|ordre)$/.test(v) && !/prendre$/.test(v)) return FR_ENDINGS_DRE.map((e) => v.slice(0, -2) + e)
  if (!v.endsWith('er') || v === 'aller') return undefined
  // Stem changes (acheter, sevrer, appeler, préférer, léguer, payer…) are irregular in spelling: leave them out.
  if (/e(?:[^aeiouyéè]|[bcdfgptv][lr])er$/.test(v) || /é(?:[^aeiouyéè]|gu|qu)+er$/.test(v) || /yer$/.test(v)) return undefined
  const stem = v.slice(0, -2)
  return FR_ENDINGS_ER.map((e, i) => {
    if (i === 3 && stem.endsWith('g')) return `${stem}eons`
    if (i === 3 && stem.endsWith('c')) return `${stem.slice(0, -1)}çons`
    return stem + e
  })
}

function changeStem(stem: string, change: 'ie' | 'ue' | 'i'): string {
  const from = change === 'ue' ? 'o' : 'e'
  const i = stem.lastIndexOf(from)
  return i < 0 ? stem : stem.slice(0, i) + change + stem.slice(i + 1)
}

/** -iar/-uar verbs that take a written accent in the present (envío, continúo). */
const ES_ACCENTED = new Set('enviar confiar guiar variar esquiar criar fiar ampliar desviar vaciar desconfiar'.split(' '))

function esRegular(v: string): string[] | undefined {
  const type = v.slice(-2) as 'ar' | 'er' | 'ir'
  if (!(type in ES_ENDINGS)) return undefined
  if (ES_ACCENTED.has(v) || (/uar$/.test(v) && !/guar$/.test(v))) return undefined
  if (type !== 'ar' && !ES_REGULAR_ER_IR.has(v) && !ES_STEM[v]) return undefined
  const stem = v.slice(0, -2)
  const change = ES_STEM[v]
  return ES_ENDINGS[type].map((e, i) => (change && i !== 3 && i !== 4 ? changeStem(stem, change) : stem) + e)
}

/** Present tense from UniMorph (src/data/conjugation, loaded by conjugationData.ts); wins over the rules. */
const DICTIONARY: Record<'fr' | 'es', Map<string, string[]>> = { fr: new Map(), es: new Map() }

/** Adds dictionary forms: one verb per line, "infinitive<TAB>six forms separated by spaces". */
export function addConjugations(language: 'fr' | 'es', text: string) {
  for (const line of text.split('\n')) {
    const [verb, forms] = line.split('\t')
    const six = forms?.trim().split(' ')
    if (verb && six?.length === 6) DICTIONARY[language].set(verb, six)
  }
}

const REFLEXIVE: Record<'fr' | 'es', string[]> = { fr: t('me te se nous vous se'), es: t('me te se nos os se') }

export interface Conjugation {
  infinitive: string
  forms: string[]
  /** 'table' = written out by hand; 'dictionary' = UniMorph; 'rule' = produced by a safe regular pattern. */
  source: 'table' | 'dictionary' | 'rule'
}

/** Present tense of a FR/ES verb entry, or undefined when it can't be produced safely. */
export function conjugate(entry: Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>): Conjugation | undefined {
  if (entry.language === 'en' || entry.partOfSpeech !== 'verb') return undefined
  const lang = entry.language
  let v = normalize(entry.lemma).toLocaleLowerCase(lang)
  // Reflexive verbs: "se lever", "s'asseoir" (FR), "levantarse" (ES).
  let reflexive = false
  if (lang === 'fr' && /^(se |s['’])/.test(v)) {
    reflexive = true
    v = v.replace(/^(se |s['’])/, '')
  }
  if (lang === 'es' && /(ar|er|ir|ír)se$/.test(v)) {
    reflexive = true
    v = v.slice(0, -2)
  }
  const table = (lang === 'fr' ? FR_TABLE : ES_TABLE)[v]
  const listed = table ? undefined : DICTIONARY[lang].get(v)
  const forms = table ?? listed ?? (lang === 'fr' ? frRegular(v) : esRegular(v))
  if (!forms) return undefined
  const withPronoun = reflexive
    ? forms.map((f, i) => {
        const p = REFLEXIVE[lang][i]
        return lang === 'fr' && /^[aeiouéèêhâîôû]/.test(f) && (p === 'me' || p === 'te' || p === 'se') ? `${p[0]}'${f}` : `${p} ${f}`
      })
    : forms
  return { infinitive: entry.lemma, forms: withPronoun, source: table ? 'table' : listed ? 'dictionary' : 'rule' }
}

/** Accepted answers for one person: the form alone, or with any of its subject pronouns. */
export function acceptedForms(language: 'fr' | 'es', person: Person, form: string): string[] {
  const out = [form]
  for (const p of PRONOUNS[language][person]) {
    out.push(language === 'fr' && p === 'je' && /^[aeiouéèêhâîôûy]/.test(form) ? `j'${form}` : `${p} ${form}`)
  }
  return out
}
