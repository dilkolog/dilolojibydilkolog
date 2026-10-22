import { normalize } from '../engine/answerCheck'
import { shuffle, type Rng } from '../engine/rng'
import type { TargetLanguage } from '../engine/types'

/** A sentence with a gap that only one of the twins fills, in the form the sentence needs ("Je ___ nager." → sais, not connais). */
export interface ConfusableDrill {
  /** The sentence with `___` where the word goes. */
  text: string
  right: string
  wrong: string
  /** The sentence (with the right word) in Turkish. */
  tr: string
}

export interface ConfusableRule {
  id: string
  language: TargetLanguage
  words: [string, string]
  meanings: [string, string]
  distinction: string
  example?: [string, string]
  drills?: ConfusableDrill[]
}

/** `confusables/*.json`: more rules, and drills for the rules below (an entry with only an id and drills adds to that rule). */
interface ConfusableFile {
  language: TargetLanguage
  source: string
  rules: (ConfusableRule | { id: string; drills: ConfusableDrill[] })[]
}
const FILES = import.meta.glob<ConfusableFile>('./confusables/*.json', { import: 'default', eager: true })

const BASE_RULES: ConfusableRule[] = [
  // Fransızca
  {
    id: 'fr:jour-journee',
    language: 'fr',
    words: ['jour', 'journée'],
    meanings: ['gün (sayı/tarih)', 'gün (yaşanan süre)'],
    distinction: 'Jour zaman birimi olarak gün sayısını (üç gün, her gün), journée ise sabahından akşamına yaşanan süreyi (iyi günler, bütün gün) anlatır.',
    example: ['Je reste trois jours.', 'Passez une bonne journée!'],
  },
  {
    id: 'fr:an-annee',
    language: 'fr',
    words: ['an', 'année'],
    meanings: ['yıl (sayı/yaş)', 'yıl (süre/içerik)'],
    distinction: 'An yaş ve sayı belirtirken (j\'ai 25 ans), année o yıl boyunca yaşanan süreci ve içeriği anlatırken (bonne année, cette année) kullanılır.',
    example: ["J'ai vécu deux ans à Paris.", "C'était une belle année."],
  },
  {
    id: 'fr:savoir-connaitre',
    language: 'fr',
    words: ['savoir', 'connaître'],
    meanings: ['bilgi bilmek, yapabilmek', 'tanımak, aşina olmak'],
    distinction: 'Savoir bir bilgiyi ya da bir eylemi yapmayı bilmektir (+ mastar/cümlecik); connaître bir insanı, şehri veya nesneyi tanımak/bilmektir (+ isim).',
    example: ['Je sais nager et je sais où il habite.', 'Je connais ce restaurant et cette personne.'],
  },
  {
    id: 'fr:attendre-entendre',
    language: 'fr',
    words: ['attendre', 'entendre'],
    meanings: ['beklemek', 'duymak, işitmek'],
    distinction: 'Attendre birinin gelmesini ya da bir şeyin olmasını beklemektir; entendre kulakla bir sesi duymaktır (İngilizce attend/katılmak ile karıştırılmamalıdır).',
    example: ["J'attends le bus.", "J'entends un bruit."],
  },
  {
    id: 'fr:amener-apporter',
    language: 'fr',
    words: ['amener', 'apporter'],
    meanings: ['canlı getirmek', 'nesne getirmek'],
    distinction: 'Amener kendi yürüyebilen insan ve hayvanları yanında getirmektir; apporter elde/çantada taşınabilen nesneleri getirmektir.',
    example: ['Tu peux amener ton ami.', 'Pense à apporter du pain.'],
  },
  {
    id: 'fr:visiter-rendre-visite',
    language: 'fr',
    words: ['visiter', 'rendre visite à'],
    meanings: ['yer/şehir gezmek', 'bir insanı ziyaret etmek'],
    distinction: 'Visiter sadece mekanlar, şehirler ve müzeler için kullanılır; bir insanı ziyaret etmek için daima "rendre visite à quelqu\'un" denir.',
    example: ['Nous visitons le musée du Louvre.', 'Je rends visite à mes grands-parents.'],
  },

  // İspanyolca
  {
    id: 'es:ser-estar',
    language: 'es',
    words: ['ser', 'estar'],
    meanings: ['öz/kalıcı durum', 'konum/geçici durum'],
    distinction: 'Ser kimlik, uyruk, meslek ve temel özellikleri; estar ise bulunulan konumu, anlık duyguları ve değişebilir durumları anlatır.',
    example: ['Soy médico y soy de Madrid.', 'Estoy en casa y estoy muy cansado.'],
  },
  {
    id: 'es:por-para',
    language: 'es',
    words: ['por', 'para'],
    meanings: ['neden, vasıta, süre', 'hedef, amaç, son tarih'],
    distinction: 'Por sebepleri, aracılığı ve rotayı (geçerek) gösterir; para varış hedefini, kullanım amacını ve teslim tarihini gösterir.',
    example: ['Lo hago por ti y viajo por tren.', 'Este regalo es para ti, para estudiar.'],
  },
  {
    id: 'es:saber-conocer',
    language: 'es',
    words: ['saber', 'conocer'],
    meanings: ['bilgi/beceri bilmek', 'kişi/yer tanımak'],
    distinction: 'Saber bir gerçeği bilmek veya beceriye sahip olmaktır (+ mastar); conocer bir kişiyi, yeri veya eseri bizzat tanımaktır (+ doğrudan nesne).',
    example: ['Sé hablar español y sé la respuesta.', 'Conozco a María y conozco Barcelona.'],
  },
  {
    id: 'es:pedir-preguntar',
    language: 'es',
    words: ['pedir', 'preguntar'],
    meanings: ['istemek, sipariş etmek', 'soru sormak'],
    distinction: 'Pedir bir nesne, yardım veya yemek siparişi istemektir; preguntar ise bilgi almak amacıyla soru sormaktır.',
    example: ['Pido la cuenta en el restaurante.', 'Pregunto la hora en la calle.'],
  },
  {
    id: 'es:llevar-traer',
    language: 'es',
    words: ['llevar', 'traer'],
    meanings: ['götürmek (oraya)', 'getirmek (buraya)'],
    distinction: 'Llevar bulunulan noktadan başka bir yere götürmektir; traer başka bir yerden konuşmacının olduğu yere getirmektir.',
    example: ['Llevo los libros a la biblioteca.', 'Traigo la comida a casa.'],
  },

  // İngilizce
  {
    id: 'en:affect-effect',
    language: 'en',
    words: ['affect', 'effect'],
    meanings: ['etkilemek (fiil)', 'etki (isim)'],
    distinction: 'Affect çoğu zaman fiildir (eylem: havanın ruh halini etkilemesi); effect ise isimdir (etki: ilacın yan etkisi).',
    example: ['The cold weather affects my joints.', 'The medicine had an immediate effect.'],
  },
  {
    id: 'en:borrow-lend',
    language: 'en',
    words: ['borrow', 'lend'],
    meanings: ['ödünç almak', 'ödünç vermek'],
    distinction: 'Borrow birinden geçici olarak bir şeyi almaktır (from); lend ise başkasına geçici olarak bir şeyini vermektir (to).',
    example: ['Can I borrow your pen?', 'I can lend you ten dollars.'],
  },
  {
    id: 'en:make-do',
    language: 'en',
    words: ['make', 'do'],
    meanings: ['üretmek, yapmak', 'eylem/iş yapmak'],
    distinction: 'Make yeni bir şey üretmek, inşa etmek veya ortaya çıkarmaktır (make coffee, make a decision); do ise görev, ödev ve genel eylemlerdir (do homework, do sport).',
    example: ['I make a fresh cup of coffee.', 'I have to do my homework now.'],
  },
  {
    id: 'en:remember-remind',
    language: 'en',
    words: ['remember', 'remind'],
    meanings: ['hatırlamak (kendin)', 'hatırlatmak (birine)'],
    distinction: 'Remember kendi zihninde hatırlamaktır; remind başka birinin aklına getirmek, hatırlatmaktır (+ nesne zamiri: remind me).',
    example: ['I remember our first trip.', 'Please remind me to call mom.'],
  },
  {
    id: 'en:say-tell',
    language: 'en',
    words: ['say', 'tell'],
    meanings: ['söylemek (ifade)', 'anlatmak (kişiye)'],
    distinction: 'Say söylenen sözün kendisine odaklanır (say that); tell ise bilgiyi bir kişiye aktarmaya odaklanır ve hemen ardından kişi zamiri ister (tell me, tell him).',
    example: ['He said he was tired.', 'He told me the secret.'],
  },
  {
    id: 'fr:voir-regarder',
    language: 'fr',
    words: ['voir', 'regarder'],
    meanings: ['görmek (istemsiz/gözle algılama)', 'bakmak, izlemek (istemli/dikkatle)'],
    distinction: 'Voir gözün kendiliğinden algılamasıdır (görmek); regarder ise dikkati vererek bilinçli bakmak veya izlemektir (filme bakmak).',
    example: ['Je vois un oiseau par la fenêtre.', 'Je regarde un bon film ce soir.'],
  },
  {
    id: 'es:mirar-ver',
    language: 'es',
    words: ['mirar', 'ver'],
    meanings: ['bakmak, izlemek (dikkatle)', 'görmek (algılamak)'],
    distinction: 'Mirar bir yere dikkatle yönelmek ve izlemektir; ver ise gözün görme duyusuyla nesneyi fark etmesidir.',
    example: ['Miro las estrellas en la noche.', 'Veo a mucha gente en la calle.'],
  },
  {
    id: 'en:hear-listen',
    language: 'en',
    words: ['hear', 'listen'],
    meanings: ['duymak (istemsiz işitme)', 'dinlemek (dikkatle kulak verme)'],
    distinction: 'Hear kulağa gelen bir sesi fark etmektir (istemsiz); listen to ise dikkat kesilerek müzik veya birini dinlemektir (istemli).',
    example: ['Did you hear that strange noise?', 'I always listen to the radio.'],
  },
  {
    id: 'en:lose-loose',
    language: 'en',
    words: ['lose', 'loose'],
    meanings: ['kaybetmek (fiil)', 'gevşek, bol (sıfat)'],
    distinction: 'Lose tek "o" ile fiildir (kaybetmek, yenilmek); loose çift "o" ile sıfattır (gevşek vida, bol kıyafet).',
    example: ['Don\'t lose your keys.', 'This shirt is too loose for me.'],
  },
]

