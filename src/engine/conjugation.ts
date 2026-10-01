import { normalize } from './answerCheck'
import type { VocabularyEntry } from './types'

/**
 * Present-tense conjugation for French and Spanish verbs. Teaching a wrong form is worse than
 * teaching none, so forms come from tables for irregular verbs and from rules only where the
 * rule is safe: French -er verbs without stem changes, -dre verbs and listed -ir (-iss-) verbs;
 * Spanish -ar verbs outside the stem-changing list and listed regular -er/-ir verbs. Anything
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
}

/** -ir verbs of the finir group (-iss- in the plural). */
const FR_ISS = new Set(
  'finir choisir réussir réfléchir grandir remplir obéir agir bâtir punir rougir vieillir maigrir grossir saisir établir fournir guérir nourrir'.split(' '),
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
}

/** Spanish stem-changing verbs: the last stem vowel changes in the singular and 3rd plural. */
const ES_STEM: Record<string, 'ie' | 'ue' | 'i'> = Object.fromEntries([
  ...'pensar empezar comenzar cerrar despertar sentar recomendar calentar atravesar confesar gobernar negar entender perder encender defender atender extender preferir sentir mentir divertir convertir advertir consentir'
    .split(' ')
    .map((v) => [v, 'ie' as const]),
  ...'volver devolver dormir morir encontrar contar recordar mostrar probar costar soñar volar acostar almorzar mover resolver colgar aprobar'
    .split(' ')
    .map((v) => [v, 'ue' as const]),
  ...'pedir servir repetir vestir medir competir impedir despedir'.split(' ').map((v) => [v, 'i' as const]),
])

/** Common Spanish -er/-ir verbs known to be regular in the present. */
const ES_REGULAR_ER_IR = new Set(
  'comer beber vivir escribir abrir aprender leer creer correr vender deber comprender subir decidir recibir partir permitir existir ocurrir responder romper meter prometer temer coser barrer cubrir describir descubrir discutir sufrir unir asistir insistir depender sorprender cumplir compartir aburrir añadir'.split(' '),
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
  // Stem changes (acheter, appeler, préférer, payer…) are irregular in spelling: leave them out.
  if (/e[^aeiouyéè]er$/.test(v) || /é[^aeiouyéè]+er$/.test(v) || /yer$/.test(v)) return undefined
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

const REFLEXIVE: Record<'fr' | 'es', string[]> = { fr: t('me te se nous vous se'), es: t('me te se nos os se') }

export interface Conjugation {
  infinitive: string
  forms: string[]
  /** 'table' = written out by hand; 'rule' = produced by a safe regular pattern. */
  source: 'table' | 'rule'
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
  if (lang === 'es' && /(ar|er|ir)se$/.test(v)) {
    reflexive = true
    v = v.slice(0, -2)
  }
  const table = (lang === 'fr' ? FR_TABLE : ES_TABLE)[v]
  const forms = table ?? (lang === 'fr' ? frRegular(v) : esRegular(v))
  if (!forms) return undefined
  const withPronoun = reflexive
    ? forms.map((f, i) => {
        const p = REFLEXIVE[lang][i]
        return lang === 'fr' && /^[aeiouéèêhâîôû]/.test(f) && (p === 'me' || p === 'te' || p === 'se') ? `${p[0]}'${f}` : `${p} ${f}`
      })
    : forms
  return { infinitive: entry.lemma, forms: withPronoun, source: table ? 'table' : 'rule' }
}

/** Accepted answers for one person: the form alone, or with any of its subject pronouns. */
export function acceptedForms(language: 'fr' | 'es', person: Person, form: string): string[] {
  const out = [form]
  for (const p of PRONOUNS[language][person]) {
    out.push(language === 'fr' && p === 'je' && /^[aeiouéèêhâîôûy]/.test(form) ? `j'${form}` : `${p} ${form}`)
  }
  return out
}
