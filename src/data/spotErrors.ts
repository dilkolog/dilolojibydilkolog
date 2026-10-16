import type { TargetLanguage } from '../engine/types'
import type { GrammarLog } from '../engine/grammar'
import type { Rng } from '../engine/rng'

export interface SpotErrorItem {
  id: string
  language: TargetLanguage
  level: 'B1' | 'B2' | 'C1'
  /** Sentence with the error in place (words space-separated) */
  sentence: string
  /** 0-based token index in sentence.split(' ') */
  errorIndex: number
  /** The faulty word token */
  faulty: string
  /** The correct replacement */
  correct: string
  /** 2 plausible distractors for multiple choice */
  distractors: string[]
  /** Detailed Turkish pedagogical rule explanation */
  explanation: string
  /** Grammatical rule category */
  rule: string
}

export const SPOT_ERRORS: SpotErrorItem[] = [
  // ── French (FR) B2/C1 Traps ──────────────────────────────────────────────
  {
    id: 'fr-spot-01',
    language: 'fr',
    level: 'B2',
    sentence: "Les lettres qu'il a écrit hier sont parties ce matin.",
    errorIndex: 4,
    faulty: 'écrit',
    correct: 'écrites',
    distractors: ['écrite', 'écris'],
    rule: 'Participe passé COD antécédent',
    explanation:
      "Avoir fiiliyle kurulan geçmiş zamanlarda, nesne (COD: 'les lettres' — dişil çoğul) fiilden önce gelirse geçmiş zaman sıfat-fiili nesneyle cinsiyet ve sayı yönünden tam uyum sağlar (écrites).",
  },
  {
    id: 'fr-spot-02',
    language: 'fr',
    level: 'B1',
    sentence: 'Il faut absolument que tu vas chez le médecin.',
    errorIndex: 5,
    faulty: 'vas',
    correct: 'ailles',
    distractors: ['vais', 'allez'],
    rule: 'Subjonctif obligatoire',
    explanation:
      "'Il faut que' zorunluluk bildiren temel bir ifadedir ve ardından daima istek kipi (subjonctif) gerektirir. 'Aller' fiilinin 'tu' şahsı için subjonctif çekimi 'ailles'dir.",
  },
  {
    id: 'fr-spot-03',
    language: 'fr',
    level: 'B2',
    sentence: 'Bien qu’il fait très froid, nous sortons marcher.',
    errorIndex: 2,
    faulty: 'fait',
    correct: 'fasse',
    distractors: ['fera', 'ferait'],
    rule: 'Subjonctif après bien que',
    explanation:
      "'-e rağmen' anlamındaki 'bien que' bağlacı her zaman subjonctif kipi gerektirir. 'Faire' fiilinin subjonctif présent çekimi 'fasse' olur.",
  },
  {
    id: 'fr-spot-04',
    language: 'fr',
    level: 'B2',
    sentence: 'Après être arrivé à Paris, elle a commencé son stage.',
    errorIndex: 2,
    faulty: 'arrivé',
    correct: 'arrivée',
    distractors: ['arrivées', 'arrivant'],
    rule: 'Accord participe passé avec être',
    explanation:
      "'Être' yardımcı fiiliyle geçmiş zaman mastarı (infinitif passé) kullanıldığında, eylemi gerçekleştiren özne dişil ('elle') olduğundan participe passé dişil takısı alır ('arrivée').",
  },
  {
    id: 'fr-spot-05',
    language: 'fr',
    level: 'B1',
    sentence: "Si j'aurais su la réponse, je te l'aurais dite.",
    errorIndex: 1,
    faulty: "j'aurais",
    correct: "j'avais",
    distractors: ["j'ai", "j'eus"],
    rule: 'Si conditionnel interdit',
    explanation:
      "Fransızcada 'si' şart ekinden hemen sonra asla koşul kipi (conditionnel: aurais) gelmez! Geçmişe dönük gerçekleşmemiş şartlarda 'si + plus-que-parfait' (si j'avais su) kullanılır.",
  },
  {
    id: 'fr-spot-06',
    language: 'fr',
    level: 'B1',
    sentence: 'Elle chante beaucoup meilleur que son frère aîné.',
    errorIndex: 3,
    faulty: 'meilleur',
    correct: 'mieux',
    distractors: ['bonne', 'meilleure'],
    rule: 'Adverbe mieux vs adjectif meilleur',
    explanation:
      "Şarkı söylemek ('chanter') bir fiildir ve fiiller zarfla nitelenir. 'Bien' zarfının üstünlük derecesi 'mieux'dür. 'Meilleur' ise sadece isimleri niteleyen bir sıfattır.",
  },
  {
    id: 'fr-spot-07',
    language: 'fr',
    level: 'B2',
    sentence: 'Je lui ai vu hier après-midi au musée.',
    errorIndex: 1,
    faulty: 'lui',
    correct: "l'",
    distractors: ['leur', 'lequel'],
    rule: 'Pronom COD vs COI',
    explanation:
      "'Voir' doğrudan nesne (COD) alan geçişli bir fiildir ('voir quelqu'un'). Dolaylı nesne zamiri olan 'lui' yerine doğrudan nesne zamiri olan 'le/la' (sesli harf önünde 'l'') kullanılmalıdır.",
  },
  {
    id: 'fr-spot-08',
    language: 'fr',
    level: 'B1',
    sentence: "Nous n'avons pas des doutes sur son honnêteté.",
    errorIndex: 3,
    faulty: 'des',
    correct: 'de',
    distractors: ['du', 'les'],
    rule: 'Négation absolue avec de',
    explanation:
      "Doğrudan nesne alan tam olumsuz cümlelerde (pas / plus / jamais), 'un / une / des' belgisiz ve partitif artikeller 'de' (veya d') haline dönüşür.",
  },
  {
    id: 'fr-spot-09',
    language: 'fr',
    level: 'B2',
    sentence: 'Elle s’est lavé avant de sortir de la maison.',
    errorIndex: 2,
    faulty: 'lavé',
    correct: 'lavée',
    distractors: ['lavées', 'lavant'],
    rule: 'Accord verbe pronominal réfléchi',
    explanation:
      "Dönüşlü fiillerde (verbes pronominaux) fiilden sonra ayrı bir doğrudan nesne yoksa ve 'se' zamiri doğrudan nesneyi karşılıyorsa participe passé özneyle uyum sağlar (dişil tekil: lavée).",
  },
  {
    id: 'fr-spot-10',
    language: 'fr',
    level: 'C1',
    sentence: "Malgré qu'il soit fatigué, il a fini le projet.",
    errorIndex: 0,
    faulty: 'Malgré',
    correct: 'Bien',
    distractors: ['Puisque', 'Comme'],
    rule: "Malgré que est incorrect",
    explanation:
      "Fransızca standart gramerinde 'malgré que' yapısı hatalı kabul edilir (malgré yalnızca isim öbeği alır: 'malgré sa fatigue'). Yan cümle bağlacı olarak 'bien qu'il soit' kullanılmalıdır.",
  },
  {
    id: 'fr-spot-11',
    language: 'fr',
    level: 'B2',
    sentence: 'Ce livre contient deux cents cinquante pages passionnantes.',
    errorIndex: 4,
    faulty: 'cents',
    correct: 'cent',
    distractors: ['centes', 'centaine'],
    rule: 'Invariabilité de cent',
    explanation:
      "'Cent' sayısı, kendisinden sonra başka bir sayısal değer geldiğinde (burada 'cinquante') çoğul takısı 's' almaz; değişmez kalır (deux cent cinquante).",
  },
  {
    id: 'fr-spot-12',
    language: 'fr',
    level: 'B2',
    sentence: 'C’est une décision que je me réjouis profondément.',
    errorIndex: 3,
    faulty: 'que',
    correct: 'dont',
    distractors: ['qui', 'laquelle'],
    rule: 'Pronom relatif dont avec de',
    explanation:
      "'Se réjouir de quelque chose' yapısı 'de' edatı aldığı için doğru ilgi zamiri 'dont' olmalıdır ('que' doğrudan nesneler içindir).",
  },
  {
    id: 'fr-spot-13',
    language: 'fr',
    level: 'B1',
    sentence: 'Je préfère le café que le thé le matin.',
    errorIndex: 4,
    faulty: 'que',
    correct: 'au',
    distractors: ['à', 'de'],
    rule: 'Préférer A à B',
    explanation:
      "'Préférer' fiilinde iki tercih arasında 'que' kullanılmaz; 'préférer quelque chose à autre chose' (à + le = au) yapısı kullanılır.",
  },
  {
    id: 'fr-spot-14',
    language: 'fr',
    level: 'B2',
    sentence: 'Tous les documents que tu as envoyé sont arrivés.',
    errorIndex: 6,
    faulty: 'envoyé',
    correct: 'envoyés',
    distractors: ['envoyée', 'envoyant'],
    rule: 'Accord participe passé COD antécédent',
    explanation:
      "'Avoir' ile çekimlenen fiilde doğrudan nesne 'tous les documents' (eril çoğul) fiilden önce geldiği için 'envoyés' biçiminde çoğul uyumu zorunludur.",
  },
  {
    id: 'fr-spot-15',
    language: 'fr',
    level: 'B2',
    sentence: 'Avant que tu pars demain, viens me voir.',
    errorIndex: 3,
    faulty: 'pars',
    correct: 'partes',
    distractors: ['partiras', 'parti'],
    rule: 'Subjonctif après avant que',
    explanation:
      "'Avant que' (önce) zaman bağlacı her zaman subjonctif kipi gerektirir. 'Partir' fiilinin 'tu' şahsı için subjonctif çekimi 'partes'dir.",
  },

  // ── Spanish (ES) B2/C1 Traps ──────────────────────────────────────────────
  {
    id: 'es-spot-01',
    language: 'es',
    level: 'B2',
    sentence: 'Aunque está lloviendo mañana, iremos de excursión al campo.',
    errorIndex: 1,
    faulty: 'está',
    correct: 'esté',
    distractors: ['estará', 'estuviera'],
    rule: 'Subjuntivo con aunque en futuro',
    explanation:
      "'Aunque' bağlacı henüz gerçekleşmemiş, geleceğe ait belirsiz veya varsayımsal bir durumu aktarırken indicativo değil daima subjuntivo gerektirir ('esté lloviendo').",
  },
  {
    id: 'es-spot-02',
    language: 'es',
    level: 'B1',
    sentence: 'Habían muchas personas esperando la llegada del tren.',
    errorIndex: 0,
    faulty: 'Habían',
    correct: 'Había',
    distractors: ['Hubieron', 'Ha habido'],
    rule: 'Haber impersonal siempre singular',
    explanation:
      "Var olmak anlamındaki kişisiz 'haber' fiili (hay, había, hubo), arkasından çoğul bir nesne gelse dahi daima 3. tekil şahıs çekilir ('Había muchas personas'). Çoğul çekilmesi İspanyolcanın en yaygın tuzaklarındandır.",
  },
  {
    id: 'es-spot-03',
    language: 'es',
    level: 'B1',
    sentence: 'Si tendría más tiempo libre, estudiaría otro idioma.',
    errorIndex: 1,
    faulty: 'tendría',
    correct: 'tuviera',
    distractors: ['tengo', 'tendré'],
    rule: 'Si condicional con subjuntivo imperfecto',
    explanation:
      "İspanyolcada 'si' şart ekinden sonra asla koşul kipi (condicional: tendría) kullanılmaz! Şimdiki/gelecekteki varsayımlarda 'si + subjuntivo imperfecto' (tuviera veya tuviese) kullanılır.",
  },
  {
    id: 'es-spot-04',
    language: 'es',
    level: 'B1',
    sentence: 'No creo que él dice la verdad sobre lo ocurrido.',
    errorIndex: 4,
    faulty: 'dice',
    correct: 'diga',
    distractors: ['dirá', 'dijo'],
    rule: 'Subjuntivo tras negación de creencia',
    explanation:
      "'No creer que', 'no pensar que' gibi inanç ve kanaatin olumsuzu belirtildiğinde yan cümle indicativo değil zorunlu olarak subjuntivo kipine geçer ('no creo que diga').",
  },
  {
    id: 'es-spot-05',
    language: 'es',
    level: 'B1',
    sentence: 'Me gusta mucho las canciones tradicionales de este país.',
    errorIndex: 1,
    faulty: 'gusta',
    correct: 'gustan',
    distractors: ['gustará', 'gusten'],
    rule: 'Concordancia con el verbo gustar',
    explanation:
      "'Gustar' fiilinde hoşlanılan unsur cümlenin öznesidir. Öznenin çoğul olduğu durumlarda ('las canciones') fiil de çoğul çekilmelidir ('Me gustan las canciones').",
  },
  {
    id: 'es-spot-06',
    language: 'es',
    level: 'B2',
    sentence: 'La agua de esta fuente cristalina está muy fría.',
    errorIndex: 0,
    faulty: 'La',
    correct: 'El',
    distractors: ['Un', 'Al'],
    rule: "Artículo el ante 'a' tónica",
    explanation:
      "Vurgulu 'a' veya 'ha' sesiyle başlayan dişil tekil isimlerin önüne telaffuz kakofonisini önlemek için 'la' yerine 'el' artikeli getirilir ('el agua', 'el águila'). Cümledeki sıfatlar ise dişil kalır ('fría').",
  },
  {
    id: 'es-spot-07',
    language: 'es',
    level: 'B2',
    sentence: 'Cuando llegarás a casa esta noche, llámame por teléfono.',
    errorIndex: 1,
    faulty: 'llegarás',
    correct: 'llegues',
    distractors: ['llegas', 'llegaste'],
    rule: 'Subjuntivo temporal con cuando',
    explanation:
      "'Cuando' zaman bağlacı geleceğe yönelik bir eylemi bağlarken gelecek zaman (futuro: llegarás) alamaz; daima subjuntivo kipi gerektirir ('Cuando llegues a casa...').",
  },
  {
    id: 'es-spot-08',
    language: 'es',
    level: 'B1',
    sentence: 'Para que tú sabes la verdad, te contaré la historia.',
    errorIndex: 3,
    faulty: 'sabes',
    correct: 'sepas',
    distractors: ['sabrás', 'supieras'],
    rule: 'Subjuntivo con para que',
    explanation:
      "Amaç bildiren 'para que' (–sın diye) bağlacından sonra daima subjuntivo kipi kullanılır. 'Saber' fiilinin 'tú' şahsı için subjuntivo çekimi 'sepas'tır.",
  },
  {
    id: 'es-spot-09',
    language: 'es',
    level: 'B2',
    sentence: 'Han habido muchos accidentes en esta carretera este año.',
    errorIndex: 0,
    faulty: 'Han',
    correct: 'Ha',
    distractors: ['Hubieron', 'Habían'],
    rule: 'Haber impersonal en pretérito perfecto',
    explanation:
      "Kişisiz 'haber' fiili pretérito perfecto composto zamanında daima tekil çekilir ('Ha habido'). Arkasından çoğul isim gelse bile 'han habido' demek gramer hatasıdır.",
  },
  {
    id: 'es-spot-10',
    language: 'es',
    level: 'B1',
    sentence: 'Ojalá que mañana no llueve durante el partido final.',
    errorIndex: 4,
    faulty: 'llueve',
    correct: 'llueva',
    distractors: ['lloverá', 'lloviera'],
    rule: 'Subjuntivo con ojalá',
    explanation:
      "Dilek ve temenni bildiren 'Ojalá' (umarım / keşke) ifadesinden sonra her zaman subjuntivo kipi kullanılır ('Ojalá no llueva').",
  },
  {
    id: 'es-spot-11',
    language: 'es',
    level: 'B2',
    sentence: 'Dudo que ellos pueden terminar todo el proyecto hoy.',
    errorIndex: 3,
    faulty: 'pueden',
    correct: 'puedan',
    distractors: ['podrán', 'pudiesen'],
    rule: 'Subjuntivo con verbos de duda',
    explanation:
      "'Dudar que' şüphe fiilinden sonra gelen yan cümle zorunlu olarak subjuntivo kipine geçer ('dudo que puedan').",
  },
  {
    id: 'es-spot-12',
    language: 'es',
    level: 'B2',
    sentence: 'Ella es más mayor que su hermana menor María.',
    errorIndex: 2,
    faulty: 'más',
    correct: 'mucho',
    distractors: ['tan', 'muy'],
    rule: 'Comparativo sintético mayor',
    explanation:
      "'Mayor' sözcüğü zaten 'daha büyük / yaşlı' anlamına gelen sentetik bir karşılaştırma sıfatıdır. Başına 'más' getirilemez; pekiştirmek için 'mucho mayor' denir.",
  },
  {
    id: 'es-spot-13',
    language: 'es',
    level: 'B2',
    sentence: 'Pienso en viajar pero soñé de volar anoche.',
    errorIndex: 5,
    faulty: 'de',
    correct: 'con',
    distractors: ['en', 'a'],
    rule: 'Régimen preposicional soñar con',
    explanation:
      "İspanyolcada rüya görmek veya hayal kurmak 'soñar con' edat kalıbıyla kullanılır; 'soñar de' demek yanlıştır.",
  },
  {
    id: 'es-spot-14',
    language: 'es',
    level: 'B1',
    sentence: 'Es necesario que nosotros vamos al hospital ahora mismo.',
    errorIndex: 4,
    faulty: 'vamos',
    correct: 'vayamos',
    distractors: ['íbamos', 'iremos'],
    rule: 'Subjuntivo con expresiones impersonales',
    explanation:
      "'Es necesario que' kişisiz gereklilik yapısı ardından gelen yan cümleyi daima subjuntivo kipine bağlar ('vayamos').",
  },
  {
    id: 'es-spot-15',
    language: 'es',
    level: 'B2',
    sentence: 'No conozco a nadie que sabe la respuesta correcta.',
    errorIndex: 5,
    faulty: 'sabe',
    correct: 'sepa',
    distractors: ['sabrá', 'supo'],
    rule: 'Subjuntivo con antecedente negativo',
    explanation:
      "Varlığı bilinmeyen ya da olumsuz bir öncüle ('nadie', 'ninguno') bağlı sıfat yan cümlelerinde fiil subjuntivo olmalıdır ('nadie que sepa').",
  },

  // ── English (EN) B2/C1 Traps ──────────────────────────────────────────────
  {
    id: 'en-spot-01',
    language: 'en',
    level: 'B2',
    sentence: 'If I was you, I would accept the job offer.',
    errorIndex: 2,
    faulty: 'was',
    correct: 'were',
    distractors: ['am', 'would be'],
    rule: 'Hypothetical subjunctive were',
    explanation:
      "İkinci tip şart cümlelerinde (Second Conditional) ve varsayımsal durumlarda tekil öznelerle dahi standart ve prestijli kullanımda 'was' yerine 'were' tercih edilir ('If I were you').",
  },
  {
    id: 'en-spot-02',
    language: 'en',
    level: 'B2',
    sentence: 'She insisted that he goes to the hospital immediately.',
    errorIndex: 4,
    faulty: 'goes',
    correct: 'go',
    distractors: ['went', 'gone'],
    rule: 'Mandative subjunctive base form',
    explanation:
      "'Insist', 'demand', 'recommend' gibi talep ve öneri bildiren fiillerden sonra gelen 'that' cümleciğinde eylem yalın (base form subjunctive) kalır ('he go').",
  },
  {
    id: 'en-spot-03',
    language: 'en',
    level: 'B1',
    sentence: 'I look forward to meet you at the conference.',
    errorIndex: 4,
    faulty: 'meet',
    correct: 'meeting',
    distractors: ['met', 'have met'],
    rule: 'Gerund after preposition to',
    explanation:
      "'Look forward to' deyimindeki 'to' bir mastar eki (infinitive) değil, bir edattır (preposition). Edatlardan sonra gelen eylemler daima '-ing' (gerund) takısı alır ('to meeting').",
  },
  {
    id: 'en-spot-04',
    language: 'en',
    level: 'B2',
    sentence: 'Neither the director nor the actors was ready yesterday.',
    errorIndex: 6,
    faulty: 'was',
    correct: 'were',
    distractors: ['is', 'are'],
    rule: 'Proximity agreement with neither/nor',
    explanation:
      "'Neither... nor' yapısında yüklem kendisine en yakın olan özneye uyar. Fiile en yakın özne çoğul olan 'the actors' olduğu için fiil de çoğul olmalıdır ('were').",
  },
  {
    id: 'en-spot-05',
    language: 'en',
    level: 'B1',
    sentence: 'She has been married with an Italian architect.',
    errorIndex: 4,
    faulty: 'with',
    correct: 'to',
    distractors: ['at', 'by'],
    rule: 'Preposition married to',
    explanation:
      "İngilizcede biriyle evli olmak 'married with' değil, 'married to' edatıyla kullanılır ('married to an architect').",
  },
  {
    id: 'en-spot-06',
    language: 'en',
    level: 'B2',
    sentence: 'It is high time you start studying for finals.',
    errorIndex: 5,
    faulty: 'start',
    correct: 'started',
    distractors: ['would start', 'have started'],
    rule: "Past subjunctive with it's high time",
    explanation:
      "'It is high time / It is about time' (zamanı geldi de geçiyor) yapısından sonra gelen yan cümlede fiil geçmiş zaman (past subjunctive) formunda kullanılır ('you started').",
  },
  {
    id: 'en-spot-07',
    language: 'en',
    level: 'B1',
    sentence: 'The police is investigating the recent burglary.',
    errorIndex: 2,
    faulty: 'is',
    correct: 'are',
    distractors: ['was', 'has'],
    rule: 'Plural noun police',
    explanation:
      "'Police' sözcüğü İngilizcede her zaman çoğul kabul edilen topluluk isimlerindendir ve daima çoğul fiil alır ('The police are investigating').",
  },
  {
    id: 'en-spot-08',
    language: 'en',
    level: 'B1',
    sentence: 'He said me that the train had left.',
    errorIndex: 1,
    faulty: 'said',
    correct: 'told',
    distractors: ['spoke', 'talked'],
    rule: 'Tell someone vs say to someone',
    explanation:
      "'Say' fiilinden sonra dolaysız şahıs zamiri (me, him vb.) gelemez; 'say to someone' ya da doğrudan 'tell someone' yapısı kullanılır ('He told me that...').",
  },
  {
    id: 'en-spot-09',
    language: 'en',
    level: 'B1',
    sentence: 'He works very hardly to support his family.',
    errorIndex: 3,
    faulty: 'hardly',
    correct: 'hard',
    distractors: ['harder', 'hardest'],
    rule: 'Hard vs hardly',
    explanation:
      "'Hard' hem sıfat hem de 'gayretle, sıkıca' anlamına gelen bir zarftır. 'Hardly' ise 'neredeyse hiç, güçbela' anlamına gelir. 'Çok sıkı çalışmak' için 'works hard' denmelidir.",
  },
  {
    id: 'en-spot-10',
    language: 'en',
    level: 'B1',
    sentence: 'The information you provided were extremely helpful.',
    errorIndex: 4,
    faulty: 'were',
    correct: 'was',
    distractors: ['are', 'being'],
    rule: 'Uncountable noun information',
    explanation:
      "'Information' sayılamayan (uncountable) bir isimdir; çoğul eki alamaz ve yüklemi daima tekil olur ('was helpful').",
  },
  {
    id: 'en-spot-11',
    language: 'en',
    level: 'B2',
    sentence: 'She is capable of solve this complex mathematical equation.',
    errorIndex: 4,
    faulty: 'solve',
    correct: 'solving',
    distractors: ['solved', 'solution'],
    rule: 'Gerund after preposition of',
    explanation:
      "'Capable of' edat öbeğinden sonra gelen eylemler daima '-ing' (gerund) takısı almalıdır ('capable of solving').",
  },
  {
    id: 'en-spot-12',
    language: 'en',
    level: 'B1',
    sentence: 'He gave me a good advice about investing.',
    errorIndex: 3,
    faulty: 'a',
    correct: 'some',
    distractors: ['an', 'many'],
    rule: 'Uncountable noun advice',
    explanation:
      "'Advice' sayılamaz bir isimdir; doğrudan 'a/an' artikeli alamaz. Miktar belirtmek için 'some advice' veya 'a piece of advice' kullanılır.",
  },
  {
    id: 'en-spot-13',
    language: 'en',
    level: 'B2',
    sentence: 'I would rather you stay at home tonight.',
    errorIndex: 4,
    faulty: 'stay',
    correct: 'stayed',
    distractors: ['staying', 'will stay'],
    rule: 'Would rather with subject requires past tense',
    explanation:
      "'Would rather' kalıbından sonra başka bir özne geldiğinde ('would rather you...'), şimdiki zaman kastedilse bile fiil past subjunctive çekilir ('would rather you stayed').",
  },
  {
    id: 'en-spot-14',
    language: 'en',
    level: 'B2',
    sentence: 'The scenery in the northern mountains were stunning.',
    errorIndex: 6,
    faulty: 'were',
    correct: 'was',
    distractors: ['are', 'been'],
    rule: 'Uncountable noun scenery',
    explanation:
      "'Scenery' (manzara) sayılamayan tekil bir isimdir; 'mountains' çoğul olsa da cümlenin öznesi 'scenery' olduğu için fiil 'was' olmalıdır.",
  },
  {
    id: 'en-spot-15',
    language: 'en',
    level: 'B1',
    sentence: 'I have lived in this city since ten years.',
    errorIndex: 6,
    faulty: 'since',
    correct: 'for',
    distractors: ['from', 'during'],
    rule: 'For vs since with duration',
    explanation:
      "Geçen sürenin toplam miktarı (süreç) aktarılırken 'since' değil 'for' kullanılır ('for ten years'). 'Since' ise eylemin başladığı başlangıç anını belirtir ('since 2014').",
  },
]

export const SPOT_ROUND_SIZE = 8

/**
 * Builds a round of Spot the Error questions, prioritizing previously missed questions
 * recorded in the user's grammar log.
 */
export function spotErrorRound(
  language: TargetLanguage,
  count: number,
  rng: Rng,
  log?: GrammarLog,
): SpotErrorItem[] {
  const pool = SPOT_ERRORS.filter((item) => item.language === language)
  if (!pool.length) return []

  // Weight previously failed questions higher
  const scored = pool.map((item) => {
    const entry = log?.[item.id]
    const misses = entry ? Math.max(0, entry.wrong - entry.ok) : 0
    return { item, weight: 1 + misses * 3 + rng() * 0.5 }
  })
  scored.sort((a, b) => b.weight - a.weight)
  return scored.slice(0, Math.min(count, pool.length)).map((s) => s.item)
}