/** The rules above with the files' drills put in, then the files' own rules. */
function withFiles(base: ConfusableRule[]): ConfusableRule[] {
  const byId = new Map(base.map((r) => [r.id, { ...r, drills: [...(r.drills ?? [])] }]))
  for (const file of Object.values(FILES))
    for (const entry of file.rules) {
      const known = byId.get(entry.id)
      if (known) known.drills.push(...(entry.drills ?? []))
      else if ('words' in entry) byId.set(entry.id, { ...entry, drills: [...(entry.drills ?? [])] })
    }
  return [...byId.values()]
}

export const CONFUSABLE_RULES: ConfusableRule[] = withFiles(BASE_RULES)

/** Finds a rule distinguishing two confusable words or for a given lemma. */
export function confusableRuleFor(word: string, language: TargetLanguage, otherWord?: string): ConfusableRule | undefined {
  const norm = normalize(word).toLocaleLowerCase()
  const otherNorm = otherWord ? normalize(otherWord).toLocaleLowerCase() : undefined

  return CONFUSABLE_RULES.find((r) => {
    if (r.language !== language) return false
    const matchThis = r.words.some((w) => normalize(w).toLocaleLowerCase() === norm)
    if (!matchThis) return false
    if (otherNorm) {
      return r.words.some((w) => normalize(w).toLocaleLowerCase() === otherNorm)
    }
    return true
  })
}

