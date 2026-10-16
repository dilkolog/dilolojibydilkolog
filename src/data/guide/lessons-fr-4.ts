import type { TopicLesson } from './lessonTypes'

export const FR_LESSONS_4: TopicLesson[] = [
  // A1
  {
    topic: 'basics_fr_c_est_vs_il_est',
    language: 'fr',
    title: "C'est mi, il est mi? (C'est un professeur vs Il est professeur)",
    level: 'A1',
    summary: "Fransızcada birini ya da bir şeyi tanıtırken veya nitelerken 'c'est' ile 'il est' arasında kesin kurallar vardır. Türkçede ikisi de 'o ...' veya 'bu ...' diye çevrilse de Fransızcada birbirinin yerine kullanılamaz.",
    rules: [
      "C'est (çoğulu ce sont) + BELİRTEÇLİ İSİM (un, une, des, le, la, mon, son...):",
      "• Bir kişiyi ya da nesneyi tanıtmak: C'est un ami (O bir arkadaş), C'est mon frère (O benim kardeşim), Ce sont des étudiants (Onlar öğrenci).",
      "• Özel isimlerin önünde: C'est Marie, C'est Paul.",
      "• Genel bir durumu niteleyen yalın sıfatla (her zaman eril tekil): C'est beau (Güzel), C'est facile (Kolay), C'est la vie.",
      "Il est / Elle est (çoğulu ils sont / elles sont) + YALIN SIFAT VEYA BELİRTEÇSİZ MESLEK/MİLLİYET:",
      "• Belirteçsiz meslek, milliyet, din: Il est médecin (O doktor), Elle est française (O Fransız).",
      "• Belirli bir kişi veya nesneyi niteleyen sıfat: Où est ta voiture? — Elle est bleue et elle est rapide.",
      "Hayati Kural: Mesleğin önüne sıfat ya da belirteç gelirse mutlaka C'EST olur: Il est professeur -> C'est un bon professeur."
    ],
    examples: [
      { text: "C'est un médecin réputé dans toute la région.", tr: "Bölge çapında tanınmış bir doktordur." },
      { text: "Elle est médecin à l'hôpital Saint-Louis.", tr: "O Saint-Louis hastanesinde doktordur." },
      { text: "C'est ma nouvelle collègue, elle est espagnole.", tr: "Bu benim yeni iş arkadaşım, kendisi İspanyol." },
      { text: "Regarde cette maison, elle est magnifique !", tr: "Şu eve bak, muhteşem!" },
      { text: "Apprendre le français, c'est passionnant.", tr: "Fransızca öğrenmek çok heyecan verici (büyüleyici)." },
      { text: "Ce sont mes amis d'enfance.", tr: "Onlar benim çocukluk arkadaşlarım." }
    ],
    watch: [
      "Belirteçli ismin önüne il est koymak: 'Il est un médecin' kesinlikle yanlıştır; doğrusu 'C'est un médecin' ya da 'Il est médecin'dir.",
      "Çoğulda ce sont yerine ils sont + belirteç kullanmak: 'Ils sont mes amis' yerine 'Ce sont mes amis' denir.",
      "Genel sıfatta dişile göre uyum yapmak: 'La musique, c'est belle' yanlış; c'est ile genel yorum daima erildir: 'La musique, c'est beau'."
    ],
    tip: "İsmin önünde 'un, une, le, la, mon' gibi bir sözcük var mı? C'est! İsim yalın meslek/milliyet mi yoksa tek başına bir sıfat mı? Il est / Elle est!",
    check: [
      {
        prompt: "___ mon meilleur ami d'enfance.",
        options: ["C'est", "Il est", "Elle est"],
        answer: 0,
        why: "'mon ami' belirteçli bir isim tamlaması olduğu için C'est kullanılır."
      },
      {
        prompt: "Claire travaille dans une banque; ___ banquière.",
        options: ["c'est", "elle est", "c'est une"],
        answer: 1,
        why: "Belirteçsiz yalın meslek ismi olduğu için 'elle est' kullanılır."
      },
      {
        prompt: "Le chocolat noir, ___ délicieux !",
        options: ["il est", "c'est", "elle est"],
        answer: 1,
        why: "Genel bir kavram üzerine yorum yaparken 'c'est + eril sıfat' kullanılır."
      }
    ]
  },
  // A2
  {
    topic: 'basics_fr_prepositions_geographie',
    language: 'fr',
    title: 'Ülkeler, şehirler ve adalarla edatlar (en France, au Japon, à Paris)',
    level: 'A2',
    summary: 'Fransızcada bir yere gitmek (aller) veya orada bulunmak (être/habiter) söylenirken coğrafi yerin cinsiyetine ve harf başlangıcına göre edat seçilir: en, au, aux veya à.',
    rules: [
      'Şehirler ve küçük adalar: daima "à" alır (cinsiyet fark etmez): à Paris, à Istanbul, à Londres, à Cuba, à Malte.',
      'Dişil ülkeler ve sesli harfle başlayan ülkeler: "en" alır:',
      '• Sonu -e ile biten hemen hemen tüm ülkeler dişildir: en France, en Espagne, en Turquie, en Italie.',
      '• Sesli harfle başlayan eril ülkeler de ses uyumu için "en" alır: en Iran, en Irak, en Israël, en Égypte.',
      '• Kıtalar ve bölgeler: en Europe, en Asie, en Bretagne, en Normandie.',
      'Eril ülkeler (sessizle başlayan ve sonu -e ile bitmeyen): "au" (à + le) alır:',
      '• au Japon, au Canada, au Brésil, au Portugal, au Maroc, au Sénégal.',
      '• İstisna eril ülkeler (sonu -e ile bittiği halde erildir): le Mexique (au Mexique), le Mozambique, le Cambodge.',
      'Çoğul ülkeler: "aux" (à + les) alır: aux États-Unis, aux Pays-Bas, aux Philippines.',
      'Bir yerden gelmek (ayrılmak): de Paris, de France, d\'Espagne, du Japon, des États-Unis.'
    ],
    examples: [
      { text: "J'habite à Lyon, mais je travaille en Suisse.", tr: "Lyon'da yaşıyorum ama İsviçre'de çalışıyorum." },
      { text: "Nous partons en vacances au Japon le mois prochain.", tr: "Önümüzdeki ay Japonya'ya tatile gidiyoruz." },
      { text: "Mes cousins vivent aux États-Unis depuis dix ans.", tr: "Kuzenlerim on yıldır Amerika Birleşik Devletleri'nde yaşıyor." },
      { text: "Elle rêve de voyager au Mexique et au Pérou.", tr: "Meksika'ya ve Peru'ya seyahat etmeyi hayal ediyor." },
      { text: "Il est né en Iran, puis il s'est installé à Montréal.", tr: "İran'da doğdu, ardından Montreal'e yerleşti." },
      { text: "Nous arrivons tout juste d'Italie.", tr: "İtalya'dan henüz yeni geldik." }
    ],
    watch: [
      "Şehirlere en demek: 'en Paris', 'en Istanbul' kesinlikle yanlıştır; şehirler daima 'à' alır: 'à Paris', 'à Istanbul'.",
      "Le Mexique'i dişil sanmak: Meksika -e ile bitmesine rağmen erildir: 'au Mexique'.",
      "Sesliyle başlayan eril ülkeye au demek: 'au Iran' değil 'en Iran'."
    ],
    tip: "Şehir mi? -> à. Ülke sonu -e mi veya sesliyle mi başlıyor? -> en. Ülke eril ve sessizle mi başlıyor? -> au. Çoğul mu? -> aux.",
    check: [
      {
        prompt: "Cet été, nous partons deux semaines ___ Italie.",
        options: ["à l'", "au", "en"],
        answer: 2,
        why: "İtalya (l'Italie) dişil ve sesliyle başlayan bir ülke olduğu için 'en' alır."
      },
      {
        prompt: "Mon frère aîné habite ___ Canada depuis trois ans.",
        options: ["en", "au", "à"],
        answer: 1,
        why: "Kanada eril bir ülkedir (le Canada); bu nedenle 'au' alır."
      },
      {
        prompt: "Elle a trouvé un nouvel emploi ___ Berlin.",
        options: ["à", "en", "au"],
        answer: 0,
        why: "Şehir isimlerinin tamamında cinsiyete bakılmaksızın 'à' kullanılır."
      }
    ]
  },
  {
    topic: 'basics_fr_si_concordance',
    language: 'fr',
    title: 'Si ile şart cümlelerinde zaman uyumu (si présent, si imparfait)',
    level: 'A2',
    summary: 'Fransızcada "si" (eğer) bağlacından sonra ASLA gelecek zaman (futur) veya şart kipi (conditionnel) gelmez. Üç temel zaman kalıbı harfiyen uygulanır.',
    rules: [
      '1. Tip (Gerçekleşebilir şart): Si + PRÉSENT -> FUTUR SIMPLE (veya présent / impératif):',
      '• Si j\'ai le temps, je viendrai te voir (Vaktim olursa seni görmeye geleceğim).',
      '• Si tu as froid, mets ton manteau (Üşüyorsan montunu giy - emir kipi).',
      '2. Tip (Şimdiki zamanda hayali / olasılığı düşük şart): Si + IMPARFAIT -> CONDITIONNEL PRÉSENT:',
      '• Si j\'avais de l\'argent, j\'achèterais cette maison (Param olsaydı bu evi alırdım - şu an param yok).',
      '• Si tu étudiais plus, tu réussirais tes examens.',
      '3. Tip (Geçmişte gerçekleşmemiş pişmanlık / kaçırılmış fırsat): Si + PLUS-QUE-PARFAIT -> CONDITIONNEL PASSÉ:',
      '• Si j\'avais su, je ne serais pas venu (Bilseydim gelmezdim).',
      '• Si nous étions partis plus tôt, nous n\'aurions pas raté le train.',
      'Altın Kural: Fransızcada meşhur atasözü: "Les \'si\' n\'aiment pas les \'rai\'" (Si\'ler -rai ile biten futur ve conditionnel eklerini sevmez!).'
    ],
    examples: [
      { text: "S'il fait beau demain, nous irons à la plage.", tr: "Yarın hava güzel olursa plaja gideceğiz." },
      { text: "Si j'étais à ta place, je refuserais cette offre.", tr: "Senin yerinde olsaydım bu teklifi reddederdim." },
      { text: "Si vous aviez prévenu la direction, le problème aurait été réglé.", tr: "Yönetimi uyarmış olsaydınız sorun çözülmüş olurdu." },
      { text: "Si tu as faim, sers-toi dans le réfrigérateur.", tr: "Açsan buzdolabından al (kendine ikram et)." },
      { text: "Si nous habitions près de la mer, nous nagerions tous les jours.", tr: "Denize yakın yaşasaydık her gün yüzerdik." },
      { text: "S'il avait fait attention, il n'aurait pas cassé le verre.", tr: "Dikkat etmiş olsaydı bardağı kırmamış olurdu." }
    ],
    watch: [
      "Si'nin peşinden futur veya conditionnel getirmek: 'Si j'aurai le temps' veya 'Si je serais riche' kesinlikle büyük hatadır; doğrusu 'Si j'ai le temps', 'Si j'étais riche'dir.",
      "Si ile il birleşirken kesme işareti konur (s'il, s'ils), ama elle ile birleşirken kesilmez (si elle, si elles).",
      "Ana cümlenin zamanını şart cümlesiyle karıştırmak."
    ],
    tip: "Si + présent -> futur. Si + imparfait -> conditionnel présent. Si + plus-que-parfait -> conditionnel passé. Asla si'den sonra -rai getirme!",
    check: [
      {
        prompt: "Si tu ___ libre ce soir, appelle-moi.",
        options: ["es", "seras", "serais"],
        answer: 0,
        why: "Si'den sonra emir cümlesi veya gelecek varsa présent kullanılır (es)."
      },
      {
        prompt: "Si nous avions un jardin, nous ___ un chien.",
        options: ["aurons", "adopterions", "adoptions"],
        answer: 1,
        why: "Si + imparfait (avions) yapısının devamı conditionnel présent (adopterions) olur."
      },
      {
        prompt: "Si elle avait suivi mes conseils, elle n'___ pas cette erreur.",
        options: ["aurait fait", "avait fait", "ferait"],
        answer: 0,
        why: "Si + plus-que-parfait yapısının ana cümlesi conditionnel passé (aurait fait) gerektirir."
      }
    ]
  },
  // B1
  {
    topic: 'basics_fr_verbes_prepositions_a_de',
    language: 'fr',
    title: 'Anlamı edata göre değişen fiiller: penser à vs penser de',
    level: 'B1',
    summary: "Fransızcada bazı fiiller peşlerinden gelen edata (à veya de) göre tamamen farklı anlamlar kazanır. Özellikle penser, manquer ve décider fiillerinde bu ayrım hayati önem taşır.",
    rules: [
      'Penser à vs Penser de:',
      '• penser à quelqu\'un / quelque chose: birini veya bir şeyi düşünmek, aklında tutmak: Je pense à toi (Aklımdasın/Seni düşünüyorum).',
      '• penser de: bir şey veya biri hakkında fikir/kanaat sahibi olmak: Que penses-tu de ce film? (Bu film hakkında ne düşünüyorsun / fikrin ne?).',
      'Manquer à vs Manquer de:',
      '• manquer à quelqu\'un: birine özlem duymak (özne ve nesne Türkçeye göre terstir!): Tu me manques (Seni özlüyorum - kelimesi kelimesine: Sen bana eksiksin). Pierre manque à Marie (Marie Pierre\'i özlüyor).',
      '• manquer de: bir şeyin eksikliğini çekmek: Il manque de courage (Cesareti eksik).',
      'Décider de vs Se décider à:',
      '• décider de + mastar: bir şey yapmaya karar vermek: J\'ai décidé de partir.',
      '• se décider à + mastar: uzun tereddütten sonra nihayet karar kılıp eyleme geçmek: Il s\'est enfin décidé à parler.',
      'Venir de vs Venir à:',
      '• venir de + mastar: az önce yapmış olmak (yakın geçmiş): Je viens d\'arriver.',
      '• venir à + mastar: tesadüfen olmak (varsayım): S\'il venait à pleuvoir...'
    ],
    examples: [
      { text: "Ne t'inquiète pas, je pense à tout.", tr: "Endişelenme, her şeyi düşünüyorum (aklımda tutuyorum)." },
      { text: "Qu'est-ce que tu penses de son nouveau projet ?", tr: "Onun yeni projesi hakkında ne düşünüyorsun (fikrin nedir)?" },
      { text: "Mes parents me manquent beaucoup.", tr: "Ailemi çok özlüyorum." },
      { text: "Ce texte manque de clarté.", tr: "Bu metin açıklıktan yoksun (yeterince net değil)." },
      { text: "Nous avons décidé de déménager à Bordeaux.", tr: "Bordeaux'ya taşınmaya karar verdik." },
      { text: "Elle s'est enfin décidée à passer son permis de conduire.", tr: "Sonunda ehliyet sınavına girmeye karar verdi (tereddüdü aştı)." }
    ],
    watch: [
      "Fikir sorarken 'Que penses-tu à...' demek: Fikir sorulurken daima 'Que penses-tu de...' denir.",
      "Manquer fiilinde özne tuzağı: 'Je te manque' dediğinizde 'Ben seni özlüyorum' değil 'Sen beni özlüyorsun' demiş olursunuz! 'Seni özlüyorum' demek için 'Tu me manques' denir.",
      "Yakın geçmişte de edatını unutmak: 'Je viens arriver' değil 'Je viens d'arriver'."
    ],
    tip: "Aklında mıyım? -> Pense à moi. Fikrin ne? -> Qu'en penses-tu? Seni özlüyorum -> Tu me manques (Sen bana eksiksin).",
    check: [
      {
        prompt: "Qu'est-ce que tu penses ___ cette proposition ?",
        options: ["à", "de", "pour"],
        answer: 1,
        why: "Bir şey hakkındaki fikir/görüş sorulurken 'penser de' kullanılır."
      },
      {
        prompt: "\"Seni özlüyorum\" cümlesinin Fransızcası hangisidir?",
        options: ["Je te manque.", "Tu me manques.", "Je manque de toi."],
        answer: 1,
        why: "Fransızcada özlenen kişi öznedir: Tu me manques (Sen bende eksiksin = Seni özlüyorum)."
      },
      {
        prompt: "Nous venons ___ signer le contrat il y a cinq minutes.",
        options: ["de", "à", "pour"],
        answer: 0,
        why: "Yakın geçmiş (az önce yapılan iş) 'venir de + mastar' ile kurulur."
      }
    ]
  },
  {
    topic: 'basics_fr_participe_gerondif',
    language: 'fr',
    title: 'Participe présent ve gérondif ayrımı (chantant vs en chantant)',
    level: 'B1',
    summary: 'İkisi de fiil köküne -ant eklenerek yapılsa da, başında "en" olan gérondif bir zarftır (nasıl? ne zaman?), "en"siz olan participe présent ise bir sıfattır ya da yan cümlecik kısaltmasıdır.',
    rules: [
      'Gérondif: "en + fiil-ant" (zamanda eşzamanlılık, tarz veya sebep bildirir):',
      '• Eşzamanlılık (-erek, -ken): Il écoute de la musique en faisant la vaisselle (Bulaşık yıkarken müzik dinliyor).',
      '• Tarz/yol: C\'est en forgeant qu\'on devient forgeron (Demir döve döve demirci olunur).',
      '• Gérondif\'in öznesi ana cümlenin öznesiyle MUTLAKA aynı olmak zorundadır.',
      'Participe Présent: "en"siz "fiil-ant" (eylem halindeki bir ismi niteler, sıfat veya qui kısaltmasıdır):',
      '• Qui\'li cümlecik kısaltması: Les personnes ayant un billet peuvent entrer (= les personnes qui ont un billet).',
      '• İsmi niteleyen sıfat: Une histoire passionnante (sözcük sıfatlaşınca cinsiyete ve çoğula göre uyum alır).',
      'Önemli Ayrım:',
      '• J\'ai vu Paul en sortant du cinéma (Sinemadan çıkarken Paul\'ü gördüm -> Çıkan BENİM).',
      '• J\'ai vu Paul sortant du cinéma (Sinemadan çıkan Paul\'ü gördüm -> Çıkan PAUL).'
    ],
    examples: [
      { text: "Elle a appris le français en regardant des films sous-titrés.", tr: "Altyazılı filmler izleyerek Fransızca öğrendi." },
      { text: "En arrivant à la gare, j'ai constaté que le train était en retard.", tr: "Gara vardığımda trenin rötarlı olduğunu fark ettim." },
      { text: "Les étudiants souhaitant participer doivent s'inscrire avant vendredi.", tr: "Katılmak isteyen öğrencilerin cumadan önce kaydolması gerekir." },
      { text: "Faites attention en traversant la rue !", tr: "Karşıdan karşıya geçerken dikkat edin!" },
      { text: "C'est une femme charmante et souriante.", tr: "Cana yakın ve güler yüzlü bir kadındır." },
      { text: "Ne parlez pas en mangeant, c'est impoli.", tr: "Yemek yerken konuşmayın, bu kabadır." }
    ],
    watch: [
      "Gérondif'te özne uyuşmazlığı: Eylemi ana cümlenin öznesi yapmıyorsa 'en + ant' kullanılamaz.",
      "Sıfatlaşan biçim ile fiil halini karıştırmak: Fiil hali (participe présent) asla çoğul/dişil eki almaz; gerçek niteleme sıfatı olursa (adjectif verbal) uyum alır.",
      "İngilizcedeki her -ing'yi gérondif sanmak: Yüzmeyi seviyorum derken 'j'aime en nageant' denmez, 'j'aime nager' denir."
    ],
    tip: "Aynı anda iki işi aynı kişi mi yapıyor (-erek, -ken)? -> en + -ant (Gérondif). Bir kişiyi tanımlayan 'yapan/eden' mi diyorsun? -> yalın -ant (Participe présent).",
    check: [
      {
        prompt: "Il s'est brûlé la main ___ préparant le dîner.",
        options: ["en", "à", "de"],
        answer: 0,
        why: "Yemek hazırlarken elini yaktığı için eşzamanlı eylemde gérondif (en préparant) kullanılır."
      },
      {
        prompt: "Les candidats ___ les critères requis seront convoqués.",
        options: ["remplissant", "en remplissant", "remplissants"],
        answer: 0,
        why: "Adayları niteleyen yan cümle kısaltmasıdır (= qui remplissent); 'en' almaz ve fiil olduğu için çoğul eki -s almaz."
      },
      {
        prompt: "\"Yürüyerek geldik\" cümlesinin Fransızcası hangisidir?",
        options: ["Nous sommes venus marchant.", "Nous sommes venus en marchant.", "Nous sommes venus à marcher."],
        answer: 1,
        why: "Eylemin yapılış tarzı 'en + gérondif' ile söylenir: en marchant."
      }
    ]
  },
  {
    topic: 'basics_fr_double_pronoms_imperatif',
    language: 'fr',
    title: 'Emir kipinde çift zamirler: Donne-le-moi vs Ne me le donne pas',
    level: 'B1',
    summary: 'Emir kipinde zamirlerin sıralanışı olumlu ve olumsuz emirlerde tamamen değişir. Olumlu emirde zamirler fiilin arkasına tire ile bağlanır ve me/te yerine moi/toi gelir.',
    rules: [
      'Olumlu Emir (L\'impératif affirmatif):',
      '• Zamirler fiilden SONRA gelir ve araya tire (-) konur.',
      '• me -> moi, te -> toi olur.',
      '• Sıralama kuralı: Fiil - [le / la / les] - [moi / toi / lui / nous / vous / leur] - [y] - [en]:',
      '  Donne-le-moi ! (Onu bana ver!)',
      '  Expliquez-la-lui ! (Onu ona açıklayın!)',
      '  Emmène-nous-y ! (Bizi oraya götür!)',
      '  Donne-m\'en ! (Bana ondan ver - moi sesli önünde m\' olur).',
      'Olumsuz Emir (L\'impératif négatif):',
      '• Zamirler normal cümledeki gibi fiilden ÖNCE yer alır ve standart zamir tablosu geçerlidir:',
      '• me ve te eski haline döner (moi/toi kullanılmaz).',
      '  Ne me le donne pas ! (Onu bana verme!)',
      '  Ne lui en parle pas ! (Ona bundan bahsetme!)'
    ],
    examples: [
      { text: "Ce livre est passionnant, prête-le-moi s'il te plaît.", tr: "Bu kitap sürükleyici, lütfen onu bana ödünç ver." },
      { text: "Ne me le prête pas maintenant, je n'ai pas le temps de lire.", tr: "Onu bana şimdi ödünç verme, okumaya vaktim yok." },
      { text: "Si tu as des pommes, donne-m'en deux.", tr: "Elman varsa bana onlardan iki tane ver." },
      { text: "C'est un secret, ne leur en dis rien !", tr: "Bu bir sır, onlara bundan hiç bahsetme!" },
      { text: "Montrez-les-nous dès que possible.", tr: "Onları bize mümkün olan en kısa sürede gösterin." },
      { text: "Ne vous y fiez pas, c'est dangereux.", tr: "Ona güvenmeyin, bu tehlikelidir." }
    ],
    watch: [
      "Olumlu emirde me/te bırakmak: 'Donne-me-le' kesinlikle yanlıştır; doğrusu 'Donne-le-moi'dır.",
      "Tireleri unutmak: 'Donne le moi' değil, tireli 'Donne-le-moi'.",
      "Olumsuz emirde moi/toi kullanmak: 'Ne donne-moi pas' değil 'Ne me donne pas'."
    ],
    tip: "Olumlu emirde zamir arkaya fırlar ve 'moi' olur: Donne-le-moi! Olumsuzda her şey eski sakin sırasına döner: Ne me le donne pas!",
    check: [
      {
        prompt: "\"Onu bana söyle!\" emrinin doğru Fransızcası hangisidir?",
        options: ["Dis-me-le !", "Dis-le-moi !", "Dis-moi-le !"],
        answer: 1,
        why: "Olumlu emirde doğrudan nesne (le) önce, dolaylı nesne (moi) sonra gelir: Dis-le-moi !"
      },
      {
        prompt: "\"Onu ona verme!\" olumsuz emrinin doğru Fransızcası hangisidir?",
        options: ["Ne lui le donne pas !", "Ne le lui donne pas !", "Ne donne-le-lui pas !"],
        answer: 1,
        why: "Olumsuz emirde zamirler fiilden önce gelir: Ne le lui donne pas !"
      },
      {
        prompt: "Du pain ? Oui, achète-___ s'il te plaît.",
        options: ["en-moi", "m'en", "moi-en"],
        answer: 1,
        why: "Moi ve en birleşirken m'en olur: achète-m'en."
      }
    ]
  },
  {
    topic: 'basics_fr_tout_tous_usages',
    language: 'fr',
    title: "'Tout' sözcüğünün bütün halleri: sıfat, zamir ve zarf",
    level: 'B1',
    summary: "Fransızcadaki 'tout' sözcüğü sıfat, zamir veya zarf olarak kullanılabilir. Özellikle 'tous' yazıldığında sondaki 's' harfinin okunup okunmayacağı kelimenin türüne bağlıdır.",
    rules: [
      '1. Belirteç / Sıfat olarak (İsmin önünde uyum alır, sondaki -s OKUNMAZ):',
      '• tout le monde (herkes - eril tekil), toute la journée (bütün gün - dişil tekil).',
      '• tous les jours (her gün - eril çoğul, /tu le jur/ diye okunur, s okunmaz!).',
      '• toutes les semaines (her hafta - dişil çoğul).',
      '2. Zamir olarak (Bir grubun tamamını temsil eder, sondaki -s MUTLAKA OKUNUR!):',
      '• Ils sont tous là (/il sõ tus la/ - Hepsi burada, s okunur!).',
      '• Je les connais tous (/tu:s/ - Hepsini tanıyorum).',
      '• Tout est prêt (/tu/ - Her şey hazır - nötr zamir).',
      '3. Zarf olarak (Sıfatın veya zarfın önünde \'tamamen/bütünüyle\' anlamında):',
      '• Kural olarak zarflar değişmez: tout doucement, tout près, tout neuf.',
      '• İstisna: Sessiz harfle başlayan dişil bir sıfattan önce gelirse kulağa hoş gelmesi için uyum alır: Elle est toute seule, Elles sont toutes contentes.'
    ],
    examples: [
      { text: "Tous les étudiants ont réussi l'examen.", tr: "Bütün öğrenciler sınavı geçti (sıfat: /tu/ okunur, s okunmaz)." },
      { text: "Les étudiants ? Ils ont tous réussi !", tr: "Öğrenciler mi? Hepsi başardı! (zamir: /tus/ okunur, s telaffuz edilir)." },
      { text: "Tout le monde est d'accord.", tr: "Herkes hemfikir." },
      { text: "Tout va bien, ne t'en fais pas.", tr: "Her şey yolunda, canını sıkma." },
      { text: "Elle était toute petite quand je l'ai rencontrée.", tr: "Onunla karşılaştığımda henüz küçücüktü (tamamen küçüktü)." },
      { text: "C'est tout à fait normal.", tr: "Bu tamamen normaldir." }
    ],
    watch: [
      "'Tous les jours' derken -s harfini okumak: Arkasından isim gelen sıfatta 's' ASLA okunmaz (/tu le jur/).",
      "'Ils sont tous là' derken -s harfini yutmak: Tek başına zamir olduğunda 's' MUTLAKA okunur (/tus/).",
      "Tout le monde'u çoğul sanıp fiili çoğul çekimlemek: 'Tout le monde sont' değil 'Tout le monde est' (Türkçedeki herkes tekildir)."
    ],
    tip: "Arkasından isim geliyorsa sıfattır, s okunmaz (tous les garçons = /tu/). Tek başına bir grubun yerine geçiyorsa zamirdir, s çatır çatır okunur (ils sont tous là = /tus/)!",
    check: [
      {
        prompt: "\"Herkes geldi\" cümlesinin doğru Fransızcası hangisidir?",
        options: ["Tout le monde sont venus.", "Tout le monde est venu.", "Tous le monde est venu."],
        answer: 1,
        why: "'Tout le monde' tekil bir özne gibi üçüncü tekil şahıs (est venu) ile çekimlenir."
      },
      {
        prompt: "Hangisinde 'tous' kelimesinin sonundaki -s harfi TELAFFUZ EDİLİR?",
        options: ["Tous les matins.", "Mes amis sont tous partis.", "Tous mes collègues."],
        answer: 1,
        why: "Zamir olarak kullanıldığında (hepsi) sondaki -s harfi okunur: /tus/."
      },
      {
        prompt: "Elle est ___ émue par cette nouvelle.",
        options: ["toute", "tout", "toutes"],
        answer: 1,
        why: "Émue sesliyle başlayan bir sıfat olduğu için zarf olan 'tout' değişmez."
      }
    ]
  },
  // B2
  {
    topic: 'basics_fr_accords_pronominaux_cod',
    language: 'fr',
    title: "Dönüşlü fiillerde ortaç uyumu tuzağı: Elle s'est lavée vs s'est lavé les mains",
    level: 'B2',
    summary: "Dönüşlü fiiller passé composé'de être ile çekimlense de, geçmiş zaman ortacı (participe passé) her zaman özneyle uyum sağlamaz! Uyum ancak ve ancak dönüşlülük zamiri (se) doğrudan nesne (COD) olduğunda yapılır.",
    rules: [
      "Temel Mantık: Dönüşlü fiillerde être kullanılır ama kural avoir'ın kuralı gibi işler: Uyum sadece önde gelen doğrudan nesneye (COD) göre yapılır.",
      "Durum 1: Doğrudan nesne öznenin kendisidir (se = COD) -> UYUM VAR:",
      "• Elle s'est lavée (Kimi yıkadı? Kendisini -> se = COD -> lavée).",
      "• Elles se sont rencontrées (Kimi karşıladılar? Birbirlerini -> se = COD -> rencontrées).",
      "Durum 2: Eylemin doğrudan nesnesi arkadan gelen başka bir organdır/nesnedir -> UYUM YOK:",
      "• Elle s'est lavé les mains (Neyi yıkadı? Ellerini -> les mains COD arkadadır; se ise kime/neye sorusuna yanıt veren COI'dir -> lavé eril tekil kalır!).",
      "Durum 3: Doğası gereği sadece dolaylı nesne (COI) alan fiiller (se parler, se téléphoner, se plaire, se succéder, se ressembler) ASLA uyum almaz:",
      "• Elles se sont parlé (parler à quelqu'un olduğu için se COI'dir, uyum olmaz).",
      "• Ils se sont téléphoné."
    ],
    examples: [
      { text: "Elle s'est blessée en tombant.", tr: "Düşerken yaralandı (kendini yaraladı: se = COD -> uyum var)." },
      { text: "Elle s'est blessé le genou en tombant.", tr: "Düşerken dizini incitti (le genou arkadaki COD -> uyum yok)." },
      { text: "Ils se sont lavé les dents avant de dormir.", tr: "Uyumadan önce dişlerini fırçaladılar (les dents COD -> lavé değişmez)." },
      { text: "Nous nous sommes téléphoné hier soir.", tr: "Dün akşam telefonlaştık (téléphoner à -> uyum yok)." },
      { text: "Les mains qu'elle s'est lavées étaient sales.", tr: "Yıkadığı eller kirliydi (les mains COD öne geçtiği için bu kez lavées olur!)." },
      { text: "Elles se sont rendu compte de leur erreur.", tr: "Hatalarının farkına vardılar (compte COD olduğu için rendu değişmez)." }
    ],
    watch: [
      "Arkasında organ veya nesne varken özneye göre uyum yapmak: 'Elle s'est coupée le doigt' yanlış; doğrusu 'Elle s'est coupé le doigt'dır.",
      "Se téléphoner veya se parler fiillerine uyum eklemek: 'Elles se sont parlées' yanlış; doğrusu 'Elles se sont parlé'dir.",
      "Se rendre compte kalıbında uyum aramak: Se rendre compte ifadesinde rendu asla uyum almaz."
    ],
    tip: "Kendini mi yıkadı? (Elle s'est lavée - uyum var). Ellerini mi yıkadı? (Elle s'est lavé les mains - uyum yok!).",
    check: [
      {
        prompt: "Marie s'est ___ les cheveux ce matin.",
        options: ["lavé", "lavée", "lavés"],
        answer: 0,
        why: "'les cheveux' doğrudan nesnesi fiilden sonra geldiği için ortaç uyum almaz: lavé."
      },
      {
        prompt: "Elles se sont ___ hier après-midi au parc.",
        options: ["rencontré", "rencontrées", "rencontrés"],
        answer: 1,
        why: "Birbirlerini karşıladılar/buluştular; 'se' doğrudan nesnedir ve dişil çoğuldur: rencontrées."
      },
      {
        prompt: "Ils se sont ___ pendant des heures au téléphone.",
        options: ["parlés", "parlé", "parlées"],
        answer: 1,
        why: "Parler à quelqu'un kalıbında 'se' dolaylı nesnedir (COI); bu fiil asla uyum almaz: parlé."
      }
    ]
  },
  {
    topic: 'basics_fr_subjonctif_conjonctions',
    language: 'fr',
    title: 'Subjonctif zorunlu kılan kilit bağlaçlar: bien que, pour que, avant que',
    level: 'B2',
    summary: "Fransızcada bazı bağlaçlar kesinlik değil amaç, taviz veya şart bildirdiği için kendilerinden sonra MUTLAKA dilek kipi (subjonctif) gerektirir. Bunların indicatif alan ikizleriyle farkını bilmek B2/C1'in anahtarıdır.",
    rules: [
      'Amaç Bağlaçları (daima subjonctif):',
      '• pour que / afin que: ...-sın diye, ... amacıyla: Je t\'explique pour que tu comprennes.',
      '• (Özneler aynıysa mastar gelir: pour + mastar: Je viens pour comprendre).',
      'Taviz / Zıtlık Bağlaçları (daima subjonctif):',
      '• bien que / quoique: ...-e rağmen: Bien qu\'il soit fatigué, il continue de travailler.',
      '• Hayati Kıyas: "même si" ise ASLA subjonctif almaz, daima indicatif alır: Même s\'il est fatigué.',
      'Zaman Bağlaçları (Öncelik ve sınır):',
      '• avant que: ...-den önce (eylem henüz gerçekleşmediği için subjonctif): Partez avant qu\'il ne pleuve.',
      '• jusqu\'à ce que: ...-e kadar: Attends ici jusqu\'à ce que je revienne.',
      '• Hayati Kıyas: "après que" gerçekleşmiş bir geçmişi anlattığı için kural gereği İNDİCATİF alır: Après qu\'il est parti.',
      'Şart Bağlaçları:',
      '• à condition que, pourvu que: ... şartıyla: Tu peux sortir à condition que tu finisses tes devoirs.'
    ],
    examples: [
      { text: "Bien qu'il fasse très froid, les enfants jouent dehors.", tr: "Hava çok soğuk olmasına rağmen çocuklar dışarıda oynuyor." },
      { text: "Je te prête mon vélo pour que tu puisses aller plus vite.", tr: "Daha hızlı gidebilesin diye sana bisikletimi ödünç veriyorum." },
      { text: "Rentrons vite avant qu'il ne commence à neiger.", tr: "Kar yağmaya başlamadan önce hemen eve dönelim." },
      { text: "Même s'il pleut des cordes, j'irai courir.", tr: "Bardaktan boşanırcasına yağsa bile koşmaya gideceğim." },
      { text: "Nous resterons ici jusqu'à ce que la tempête se calme.", tr: "Fırtına dinene kadar burada kalacağız." },
      { text: "Vous réussirez, pourvu que vous fassiez des efforts réguliers.", tr: "Düzenli çaba gösterdiğiniz sürece (yeter ki çaba gösterin) başarırsınız." }
    ],
    watch: [
      "Même si'den sonra subjonctif kullanmak: 'Même s'il soit tard' yanlıştır; même si daima indicatif ister: 'Même s'il est tard'.",
      "Avant que sonrasında indicatif kullanmak: 'Avant qu'il part' değil 'Avant qu'il ne parte'.",
      "Aynı özne varken pour que kullanmak: 'Je travaille pour que je réussisse' yerine doğal olan 'Je travaille pour réussir'dir."
    ],
    tip: "Bien que / Pour que / Avant que = SUBJONCTIF! Même si / Après que = İNDİCATİF!",
    check: [
      {
        prompt: "Bien qu'elle ___ malade, elle est venue travailler.",
        options: ["est", "soit", "sera"],
        answer: 1,
        why: "'Bien que' bağlacı daima subjonctif gerektirir (soit)."
      },
      {
        prompt: "Même si tu ne me ___ pas, je te dis la vérité.",
        options: ["crois", "croies", "croiras"],
        answer: 0,
        why: "'Même si' kesinlikle subjonctif almaz; normal indicatif (crois) ile kullanılır."
      },
      {
        prompt: "Dépêche-toi avant que le magasin ne ___ ses portes.",
        options: ["ferme", "fermera", "fermait"],
        answer: 0,
        why: "'Avant que' henüz gerçekleşmemiş bir anı belirttiği için subjonctif (ferme) ister."
      }
    ]
  },
  {
    topic: 'basics_fr_pronoms_relatifs_composes',
    language: 'fr',
    title: 'Bileşik ilgi zamirleri: lequel, auquel, duquel',
    level: 'B2',
    summary: "Bir isimden sonra edat geldiğinde (avec, pour, sur, dans, à, de) yalın 'qui/que' yetersiz kalır; ismin cinsiyetine ve sayısına göre lequel, laquelle, auquel veya duquel gibi bileşik ilgi zamirleri kullanılır.",
    rules: [
      'Yalın Biçimler (Edat + lequel / laquelle / lesquels / lesquelles):',
      '• avec lequel (ile), pour laquelle (için), dans lequel (içinde), sur lesquels (üzerinde):',
      '  L\'entreprise pour laquelle je travaille est très dynamique (Çalıştığım şirket...).',
      '  Le stylo avec lequel j\'écris fuit.',
      'À Edatı ile Birleşen Biçimler (à + lequel -> AUQUEL):',
      '• à + lequel -> auquel; à + laquelle -> à laquelle; à + lesquels -> auxquels; à + lesquelles -> auxquelles:',
      '  Le projet auquel je pense est innovant (penser à -> auquel).',
      '  Les réunions auxquelles j\'ai assisté étaient longues (assister à).',
      'De Edatı ile Birleşen Biçimler (Bileşik edatlarla: près de, à côté de, à cause de):',
      '• près de + lequel -> près duquel; à côté de laquelle; au cours desquels; à cause duquel:',
      '  La table à côté de laquelle nous étions assis était bancale.',
      "İnsanlar için edattan sonra 'qui' de kullanılabilir: l'homme avec qui j'ai parlé (= avec lequel)."
    ],
    examples: [
      { text: "Le problème auquel nous sommes confrontés est inédit.", tr: "Karşı karşıya olduğumuz problem daha önce görülmemiş türden." },
      { text: "C'est une cause pour laquelle je suis prêt à me battre.", tr: "Bu, uğruna mücadele etmeye hazır olduğum bir davadır." },
      { text: "Le village près duquel nous avons campé était désert.", tr: "Yakınında kamp kurduğumuz köy terk edilmişti." },
      { text: "Les documents sur lesquels reposent cette étude sont confidentiels.", tr: "Bu çalışmanın dayandığı belgeler gizlidir." },
      { text: "La personne avec qui (avec laquelle) je voyage est une amie.", tr: "Birlikte seyahat ettiğim kişi bir arkadaşımdır." },
      { text: "Ce sont des difficultés auxquelles personne ne s'attendait.", tr: "Bunlar kimsenin beklemediği türden zorluklardı." }
    ],
    watch: [
      "Nesneler için edattan sonra qui koymak: 'Le stylo avec qui j'écris' yanlıştır; qui sadece insanlar için kullanılır, nesneler için 'avec lequel' denir.",
      "À + lequel yazmak: 'à lequel' kaynaşarak mutlaka 'auquel' olmalıdır.",
      "Cinsiyet uyumunu kaçırmak: La solution -> à laquelle; Les problèmes -> auxquels."
    ],
    tip: "Edat à mı istiyor? -> auquel, à laquelle, auxquels. Edat de mi istiyor? -> duquel, de laquelle, desquels. Sıradan edat mı (pour, avec)? -> pour lequel, avec laquelle.",
    check: [
      {
        prompt: "Le projet ___ je participe demande beaucoup d'énergie.",
        options: ["auquel", "duquel", "lequel"],
        answer: 0,
        why: "'Participer à' fiili à edatı aldığı için eril tekil isimle 'auquel' (à + lequel) olur."
      },
      {
        prompt: "L'amie avec ___ je suis parti en vacances s'appelle Sophie.",
        options: ["laquelle", "auquel", "duquel"],
        answer: 0,
        why: "Dişil tekil bir arkadaş için 'avec laquelle' (veya avec qui) kullanılır."
      },
      {
        prompt: "L'immeuble près ___ se trouve la pharmacie est très ancien.",
        options: ["duquel", "auquel", "lequel"],
        answer: 0,
        why: "'Près de' edatı de içerdiği için eril isimle 'près duquel' olur."
      }
    ]
  }
]
