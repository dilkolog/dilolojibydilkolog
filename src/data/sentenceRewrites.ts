import type { TargetLanguage } from '../engine/types'
import type { GrammarLog } from '../engine/grammar'
import type { Rng } from '../engine/rng'

export interface SentenceRewriteItem {
  id: string
  language: TargetLanguage
  level: 'B2' | 'C1'
  /** Original prompt sentence */
  sourceSentence: string
  /** Turkish translation of source sentence */
  sourceTr: string
  /** Mandatory key word that must appear in the solution (upper-case) */
  keyword: string
  /** Beginning of target sentence (before the blank) */
  targetPrefix: string
  /** End of target sentence (after the blank), may be empty */
  targetSuffix: string
  /** Accepted answers for the blank (in lower case or trimmed) */
  acceptedAnswers: string[]
  /** Detailed Turkish pedagogical explanation of the transformation rule */
  explanation: string
}

export const SENTENCE_REWRITES: SentenceRewriteItem[] = [
  // ── French (FR) Sentence Transformations ─────────────────────────────────
  {
    id: 'fr-rw-01',
    language: 'fr',
    level: 'B2',
    sourceSentence: "Bien qu'il fasse très froid dehors, nous sortons nous promener.",
    sourceTr: 'Dışarısı çok soğuk olmasına rağmen yürüyüşe çıkıyoruz.',
    keyword: 'MALGRÉ',
    targetPrefix: 'Nous sortons nous promener',
    targetSuffix: '.',
    acceptedAnswers: ['malgré le grand froid', 'malgré le froid dehors', 'malgré le très grand froid', 'malgré le froid'],
    explanation:
      "'Bien que + subjonctif' bağlaç yapısı, aynı anlamı veren 'malgré + isim öbeği' (malgré le froid) ile dönüştürülür.",
  },
  {
    id: 'fr-rw-02',
    language: 'fr',
    level: 'B2',
    sourceSentence: 'Il est indispensable que tu termines ce rapport avant midi.',
    sourceTr: 'Bu raporu öğleden önce bitirmen şarttır.',
    keyword: 'DOIS',
    targetPrefix: 'Tu',
    targetSuffix: 'avant midi.',
    acceptedAnswers: ['dois terminer ce rapport', 'dois finir ce rapport'],
    explanation:
      "Kişisiz gereklilik yapısı 'il est indispensable que + subjonctif', şahıs öznesiyle 'devoir + mastar' (tu dois terminer ce rapport) olarak ifade edilir.",
  },
  {
    id: 'fr-rw-03',
    language: 'fr',
    level: 'B2',
    sourceSentence: "Je n'ai pas pu assister à la réunion parce que j'étais malade.",
    sourceTr: 'Hasta olduğum için toplantıya katılamadım.',
    keyword: 'CAUSE',
    targetPrefix: "Je n'ai pas pu assister à la réunion",
    targetSuffix: '.',
    acceptedAnswers: ['à cause de ma maladie', 'à cause de la maladie'],
    explanation:
      "Olumsuz sebep bildiren 'parce que' yan cümlesi, 'à cause de + isim' kalıbına dönüştürülür.",
  },
  {
    id: 'fr-rw-04',
    language: 'fr',
    level: 'C1',
    sourceSentence: "Si tu m'avais prévenu à temps, je ne serais pas venu.",
    sourceTr: 'Bana zamanında haber verseydin, gelmezdim.',
    keyword: 'SANS',
    targetPrefix: 'Je ne serais pas venu',
    targetSuffix: '.',
    acceptedAnswers: ['sans ton avertissement', 'sans ton message', 'sans ta mise en garde'],
    explanation:
      "Gerçekleşmemiş geçmiş şart (si + plus-que-parfait), 'sans + isim' (uyarın olmadan) yapısıyla eşdeğer anlam taşır.",
  },
  {
    id: 'fr-rw-05',
    language: 'fr',
    level: 'C1',
    sourceSentence: 'Dès son arrivée à la gare, il a téléphoné à sa mère.',
    sourceTr: 'İstasyona varır varmaz annesini aradı.',
    keyword: 'MOMENT',
    targetPrefix: 'Au',
    targetSuffix: ', il a téléphoné à sa mère.',
    acceptedAnswers: ['moment où il est arrivé à la gare', 'moment de son arrivée à la gare'],
    explanation:
      "'Dès son arrivée' zaman öbeği, 'Au moment où il est arrivé...' yan cümlesiyle dönüştürülür.",
  },
  {
    id: 'fr-rw-06',
    language: 'fr',
    level: 'C1',
    sourceSentence: "Il a pris un taxi afin de ne pas être en retard à l'entretien.",
    sourceTr: 'Mülakata geç kalmamak için taksiye bindi.',
    keyword: 'PEUR',
    targetPrefix: 'Il a pris un taxi',
    targetSuffix: "en retard à l'entretien.",
    acceptedAnswers: ["de peur d'être", "par peur d'être"],
    explanation:
      "Olumsuz amaç bildiren 'afin de ne pas' kalıbı, çekince belirten 'de peur de + mastar' ile eş anlamlıdır.",
  },
  {
    id: 'fr-rw-07',
    language: 'fr',
    level: 'B2',
    sourceSentence: 'Sa réussite brillante est due à son travail acharné.',
    sourceTr: 'Parlak başarısı yoğun çalışmasına dayanıyor.',
    keyword: 'GRÂCE',
    targetPrefix: 'Il a réussi brillamment',
    targetSuffix: '.',
    acceptedAnswers: ['grâce à son travail acharné', 'grâce à son travail'],
    explanation:
      "Olumlu neden bildiren 'être dû à', etken cümlede 'grâce à + isim' (sayesinde) kalıbıyla kurulur.",
  },
  {
    id: 'fr-rw-08',
    language: 'fr',
    level: 'C1',
    sourceSentence: "Je regrette sincèrement de ne pas avoir appris l'espagnol plus jeune.",
    sourceTr: 'Daha gençken İspanyolca öğrenmemiş olduğuma içtenlikle pişmanım.',
    keyword: 'SOUHAITÉ',
    targetPrefix: "J'aurais",
    targetSuffix: "l'espagnol plus jeune.",
    acceptedAnswers: ["souhaité avoir appris", 'souhaité apprendre'],
    explanation:
      "Geçmişe dair pişmanlık 'regretter de ne pas avoir fait', geçmiş koşul kipi 'j'aurais souhaité + mastar' ile ifade edilir.",
  },
  {
    id: 'fr-rw-09',
    language: 'fr',
    level: 'B2',
    sourceSentence: "Il est peu probable qu'il vienne à la soirée ce soir.",
    sourceTr: 'Bu akşamki partiye gelmesi pek olası değil.',
    keyword: 'CHANCE',
    targetPrefix: 'Il a peu de',
    targetSuffix: 'à la soirée ce soir.',
    acceptedAnswers: ['chances de venir', 'chance de venir'],
    explanation:
      "'Il est peu probable que + subjonctif' kişisiz ihtimal yapısı, 'avoir peu de chances de + mastar' biçiminde dönüştürülür.",
  },
  {
    id: 'fr-rw-10',
    language: 'fr',
    level: 'C1',
    sourceSentence: 'Nous avons continué la marche bien que la pluie fût abondante.',
    sourceTr: 'Şiddetli yağmura rağmen yürüyüşe devam ettik.',
    keyword: 'DÉPIT',
    targetPrefix: 'Nous avons continué la marche en',
    targetSuffix: '.',
    acceptedAnswers: ['dépit de la pluie abondante', 'dépit de la pluie', 'dépit de la forte pluie'],
    explanation:
      "'En dépit de' (-e karşın / rağmen), 'bien que' bağlacının en prestijli C1 isim öbeği alternatifidir.",
  },
  {
    id: 'fr-rw-11',
    language: 'fr',
    level: 'B2',
    sourceSentence: "Tu n'as qu'à me téléphoner si tu rencontres un obstacle.",
    sourceTr: 'Bir engelle karşılaşırsan tek yapman gereken beni aramak.',
    keyword: 'HÉSITE',
    targetPrefix: "N'",
    targetSuffix: 'si tu rencontres un obstacle.',
    acceptedAnswers: ["hésite pas à me téléphoner", "hésite pas à m'appeler"],
    explanation:
      "'Tu n'as qu'à...' (tek yapman gereken...) önerisi, 'N'hésite pas à me téléphoner' (aramaktan çekinme) rica kalıbıyla karşılanır.",
  },
  {
    id: 'fr-rw-12',
    language: 'fr',
    level: 'C1',
    sourceSentence: "Personne ne sait comment le cambrioleur a pu s'échapper.",
    sourceTr: 'Hırsızın nasıl kaçabildiğini hiç kimse bilmiyor.',
    keyword: 'MYSTÈRE',
    targetPrefix: "La fuite du cambrioleur reste un",
    targetSuffix: '.',
    acceptedAnswers: ['mystère', 'vrai mystère', 'total mystère'],
    explanation:
      "'Personne ne sait comment...' yapısı, üst düzey sözdiziminde 'reste un mystère' (bir gizem olarak kalıyor) yüklemiyle dönüştürülür.",
  },
  {
    id: 'fr-rw-13',
    language: 'fr',
    level: 'C1',
    sourceSentence: "Il refuse catégoriquement d'admettre ses erreurs passées.",
    sourceTr: 'Geçmiş hatalarını kabul etmeyi kesinlikle reddediyor.',
    keyword: 'QUESTION',
    targetPrefix: "Il n'est pas",
    targetSuffix: 'ses erreurs passées.',
    acceptedAnswers: ["question qu'il admette", "question d'admettre"],
    explanation:
      "Kesin ret bildiren 'refuser catégoriquement', deyimsel 'il n'est pas question de / que' kalıbıyla dönüştürülür.",
  },
  {
    id: 'fr-rw-14',
    language: 'fr',
    level: 'B2',
    sourceSentence: "Cet exercice est trop difficile pour que nous le réussissions.",
    sourceTr: 'Bu alıştırma başarabileceğimizden çok daha zor.',
    keyword: 'ASSEZ',
    targetPrefix: "Cet exercice n'est pas",
    targetSuffix: 'pour nous.',
    acceptedAnswers: ['assez facile', 'assez simple'],
    explanation:
      "'Trop difficile pour réussir' yapısı, zıt sıfat ve olumsuzlukla 'pas assez facile' (yeterince kolay değil) olarak ifade edilir.",
  },
  {
    id: 'fr-rw-15',
    language: 'fr',
    level: 'C1',
    sourceSentence: 'Dès que le chef est entré, tout le monde a cessé de parler.',
    sourceTr: 'Müdür içeri girer girmez herkes konuşmayı kesti.',
    keyword: 'PEINE',
    targetPrefix: 'À peine le chef était-il',
    targetSuffix: 'tout le monde a cessé de parler.',
    acceptedAnswers: ['entré que', 'entré dans la pièce que'],
    explanation:
      "'À peine ... que' kalıbı, Fransızcada devrik özneyle anındalık bildiren C1 yapısıdır.",
  },

  // ── Spanish (ES) Sentence Transformations ─────────────────────────────────
  {
    id: 'es-rw-01',
    language: 'es',
    level: 'B2',
    sourceSentence: 'Es necesario que estudies con más regularidad para aprobar.',
    sourceTr: 'Geçmek için daha düzenli çalışman gereklidir.',
    keyword: 'DEBERÍAS',
    targetPrefix: 'Tú',
    targetSuffix: 'para aprobar.',
    acceptedAnswers: ['deberías estudiar con más regularidad', 'deberías estudiar más regularmente', 'deberías estudiar más'],
    explanation:
      "'Es necesario que estudies' zorunluluk ifadesi, 'deberías + mastar' koşul kipiyle nazik ve doğrudan tavsiyeye dönüştürülür.",
  },
  {
    id: 'es-rw-02',
    language: 'es',
    level: 'B2',
    sourceSentence: 'Aunque llueva intensamente mañana, iremos de excursión.',
    sourceTr: 'Yarın şiddetle yağmur yağsa bile geziye gideceğiz.',
    keyword: 'PESAR',
    targetPrefix: 'Iremos de excursión a',
    targetSuffix: 'mañana.',
    acceptedAnswers: ['pesar de la intensa lluvia', 'pesar de la lluvia', 'pesar de que llueva intensamente'],
    explanation:
      "'Aunque' zıtlık bağlacı, 'a pesar de + isim' veya 'a pesar de que + subjuntivo' yapısına dönüştürülür.",
  },
  {
    id: 'es-rw-03',
    language: 'es',
    level: 'B2',
    sourceSentence: 'Terminé de redactar el informe en cuanto llegué a la oficina.',
    sourceTr: 'Ofise varır varmaz raporu yazmayı bitirdim.',
    keyword: 'NADA',
    targetPrefix: 'Terminé de redactar el informe',
    targetSuffix: 'a la oficina.',
    acceptedAnswers: ['nada más llegar', 'al nada más llegar'],
    explanation:
      "'En cuanto + geçmiş zaman' zaman yapısı, İspanyolcaya özgü 'nada más + mastar' (llegar) kalıbıyla aynı anındalığı ifade eder.",
  },
  {
    id: 'es-rw-04',
    language: 'es',
    level: 'B2',
    sourceSentence: 'No tengo suficiente dinero para comprar ese coche nuevo.',
    sourceTr: 'O yeni arabayı satın almak için yeterli param yok.',
    keyword: 'DEMASIADO',
    targetPrefix: 'Ese coche nuevo es',
    targetSuffix: 'para mí.',
    acceptedAnswers: ['demasiado caro', 'demasiado costoso'],
    explanation:
      "'No tener suficiente dinero para algo', nesnenin 'demasiado caro' (aşırı pahalı) olmasıyla eşdeğerdir.",
  },
  {
    id: 'es-rw-05',
    language: 'es',
    level: 'C1',
    sourceSentence: 'Lamento mucho no haber asistido a tu fiesta de cumpleaños.',
    sourceTr: 'Doğum günü partine katılamadığım için çok üzgünüm.',
    keyword: 'HABER',
    targetPrefix: 'Me hubiera gustado',
    targetSuffix: 'a tu fiesta de cumpleaños.',
    acceptedAnswers: ['haber asistido', 'haber ido'],
    explanation:
      "Geçmişe dönük pişmanlık 'lamento no haber...', 'me hubiera gustado + haber asistido' (katılmış olmayı çok isterdim) yapısıyla kurulur.",
  },
  {
    id: 'es-rw-06',
    language: 'es',
    level: 'C1',
    sourceSentence: 'Si no me ayudas con el proyecto, no terminaré a tiempo.',
    sourceTr: 'Bana projede yardım etmezsen, zamanında bitiremeyeceğim.',
    keyword: 'MENOS',
    targetPrefix: 'No terminaré el proyecto a',
    targetSuffix: '.',
    acceptedAnswers: ['menos que me ayudes', 'menos que me eches una mano'],
    explanation:
      "'Si no + eylem' olumsuz şartı, 'a menos que + subjuntivo' (-medikçe) bağlacıyla karşılanır.",
  },
  {
    id: 'es-rw-07',
    language: 'es',
    level: 'C1',
    sourceSentence: 'Es la primera vez que veo una obra de arte tan hermosa.',
    sourceTr: 'İlk defa bu kadar güzel bir sanat eseri görüyorum.',
    keyword: 'JAMÁS',
    targetPrefix: '',
    targetSuffix: 'una obra de arte tan hermosa.',
    acceptedAnswers: ['Jamás había visto', 'Jamás he visto'],
    explanation:
      "'Es la primera vez que veo...' deneyimi, cümle başı negatif vurguyla 'Jamás había visto...' (asla görmemiştim) kalıbına dönüşür.",
  },
  {
    id: 'es-rw-08',
    language: 'es',
    level: 'B2',
    sourceSentence: 'Prefiero quedarme en casa antes que salir con esta lluvia.',
    sourceTr: 'Bu yağmurda dışarı çıkmaktansa evde kalmayı yeğlerim.',
    keyword: 'MÁS',
    targetPrefix: 'Me apetece',
    targetSuffix: 'que salir con esta lluvia.',
    acceptedAnswers: ['más quedarme en casa', 'mucho más quedarme en casa'],
    explanation:
      "'Preferir' fiili, 'apetecer más + mastar' deyimsel tercihiyle dönüştürülür.",
  },
  {
    id: 'es-rw-09',
    language: 'es',
    level: 'B2',
    sourceSentence: 'Ella continuó trabajando a pesar de su cansancio extremo.',
    sourceTr: 'Aşırı yorgunluğuna rağmen çalışmaya devam etti.',
    keyword: 'ESTABA',
    targetPrefix: 'Ella continuó trabajando aunque',
    targetSuffix: '.',
    acceptedAnswers: ['estaba extremadamente cansada', 'estaba muy cansada', 'estaba agotada'],
    explanation:
      "'A pesar de + isim' kalıbı, 'aunque + indicativo' (gerçekleşmiş bir olgu olduğu için) yan cümlesine dönüştürülür.",
  },
  {
    id: 'es-rw-10',
    language: 'es',
    level: 'B2',
    sourceSentence: 'No olvides apagar todas las luces antes de salir.',
    sourceTr: 'Çıkmadan önce bütün ışıkları kapatmayı unutma.',
    keyword: 'CUENTA',
    targetPrefix: 'Ten en',
    targetSuffix: 'todas las luces antes de salir.',
    acceptedAnswers: ['cuenta apagar', 'cuenta que debes apagar'],
    explanation:
      "'No olvides...' uyarısı, 'tener en cuenta' (dikkate almak/akılda tutmak) deyimiyle dönüştürülür.",
  },
  {
    id: 'es-rw-11',
    language: 'es',
    level: 'B2',
    sourceSentence: 'Tan pronto como supe la noticia, te llamé inmediatamente.',
    sourceTr: 'Haberi öğrenir öğrenmez seni hemen aradım.',
    keyword: 'ENTERARME',
    targetPrefix: 'Al',
    targetSuffix: ', te llamé inmediatamente.',
    acceptedAnswers: ['enterarme de la noticia', 'enterarme de ella'],
    explanation:
      "'Tan pronto como + fiil' yapısı, 'al + mastar' (al enterarme de...) anındalık kalıbıyla sadeleştirilir.",
  },
  {
    id: 'es-rw-12',
    language: 'es',
    level: 'C1',
    sourceSentence: 'El examen era tan difícil que pocos estudiantes aprobaron.',
    sourceTr: 'Sınav o kadar zordu ki çok az öğrenci geçti.',
    keyword: 'DIFICULTAD',
    targetPrefix: 'Debido a la gran',
    targetSuffix: ', pocos estudiantes aprobaron.',
    acceptedAnswers: ['dificultad del examen', 'dificultad de la prueba'],
    explanation:
      "Sıfatlı sonuç cümlesi ('tan difícil que'), 'debido a la dificultad de...' isim öbeğiyle C1 düzeyinde ifade edilir.",
  },
  {
    id: 'es-rw-13',
    language: 'es',
    level: 'B2',
    sourceSentence: 'No me importa en absoluto lo que piensen los demás.',
    sourceTr: 'Başkalarının ne düşündüğü kesinlikle umrumda değil.',
    keyword: 'IGUAL',
    targetPrefix: 'Me da',
    targetSuffix: 'lo que piensen los demás.',
    acceptedAnswers: ['igual', 'exactamente igual', 'completamente igual'],
    explanation:
      "'No me importa en absoluto' ifadesi, İspanyolcada 'dar igual / dar lo mismo' deyimiyle dönüştürülür.",
  },
  {
    id: 'es-rw-14',
    language: 'es',
    level: 'C1',
    sourceSentence: 'Por mucho que insistas, no cambiaré de opinión.',
    sourceTr: 'Ne kadar ısrar edersen et, fikrimi değiştirmeyeceğim.',
    keyword: 'AUNQUE',
    targetPrefix: 'No cambiaré de opinión',
    targetSuffix: 'mucho.',
    acceptedAnswers: ['aunque insistas', 'aunque me insistas'],
    explanation:
      "'Por mucho que + subjuntivo' kalıbı, 'aunque + subjuntivo' zıtlık yapısıyla eşanlamlıdır.",
  },
  {
    id: 'es-rw-15',
    language: 'es',
    level: 'B2',
    sourceSentence: 'Es imposible que ellos hayan terminado todo el trabajo.',
    sourceTr: 'Bütün işi bitirmiş olmaları imkansızdır.',
    keyword: 'PUEDEN',
    targetPrefix: 'Ellos no',
    targetSuffix: 'todo el trabajo todavía.',
    acceptedAnswers: ['pueden haber terminado', 'pueden haber concluido'],
    explanation:
      "İmkansızlık bildiren 'es imposible que hayan...', 'no pueden haber + participio' kalıbıyla karşılanır.",
  },

  // ── English (EN) Sentence Transformations ─────────────────────────────────
  {
    id: 'en-rw-01',
    language: 'en',
    level: 'B2',
    sourceSentence: "I haven't seen her for five years.",
    sourceTr: 'Onu beş yıldır görmedim.',
    keyword: 'TIME',
    targetPrefix: 'The',
    targetSuffix: 'was five years ago.',
    acceptedAnswers: ['last time I saw her', 'last time that I saw her'],
    explanation:
      "'I haven't seen her for X years' present perfect yapısı, 'The last time I saw her was X years ago' past simple yapısıyla dönüştürülür.",
  },
  {
    id: 'en-rw-02',
    language: 'en',
    level: 'B2',
    sourceSentence: 'It is possible that he missed the early morning train.',
    sourceTr: 'Sabah erken trenini kaçırmış olması muhtemeldir.',
    keyword: 'MIGHT',
    targetPrefix: 'He',
    targetSuffix: 'the early morning train.',
    acceptedAnswers: ['might have missed', 'might well have missed'],
    explanation:
      "Geçmişe ait olasılık 'it is possible that he missed', modal perfect 'might have + V3' (might have missed) ile aktarılır.",
  },
  {
    id: 'en-rw-03',
    language: 'en',
    level: 'B2',
    sourceSentence: 'She started playing the violin when she was six years old.',
    sourceTr: 'Keman çalmaya altı yaşındayken başladı.',
    keyword: 'SINCE',
    targetPrefix: 'She',
    targetSuffix: 'she was six years old.',
    acceptedAnswers: ['has been playing the violin since', 'has played the violin since'],
    explanation:
      "Geçmişte başlayıp süren eylemler, 'present perfect continuous + since' kalıbına dönüştürülür.",
  },
  {
    id: 'en-rw-04',
    language: 'en',
    level: 'C1',
    sourceSentence: 'I sincerely regret not telling him the whole truth earlier.',
    sourceTr: 'Ona tüm gerçeği daha önce söylememiş olduğuma içtenlikle pişmanım.',
    keyword: 'WISH',
    targetPrefix: 'I',
    targetSuffix: 'the whole truth earlier.',
    acceptedAnswers: ['wish I had told him', 'wish that I had told him'],
    explanation:
      "Geçmişe dair pişmanlık bildiren 'regret not doing', 'wish + past perfect' (wish I had told) yapısına dönüşür.",
  },
  {
    id: 'en-rw-05',
    language: 'en',
    level: 'C1',
    sourceSentence: 'People believe that the burglar escaped through the bathroom window.',
    sourceTr: 'Hırsızın banyo penceresinden kaçtığına inanılıyor.',
    keyword: 'BELIEVED',
    targetPrefix: 'The burglar is',
    targetSuffix: 'through the bathroom window.',
    acceptedAnswers: ['believed to have escaped'],
    explanation:
      "Etken raporlama ('People believe that X did...'), edilgen perfect infinitive yapısına dönüşür: 'X is believed to have + V3'.",
  },
  {
    id: 'en-rw-06',
    language: 'en',
    level: 'C1',
    sourceSentence: 'He had barely sat down when the telephone rang.',
    sourceTr: 'Tam oturmuştu ki telefon çaldı.',
    keyword: 'SOONER',
    targetPrefix: 'No',
    targetSuffix: 'than the telephone rang.',
    acceptedAnswers: ['sooner had he sat down', 'sooner had he seated himself'],
    explanation:
      "Cümle başında 'No sooner' kullanıldığında devrik yapı (inversion: had he sat down) ve 'than' bağlacı zorunludur.",
  },
  {
    id: 'en-rw-07',
    language: 'en',
    level: 'B2',
    sourceSentence: "We couldn't go sailing because the wind was too strong.",
    sourceTr: 'Rüzgar çok güçlü olduğu için yelkene gidemedik.',
    keyword: 'PREVENTED',
    targetPrefix: 'The strong wind',
    targetSuffix: 'sailing.',
    acceptedAnswers: ['prevented us from going', 'prevented them from going'],
    explanation:
      "'Because the wind was strong, we couldn't...' neden cümlesi, 'prevent someone from doing something' (-den alıkoymak) yapısına dönüştürülür.",
  },
  {
    id: 'en-rw-08',
    language: 'en',
    level: 'B2',
    sourceSentence: 'Although he felt exhausted, he finished writing the entire chapter.',
    sourceTr: 'Bitkin hissetmesine rağmen tüm bölümü yazmayı bitirdi.',
    keyword: 'SPITE',
    targetPrefix: 'In',
    targetSuffix: ', he finished writing the entire chapter.',
    acceptedAnswers: ['spite of feeling exhausted', 'spite of his exhaustion', 'spite of being exhausted'],
    explanation:
      "'Although + yan cümle' zıtlığı, 'in spite of + gerund / noun' (in spite of feeling exhausted) öbeğine çevrilir.",
  },
  {
    id: 'en-rw-09',
    language: 'en',
    level: 'C1',
    sourceSentence: 'You ought to clean your room right now.',
    sourceTr: 'Odanı hemen temizlesen iyi edersin.',
    keyword: 'HIGH',
    targetPrefix: 'It is',
    targetSuffix: 'your room.',
    acceptedAnswers: ['high time you cleaned', 'high time that you cleaned'],
    explanation:
      "'It is high time' kalıbı, ardından özne ve geçmiş zaman fiil (past subjunctive: you cleaned) alarak acil gereklilik bildirir.",
  },
  {
    id: 'en-rw-10',
    language: 'en',
    level: 'B2',
    sourceSentence: 'I would rather not discuss this sensitive topic in public.',
    sourceTr: 'Bu hassas konuyu uluorta tartışmamayı yeğlerim.',
    keyword: 'FEEL',
    targetPrefix: 'I do not',
    targetSuffix: 'this sensitive topic in public.',
    acceptedAnswers: ['feel like discussing', 'feel up to discussing'],
    explanation:
      "'Would rather not do' tercihi, 'not feel like doing' (canı istememek) deyimiyle eş anlam üretir.",
  },
  {
    id: 'en-rw-11',
    language: 'en',
    level: 'B2',
    sourceSentence: "The car was so expensive that we couldn't possibly afford it.",
    sourceTr: 'Araba o kadar pahalıydı ki bütçemiz asla yetemezdi.',
    keyword: 'TOO',
    targetPrefix: 'The car was',
    targetSuffix: 'afford.',
    acceptedAnswers: ['too expensive for us to', 'much too expensive to', 'too expensive to'],
    explanation:
      "'So expensive that we couldn't afford' aşırılık yapısı, 'too + sıfat + for someone + to do' kalıbına dönüşür.",
  },
  {
    id: 'en-rw-12',
    language: 'en',
    level: 'B2',
    sourceSentence: "If you don't take an umbrella, you will definitely get soaked.",
    sourceTr: 'Şemsiye almazsan kesinlikle sırılsıklam olacaksın.',
    keyword: 'UNLESS',
    targetPrefix: 'You will get soaked',
    targetSuffix: 'an umbrella.',
    acceptedAnswers: ['unless you take', 'unless you carry'],
    explanation:
      "'If ... not' olumsuz şart ifadesi, olumlu fiil alan 'unless' (-medikçe) bağlacıyla karşılanır.",
  },
  {
    id: 'en-rw-13',
    language: 'en',
    level: 'C1',
    sourceSentence: 'I only understood the plot when I watched the movie a second time.',
    sourceTr: 'Filmin konusunu ancak ikinci kez izlediğimde anladım.',
    keyword: 'UNTIL',
    targetPrefix: 'Not',
    targetSuffix: 'the movie a second time did I understand the plot.',
    acceptedAnswers: ['until I watched', 'until I had watched'],
    explanation:
      "Cümle başı 'Not until...' kısıtlayıcı zaman yapısı, ana cümlede devrik yapı (did I understand) gerektirir.",
  },
  {
    id: 'en-rw-14',
    language: 'en',
    level: 'C1',
    sourceSentence: "It doesn't matter how hard you try, you won't convince him.",
    sourceTr: 'Ne kadar çok uğraşırsan uğraş, onu ikna edemeyeceksin.',
    keyword: 'HOWEVER',
    targetPrefix: 'However',
    targetSuffix: "you try, you won't convince him.",
    acceptedAnswers: ['hard', 'much'],
    explanation:
      "'It doesn't matter how hard...' ifadesi, 'However + sıfat/zarf' (ne kadar ... olursa olsun) kalıbıyla C1 seviyesinde sadeleşir.",
  },
  {
    id: 'en-rw-15',
    language: 'en',
    level: 'B2',
    sourceSentence: 'The manager cancelled the meeting due to unforeseen circumstances.',
    sourceTr: 'Müdür beklenmedik koşullar nedeniyle toplantıyı iptal etti.',
    keyword: 'CALLED',
    targetPrefix: 'The meeting was',
    targetSuffix: 'due to unforeseen circumstances.',
    acceptedAnswers: ['called off by the manager', 'called off'],
    explanation:
      "'Cancel' fiili, phrasal verb karşılığı olan 'call off' (edilgende: was called off) ile dönüştürülür.",
  },
]