export interface ConfusableQuestion {
  id: string
  rule: ConfusableRule
  prompt: string
  context?: string
  correct: string
  wrong: string
  distinction: string
  /** The sentence in Turkish, shown after the answer (drills only). */
  tr?: string
}

export function buildConfusableQuestions(language: TargetLanguage): ConfusableQuestion[] {
  const rules = CONFUSABLE_RULES.filter((r) => r.language === language)
  const list: ConfusableQuestion[] = []

  for (const r of rules) {
    r.drills?.forEach((d, i) =>
      list.push({ id: `${r.id}:d${i}`, rule: r, prompt: d.text, correct: d.right, wrong: d.wrong, distinction: r.distinction, tr: d.tr }),
    )
    if (r.example) {
      const ex0 = r.example[0]
      const w0Reg = new RegExp(`\\b${r.words[0]}\\b`, 'i')
      if (w0Reg.test(ex0)) {
        list.push({
          id: `${r.id}:q0`,
          rule: r,
          prompt: ex0.replace(w0Reg, '_______'),
          context: r.meanings[0],
          correct: r.words[0],
          wrong: r.words[1],
          distinction: r.distinction,
        })
      }

      const ex1 = r.example[1]
      const w1Reg = new RegExp(`\\b${r.words[1]}\\b`, 'i')
      if (w1Reg.test(ex1)) {
        list.push({
          id: `${r.id}:q1`,
          rule: r,
          prompt: ex1.replace(w1Reg, '_______'),
          context: r.meanings[1],
          correct: r.words[1],
          wrong: r.words[0],
          distinction: r.distinction,
        })
      }
    }

    list.push({
      id: `${r.id}:m0`,
      rule: r,
      prompt: `Hangisi "${r.meanings[0]}" bağlamında kullanılır?`,
      correct: r.words[0],
      wrong: r.words[1],
      distinction: r.distinction,
    })
    list.push({
      id: `${r.id}:m1`,
      rule: r,
      prompt: `Hangisi "${r.meanings[1]}" bağlamında kullanılır?`,
      correct: r.words[1],
      wrong: r.words[0],
      distinction: r.distinction,
    })
  }

  return list
}

