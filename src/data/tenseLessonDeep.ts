import type { Tense } from '../engine/tenses'

/**
 * The third layer of each tense's lesson (after data/tenseLesson.ts and data/tenseLessonMore.ts): the fine
 * points a learner meets once the basics are in place. Negation and questions, where the pronouns go,
 * agreement, the full lists of irregular stems, verbs whose meaning changes with the tense, how the tense
 * shifts in reported speech, spelling and sound, and how regions and registers differ. Shown folded, one
 * section at a time, at the end of the same sheet.
 */
export interface TenseDeepSection {
  /** Short Turkish title. */
  title: string
  /** One fact per line, in Turkish, with target-language words inline. */
  points: string[]
  /** Sentences that show the section, with their Turkish. */
  examples?: { text: string; tr: string }[]
}

const x = (text: string, tr: string) => ({ text, tr })
const sec = (title: string, points: string[], examples?: { text: string; tr: string }[]): TenseDeepSection => ({ title, points, ...(examples ? { examples } : {}) })

export const TENSE_LESSON_DEEP: Partial<Record<Tense, TenseDeepSection[]>> = {
  // ---------- Français ----------
  present: [
    sec(
      'Olumsuz ve soru',
      [
        'Olumsuzda ne … pas fiili sarar: Je ne parle pas. Sesli harften önce ne → n’: Il n’aime pas.',
        'Diğer olumsuzlar da aynı yerde: ne … jamais (hiç), ne … plus (artık), ne … rien (hiçbir şey), ne … personne (kimse), ne … que (yalnızca, olumsuz değil!).',
        'Konuşma dilinde ne çoğu zaman düşer: Je sais pas. Yazıda ve sınavda ne yazılır.',
        'Soru üç yolla sorulur: tonlamayla (Tu viens ?), est-ce que ile (Est-ce que tu viens ?), devrikle (Viens-tu ?). Devrik en resmî olanıdır.',
        'il / elle / on ile devrikte iki ünlü yan yana gelirse araya -t- girer: Parle-t-il ? A-t-elle fini ? Va-t-on partir ?',
        'je ile devrik nerdeyse yalnız birkaç kalıpta kalır: Puis-je ? Suis-je ? Ai-je ? Diğerlerinde est-ce que kullanılır.',
      ],
      [x('Je ne mange jamais de viande.', 'Hiç et yemem.'), x('Est-ce que vous habitez ici ?', 'Burada mı oturuyorsunuz?'), x('Parle-t-elle espagnol ?', 'İspanyolca konuşuyor mu?')],
    ),
    sec(
      'Zamirlerin yeri',
      [
        'Nesne zamirleri çekimli fiilin önüne gelir: Je le vois, Je lui parle, J’y vais, J’en veux.',
        'Sıra: me / te / se / nous / vous → le / la / les → lui / leur → y → en. Örnek: Je te le donne; Il leur en parle.',
        'Mastarlı yapılarda zamir mastarın önüne geçer: Je veux le voir (Je le veux voir eskidir).',
        'Olumsuzda ne zamirden önce gelir: Je ne le vois pas.',
      ],
      [x('Tu me le prêtes ?', 'Onu bana ödünç verir misin?'), x('Je vais y penser.', 'Bunu düşüneceğim.')],
    ),
    sec('Yazım ve telaffuz', [
      '-e, -es, -ent okunmaz: parle, parles, parlent aynı sesle okunur. Ayrım yalnız yazıda.',
      'Düzensizlerde il / ils farkı duyulur: il finit / ils finissent, il prend / ils prennent, il doit / ils doivent.',
      '-cer ve -ger fiillerinde nous biçimi: nous commençons, nous mangeons (sesi korumak için).',
      '-eler / -eter fiillerinin çoğu harfi ikiler: j’appelle, je jette; birkaçı è alır: j’achète, je gèle, je pèle.',
      'é ile biten kök sessiz e’den önce è olur: je préfère, ils préfèrent; ama nous préférons, vous préférez.',
      '-yer fiillerinde y sessiz e’den önce i olur: je paie (je paye da doğru), j’envoie, je nettoie (-oyer ve -uyer’de zorunlu).',
      'Liaison: ils_ont [z] ile ils sont [s] ayrımı anlamı değiştirir: ils ont (sahipler) / ils sont (onlar).',
    ]),
    sec('Sık düzensizlerin tamamı', [
      'être: suis, es, est, sommes, êtes, sont.',
      'avoir: ai, as, a, avons, avez, ont.',
      'aller: vais, vas, va, allons, allez, vont.',
      'faire: fais, fais, fait, faisons, faites, font (faisons “fözon” okunur).',
      'pouvoir: peux, peux, peut, pouvons, pouvez, peuvent. vouloir: veux, veux, veut, voulons, voulez, veulent.',
      'venir: viens, viens, vient, venons, venez, viennent. prendre: prends, prends, prend, prenons, prenez, prennent.',
      'savoir: sais, sais, sait, savons, savez, savent. devoir: dois, dois, doit, devons, devez, doivent.',
      'dire: dis, dis, dit, disons, dites, disent. mettre: mets, mets, met, mettons, mettez, mettent.',
      '-indre / -soudre fiilleri d’yi düşürür: il peint, il craint, il résout (ama il prend, il vend d’yi korur).',
    ]),
    sec(
      'Présent’in özel kalıpları',
      [
        'être en train de + mastar: şu anda yapıyor olmayı vurgular: Je suis en train de manger.',
        'depuis / ça fait … que / il y a … que + présent: Türkçedeki “-dır” anlamı: J’habite ici depuis trois ans (üç yıldır burada oturuyorum). Burada passé composé kullanılmaz.',
        'venir de + mastar: yakın geçmiş (az önce): Je viens de manger.',
        'aller + mastar: yakın gelecek: Je vais partir.',
        'si + présent → futur / présent / impératif: S’il pleut, je reste à la maison.',
        'Tarihî présent: geçmişi canlı anlatmak için: En 1789, la Révolution commence.',
      ],
      [x('Ça fait deux heures que je t’attends.', 'İki saattir seni bekliyorum.'), x('Elle vient de sortir.', 'Az önce çıktı.')],
    ),
  ],

  imparfait: [
    sec(
      'Anlamı değişen fiiller',
      [
        'savoir: je savais (biliyordum) / j’ai su (öğrendim, haberim oldu).',
        'connaître: je connaissais (tanıyordum) / j’ai connu (tanıştım).',
        'pouvoir: je pouvais (gücüm yetiyordu) / j’ai pu (başardım). Olumsuzda: je n’ai pas pu (yapamadım, denedim ama olmadı).',
        'vouloir: je voulais (istiyordum) / j’ai voulu (istedim, denedim). je n’ai pas voulu = reddettim.',
        'devoir: je devais (yapmam gerekiyordu, planlanmıştı) / j’ai dû (zorunda kaldım; ya da “mutlaka … -mışımdır”).',
        'avoir: j’avais (sahiptim) / j’ai eu (aldım, başıma geldi): J’ai eu un accident.',
      ],
      [x('Je savais qu’il viendrait.', 'Geleceğini biliyordum.'), x('J’ai su la vérité hier.', 'Gerçeği dün öğrendim.')],
    ),
    sec(
      'Imparfait’in özel kullanımları',
      [
        'Kibarlık: Je voulais vous demander un service (Sizden bir ricam olacaktı). Şimdiki zamandan daha yumuşaktır.',
        'Öneri: Et si on allait au cinéma ? (Sinemaya gitsek mi?) – si + imparfait tek başına.',
        'Varsayım: Si j’étais toi, je partirais. si’den sonra hiçbir zaman conditionnel gelmez.',
        'Az kalsın: Un pas de plus et il tombait (Bir adım daha atsa düşüyordu).',
        'aller + mastar imparfait’te: “tam … üzereydim”: J’allais partir quand tu as appelé.',
        'venir de + mastar imparfait’te: “az önce … -mıştım”: Il venait de rentrer.',
        'être en train de imparfait’te: süren eylem vurgusu: J’étais en train de lire.',
      ],
      [x('J’allais t’appeler !', 'Tam seni arayacaktım!'), x('Si seulement j’avais plus de temps…', 'Keşke daha çok zamanım olsa…')],
    ),
    sec(
      'Dolaylı anlatımda (zaman uyumu)',
      [
        'Ana cümle geçmişteyse (il a dit, il disait) aktarılan présent imparfait olur.',
        'Il dit : « Je suis fatigué. » → Il a dit qu’il était fatigué.',
        'Aktarılan cümle zaten imparfait ise değişmez.',
      ],
      [x('Elle m’a dit qu’elle habitait à Nice.', 'Bana Nice’te oturduğunu söyledi.')],
    ),
    sec('Yazım ve telaffuz', [
      'Tek düzensiz être’dir (ét-). Diğer bütün fiiller nous köküyle kurulur: nous faisons → je faisais, nous prenons → je prenais, nous buvons → je buvais.',
      '-ais, -ait, -aient aynı okunur [ɛ]; yazıda dikkat: je / tu -ais, il -ait, ils -aient.',
      '-cer / -ger: je commençais, je mangeais, ama nous commencions, nous mangions (i’den önce ç ve ge gerekmez).',
      '-ier fiillerinde nous / vous’da iki i: nous étudiions, vous oubliiez. -yer’de yi: nous payions. -iller’de lli: nous travaillions.',
      'Bu çift i’ler présent ile karışmayı önler: nous étudions (şimdi) / nous étudiions (geçmiş).',
    ]),
  ],

  'passe-compose': [
    sec(
      'Olumsuz, soru ve zarfların yeri',
      [
        'ne … pas yardımcı fiili sarar: Je n’ai pas mangé. Je ne suis pas sorti.',
        'ne … personne ve ne … nulle part ortaçtan sonra gelir: Je n’ai vu personne. (ama: Je n’ai rien vu.)',
        'Devrik soruda yardımcı ile özne yer değiştirir: As-tu mangé ? Est-il parti ? A-t-elle compris ?',
        'Kısa zarflar yardımcı ile ortaç arasına girer: J’ai bien dormi, J’ai déjà fini, J’ai beaucoup travaillé, Il a toujours aimé.',
        'Zaman zarfları (hier, aujourd’hui, tôt, tard) ve uzun zarflar cümle başına ya da sonuna gider: Je suis arrivé tard.',
      ],
      [x('Je n’ai jamais vu la mer.', 'Denizi hiç görmedim.'), x('Avez-vous bien dormi ?', 'İyi uyudunuz mu?')],
    ),
    sec(
      'Zamirlerin yeri',
      [
        'Nesne zamirleri yardımcı fiilin önüne gelir: Je l’ai vu, Je lui ai parlé, J’y suis allé, J’en ai mangé.',
        'Olumsuzda ne zamirin önünde: Je ne l’ai pas vu.',
        'Devrik soruda zamir yine yardımcıdan önce: L’as-tu vu ?',
      ],
      [x('Tu lui as dit la vérité ?', 'Ona gerçeği söyledin mi?')],
    ),
    sec(
      'Ortaç uyumu (en ince kural)',
      [
        'être ile: ortaç özneye uyar: elle est partie, ils sont venus, elles sont arrivées, nous sommes allé(e)s.',
        'avoir ile: ortaç uymaz, ama düz nesne fiilden ÖNCE gelirse ona uyar: J’ai mangé la pomme / La pomme que j’ai mangée / Je l’ai mangée.',
        'en ile uyum yoktur: Des pommes ? J’en ai mangé.',
        'Dönüşlü fiillerde se düz nesne ise uyar: Elle s’est lavée. Sonra düz nesne gelirse uymaz: Elle s’est lavé les mains.',
        'se dolaylı nesne ise (birine bir şey yapmak) uyum yok: Ils se sont parlé, Elles se sont téléphoné, Ils se sont écrit.',
        'Uyum çoğu zaman duyulmaz (mangé / mangée aynı okunur), ama -t, -s ile biten ortaçlarda duyulur: Il l’a prise, La lettre qu’il a écrite.',
      ],
      [x('Les fleurs que tu m’as offertes sont belles.', 'Bana verdiğin çiçekler güzel.'), x('Elle s’est cassé la jambe.', 'Bacağını kırdı.')],
    ),
    sec('Yardımcı seçiminin ayrıntıları', [
      'être alanlar: aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, retourner, passer, devenir, revenir, rentrer, apparaître ve bütün dönüşlü fiiller.',
      'monter, descendre, sortir, rentrer, retourner, passer düz nesne alırsa avoir ile çekilir ve anlamı değişir:',
      'Il est monté (çıktı) / Il a monté les valises (bavulları çıkardı). Je suis sorti (çıktım) / J’ai sorti le chien (köpeği çıkardım).',
      'Je suis passé chez toi (sana uğradım) / J’ai passé une bonne journée (iyi bir gün geçirdim).',
      'Durum değişikliği bildirmeyen hareket fiilleri avoir alır: J’ai marché, J’ai couru, J’ai voyagé.',
    ]),
    sec('Düzensiz ortaçların tam listesi', [
      'avoir → eu, être → été, faire → fait, dire → dit, écrire → écrit, conduire → conduit.',
      'prendre → pris (apprendre → appris, comprendre → compris), mettre → mis (promettre → promis), s’asseoir → assis.',
      'voir → vu, venir → venu, tenir → tenu, pouvoir → pu, vouloir → voulu, savoir → su, devoir → dû (eril tekilde şapkalı; due, dus).',
      'boire → bu, lire → lu, croire → cru, connaître → connu, vivre → vécu, recevoir → reçu, courir → couru, falloir → fallu, pleuvoir → plu.',
      'ouvrir → ouvert, offrir → offert, couvrir → couvert, souffrir → souffert, découvrir → découvert.',
      'naître → né, mourir → mort, rire → ri, suivre → suivi, craindre → craint, peindre → peint, joindre → joint, plaire → plu.',
    ]),
    sec('Telaffuz ve yazım', [
      '-é ortacı ile -er mastarı aynı okunur: j’ai mangé / je vais manger. Yazarken yerine vendu / vendre koy: “j’ai vendu” oluyorsa -é, “je vais vendre” oluyorsa -er.',
      'je + ai → j’ai; ne + ai → n’ai.',
      'Konuşmada passé composé hem “-dı” hem “-mış” anlamını taşır; Türkçedeki gibi duyulan geçmiş ayrımı yoktur.',
    ]),
  ],

  'passe-simple': [
    sec('Düzensizler ünlü gruplarına göre', [
      '-is grubu: faire → je fis, il fit; dire → il dit; mettre → il mit; prendre → il prit; voir → il vit; écrire → il écrivit; conduire → il conduisit; naître → il naquit.',
      '-us grubu: être → il fut; avoir → il eut; pouvoir → il put; savoir → il sut; vouloir → il voulut; devoir → il dut; boire → il but; lire → il lut; croire → il crut; connaître → il connut; vivre → il vécut; recevoir → il reçut; courir → il courut; mourir → il mourut.',
      '-ins grubu: venir → il vint, ils vinrent; tenir → il tint, ils tinrent (ve türevleri: devint, obtint, revint).',
      'Bu fiillerin ekleri: -s, -s, -t, şapkalı -mes ve -tes, -rent: je fis, tu fis, il fit, nous fîmes, vous fîtes, ils firent.',
    ]),
    sec('Tanıma ipuçları', [
      'nous ve vous biçimleri şapka alır: nous parlâmes, vous parlâtes, nous fûmes, nous eûmes, nous vînmes.',
      '-ir fiillerinde il biçimi présent ile aynıdır: il finit (bitirir / bitirdi), il dit (der / dedi). Ayrım cümlenin diğer fiillerinden çıkar.',
      '1. ve 2. kişi yazıda bile nadirdir; romanlarda en çok il / elle ve ils / elles görülür.',
      'Passé antérieur (il eut fini, il fut parti) yalnız passé simple’li anlatıda, dès que / quand / après que’den sonra: Dès qu’il eut fini, il sortit.',
    ]),
    sec(
      'Anlatıdaki yeri',
      [
        'Passé simple olayları sıralar, imparfait fonu çizer, plus-que-parfait daha önceyi anlatır.',
        'Masallar: Il était une fois un roi qui avait trois filles. Un jour, il décida…',
        'Gazetelerde ve tarih kitaplarında da görülür; mektupta ve konuşmada kullanılmaz.',
      ],
      [x('La nuit tombait. Elle ferma les volets et alluma une bougie.', 'Gece çöküyordu. Panjurları kapadı ve bir mum yaktı.')],
    ),
  ],

  'plus-que-parfait': [
    sec('Olumsuz, zamir ve uyum', [
      'Olumsuz: Je n’avais pas compris. Soru: Avais-tu déjà vu ce film ?',
      'Zamirler yardımcıdan önce: Je l’avais oublié. Je n’y étais jamais allé.',
      'Yardımcı seçimi ve ortaç uyumu passé composé ile tamamen aynıdır: Elle était partie; Les lettres qu’il avait écrites.',
    ]),
    sec(
      'Dolaylı anlatımda (zaman uyumu)',
      [
        'Ana cümle geçmişteyse aktarılan passé composé plus-que-parfait olur.',
        'Il a dit : « J’ai fini. » → Il a dit qu’il avait fini.',
        'Aktarılan imparfait değişmez; aktarılan futur conditionnel olur.',
      ],
      [x('Elle m’a expliqué qu’elle avait raté son train.', 'Bana trenini kaçırdığını anlattı.')],
    ),
    sec(
      'Özel kullanımlar',
      [
        'Keşke: Si seulement j’avais su ! (Keşke bilseydim!)',
        'Gerçekleşmemiş geçmiş koşul: si + plus-que-parfait → conditionnel passé: Si tu m’avais appelé, je serais venu.',
        'Kibar geçmiş: J’étais venu vous demander… (Size sormaya gelmiştim…).',
      ],
      [x('Si j’avais pris le métro, je serais arrivé à l’heure.', 'Metroya binseydim zamanında varırdım.')],
    ),
    sec('Türkçe “-mıştı” ile farkı', [
      'Türkçe -mıştı bazen “duydum ki” anlamı taşır; Fransızca plus-que-parfait taşımaz. Duyulan bilgi için on dit que ya da conditionnel kullanılır: Il serait parti.',
      'Fransızcada plus-que-parfait yalnızca “başka bir geçmişten önce” demektir; tek başına anlatılan eski bir olay passé composé ile söylenir.',
    ]),
  ],

  futur: [
    sec('Düzensiz köklerin tam listesi', [
      'être → ser-, avoir → aur-, aller → ir-, faire → fer-, savoir → saur-.',
      'pouvoir → pourr-, voir → verr-, envoyer → enverr-, courir → courr-, mourir → mourr-, acquérir → acquerr-.',
      'devoir → devr-, recevoir → recevr-, vouloir → voudr-, valoir → vaudr-, falloir → faudr- (il faudra), pleuvoir → pleuvr- (il pleuvra).',
      'venir → viendr-, tenir → tiendr- (ve türevleri: deviendr-, obtiendr-).',
      'cueillir → cueiller-, s’asseoir → assiér- ya da assoir- (je m’assiérai / je m’assoirai).',
      'Kök ne olursa olsun önünde hep r vardır; ekler hiç değişmez.',
    ]),
    sec('Yazım ayrıntıları', [
      '-re fiillerinde son e düşer: prendre → je prendrai, boire → je boirai.',
      'Sessiz e’li fiiller présent’teki yazımı korur: j’achèterai, je lèverai, j’appellerai, je jetterai, je paierai (ya da payerai), j’essaierai.',
      'é’li fiiller (préférer, répéter) geleneksel olarak é korur: je préférerai. 1990 yazım düzeltmesinden beri je préfèrerai da kabul edilir.',
      'futur ile conditionnel’in je biçimi konuşmada çoğu zaman aynı duyulur: je parlerai / je parlerais. Yazıda -ai / -ais anlamı değiştirir.',
    ]),
    sec(
      'quand, si ve zaman uyumu',
      [
        'quand, lorsque, dès que, aussitôt que, tant que, une fois que gelecekten söz ediyorsa futur gerekir: Quand tu seras grand, tu comprendras.',
        'si’den sonra futur gelmez: S’il fait beau, nous sortirons.',
        'Ama dolaylı soru “mı / mi” anlamındaki si futur alabilir: Je ne sais pas s’il viendra (Gelip gelmeyeceğini bilmiyorum).',
        'Dolaylı anlatımda ana cümle geçmişteyse futur conditionnel olur: Il a dit qu’il viendrait.',
      ],
      [x('Dès que j’aurai le temps, je t’écrirai.', 'Vaktim olur olmaz sana yazacağım.'), x('Je me demande s’il pleuvra demain.', 'Yarın yağmur yağar mı diye merak ediyorum.')],
    ),
    sec('Futur simple mi, futur proche mu?', [
      'aller + mastar (futur proche): konuşmada yakın ve kesin plan: Je vais manger.',
      'futur simple: daha uzak, daha resmî, tahmin ve söz: Un jour, je visiterai le Japon.',
      'Yazılı talimatta ve nazik emirde futur: Vous prendrez ce médicament trois fois par jour.',
      'Olumsuz: Je ne viendrai pas / Je ne vais pas venir.',
    ]),
  ],

  'futur-anterieur': [
    sec('Kullanımın ince noktaları', [
      'İki gelecek olaydan önce biteni gösterir; Türkçe çoğu zaman “-ınca / -dıktan sonra” der: Quand tu auras fini, tu pourras sortir (Bitirince çıkabilirsin).',
      'Bir tarihe kadar tamamlanmış olacak iş: D’ici juin, j’aurai passé mes examens.',
      'Geçmiş için tahmin: Il n’est pas là ? Il aura oublié (Unutmuş olmalı).',
      'Bilanço: En 2030, j’aurai vécu dix ans à Paris.',
    ]),
    sec('Kuruluş ayrıntıları', [
      'Yardımcı futur’a geçer: j’aurai, tu auras… / je serai, tu seras… + ortaç.',
      'Ortaç uyumu passé composé ile aynı: Elles seront parties; La lettre que j’aurai écrite.',
      'Olumsuz: Je n’aurai pas fini à temps. Zamir: Je l’aurai terminé demain.',
      'Dolaylı anlatımda ana cümle geçmişteyse conditionnel passé olur: Il a dit qu’il aurait fini à midi.',
    ]),
  ],

  conditionnel: [
    sec(
      'si cümlesinin üç tipi',
      [
        'Gerçek: si + présent → futur / présent / impératif: Si tu viens, on ira au parc.',
        'Gerçek dışı şimdi: si + imparfait → conditionnel présent: Si j’avais une voiture, je t’emmènerais.',
        'Gerçek dışı geçmiş: si + plus-que-parfait → conditionnel passé: Si j’avais su, je serais venu.',
        'Karışık: geçmiş koşul, şimdiki sonuç: Si j’avais étudié la médecine, je serais médecin aujourd’hui.',
        'si’den sonra conditionnel gelmez (Si j’aurais… yanlış). Ama dolaylı soru si’si alabilir: Je me demande s’il viendrait.',
      ],
      [x('Si on partait demain, on arriverait lundi.', 'Yarın yola çıksak pazartesi varırdık.')],
    ),
    sec('Kibarlığın dili', [
      'Je voudrais (istiyorum yerine), J’aimerais, Pourriez-vous… ?, Auriez-vous… ?, Ça vous dérangerait de… ?',
      'Tavsiye: Tu devrais (yapmalısın), Il faudrait (gerekir), Vous feriez mieux de (… yapsanız iyi olur).',
      'Yumuşak öneri: On pourrait aller au cinéma.',
    ]),
    sec('Haber dili ve geçmişten gelecek', [
      'Doğrulanmamış bilgi: Le ministre serait malade (Bakanın hasta olduğu söyleniyor). Türkçe -mış gibi.',
      'Geçmişten bakınca gelecek: Il a dit qu’il viendrait; Je savais que tu réussirais.',
      'au cas où + conditionnel: Prends un parapluie au cas où il pleuvrait.',
      'même si + imparfait (conditionnel değil): Même si j’étais riche, je travaillerais.',
    ]),
    sec('Yazım ve telaffuz', [
      'Kök futur ile tamamen aynıdır: je serais, j’aurais, j’irais, je ferais, je pourrais, je viendrais, il faudrait.',
      'Ekler imparfait’inkilerdir ve aynı okunur: -ais, -ait, -aient.',
      'je parlerai (futur) / je parlerais (conditionnel): resmî telaffuzda [e] / [ɛ], gündelikte çoğu zaman aynı. Yazıda s’yi unutma.',
    ]),
  ],

  'conditionnel-passe': [
    sec(
      'En sık üç kalıp',
      [
        'j’aurais dû + mastar: “… -malıydım” (pişmanlık / eleştiri): J’aurais dû partir plus tôt.',
        'j’aurais pu + mastar: “… -abilirdim” (fırsat, sitem): Tu aurais pu me prévenir !',
        'j’aurais voulu / j’aurais aimé + mastar: “isterdim (ama olmadı)”: J’aurais aimé te voir.',
      ],
      [x('Tu aurais dû me le dire.', 'Bunu bana söylemeliydin.'), x('On aurait pu gagner.', 'Kazanabilirdik.')],
    ),
    sec('İnce noktalar', [
      'Karışık koşul: şimdiki koşul, geçmiş sonuç: Si j’étais plus courageux, j’aurais accepté.',
      'Haber dilinde geçmiş: L’accident aurait fait trois blessés (… yaralandığı bildiriliyor).',
      'Dolaylı anlatımda futur antérieur buna dönüşür: Il a promis qu’il aurait fini avant midi.',
      'Ortaç uyumu ve yardımcı seçimi passé composé ile aynı: Elle serait venue.',
      'Olumsuz: Je n’aurais pas dû. Zamir: Je l’aurais acheté.',
      'Edebî dilde “conditionnel passé 2. biçim” (j’eusse aimé) görülebilir: yalnızca tanımak yeter.',
    ]),
  ],

  subjonctif: [
    sec('Tetikleyicilerin tam listesi', [
      'İstek: vouloir que, souhaiter que, désirer que, aimer que, préférer que, demander que, exiger que, ordonner que.',
      'Zorunluluk ve gereklilik: il faut que, il est nécessaire que, il est important que, il vaut mieux que, il suffit que.',
      'Duygu: être content / heureux / triste / surpris / désolé que, avoir peur que, craindre que, regretter que, s’étonner que.',
      'Olasılık ve şüphe: il est possible que, il se peut que, douter que, il semble que, ne pas être sûr que.',
      'Olumsuz ve soru düşünce: je ne pense pas que, je ne crois pas que, penses-tu que…? (olumluda indicatif: je pense qu’il vient).',
      'Bağlaçlar: pour que, afin que, bien que, quoique, avant que, jusqu’à ce que, à condition que, pourvu que, sans que, de peur que, à moins que.',
      'Göreli cümle: var olup olmadığı bilinmeyen şey: Je cherche quelqu’un qui sache le chinois. Üstünlük: C’est le meilleur livre que je connaisse.',
    ]),
    sec('Subjonctif istemeyenler (sık tuzaklar)', [
      'espérer que → indicatif: J’espère qu’il viendra.',
      'il est probable / sûr / certain / évident que → indicatif.',
      'après que → kural olarak indicatif: Après qu’il est parti (konuşmada subjonctif çok duyulur, ama sınavda indicatif).',
      'parce que, puisque, pendant que, tandis que, depuis que, dès que → indicatif.',
      'penser / croire olumlu → indicatif: Je crois qu’il a raison.',
    ]),
    sec(
      'Aynı özne → mastar',
      [
        'İki cümlenin öznesi aynıysa que + subjonctif yerine mastar gelir:',
        'Je veux partir (Je veux que je parte değil). Je suis content d’être ici.',
        'pour que → pour + mastar, avant que → avant de + mastar, sans que → sans + mastar, à condition que → à condition de.',
        'bien que’nin mastarlı biçimi yoktur.',
      ],
      [x('Je suis content que tu sois là. / Je suis content d’être là.', 'Burada olmana seviniyorum. / Burada olduğuma seviniyorum.')],
    ),
    sec('ne explétif', [
      'avoir peur que, craindre que, avant que, à moins que, de peur que’den sonra resmî dilde boş bir ne gelebilir: J’ai peur qu’il ne vienne.',
      'Bu ne olumsuzluk değildir: “gelmesinden korkuyorum” demektir. Olumsuz için ne … pas gerekir.',
      'Konuşmada çoğu zaman atlanır.',
    ]),
    sec('İki köklü fiiller ve yazım', [
      'Bazı fiiller nous / vous için ayrı kök kullanır (imparfait’teki gibi): boire → que je boive / que nous buvions; venir → vienne / venions; prendre → prenne / prenions.',
      'recevoir → reçoive / recevions; devoir → doive / devions; voir → voie / voyions; croire → croie / croyions.',
      'Tamamen düzensizler: être (sois, sois, soit, soyons, soyez, soient), avoir (aie, aies, ait, ayons, ayez, aient), aller (aille / allions), faire (fasse), pouvoir (puisse), savoir (sache), vouloir (veuille / voulions), falloir (qu’il faille), valoir (vaille).',
      '-er fiillerinde tekiller ve 3. çoğul présent ile aynı yazılır ve okunur: que je parle. Fark nous / vous’da: que nous parlions.',
    ]),
    sec('Bağımsız subjonctif', [
      'que + subjonctif tek başına 3. kişiye emir ya da dilektir: Qu’il entre ! (Girsin!) Qu’ils se taisent !',
      'Kalıplaşmış dilekler: Vive la France ! Ainsi soit-il. Soit !',
    ]),
  ],

  'subjonctif-passe': [
    sec(
      'Hangi subjonctif? (zaman ilişkisi)',
      [
        'Seçimi ana cümlenin zamanı değil, eylemin tetikleyiciye göre zamanı belirler.',
        'Eylem aynı anda ya da sonra → subjonctif présent: Je suis content que tu viennes (gelmene / geleceğine seviniyorum).',
        'Eylem önce bitmiş → subjonctif passé: Je suis content que tu sois venu (gelmiş olmana seviniyorum).',
        'Gelecekte bir noktadan önce bitecek: Attends jusqu’à ce que j’aie fini.',
      ],
      [x('Je ne crois pas qu’il ait compris.', 'Anladığını sanmıyorum.'), x('C’est le plus beau voyage que j’aie jamais fait.', 'Bu, yaptığım en güzel yolculuk.')],
    ),
    sec('Kuruluş ayrıntıları', [
      'que j’aie, que tu aies, qu’il ait, que nous ayons, que vous ayez, qu’ils aient + ortaç.',
      'que je sois, que tu sois, qu’il soit, que nous soyons, que vous soyez, qu’ils soient + ortaç (ortaç özneye uyar).',
      'Ortaç uyumu passé composé ile aynı: Je doute qu’elle soit partie; Bien qu’il les ait lues.',
      'Olumsuz: Je suis triste qu’il ne soit pas venu.',
    ]),
    sec('Edebî subjonctif', [
      'Kitaplarda subjonctif imparfait (qu’il fût, qu’il eût, qu’il parlât) ve plus-que-parfait (qu’il eût fini) görülür.',
      'Konuşmada ve günlük yazıda bunların yerine présent ve passé kullanılır; yalnızca tanımak yeter.',
    ]),
  ],

  imperatif: [
    sec(
      'Zamirlerin sırası',
      [
        'Olumlu emirde zamirler fiilden sonra, tireyle gelir: Regarde-le. Donne-lui. Vas-y. Prends-en.',
        'Sıra: fiil – le / la / les – moi / toi / lui / nous / vous / leur – y – en: Donne-le-moi, Donnez-les-leur.',
        'me / te olumlu emirde moi / toi olur: Aide-moi, Lève-toi. Ama en’den önce m’ / t’: Donne-m’en, Va-t’en.',
        'Olumsuz emirde zamirler normal yerinde, fiilden önce: Ne me le donne pas. Ne t’en va pas.',
      ],
      [x('Dis-le-moi.', 'Bana onu söyle.'), x('Ne t’inquiète pas.', 'Merak etme.'), x('Allez-vous-en !', 'Gidin buradan!')],
    ),
    sec('Yazım ayrıntıları', [
      '-er fiillerinde ve aller’de tu için s düşer: Parle ! Va ! Ama y ve en’den önce s geri gelir (okunuş için): Vas-y, Manges-en, Penses-y.',
      'Dönüşlü fiillerin olumlusu: Lève-toi, Levons-nous, Levez-vous. Olumsuzu: Ne te lève pas.',
      'Düzensizler: être (sois, soyons, soyez), avoir (aie, ayons, ayez), savoir (sache, sachons, sachez), vouloir (veuille, veuillons, veuillez).',
      'Ünlem işaretinden önce Fransızcada boşluk bırakılır: Viens !',
    ]),
    sec('Emri yumuşatmak', [
      'Veuillez + mastar: çok resmî rica (lütfen): Veuillez patienter.',
      'Merci de + mastar: yazılı rica: Merci de fermer la porte.',
      'Mastar emir: tarif, tabela, talimat: Ne pas fumer. Mélanger les œufs.',
      'Soru biçimi daha kibardır: Tu peux fermer la porte ? Pourriez-vous… ?',
      '3. kişiye emir subjonctif ile: Qu’il attende !',
      'Nadiren impératif passé: Sois rentré avant minuit (Gece yarısından önce dönmüş ol).',
    ]),
  ],

  // ---------- Español ----------
  presente: [
    sec(
      'Olumsuz ve soru',
      [
        'Olumsuzda no fiilden önce gelir: No hablo alemán.',
        'İspanyolcada çift olumsuz doğrudur: No veo nada, No viene nadie, No voy nunca. Olumsuz sözcük başa gelirse no düşer: Nunca voy, Nadie viene.',
        'Soru tonlamayla ve baştaki ¿ ile yazılır: ¿Hablas inglés?',
        'Soru sözcükleri vurgu işareti alır: qué, quién, dónde, cuándo, cómo, cuánto, cuál, por qué (cevaptaki porque bitişik ve işaretsiz).',
        'Soruda özne genellikle fiilden sonra gelir: ¿Dónde vive tu hermano?',
      ],
      [x('No conozco a nadie aquí.', 'Burada kimseyi tanımıyorum.'), x('¿Cuándo empieza la película?', 'Film ne zaman başlıyor?')],
    ),
    sec(
      'Zamirlerin yeri',
      [
        'Nesne zamirleri çekimli fiilden önce gelir: Lo veo, Me lo da, Te quiero.',
        'Sıra: dolaylı (me, te, le, nos, os, les) sonra düz (lo, la, los, las): Me lo dice.',
        'le / les + lo / la … → se lo: Se lo doy (Onu ona veriyorum; le lo değil).',
        'Mastar ve ulaçla iki yer de doğru: Lo quiero ver = Quiero verlo; Lo estoy leyendo = Estoy leyéndolo (sona eklenince vurgu işareti gelir).',
        'Kişiyi gösteren düz nesnenin önüne a gelir: Veo a María, ama Veo la casa.',
      ],
      [x('¿Me lo puedes explicar? / ¿Puedes explicármelo?', 'Bunu bana açıklayabilir misin?')],
    ),
    sec('Kök değişen fiillerin yaygın listesi', [
      'e → ie: cerrar, comenzar, empezar, entender, pensar, perder, preferir, querer, sentir, despertar, nevar; tener (tengo, tienes) ve venir (vengo, vienes).',
      'o → ue: contar, costar, dormir, encontrar, morir, mostrar, poder, recordar, volver, volar, soñar, llover; u → ue: jugar.',
      'e → i (yalnız -ir): pedir, repetir, seguir, servir, vestir, medir, reír (río), decir (digo, dices).',
      'Değişim vurgulu hecede olur; bu yüzden nosotros ve vosotros’ta yoktur: pienso / pensamos.',
    ]),
    sec('yo biçiminde yazım değişiklikleri', [
      '-ger / -gir → -jo: coger → cojo, elegir → elijo, dirigir → dirijo, proteger → protejo.',
      '-guir → -go: seguir → sigo, distinguir → distingo.',
      'ünsüz + -cer / -cir → -zo: vencer → venzo, convencer → convenzo, ejercer → ejerzo.',
      '-uir → y: construir → construyo, construyes … construimos (nosotros’ta y yok).',
      '-iar / -uar fiillerinin bir kısmında vurgulu í / ú: enviar → envío, continuar → continúo, confiar → confío (ama cambiar → cambio, averiguar → averiguo).',
    ]),
    sec(
      'Presente’nin özel kalıpları',
      [
        'estar + ulaç: “şu anda” vurgusu: Estoy comiendo. Alışkanlık için kullanılmaz: Como a las dos (Ben saat ikide yerim).',
        'llevar + süre + ulaç / hace … que / desde hace: Türkçedeki “-dır”: Llevo tres años estudiando español; Hace tres años que estudio español.',
        'acabar de + mastar: “az önce”: Acabo de llegar.',
        'ir a + mastar: yakın gelecek: Voy a comer.',
        'Rica için soru: ¿Me pasas la sal? (Tuzu uzatır mısın?)',
        'Tarihî presente: En 1492, Colón llega a América.',
      ],
      [x('Llevo media hora esperándote.', 'Yarım saattir seni bekliyorum.'), x('Acaban de salir.', 'Az önce çıktılar.')],
    ),
    sec('Bölge farkları', [
      'vosotros (siz, samimi çoğul) yalnız İspanya’da kullanılır; Latin Amerika’da çoğul her zaman ustedes’tir ve 3. çoğulla çekilir: ustedes hablan.',
      'usted / ustedes (resmî siz) 3. kişiyle çekilir: usted habla, ustedes hablan.',
      'Arjantin, Uruguay ve Orta Amerika’nın bir kısmında tú yerine vos kullanılır (voseo): vos hablás, vos comés, vos vivís, vos tenés, vos sos.',
    ]),
  ],

  imperfecto: [
    sec(
      'Anlamı değişen fiiller',
      [
        'conocer: conocía (tanıyordum) / conocí (tanıştım).',
        'saber: sabía (biliyordum) / supe (öğrendim, haberim oldu).',
        'querer: quería (istiyordum) / quise (istedim, denedim); no quería (istemiyordum) / no quise (reddettim).',
        'poder: podía (gücüm vardı) / pude (başardım); no pude (yapamadım, denedim ama olmadı).',
        'tener: tenía (sahiptim) / tuve (aldım, oldu): Tuve una idea (Aklıma bir fikir geldi).',
        'estar: estaba enfermo (hastaydım, durum) / estuve enfermo tres días (üç gün hasta kaldım, bitti).',
      ],
      [x('No sabía que estabas aquí.', 'Burada olduğunu bilmiyordum.'), x('Lo supe ayer.', 'Dün öğrendim.')],
    ),
    sec(
      'Özel kalıplar',
      [
        'soler + mastar (imperfecto’da): “eskiden … -ırdım”: Solía levantarme a las seis.',
        'ir a + mastar (imperfecto’da): “tam … -acaktım”: Iba a llamarte.',
        'estar + ulaç (imperfecto’da): süren eylem: Estaba leyendo cuando sonó el teléfono.',
        'Kibarlık: Quería pedirle un favor (Sizden bir ricam olacaktı).',
        'Çocuk oyunu: Yo era el policía y tú eras el ladrón (Ben polis olayım, sen hırsız).',
      ],
      [x('Iba a decírtelo, pero se me olvidó.', 'Sana söyleyecektim ama unuttum.')],
    ),
    sec('Dolaylı anlatımda', [
      'Ana fiil geçmişteyse aktarılan presente imperfecto olur: Dice: «Estoy cansado.» → Dijo que estaba cansado.',
      'Aktarılan imperfecto değişmez.',
    ]),
    sec('Yazım ve telaffuz', [
      '-ía eklerinde í vurguludur ve işaret alır: comía, vivíamos.',
      '-ar fiillerinde yalnız nosotros vurgu işareti alır: hablábamos (hablabais işaretsiz).',
      'yo ve él aynıdır: hablaba, comía. Gerekirse özne söylenir: Yo trabajaba y él estudiaba.',
      'Üç düzensiz: ser (era, eras, era, éramos, erais, eran), ir (iba, ibas, iba, íbamos, ibais, iban), ver (veía, veías…).',
    ]),
  ],

  preterito: [
    sec('Düzensizlerin tam listesi', [
      'Güçlü kökler (ekler -e, -iste, -o, -imos, -isteis, -ieron, vurgusuz): andar → anduv-, caber → cup-, estar → estuv-, haber → hub-, hacer → hic- (él hizo), poder → pud-, poner → pus-, querer → quis-, saber → sup-, tener → tuv-, venir → vin-.',
      'j kökleri (ellos’ta -eron): decir → dij-, traer → traj-, conducir → conduj-, producir → produj-, traducir → traduj-.',
      'ser ve ir aynı: fui, fuiste, fue, fuimos, fuisteis, fueron.',
      'dar -er/-ir ekleriyle çekilir: di, diste, dio, dimos, disteis, dieron. ver: vi, viste, vio, vimos, visteis, vieron.',
      'Türevler kökünü izler: obtener → obtuve, componer → compuse, deshacer → deshice, contradecir → contradije.',
    ]),
    sec('Sesli ve yazım değişiklikleri', [
      '-ir fiillerinde él / ellos’ta kök değişir: sentir → sintió, sintieron; pedir → pidió; dormir → durmió, durmieron; morir → murió.',
      '-ar ve -er fiillerinde pretérito’da kök değişmez: pensó, volvió, entendió.',
      'İki ünlü arasında i → y: leer → leyó, leyeron; oír → oyó; caer → cayó; creer → creyó; construir → construyó.',
      'yo biçiminde: -car → -qué (busqué), -gar → -gué (llegué), -zar → -cé (empecé), -guar → -güé (averigüé).',
      'Vurgu işareti anlamı değiştirir: hablo (konuşurum) / habló (konuştu); trabajo / trabajó.',
      '-ar ve -ir fiillerinde nosotros presente ile aynıdır: hablamos, vivimos. Anlam bağlamdan çıkar (ayer hablamos).',
    ]),
    sec(
      'Pretérito mu, imperfecto mu? İnce durumlar',
      [
        'Süresi verilen ve bitmiş durum pretérito’dur: Viví en Madrid cinco años (Beş yıl Madrid’de yaşadım, artık değil).',
        'Belli sayıda tekrar pretérito’dur: Fui tres veces a Roma.',
        'Olay araya girer: Dormía (fon) cuando sonó (olay) el teléfono.',
        'hace + süre = “önce”: Llegué hace dos horas (İki saat önce geldim).',
      ],
      [x('Estuve dos semanas en México.', 'İki hafta Meksika’da kaldım.'), x('Cuando era niño, fui una vez a la playa.', 'Çocukken bir kez plaja gittim.')],
    ),
    sec('Bölge farkı', [
      'Latin Amerika’nın çoğunda ve İspanya’nın kuzeybatısında, bugünle ilgili geçmiş için de pretérito kullanılır: ¿Ya comiste? (İspanya’da: ¿Ya has comido?).',
      'İki kullanım da doğrudur; tutarlı olmak yeter.',
    ]),
  ],

  perfecto: [
    sec(
      'Olumsuz, soru ve zamirler',
      [
        'no ve zamirler haber’in önüne gelir, haber ile ortaç ayrılmaz: No lo he visto. ¿Lo has visto?',
        'Fransızcanın tersine ortaç hiçbir zaman uyum yapmaz: Las he visto (vistas değil); Ella ha llegado.',
        'Yardımcı her fiilde haber’dir (ser yok): He ido, Me he levantado.',
      ],
      [x('Todavía no me he duchado.', 'Henüz duş almadım.')],
    ),
    sec('İşaret sözcükleri', [
      'hoy, esta mañana, esta semana, este año, este mes, últimamente, hasta ahora.',
      'ya (çoktan), todavía no / aún no (henüz), alguna vez (hiç), nunca, jamás, siempre (hayat boyu), muchas veces.',
      'ayer, el año pasado, en 2010, hace dos días → pretérito (perfecto değil).',
    ]),
    sec('Düzensiz ortaçların tam listesi', [
      'abrir → abierto, cubrir → cubierto, descubrir → descubierto, decir → dicho, escribir → escrito.',
      'hacer → hecho, satisfacer → satisfecho, morir → muerto, poner → puesto (componer → compuesto), resolver → resuelto.',
      'romper → roto, ver → visto (prever → previsto), volver → vuelto (devolver → devuelto, envolver → envuelto).',
      'İki biçimli: imprimir → impreso / imprimido, freír → frito / freído, proveer → provisto / proveído.',
      'Vurgu işareti alanlar: leer → leído, creer → creído, oír → oído, traer → traído, caer → caído, reír → reído.',
    ]),
    sec('İnce noktalar', [
      'tener + ortaç farklı bir yapıdır ve ortaç uyum yapar: Tengo escritas tres páginas (Üç sayfam yazılı durumda).',
      'acabar de + mastar “az önce”, perfecto ise bugünün içindeki herhangi bir an: Acabo de comer / He comido a las dos.',
      'Kanarya Adaları ve Latin Amerika’da perfecto daha çok hayat deneyimi ve hâlâ süren durum için kullanılır.',
    ]),
  ],

  pluscuamperfecto: [
    sec('Kuruluş ve yer', [
      'había, habías, había, habíamos, habíais, habían + ortaç (ortaç değişmez).',
      'Zamirler ve no había’dan önce: No lo había visto nunca.',
      'ya ile çok kullanılır: Cuando llegué, ya habían cenado.',
    ]),
    sec(
      'Dolaylı anlatımda',
      [
        'Ana fiil geçmişteyse aktarılan pretérito / perfecto pluscuamperfecto olur.',
        'Dijo: «He terminado.» / «Terminé.» → Dijo que había terminado.',
      ],
      [x('Me contó que había perdido las llaves.', 'Anahtarlarını kaybettiğini anlattı.')],
    ),
    sec('İnce noktalar', [
      'Şaşkınlık: ¡No sabía que habías venido! (Geldiğini bilmiyordum!)',
      'Türkçe -mıştı’nın “duydum ki” anlamı yoktur; duyulan bilgi için dicen que, al parecer kullanılır.',
      'Edebî pretérito anterior (hubo terminado) yalnız yazıda, apenas / en cuanto’dan sonra görülür: tanımak yeter.',
    ]),
  ],

  futuro: [
    sec(
      'Şimdi hakkında tahmin (çok önemli)',
      [
        'Futuro, şu an için “herhalde, acaba” anlamı taşır: Serán las cinco (Saat beş olmalı). ¿Dónde estará Juan? (Juan acaba nerede?)',
        'Kabul ve itiraz: Será rico, pero no es feliz (Zengin olabilir, ama mutlu değil).',
        'Bu kullanım Türkçe “-dır” tahminine benzer: Estará cansado (Yorgundur).',
      ],
      [x('¿Quién será a estas horas?', 'Bu saatte kim olabilir?'), x('Tendrá unos cuarenta años.', 'Kırk yaşlarında olmalı.')],
    ),
    sec('cuando ve si ile', [
      'cuando, en cuanto, hasta que, antes de que gelecekten söz ediyorsa futuro değil subjuntivo gelir: Cuando llegues, llámame (cuando llegarás yanlış).',
      'si’den sonra futuro gelmez: Si llueve, nos quedaremos en casa.',
      'Ama dolaylı soru si’si alabilir: No sé si vendrá (Gelip gelmeyeceğini bilmiyorum).',
      'Dolaylı anlatımda ana fiil geçmişteyse futuro condicional olur: Dijo que vendría.',
    ]),
    sec('Ayrıntılar', [
      'haber’in “var olacak” anlamı tekildir: Habrá muchas personas (habrán değil).',
      'Vurgu işaretleri: hablaré, hablarás, hablará, hablaréis, hablarán; hablaremos işaretsiz.',
      'Konuşmada ir a + mastar daha sık, futuro daha resmî ve uzak: Voy a comprarlo / Algún día lo compraré.',
      'Yakın plan için presente de kullanılır: Mañana trabajo.',
      'Zamirler önde: Te lo diré mañana.',
    ]),
  ],

  'futuro-perfecto': [
    sec(
      'Geçmiş hakkında tahmin',
      [
        'Şimdiden geriye bakarak “-mış olmalı”: Habrá salido (Çıkmış olmalı). ¿Qué habrá pasado? (Ne olmuş olabilir?)',
        'Bu, futuro-perfecto’nun gündelik dilde en sık kullanımıdır.',
      ],
      [x('No contesta; se habrá dormido.', 'Cevap vermiyor; uyumuş olmalı.')],
    ),
    sec('Ayrıntılar', [
      'habré, habrás, habrá, habremos, habréis, habrán + ortaç.',
      'Bir tarihe kadar: Para junio habremos terminado la obra.',
      'cuando ile gelecekte bitmiş olan subjuntivo perfecto ister: Cuando hayas terminado, avísame.',
      'Dolaylı anlatımda condicional perfecto olur: Dijo que para el lunes habría terminado.',
      'haber tekil kalır: Para entonces habrá habido muchos cambios.',
    ]),
  ],

  condicional: [
    sec(
      'si cümlesinin üç tipi',
      [
        'Gerçek: si + presente → futuro / presente / imperativo: Si tienes tiempo, ven.',
        'Gerçek dışı şimdi: si + subjuntivo imperfecto → condicional: Si tuviera dinero, viajaría.',
        'Gerçek dışı geçmiş: si + subjuntivo pluscuamperfecto → condicional perfecto: Si hubiera sabido, habría venido.',
        'si’den sonra condicional gelmez: “Si tendría” yanlıştır (bazı bölgelerin konuşmasında duyulsa da standart değil).',
      ],
      [x('Si viviera cerca, te visitaría más.', 'Yakında yaşasam seni daha sık ziyaret ederdim.')],
    ),
    sec('Geçmiş hakkında tahmin', [
      'Futuro şimdiyi tahmin eder, condicional geçmişi: Serían las diez cuando llegó (Geldiğinde saat on civarıydı).',
      'Tendría veinte años entonces (O zaman yirmi yaşlarındaydı).',
    ]),
    sec('Kibarlık ve tavsiye', [
      'Me gustaría, Querría / Quisiera (quisiera daha da kibar), ¿Podría…?, ¿Le importaría…?',
      'Tavsiye: Deberías descansar. Yo que tú, no iría (Senin yerinde olsam gitmezdim). Yo en tu lugar…',
      'Haber dili: Según fuentes oficiales, el presidente estaría enfermo (hasta olduğu bildiriliyor).',
    ]),
    sec('Ayrıntılar', [
      'Kökler futuro ile aynıdır: tendría, pondría, saldría, vendría, podría, sabría, querría, habría, haría, diría, cabría, valdría.',
      'Bütün kişilerde vurgulu í: hablaría, hablaríamos.',
      'yo ve él aynıdır: yo hablaría, él hablaría.',
      'haber tekil: Habría más gente si hiciera sol.',
    ]),
  ],

  'condicional-perfecto': [
    sec(
      'En sık kalıplar',
      [
        'Pişmanlık / sitem: Habría ido, pero no pude. Me habría gustado verte.',
        'deber / poder ile: Habrías podido avisarme (Haber verebilirdin). “Yapmalıydın” için daha sık: Deberías haberme avisado.',
        'Geçmişte geçmiş tahmini: Cuando llegamos, ya habrían salido (Vardığımızda çıkmış olmalıydılar).',
      ],
      [x('Yo no lo habría hecho así.', 'Ben bunu böyle yapmazdım.')],
    ),
    sec('Ayrıntılar', [
      'habría, habrías, habría, habríamos, habríais, habrían + ortaç.',
      'Karışık koşul: si + imperfecto subjuntivo → condicional perfecto: Si fuera más valiente, habría aceptado.',
      'Konuşmada sonuç cümlesinde de hubiera duyulur: Si lo hubiera sabido, no hubiera venido. İkisi de kabul edilir.',
      'Dolaylı anlatımda futuro perfecto’dan gelir: Dijo que a las diez ya habría llegado.',
    ]),
  ],

  subjuntivo: [
    sec('Tetikleyiciler (WEIRDO)', [
      'W – istek: querer que, desear que, preferir que, pedir que, necesitar que, exigir que.',
      'E – duygu: alegrarse de que, gustar que, molestar que, tener miedo de que, sentir que (üzülmek), sorprender que.',
      'I – kişisiz ifadeler: es importante / necesario / posible / mejor / raro que. (es verdad / cierto / obvio / seguro que → indicativo.)',
      'R – tavsiye ve emir: recomendar que, aconsejar que, sugerir que, decir que (emir anlamında: Te digo que vengas).',
      'D – şüphe ve inkâr: dudar que, no creer que, no pensar que, no es verdad que, negar que.',
      'O – ojalá: Ojalá llueva.',
    ]),
    sec(
      'Zaman bağlaçları ve aunque',
      [
        'cuando, en cuanto, hasta que, después de que, mientras: gelecekten söz ediyorsa subjuntivo, alışkanlık ya da geçmişse indicativo.',
        'Cuando llegues, llámame (gelecek) / Cuando llego, como (alışkanlık) / Cuando llegué, comí (geçmiş).',
        'antes de que her zaman subjuntivo: Antes de que te vayas…',
        'aunque + indicativo = bilinen gerçek (… -sa da, ki öyle): Aunque llueve, salgo. aunque + subjuntivo = olasılık ya da önemsiz sayma: Aunque llueva, saldré (yağsa bile).',
        'para que, sin que, a menos que, con tal de que, en caso de que her zaman subjuntivo.',
      ],
      [x('En cuanto termine, te llamo.', 'Biter bitmez seni ararım.'), x('Aunque sea caro, lo compro.', 'Pahalı olsa bile alırım.')],
    ),
    sec(
      'Göreli cümlede subjuntivo',
      [
        'Bilinmeyen ya da var olup olmadığı belirsiz şey: Busco un piso que tenga terraza (öyle bir ev var mı bilmiyorum).',
        'Bilinen şey indicativo: Vivo en un piso que tiene terraza.',
        'Olumsuz varlık: No hay nadie que sepa la respuesta.',
      ],
      [x('¿Conoces a alguien que hable japonés?', 'Japonca konuşan birini tanıyor musun?')],
    ),
    sec('Aynı özne ve tal vez', [
      'Özneler aynıysa mastar: Quiero salir (Quiero que yo salga değil); Me alegro de estar aquí.',
      'para que → para + mastar, antes de que → antes de + mastar, sin que → sin + mastar.',
      'quizá(s), tal vez, probablemente her iki kipi de alabilir: subjuntivo şüpheyi artırır: Quizás venga / Quizás viene.',
      'creer / pensar soruda iki kip de olabilir: ¿Crees que viene / venga?',
    ]),
    sec('Yazım ve kök ayrıntıları', [
      'Ses korunur: buscar → busque, llegar → llegue, empezar → empiece, coger → coja, elegir → elija, seguir → siga.',
      '-ir fiillerinde nosotros / vosotros da değişir: dormir → durmamos, pedir → pidamos, sentir → sintamos. -ar / -er’de değişmez: pensemos, volvamos.',
      'Tam çekimler: ser → sea, seas, sea, seamos, seáis, sean; estar → esté, estés, esté, estemos, estéis, estén; dar → dé, des, dé, demos, deis, den (dé işaretli, edat de’den ayrılsın diye).',
      'ir → vaya; haber → haya; saber → sepa; ver → vea; caber → quepa.',
      'Olumsuz emir ve usted / ustedes emirleri de bu biçimdir: No hables. Hable usted.',
    ]),
  ],

  'subjuntivo-imperfecto': [
    sec(
      'Zaman uyumu',
      [
        'Ana cümle geçmişte ya da condicional’de ise subjuntivo imperfecto gelir: Quería que vinieras. Me gustaría que vinieras.',
        'Ana cümle presente / futuro / emir ise subjuntivo presente: Quiero que vengas.',
        'Ana cümle presente ama eylem geçmişteyse de imperfecto olabilir: No creo que lo dijera (Onun söylediğini sanmıyorum).',
      ],
      [x('Le pedí que me esperara.', 'Ondan beni beklemesini istedim.'), x('Me encantaría que vinieras a la fiesta.', 'Partiye gelmeni çok isterim.')],
    ),
    sec('Her zaman bu kip', [
      'como si + imperfecto (ya da pluscuamperfecto) subjuntivo: Habla como si fuera el jefe.',
      'Ojalá + imperfecto: şimdiki zamanda gerçek dışı ya da zor dilek: Ojalá estuvieras aquí (Keşke burada olsan).',
      'Ojalá + presente ise olası gelecek dilektir: Ojalá vengas.',
    ]),
    sec('-ra ve -se biçimleri', [
      'İkisi aynı anlamdadır: hablara = hablase, tuviera = tuviese. -se İspanya’da ve yazıda daha çok görülür.',
      '-ra biçimi kibarlık için de kullanılır (-se kullanılmaz): Quisiera un café. Debieras descansar.',
      'nosotros’ta vurgu işareti: habláramos, comiéramos, fuéramos, tuviéramos.',
      'ser ve ir aynı: fuera (Si fuera rico / Si fuera a Madrid).',
    ]),
  ],

  'subjuntivo-perfecto': [
    sec(
      'Ne zaman?',
      [
        'Tetikleyici şimdide, eylem ondan önce bitmiş: Me alegro de que hayas venido (Gelmiş olmana seviniyorum).',
        'Gelecekte bitmiş olacak eylem: Cuando hayas terminado, avísame. Antes de que haya llegado…',
        'Şüphe: No creo que lo haya hecho. Puede que haya salido.',
      ],
      [x('Espero que hayas dormido bien.', 'Umarım iyi uyumuşsundur.')],
    ),
    sec('Ayrıntılar', [
      'haya, hayas, haya, hayamos, hayáis, hayan + ortaç (ortaç değişmez).',
      'Zamirler önde: No creo que lo hayan visto.',
      'haya (haber) ile vaya (ir) ve halla (hallar, bulmak) aynı okunur; yazıyı bağlam ve ortaç belirler.',
      'Ana cümle geçmişteyse pluscuamperfecto subjuntivo’ya geçer: No creía que lo hubiera hecho.',
    ]),
  ],

  'subjuntivo-pluscuamperfecto': [
    sec(
      'Koşul ve keşke',
      [
        'Gerçekleşmemiş geçmiş koşul: Si hubiera estudiado, habría aprobado.',
        'Keşke (geçmiş): Ojalá hubiera estudiado más (Keşke daha çok çalışsaydım).',
        'como si + geçmiş: Me miró como si hubiera visto un fantasma.',
        'Karışık koşul: Si hubiera estudiado medicina, ahora sería médico.',
      ],
      [x('Si me lo hubieras dicho, te habría ayudado.', 'Bana söyleseydin sana yardım ederdim.')],
    ),
    sec('Ayrıntılar', [
      'hubiera, hubieras, hubiera, hubiéramos, hubierais, hubieran + ortaç; -se biçimi: hubiese, hubieses…',
      'Sonuç cümlesinde hubiera da kullanılabilir: Si hubiera sabido, no hubiera venido.',
      'Dolaylı anlatımda ana fiil geçmişte ve eylem daha önce: Sentí que no hubieras venido.',
      'si’den sonra habría gelmez: “Si habría sabido” yanlıştır.',
    ]),
  ],

  imperativo: [
    sec('Düzensiz tú biçimlerinin tamamı', [
      'decir → di, hacer → haz, ir → ve, poner → pon, salir → sal, ser → sé, tener → ten, venir → ven.',
      'Türevler de böyledir: mantener → mantén, proponer → propón, deshacer → deshaz.',
      've hem ir’in hem ver’in emri olabilir; bağlam ayırır: Ve a casa (Eve git) / Ve esto (Şuna bak).',
      'Kök değişimi korunur: piensa, vuelve, pide, duerme.',
    ]),
    sec(
      'Zamirler ve vurgu',
      [
        'Olumlu emirde zamirler fiilin sonuna yapışır: dime, dámelo, cómpralo, siéntate, levántate.',
        'Eklenince vurgu yeri korunur; gerekirse işaret konur: compra → cómpralo, da → dámelo (ama dime, dale işaretsiz).',
        'Olumsuz emirde zamirler fiilden önce: No me lo digas. No te sientes.',
        'Sıra yine dolaylı + düz, le → se: Dáselo.',
      ],
      [x('Pásamelo, por favor.', 'Onu bana uzatır mısın lütfen.'), x('No te preocupes.', 'Merak etme.')],
    ),
    sec('nosotros ve vosotros ayrıntıları', [
      'vosotros olumlu: mastarın r’si d olur: hablad, comed, id (ir).',
      'vosotros dönüşlü: d düşer: sentaos, levantaos, callaos (konuşmada sentaros da duyulur, standart değil). Tek istisna: idos.',
      'nosotros olumlu = subjuntivo: hablemos, comamos. Dönüşlüde s düşer: levantémonos, sentémonos. ir için: vamos / vámonos.',
      'Latin Amerika’da vosotros yoktur: ustedes biçimi (hablen, siéntense) kullanılır.',
      'Voseo bölgelerinde vos emri vurgulu son heceyle: hablá, comé, vení, tené, decí.',
    ]),
    sec('Emri yumuşatmak', [
      'Soru ve presente: ¿Me pasas la sal? ¿Puedes cerrar la puerta?',
      'por favor ve kibar kalıplar: ¿Podría…?, ¿Le importaría…?',
      'Mastar emir: tabela ve talimat: No fumar. Agitar antes de usar. a + mastar: ¡A comer! (Hadi yemeğe!)',
      'usted / ustedes emirleri subjuntivo biçimindedir: Pase, Siéntese, Siéntense.',
    ]),
  ],
}