export const REWRITE_ROUND_SIZE = 6

/**
 * Normalizes user input and accepted answers:
 * trims, collapses multiple spaces, converts curly apostrophes to straight ones,
 * and lowers case for fuzzy matching.
 */
export function normalizeRewriteAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
}

/**
 * Checks if the given user response matches any of the accepted answers.
 */
export function isRewriteAnswerCorrect(given: string, accepted: readonly string[]): boolean {
  const normGiven = normalizeRewriteAnswer(given)
  if (!normGiven) return false
  return accepted.some((ans) => normalizeRewriteAnswer(ans) === normGiven)
}

/**
 * Draws a balanced round of sentence rewrite challenges.
 */
export function sentenceRewriteRound(
  language: TargetLanguage,
  count: number,
  rng: Rng,
  log?: GrammarLog,
): SentenceRewriteItem[] {
  const pool = SENTENCE_REWRITES.filter((item) => item.language === language)
  if (!pool.length) return []

  const scored = pool.map((item) => {
    const entry = log?.[item.id]
    const misses = entry ? Math.max(0, entry.wrong - entry.ok) : 0
    return { item, weight: 1 + misses * 3 + rng() * 0.5 }
  })
  scored.sort((a, b) => b.weight - a.weight)
  return scored.slice(0, Math.min(count, pool.length)).map((s) => s.item)
}