export const CONFUSABLE_ROUND = 10
/** A round asks mostly sentences; a couple of "which one means…" questions keep the meanings in view. */
const MEANING_QUESTIONS = 2

/**
 * A round: the sentences missed last time first (up to half the round), then sentences spread over as many pairs as there
 * are, then a couple of meaning questions; shuffled.
 */
export function confusableRound(pool: ConfusableQuestion[], rng: Rng, size = CONFUSABLE_ROUND, missed: ReadonlySet<string> = new Set()): ConfusableQuestion[] {
  const all = shuffle(
    pool.filter((q) => q.tr),
    rng,
  )
  const again = all.filter((q) => missed.has(q.id)).slice(0, Math.floor(size / 2))
  const drills = [...again, ...all.filter((q) => !again.includes(q))]
  const meanings = shuffle(
    pool.filter((q) => !q.tr),
    rng,
  )
  // One drill per pair first, then the rest.
  const firsts: ConfusableQuestion[] = []
  const rest: ConfusableQuestion[] = []
  const seen = new Set<string>()
  for (const q of drills) {
    if (again.includes(q)) firsts.push(q)
    else if (seen.has(q.rule.id)) rest.push(q)
    else {
      seen.add(q.rule.id)
      firsts.push(q)
    }
  }
  const wantMeanings = drills.length ? Math.min(MEANING_QUESTIONS, meanings.length) : size
  const picked = [...firsts, ...rest].slice(0, size - wantMeanings)
  return shuffle([...picked, ...meanings.slice(0, size - picked.length)], rng)
}
