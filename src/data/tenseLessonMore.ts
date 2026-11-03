import type { Tense } from '../engine/tenses'

/**
 * The second layer of each tense's lesson (data/tenseLesson.ts is the first): the formula in one line, the words
 * that signal the tense, the tenses it is mixed up with, the slips Turkish speakers make (wrong → right) and more
 * examples. Shown in the same sheet, below what the first layer says.
 */
export interface TenseLessonMore {
  /** The tense made in one line. */
  formula: string
  /** Words and phrases that call for the tense. */
  markers: string[]
  /** The tenses it is confused with, and how to tell them apart. */
  contrast: { with: string; text: string }[]
  /** A slip, its correction and why. */
  slips: { wrong: string; right: string; why: string }[]
  /** More sentences with their Turkish. */
  examples: { text: string; tr: string }[]
}

const e = (text: string, tr: string) => ({ text, tr })
const c = (w: string, text: string) => ({ with: w, text })
const s = (wrong: string, right: string, why: string) => ({ wrong, right, why })

export const TENSE_LESSON_MORE: Partial<Record<Tense, TenseLessonMore>> = {
  // ---------- Français ----------
  present: {
    formula: 'kök + -e, -es, -e, -ons, -ez, -ent (-er fiilleri)',
    markers: ['maintenant', 'en ce moment', 'aujourd’hui', 'd’habitude', 'toujours', 'souvent', 'tous les jours', 'chaque lundi', 'depuis (+ süre)'],
    contrast: [
      c('Passé composé', 'Présent “şu an, alışkanlık, genel doğru”dur; bitmiş tek olay passé composé ister: Je mange (yiyorum) / J’ai mangé (yedim).'),
      c('Futur proche', 'Présent planı da söyler (Je pars demain); aller + mastar niyeti ve kesinliği vurgular (Je vais partir).'),
      c('Türkçe -iyor ve geniş zaman', 'Fransızcada ikisi ayrı zaman değil: “yürüyorum” da “yürürüm” de Je marche. “Şu anda” vurgusu için en ce moment eklenir.'),
    ],
    slips: [
      s('Je suis vingt ans.', 'J’ai vingt ans.', 'Yaş avoir ile söylenir (“yirmi yaşına sahibim”).'),
      s('Ils parle français.', 'Ils parlent français.', '3. çoğul eki -ent yazılır, okunmasa da.'),
      s('Vous faisez du sport.', 'Vous faites du sport.', 'faire, être, dire düzensizdir: vous faites, vous êtes, vous dites.'),
    ],
    examples: [e('Il habite à Lyon depuis 2019.', '2019’dan beri Lyon’da oturuyor.'), e('Tu veux un café ?', 'Kahve ister misin?'), e('Elle prend le train tous les matins.', 'Her sabah trene biniyor.')],
  },
  imparfait: {
    formula: 'nous köküne (-ons atılır) + -ais, -ais, -ait, -ions, -iez, -aient',
    markers: ['autrefois', 'avant', 'à l’époque', 'quand j’étais petit', 'souvent', 'toujours', 'chaque été', 'tous les jours (geçmişte)', 'pendant que', 'd’habitude'],
    contrast: [
      c('Passé composé', 'Imparfait “nasıldı, ne yapardı” (fon, alışkanlık); passé composé “ne oldu” (bitmiş olay). Il pleuvait (yağıyordu) / Il a plu toute la nuit (bütün gece yağdı, bitti).'),
      c('Plus-que-parfait', 'Imparfait o anda süren durumdur; plus-que-parfait ondan önce bitmiş olandır: Il dormait / Il avait dormi.'),
      c('Conditionnel', 'Ekler aynıdır, kök farklıdır: je parlais (konuşurdum, alışkanlık) / je parlerais (konuşurdum, varsayım). Yazıda “r” fark eder.'),
    ],
    slips: [
      s('Je mangeait', 'Je mangeais', 'je ve tu için -ais, il için -ait yazılır.'),
      s('Nous commençions → nous commençions', 'Nous commencions', 'ç yalnızca a, o, u önünde yazılır: je commençais, ama nous commencions.'),
      s('Je étais malade.', 'J’étais malade.', 'je sesli harften önce j’ olur.'),
    ],
    examples: [e('Autrefois, on écrivait des lettres.', 'Eskiden mektup yazılırdı.'), e('Il avait les cheveux longs.', 'Saçları uzundu.'), e('Pendant que tu cuisinais, je lisais.', 'Sen yemek yaparken ben okuyordum.')],
  },
  'passe-compose': {
    formula: 'avoir / être (présent) + participe passé',
    markers: ['hier', 'ce matin', 'la semaine dernière', 'il y a deux jours', 'déjà', 'pas encore', 'une fois', 'soudain', 'tout à coup', 'en 2020', 'ce week-end'],
    contrast: [
      c('Imparfait', 'Passé composé olayı ilerletir (ne oldu), imparfait fonu çizer (nasıldı): Il était tard quand elle est arrivée.'),
      c('Passé simple', 'Konuşmada ve mektupta passé composé, edebî anlatıda passé simple kullanılır; ikisi aynı bitmiş olayı anlatır.'),
      c('Plus-que-parfait', 'Başka bir geçmiş olaydan önce biten iş için plus-que-parfait gerekir: Quand je suis arrivé, il était déjà parti.'),
    ],
    slips: [
      s('Je suis mangé.', 'J’ai mangé.', 'Çoğu fiil avoir alır; être yalnızca “gezen” fiiller ve dönüşlü fiillerle.'),
      s('Elle a arrivé.', 'Elle est arrivée.', 'arriver être alır ve ortaç özneye uyar (arrivée).'),
      s('Je ne pas ai mangé.', 'Je n’ai pas mangé.', 'ne … pas yardımcı fiili sarar; ortaç pas’tan sonra gelir.'),
    ],
    examples: [e('Tu as vu mon téléphone ?', 'Telefonumu gördün mü?'), e('Nous sommes allés au cinéma hier soir.', 'Dün akşam sinemaya gittik.'), e('Elle s’est trompée de route.', 'Yolu şaşırdı.')],
  },
  'passe-simple': {
    formula: '-er: kök + -a (il) / -èrent (ils); -ir ve -re: kök + -it (il) / -irent (ils)',
    markers: ['puis', 'soudain', 'alors', 'un jour', 'le lendemain', 'enfin', 'ce jour-là', 'Il était une fois'],
    contrast: [
      c('Passé composé', 'Aynı bitmiş olayı anlatır; passé simple yazı dilinde (roman, tarih), passé composé konuşmada.'),
      c('Imparfait', 'Anlatıda passé simple olayları sıralar, imparfait fonu çizer: Il pleuvait. Il ouvrit la porte et sortit.'),
    ],
    slips: [
      s('Il parla = “konuşuyor”', 'Il parla = “konuştu”', '-a ile biten 3. tekil -er fiili passé simple’dir; şimdiki zaman il parle’dır.'),
      s('Il vint = “gelir”', 'Il vint = “geldi”', 'vint ve tint, venir ve tenir’in passé simple biçimleridir (présent: il vient, il tient).'),
    ],
    examples: [e('Il était une fois un roi qui eut trois fils.', 'Bir zamanlar üç oğlu olan bir kral vardı.'), e('Elle prit son manteau et sortit.', 'Paltosunu aldı ve çıktı.'), e('Nous arrivâmes à Paris au petit matin.', 'Sabaha karşı Paris’e vardık.')],
  },
  'plus-que-parfait': {
    formula: 'avoir / être (imparfait) + participe passé',
    markers: ['déjà', 'avant', 'la veille', 'auparavant', 'ne … pas encore', 'quand', 'après que', 'parce que'],
    contrast: [
      c('Passé composé', 'Passé composé olayın kendisidir; plus-que-parfait başka bir geçmiş olaydan “daha önce” olmuştur: Elle a mangé / Elle avait déjà mangé quand je suis arrivé.'),
      c('Conditionnel passé', '“si + plus-que-parfait” koşulu kurar, sonuç conditionnel passé ile gelir: Si j’avais su, je serais venu.'),
    ],
    slips: [
      s('Quand je suis arrivé, il est déjà parti.', 'Quand je suis arrivé, il était déjà parti.', 'Gelmeden önce giden kişi için plus-que-parfait gerekir.'),
      s('J’avais allé.', 'J’étais allé.', 'Gezen fiiller (aller, partir, venir…) plus-que-parfait’de de être alır.'),
    ],
    examples: [e('Il avait déjà plu quand nous sommes sortis.', 'Çıktığımızda yağmur zaten yağmıştı.'), e('Je lui avais dit de ne pas venir.', 'Ona gelmemesini söylemiştim.'), e('Elle était née à Lyon, mais elle avait grandi à Nice.', 'Lyon’da doğmuştu ama Nice’te büyümüştü.')],
  },
  futur: {
    formula: 'mastar (sondaki r’ye kadar) + -ai, -as, -a, -ons, -ez, -ont',
    markers: ['demain', 'la semaine prochaine', 'dans deux jours', 'bientôt', 'plus tard', 'un jour', 'l’année prochaine', 'quand / dès que (+ futur)'],
    contrast: [
      c('Futur proche', 'Konuşmada aller + mastar yakın ve kesin geleceği söyler (Je vais partir); futur simple daha resmî, uzak ya da söz niteliğindedir (Je partirai).'),
      c('Présent', 'Planlı yakın gelecek présent ile de söylenir: Je pars demain. Belirsiz, uzak gelecek için futur.'),
      c('Conditionnel', 'Kök aynıdır, ekler farklıdır: je parlerai (konuşacağım) / je parlerais (konuşurdum).'),
    ],
    slips: [
      s('Quand je viens, je te dirai.', 'Quand je viendrai, je te dirai.', 'quand ve dès que gelecek anlamında futur ister (Türkçede burada geniş zaman kullanırız).'),
      s('Si tu viendras, je serai content.', 'Si tu viens, je serai content.', 'si’den sonra futur kullanılmaz: si + présent → futur.'),
      s('Je serai content si il vient.', 'Je serai content s’il vient.', 'si + il birleşir: s’il, ama si + elle ayrı kalır.'),
    ],
    examples: [e('Dans un an, nous habiterons à Marseille.', 'Bir yıl sonra Marsilya’da oturacağız.'), e('Je t’appellerai dès que j’arriverai.', 'Varır varmaz seni arayacağım.'), e('Qui viendra avec moi ?', 'Benimle kim gelecek?')],
  },
  'futur-anterieur': {
    formula: 'avoir / être (futur) + participe passé',
    markers: ['d’ici demain', 'avant', 'quand', 'dès que', 'lorsque', 'après que', 'déjà', 'à cette heure-là'],
    contrast: [
      c('Futur simple', 'Sıra bildirir: Quand j’arriverai, je mangerai. Önce biten işi vurgulamak için futur antérieur: Quand j’aurai mangé, je partirai.'),
      c('Passé composé', 'Konuşmada “dès que j’ai fini, je pars” da denir; yazıda ve dikkatli konuşmada gelecekteki bitiş futur antérieur ile söylenir.'),
    ],
    slips: [
      s('Quand il finira, il partira.', 'Quand il aura fini, il partira.', 'Önce biten iş futur antérieur ister: önce bitirecek, sonra gidecek.'),
      s('Elle aura parti.', 'Elle sera partie.', 'partir être alır; ortaç özneye uyar.'),
    ],
    examples: [e('Avant la fin du mois, il aura déménagé.', 'Ay sonuna kadar taşınmış olacak.'), e('Quand tu auras lu ce livre, prête-le-moi.', 'Bu kitabı okuduğunda bana ödünç ver.'), e('Ils seront déjà rentrés à cette heure-là.', 'O saatte çoktan dönmüş olacaklar.')],
  },
  conditionnel: {
    formula: 'futur kökü + -ais, -ais, -ait, -ions, -iez, -aient',
    markers: ['si + imparfait', 'à ta place', 'peut-être', 'selon (haber)', 'au cas où', 'j’aimerais', 'je voudrais', 'pourriez-vous'],
    contrast: [
      c('Futur', 'si + présent → futur (gerçekçi ihtimal): Si tu viens, je serai content. si + imparfait → conditionnel (varsayım): Si tu venais, je serais content.'),
      c('Imparfait', 'Ekler aynıdır; kök farklıdır: je parlais / je parlerais. “r” varsa conditionnel’dir.'),
    ],
    slips: [
      s('Si j’aurais le temps, je viendrais.', 'Si j’avais le temps, je viendrais.', 'si’den sonra conditionnel kullanılmaz: si + imparfait.'),
      s('Je mangerai si j’avais faim.', 'Je mangerais si j’avais faim.', 'si + imparfait ile conditionnel gelir, futur değil.'),
      s('Je voudrait un café.', 'Je voudrais un café.', 'je için -ais yazılır.'),
    ],
    examples: [e('À ta place, je dirais la vérité.', 'Senin yerinde olsam doğruyu söylerdim.'), e('Pourriez-vous fermer la fenêtre ?', 'Pencereyi kapatabilir misiniz?'), e('Il aimerait habiter à la campagne.', 'Kırda oturmak isterdi.')],
  },
  'conditionnel-passe': {
    formula: 'avoir / être (conditionnel) + participe passé',
    markers: ['si + plus-que-parfait', 'j’aurais dû', 'j’aurais voulu', 'à ta place', 'selon (geçmiş haber)', 'sans toi'],
    contrast: [
      c('Conditionnel présent', 'Şimdi ya da gelecek varsayımı: Je viendrais. Gerçekleşmemiş geçmiş için conditionnel passé: Je serais venu.'),
      c('Plus-que-parfait', 'Koşulun “si” yarısı plus-que-parfait, sonuç yarısı conditionnel passé olur: Si j’avais su, je serais venu.'),
    ],
    slips: [
      s('Si j’aurais su, je serais venu.', 'Si j’avais su, je serais venu.', 'si’den sonra conditionnel gelmez: si + plus-que-parfait.'),
      s('J’aurais allé.', 'Je serais allé.', 'aller être alır; ortaç özneye uyar.'),
    ],
    examples: [e('Tu aurais dû me prévenir.', 'Beni uyarmalıydın.'), e('Sans la pluie, nous serions sortis.', 'Yağmur olmasa çıkardık.'), e('Il y aurait eu trois blessés.', 'Üç yaralı olduğu bildiriliyor.')],
  },
  subjonctif: {
    formula: 'que + ils/elles köküne -e, -es, -e, -ions, -iez, -ent',
    markers: ['il faut que', 'je veux que', 'bien que', 'pour que', 'avant que', 'à condition que', 'je doute que', 'il est important que', 'jusqu’à ce que'],
    contrast: [
      c('Indicatif', 'Kesin bilgi indicatif ister (Je sais qu’il vient), öznel bakış subjonctif (Je veux qu’il vienne).'),
      c('Mastar', 'Aynı özne varsa mastar kullanılır: Je veux partir. Özne farklıysa que + subjonctif: Je veux que tu partes.'),
    ],
    slips: [
      s('Il faut que je vais.', 'Il faut que j’aille.', 'il faut que subjonctif ister: aller → aille.'),
      s('Je veux que tu es là.', 'Je veux que tu sois là.', 'vouloir que subjonctif ister: être → sois.'),
      s('Je pense qu’il vienne.', 'Je pense qu’il vient.', 'penser olumlu cümlede indicatif alır; olumsuzda (je ne pense pas qu’il vienne) subjonctif.'),
    ],
    examples: [e('Il faut que nous partions à huit heures.', 'Sekizde yola çıkmamız gerekiyor.'), e('Je suis contente que vous veniez.', 'Geldiğinize sevindim.'), e('Bien que ce soit difficile, il continue.', 'Zor olmasına rağmen devam ediyor.')],
  },
  'subjonctif-passe': {
    formula: 'que + avoir / être (subjonctif) + participe passé',
    markers: ['je suis content que', 'bien que', 'avant que (bitiş)', 'il est possible que', 'je ne crois pas que', 'je regrette que'],
    contrast: [
      c('Subjonctif présent', 'Présent eş zamanlı ya da sonraki eylemi, passé tetikleyiciden önce bitmiş eylemi anlatır: Je suis content que tu viennes (geliyorsun/geleceksin) / que tu sois venu (geldin).'),
      c('Indicatif', 'après que norm olarak indicatif alır: Après qu’il est parti. avant que subjonctif ister.'),
    ],
    slips: [
      s('Je suis content que tu es venu.', 'Je suis content que tu sois venu.', 'Duygu cümlesi subjonctif ister; bitmiş olay için subjonctif passé.'),
      s('Après qu’il soit parti', 'Après qu’il est parti', 'après que norm olarak indicatif alır.'),
    ],
    examples: [e('Il est possible qu’elle soit déjà partie.', 'Çoktan gitmiş olması mümkün.'), e('Je regrette que vous n’ayez pas pu venir.', 'Gelemediğinize üzüldüm.'), e('Je partirai avant que tu aies fini.', 'Sen bitirmeden gideceğim.')],
  },
  imperatif: {
    formula: 'tu / nous / vous için présent biçimi, özne söylenmeden',
    markers: ['s’il te plaît', 's’il vous plaît', 'vite', 'tout de suite', 'ne … pas', 'allez', 'voyons', 'd’abord / ensuite (talimat)'],
    contrast: [
      c('Présent', 'Présent bilgi verir ya da soru sorar (Tu parles), impératif emreder (Parle !).'),
      c('Subjonctif', 'Üçüncü kişiye emir subjonctif ile verilir: Qu’il vienne !'),
    ],
    slips: [
      s('Parles plus fort !', 'Parle plus fort !', '-er fiillerinde tu emrinde -s düşer.'),
      s('Donne-me le livre.', 'Donne-moi le livre.', 'Olumlu emirde me → moi, te → toi olur.'),
      s('Ne le donne-moi pas.', 'Ne me le donne pas.', 'Olumsuz emirde zamirler fiilin önüne gelir ve me kalır.'),
    ],
    examples: [e('Dis-moi la vérité.', 'Bana doğruyu söyle.'), e('Ne touchez pas !', 'Dokunmayın!'), e('Asseyez-vous, je vous en prie.', 'Buyurun oturun.')],
  },

  // ---------- Español ----------
  presente: {
    formula: 'kök + -o, -as, -a, -amos, -áis, -an (-ar fiilleri)',
    markers: ['ahora', 'hoy', 'normalmente', 'siempre', 'a menudo', 'todos los días', 'cada lunes', 'de momento', 'desde hace'],
    contrast: [
      c('estar + gerundio', 'Presente genel durum ve alışkanlığı söyler (Estudio español); estar + gerundio tam şu an olanı (Estoy estudiando).'),
      c('ir a + mastar', 'Mañana voy a Madrid plan söyler; Voy a llamar niyeti vurgular. Aynı anlamda presente yakın gelecek yerine yeter.'),
    ],
    slips: [
      s('Soy veinte años.', 'Tengo veinte años.', 'Yaş tener ile söylenir.'),
      s('Nosotros piensamos → nosotros pienso/ nosotros piensamos', 'Nosotros pensamos', 'nosotros ve vosotros kök değiştirmez: pensamos, pensáis.'),
      s('Yo sabo la respuesta.', 'Yo sé la respuesta.', 'saber’in yo biçimi düzensizdir: sé.'),
      s('Yo conozo a Ana.', 'Yo conozco a Ana.', 'Ünlüden sonra -cer biten fiiller yo’da -zco alır: conozco, parezco.'),
    ],
    examples: [e('Mi hermano trabaja en un banco.', 'Ağabeyim bankada çalışıyor.'), e('¿A qué hora empieza la película?', 'Film kaçta başlıyor?'), e('Duermen ocho horas al día.', 'Günde sekiz saat uyuyorlar.')],
  },
  imperfecto: {
    formula: '-ar: -aba, -abas, -aba, -ábamos, -abais, -aban; -er/-ir: -ía, -ías, -ía, -íamos, -íais, -ían',
    markers: ['antes', 'de niño', 'de pequeño', 'siempre', 'normalmente', 'todos los días (geçmişte)', 'mientras', 'cada verano', 'en aquella época'],
    contrast: [
      c('Pretérito', 'Imperfecto “nasıldı, ne yapardı”; pretérito “ne oldu”: Siempre comía a las dos / Ayer comí a las dos.'),
      c('estaba + gerundio', 'Geçmişte o anda sürmekte olan eylem: Estaba leyendo cuando llamaste. Imperfecto ile de söylenebilir: Leía cuando llamaste.'),
    ],
    slips: [
      s('De niño jugué al fútbol todos los días.', 'De niño jugaba al fútbol todos los días.', 'Geçmişte tekrarlanan alışkanlık imperfecto ister.'),
      s('Ibamos a la playa. / hablabamos', 'Íbamos a la playa. / hablábamos', 'nosotros biçiminde vurgu işareti yazılır: -ábamos, íbamos.'),
    ],
    examples: [e('Cuando era niña, vivía en un pueblo.', 'Küçükken bir köyde yaşardım.'), e('Hacía mucho calor y no había nadie.', 'Hava çok sıcaktı ve kimse yoktu.'), e('Mientras estudiaba, sonó el teléfono.', 'Ders çalışırken telefon çaldı.')],
  },
  preterito: {
    formula: '-ar: -é, -aste, -ó, -amos, -asteis, -aron; -er/-ir: -í, -iste, -ió, -imos, -isteis, -ieron',
    markers: ['ayer', 'anoche', 'anteayer', 'el año pasado', 'hace tres días', 'el lunes', 'en 1999', 'de repente', 'entonces', 'una vez'],
    contrast: [
      c('Imperfecto', 'Pretérito olayı ilerletir, imperfecto fonu çizer: Era tarde cuando llegó.'),
      c('Perfecto', 'Bugünü içeren zaman diliminde perfecto (hoy he comido); bitmiş zamanda pretérito (ayer comí). Latin Amerika’da bugün için de çoğunlukla pretérito kullanılır.'),
    ],
    slips: [
      s('Ayer he comido paella.', 'Ayer comí paella.', '“Ayer” bitmiş zamandır: pretérito.'),
      s('Yo tené un problema.', 'Yo tuve un problema.', 'tener düzensiz kök alır: tuv-; ekler vurgu işaretsizdir.'),
      s('Ellos dijieron la verdad.', 'Ellos dijeron la verdad.', 'Kökü -j ile biten fiillerde -ieron değil -eron gelir: dijeron, trajeron.'),
    ],
    examples: [e('El sábado conocí a tu hermano.', 'Cumartesi ağabeyinle tanıştım.'), e('Ayer no pudimos salir.', 'Dün çıkamadık.'), e('¿Qué dijiste?', 'Ne dedin?')],
  },
  perfecto: {
    formula: 'haber (he, has, ha, hemos, habéis, han) + participio (-ado / -ido)',
    markers: ['hoy', 'esta mañana', 'esta semana', 'este año', 'ya', 'todavía no', 'nunca', 'alguna vez', 'últimamente'],
    contrast: [
      c('Pretérito', 'Perfecto bugünü ya da şimdiye uzanan zamanı içerir (hoy, esta semana, nunca); bitmiş zamanda (ayer, el año pasado) pretérito gelir.'),
      c('Türkçe -mış / -dı', 'Hayat deneyimi ve bugünkü sonuç perfecto ile söylenir: ¿Has estado en Roma? “Roma’da bulundun mu?”.'),
    ],
    slips: [
      s('He comido ayer.', 'Comí ayer.', '“Ayer” ile pretérito kullanılır.'),
      s('Ha escribido una carta.', 'Ha escrito una carta.', 'escribir düzensiz ortaç alır: escrito (ayrıca hecho, dicho, visto, puesto, abierto).'),
      s('He las visto.', 'Las he visto.', 'Zamir yardımcı fiilin önüne gelir; yardımcı ile ortacın arasına bir şey girmez.'),
    ],
    examples: [e('¿Has probado la tortilla?', 'Tortillayı denedin mi?'), e('Este mes no he tenido tiempo.', 'Bu ay zamanım olmadı.'), e('Nunca hemos viajado en avión.', 'Hiç uçakla seyahat etmedik.')],
  },
  pluscuamperfecto: {
    formula: 'haber (había, habías, había, habíamos, habíais, habían) + participio',
    markers: ['ya', 'antes', 'nunca (o ana kadar)', 'todavía no', 'cuando', 'la víspera', 'hasta ese momento'],
    contrast: [
      c('Perfecto', 'Perfecto şimdiye bağlıdır: Ha salido (çıktı, şimdi yok). Pluscuamperfecto geçmişteki bir noktadan önceyi anlatır: Había salido cuando llegué.'),
      c('Pretérito', 'Pretérito olayın kendisidir; pluscuamperfecto “daha önce” olmuş olanı söyler.'),
    ],
    slips: [
      s('Cuando llegué, ya se fue.', 'Cuando llegué, ya se había ido.', 'Gelmeden önce giden için pluscuamperfecto gerekir.'),
      s('Había escribido la carta.', 'Había escrito la carta.', 'Düzensiz ortaçlar aynen kalır: escrito, hecho, dicho, visto.'),
    ],
    examples: [e('Nunca había visto el mar.', 'Denizi hiç görmemiştim.'), e('Ya habían cenado cuando llegamos.', 'Biz geldiğimizde yemek yemişlerdi.'), e('Me dijo que no había recibido el mensaje.', 'Mesajı almadığını söyledi.')],
  },
  futuro: {
    formula: 'mastar + -é, -ás, -á, -emos, -éis, -án',
    markers: ['mañana', 'el año que viene', 'la semana próxima', 'pronto', 'algún día', 'dentro de dos días', 'seguramente', 'probablemente (tahmin)'],
    contrast: [
      c('ir a + mastar', 'Konuşmada yakın ve planlı gelecek ir a ile söylenir (Voy a llamar); futuro daha resmî, uzak ya da tahmin anlamlıdır (Llamaré, ¿Qué hora será?).'),
      c('Presente', 'Planlı yakın gelecek presente ile de söylenir: Mañana voy a Madrid.'),
    ],
    slips: [
      s('Si lloverá, me quedaré.', 'Si llueve, me quedaré.', 'si’den sonra futuro gelmez: si + presente → futuro.'),
      s('Yo ponderé la mesa.', 'Yo pondré la mesa.', 'poner düzensiz kök alır: pondr-.'),
      s('Cuando llegaré, te llamo.', 'Cuando llegue, te llamaré.', 'Belirsiz gelecek için cuando + subjuntivo kullanılır.'),
    ],
    examples: [e('Mañana te llamaré sin falta.', 'Yarın mutlaka seni arayacağım.'), e('¿Quién será a estas horas?', 'Bu saatte kim olabilir?'), e('El concierto empezará a las nueve.', 'Konser dokuzda başlayacak.')],
  },
  'futuro-perfecto': {
    formula: 'haber (habré, habrás, habrá, habremos, habréis, habrán) + participio',
    markers: ['para mañana', 'antes de', 'dentro de', 'cuando (+ subjuntivo)', 'ya', 'seguro que', 'supongo que (tahmin)'],
    contrast: [
      c('Futuro', 'Terminaré mañana “yarın bitireceğim”; Para mañana habré terminado “yarına kadar bitirmiş olacağım”.'),
      c('Perfecto', 'Perfecto şimdiye bağlı kesin bilgidir (Ha llegado); futuro perfecto tahmin ya da geleceğe kadar bitişi söyler (Habrá llegado).'),
    ],
    slips: [
      s('Habrá llegado = “geliyor”', 'Habrá llegado = “gelmiş olmalı”', 'Futuro perfecto geçmiş hakkında tahmin de yapar.'),
      s('Habré hacido el trabajo.', 'Habré hecho el trabajo.', 'hacer düzensiz ortaç alır: hecho.'),
    ],
    examples: [e('Dentro de un mes habré aprobado el examen.', 'Bir ay içinde sınavı geçmiş olacağım.'), e('Ya habrán cenado.', 'Yemek yemiş olmalılar.'), e('¿Habrá visto el mensaje?', 'Mesajı görmüş müdür acaba?')],
  },
  condicional: {
    formula: 'mastar + -ía, -ías, -ía, -íamos, -íais, -ían',
    markers: ['si tuviera…', 'me gustaría', '¿podría…?', 'yo que tú', 'quizá', 'según dicen', 'dijo que'],
    contrast: [
      c('Futuro', 'Konuşma anından gelecek futuro, geçmişten bakınca gelecek condicional: Dice que vendrá / Dijo que vendría.'),
      c('Imperfecto de subjuntivo', 'si-cümlesi imperfecto de subjuntivo ile, sonuç condicional ile kurulur: Si tuviera tiempo, viajaría.'),
    ],
    slips: [
      s('Si tendría dinero, compraría una casa.', 'Si tuviera dinero, compraría una casa.', 'si’den sonra condicional değil imperfecto de subjuntivo gelir.'),
      s('Yo hacería ejercicio.', 'Yo haría ejercicio.', 'hacer düzensiz kök alır: har-.'),
    ],
    examples: [e('Con más tiempo, aprendería alemán.', 'Daha çok zamanım olsa Almanca öğrenirdim.'), e('Yo, en tu lugar, hablaría con ella.', 'Senin yerinde olsam onunla konuşurdum.'), e('Dijo que llegaría tarde.', 'Geç geleceğini söyledi.')],
  },
  'condicional-perfecto': {
    formula: 'haber (habría, habrías, habría, habríamos, habríais, habrían) + participio',
    markers: ['si hubiera…', 'habría querido', 'de haberlo sabido', 'sin ti', 'yo que tú (geçmiş)'],
    contrast: [
      c('Condicional simple', 'Şimdi ya da gelecek varsayımı: Compraría. Gerçekleşmemiş geçmiş için habría comprado.'),
      c('Subjuntivo pluscuamperfecto', 'si yarısı hubiera + participio, sonuç yarısı habría + participio olur: Si hubiera sabido, habría venido.'),
    ],
    slips: [
      s('Si habría sabido, habría venido.', 'Si hubiera sabido, habría venido.', 'si yarısında condicional kullanılmaz: hubiera.'),
      s('Habria comido.', 'Habría comido.', 'habría vurgu işareti ister (habría, habríamos).'),
    ],
    examples: [e('De haberlo sabido, habría venido antes.', 'Bilseydim daha önce gelirdim.'), e('Sin tu ayuda, no lo habríamos logrado.', 'Yardımın olmasa başaramazdık.'), e('Dijo que habría terminado para el viernes.', 'Cumaya kadar bitirmiş olacağını söyledi.')],
  },
  subjuntivo: {
    formula: 'yo biçimi (-o atılır) + zıt ünlü: -ar → e, -er/-ir → a',
    markers: ['quiero que', 'espero que', 'ojalá', 'es necesario que', 'para que', 'antes de que', 'aunque (olasılık)', 'cuando (gelecek)', 'no creo que', 'dudo que'],
    contrast: [
      c('Gösterme kipi', 'Kesin bilgi indicativo ister (Sé que viene), istek ve duygu subjuntivo ister (Quiero que venga).'),
      c('Mastar', 'Aynı özne varsa mastar kullanılır: Quiero salir. Özne farklıysa que + subjuntivo: Quiero que salgas.'),
      c('aunque', 'Gerçek bilgide indicativo (Aunque llueve, salgo: yağıyor ama çıkıyorum), olasılıkta subjuntivo (Aunque llueva, saldré: yağsa bile).'),
    ],
    slips: [
      s('Quiero que vienes.', 'Quiero que vengas.', 'querer que subjuntivo ister: venir → vengas.'),
      s('Espero que tienes suerte.', 'Espero que tengas suerte.', 'tener → yo tengo → tenga.'),
      s('No creo que es verdad.', 'No creo que sea verdad.', 'no creer que subjuntivo ister: ser → sea.'),
    ],
    examples: [e('Prefiero que cenemos temprano.', 'Erken yemek yememizi tercih ederim.'), e('Dudo que haga buen tiempo mañana.', 'Yarın havanın güzel olacağından şüpheliyim.'), e('Te llamo para que me expliques.', 'Bana açıklaman için arıyorum.')],
  },
  'subjuntivo-imperfecto': {
    formula: 'ellos pretérito biçimi (-ron atılır) + -ra, -ras, -ra, -ramos, -rais, -ran',
    markers: ['si + (varsayım)', 'ojalá', 'como si', 'quisiera', 'me gustaría que', 'era necesario que', 'esperaba que'],
    contrast: [
      c('Subjuntivo presente', 'Presente şimdiki ya da gelecek tetikleyici ister (Quiero que vengas); imperfecto geçmiş tetikleyici ya da varsayım (Quería que vinieras, Si vinieras…).'),
      c('Subjuntivo pluscuamperfecto', 'Gerçekleşmemiş geçmiş koşul pluscuamperfecto ile söylenir: Si hubiera venido.'),
    ],
    slips: [
      s('Si tuviera tiempo, viajo.', 'Si tuviera tiempo, viajaría.', 'si + imperfecto de subjuntivo → condicional.'),
      s('Quería que vienes.', 'Quería que vinieras.', 'Geçmiş tetikleyiciden sonra imperfecto de subjuntivo gelir.'),
    ],
    examples: [e('Si pudiera, me iría hoy.', 'Yapabilsem bugün giderdim.'), e('Me pidieron que firmara el contrato.', 'Sözleşmeyi imzalamamı istediler.'), e('Hablas como si lo supieras todo.', 'Her şeyi biliyormuşsun gibi konuşuyorsun.')],
  },
  'subjuntivo-perfecto': {
    formula: 'haber (haya, hayas, haya, hayamos, hayáis, hayan) + participio',
    markers: ['espero que', 'dudo que', 'no creo que', 'me alegro de que', 'cuando (gelecekte bitmiş)', 'es posible que', 'ojalá'],
    contrast: [
      c('Subjuntivo presente', 'Presente eş zamanlı ya da sonraki eylemi, perfecto tetikleyiciden önce bitmiş eylemi anlatır: Espero que vengas / Espero que hayas venido.'),
      c('Perfecto de indicativo', 'Kesin bilgide indicativo gelir: Sé que has venido.'),
    ],
    slips: [
      s('Espero que has llegado bien.', 'Espero que hayas llegado bien.', 'espero que subjuntivo ister; yardımcı haber de subjuntivoya geçer.'),
      s('Dudo que han terminado.', 'Dudo que hayan terminado.', 'dudar que subjuntivo ister.'),
    ],
    examples: [e('Es posible que se haya perdido.', 'Kaybolmuş olması mümkün.'), e('No creo que hayas entendido bien.', 'İyi anladığını sanmıyorum.'), e('Cuando hayas comido, vamos al parque.', 'Yemeğini bitirince parka gidiyoruz.')],
  },
  'subjuntivo-pluscuamperfecto': {
    formula: 'haber (hubiera, hubieras, hubiera, hubiéramos, hubierais, hubieran) + participio',
    markers: ['si hubiera…', 'ojalá hubiera…', 'como si hubiera', 'de haber…', 'si no hubiera sido por…'],
    contrast: [
      c('Subjuntivo imperfecto', 'Şimdi ya da gelecek varsayımı: Si tuviera dinero, compraría. Gerçekleşmemiş geçmiş: Si hubiera tenido dinero, habría comprado.'),
      c('Condicional perfecto', 'Koşul yarısı subjuntivo pluscuamperfecto, sonuç yarısı condicional perfecto olur.'),
    ],
    slips: [
      s('Si habría estudiado, habría aprobado.', 'Si hubiera estudiado, habría aprobado.', 'si yarısında condicional gelmez: hubiera.'),
      s('Ojalá habría ido.', 'Ojalá hubiera ido.', 'Pişmanlık dileği hubiera + participio ile kurulur.'),
    ],
    examples: [e('Si hubieras llegado antes, lo habrías visto.', 'Daha önce gelseydin onu görürdün.'), e('Ojalá me hubieran avisado.', 'Keşke bana haber verselerdi.'), e('Habló como si nunca hubiera pasado nada.', 'Hiçbir şey olmamış gibi konuştu.')],
  },
  imperativo: {
    formula: 'tú: 3. tekil geniş zaman; usted / nosotros / ustedes: subjuntivo; olumsuz emir: hep subjuntivo',
    markers: ['por favor', 'rápido', 'ya', 'ven aquí', 'no + subjuntivo', 'anda', 'oye', 'mira'],
    contrast: [
      c('Presente', 'Presente bilgi verir (Tú hablas), imperativo emreder (Habla).'),
      c('Subjuntivo', 'Olumsuz emir ve usted/ustedes emri subjuntivodur: No hables, Hable usted.'),
      c('Mastar', 'Yazılı talimat ve tabelalarda mastar emir yerine kullanılır: Cerrar la puerta.'),
    ],
    slips: [
      s('No habla tan alto.', 'No hables tan alto.', 'Olumsuz emir subjuntivo ister.'),
      s('Dame lo.', 'Dámelo.', 'Olumlu emirde zamirler fiile yapışır ve vurgu işareti gerekir.'),
      s('Hacer lo que te digo.', 'Haz lo que te digo.', 'hacer’in tú emri düzensizdir: haz (ayrıca ven, ten, pon, sal, di, ve, sé).'),
    ],
    examples: [e('Siéntate, por favor.', 'Otur lütfen.'), e('Dime cuándo llegas.', 'Ne zaman geldiğini söyle.'), e('No te preocupes.', 'Endişelenme.')],
  },
}
