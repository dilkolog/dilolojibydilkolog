import type { TopicLesson } from './lessonTypes'

export const FR_LESSONS_2: TopicLesson[] = [
  // ---------------------------------------------------------------- A1
  {
    topic: "basics_fr_pronoms",
    language: "fr",
    title: "Kişi zamirleri ve vurgulu zamirler",
    level: "A1",
    summary:
      "Fransızcada fiilin önünde her zaman bir özne zamiri (je, tu, il…) durur. Zamir tek başına, edattan sonra ya da vurgu için kullanılacaksa vurgulu biçim (moi, toi, lui…) gelir.",
    rules: [
      "Özne zamirleri: je, tu, il, elle, on, nous, vous, ils, elles.",
      "tu samimi tekil « sen »dir; vous hem çoğul « siz » hem de resmî tekil « siz »dir: Vous êtes prêt, monsieur ?",
      "on konuşmada « biz » yerine ve « insan, birileri » anlamında kullanılır; fiil 3. tekildir: On va au cinéma ? On parle français ici.",
      "ils eril ya da karma grup içindir; elles yalnızca hepsi dişil olan grup için.",
      "il ve elle şeyler için de kullanılır, ismin cinsiyetine göre: La voiture ? Elle est neuve.",
      "Vurgulu zamirler: moi, toi, lui, elle, nous, vous, eux, elles.",
      "Vurgulu zamir tek başına (Moi aussi. Et toi ?), edattan sonra (avec moi, chez lui, pour elles), c'est'ten sonra (C'est moi), karşılaştırmada (plus grand que toi) ve özneyi vurgulamak için (Moi, je préfère le thé) gelir.",
    ],
    table: {
      caption: "Özne Zamirleri ve Vurgulu Zamirler",
      head: ["Anlamı", "Özne Zamiri", "Vurgulu Zamir", "Örnek Kullanım"],
      rows: [
        ["Ben / Sen", "je (j') / tu", "moi / toi", "Moi, je parle. Et toi ?"],
        ["O (eril / dişil)", "il / elle", "lui / elle", "C'est lui. Je pars avec elle."],
        ["Biz / İnsan (genel)", "on", "soi (genel) / nous", "On va au cinéma ?"],
        ["Biz / Siz", "nous / vous", "nous / vous", "Chez nous / Pour vous"],
        ["Onlar (eril / dişil)", "ils / elles", "eux / elles", "Ils sont là, je travaille avec eux."],
      ],
    },
    examples: [
      { text: "Moi, je m'appelle Ali. Et toi ?", tr: "Benim adım Ali. Ya senin?" },
      { text: "Vous êtes d'où, madame ?", tr: "Nerelisiniz, hanımefendi?" },
      { text: "On va au cinéma ce soir ?", tr: "Bu akşam sinemaya gidiyor muyuz?" },
      { text: "Mes cousins ? Je travaille avec eux.", tr: "Kuzenlerim mi? Onlarla çalışıyorum." },
      { text: "— Qui a téléphoné ? — C'est lui.", tr: "— Kim aradı? — O." },
      { text: "Ma sœur est plus grande que moi.", tr: "Kız kardeşim benden daha uzun." },
    ],
    watch: [
      "Türkçede « ben » çoğu zaman düşer; Fransızcada özne zamiri zorunludur. Vurgu için moi eklenir ama je yine kalır: « Moi, je parle », « Moi parle » değil.",
      "Edattan sonra özne zamiri kullanma: « avec moi », « avec je » değil; « pour lui », « pour il » değil.",
      "Türkçedeki « o » cinsiyet bildirmez; Fransızcada il / elle seçilir, şeylerde de: « la table ? Elle est grande ».",
      "Karışık bir grup için ils ve eux: « Ali et Marie ? Ils sont là, je pars avec eux ».",
    ],
    tip: "Zamir tek başına bir cevap olabiliyorsa (« Kim? — Ben. ») vurgulu biçimi kullan: moi, toi, lui, elle, nous, vous, eux, elles.",
    check: [
      {
        prompt: "Mes cousins ? Je pars en vacances avec ___.",
        options: ["ils", "leur", "les", "eux"],
        answer: 3,
        why: "Edattan sonra vurgulu zamir gelir: avec eux.",
      },
      {
        prompt: "Ma sœur est plus grande que ___.",
        options: ["je", "me", "moi", "mon"],
        answer: 2,
        why: "Karşılaştırmada que'den sonra vurgulu zamir gelir: que moi.",
      },
      {
        prompt: "___ va au cinéma ce soir ?",
        options: ["Nous", "On", "Vous", "Ils"],
        answer: 1,
        why: "Fiil 3. tekil (va) olduğu için özne on; konuşmada « biz » demektir.",
      },
    ],
  },
  {
    topic: "basics_fr_possessifs",
    language: "fr",
    title: "İyelik ve işaret sıfatları",
    level: "A1",
    summary:
      "İyelik sıfatları (mon, ma, mes…) Türkçedeki iyelik eklerinin, işaret sıfatları (ce, cette, ces) ise « bu / şu » sözcüklerinin karşılığıdır. İkisi de isimden önce gelir ve isme uyar.",
    rules: [
      "Benim: mon (eril), ma (dişil), mes (çoğul). Senin: ton, ta, tes. Onun: son, sa, ses.",
      "Bizim: notre, nos. Sizin: votre, vos. Onların: leur (tekil şey), leurs (çoğul şey).",
      "son / sa / ses sahibin cinsiyetine değil, ismin cinsiyetine göre seçilir: sa maison hem « onun (kadının) evi » hem « onun (adamın) evi »dir.",
      "Sesli harf ya da sessiz h ile başlayan dişil isimden önce ma / ta / sa → mon / ton / son: mon amie, son école, ton histoire.",
      "İşaret sıfatı: ce (eril), cet (sesli harf ya da sessiz h ile başlayan eril), cette (dişil), ces (çoğul): ce livre, cet homme, cette femme, ces enfants.",
      "Yakın ve uzak ayırmak gerekirse isme -ci / -là eklenir: ce livre-ci (bu kitap), ce livre-là (şu kitap).",
      "Zaman sözcükleriyle « bu »: ce matin, cet après-midi, ce soir, cette semaine, cette année.",
    ],
    table: {
      caption: "İyelik ve İşaret Sıfatları Özeti",
      head: ["Kişi / İşaret", "Eril Tekil (ve Sesli Önü Dişil)", "Dişil Tekil (Ünsüz Önü)", "Çoğul (Eril ve Dişil)"],
      rows: [
        ["Benim (je)", "mon livre / mon amie", "ma table", "mes livres"],
        ["Senin (tu)", "ton livre / ton école", "ta table", "tes livres"],
        ["Onun (il / elle)", "son livre / son histoire", "sa table", "ses livres"],
        ["Bizim / Sizin", "notre / votre", "notre / votre", "nos / vos"],
        ["Onların (ils / elles)", "leur livre", "leur table", "leurs livres"],
        ["İşaret (bu / şu)", "ce livre / cet homme (sesli önü)", "cette femme", "ces enfants"],
      ],
    },
    examples: [
      { text: "Ma sœur habite à Lyon avec son mari.", tr: "Kız kardeşim kocasıyla Lyon'da oturuyor." },
      { text: "Mon amie Claire travaille dans une banque.", tr: "Arkadaşım Claire bir bankada çalışıyor." },
      { text: "Les enfants jouent avec leurs amis.", tr: "Çocuklar arkadaşlarıyla oynuyor." },
      { text: "Cet hôtel est cher, mais cette chambre est très belle.", tr: "Bu otel pahalı ama bu oda çok güzel." },
      { text: "Tu préfères ce pull ou ces chaussures ?", tr: "Bu kazağı mı yoksa bu ayakkabıları mı tercih edersin?" },
      { text: "Qu'est-ce que tu fais ce week-end ?", tr: "Bu hafta sonu ne yapıyorsun?" },
    ],
    watch: [
      "son / sa'yı sahibin cinsiyetine göre seçme: bir adamın annesi de « sa mère »dir, « son mère » değil.",
      "Sesli harften önce « ma amie », « ce homme » deme: « mon amie », « cet homme ».",
      "Türkçe « benim kitabım » der; Fransızcada artikel ile iyelik sıfatı yan yana gelmez: « mon livre », « le mon livre » değil.",
      "Dönüşlü fiille beden parçası anlatılırken iyelik değil artikel gelir: « Je me lave les mains », « Je me lave mes mains » değil.",
    ],
    tip: "son / sa / ses seçerken sahibine değil sahip olunan isme bak: isim dişilse sa, çoğulsa ses.",
    check: [
      {
        prompt: "Paul habite avec ___ mère. (Paul'ün annesi)",
        options: ["son", "sa", "ses", "leur"],
        answer: 1,
        why: "İyelik sıfatı sahibe değil isme uyar: mère dişil olduğu için sa.",
      },
      {
        prompt: "C'est ___ amie Claire.",
        options: ["ma", "me", "mes", "mon"],
        answer: 3,
        why: "Sesli harfle başlayan dişil isimden önce ma yerine mon gelir.",
      },
      {
        prompt: "___ hôtel est très cher.",
        options: ["Ce", "Cette", "Cet", "Ces"],
        answer: 2,
        why: "Sesli harf ya da sessiz h ile başlayan eril isimden önce ce, cet olur.",
      },
    ],
  },
  {
    topic: "basics_fr_nombres",
    language: "fr",
    title: "Sayılar, saat ve tarih",
    level: "A1",
    summary:
      "Fransızcada 70'ten sonra sayılar toplama ve çarpmayla kurulur. Saat « Il est … heures » kalıbıyla, tarih « le + sayı + ay » sırasıyla söylenir.",
    rules: [
      "1–16: un, deux, trois, quatre, cinq, six, sept, huit, neuf, dix, onze, douze, treize, quatorze, quinze, seize; 17–19: dix-sept, dix-huit, dix-neuf.",
      "Onluklar: vingt, trente, quarante, cinquante, soixante. 21, 31… 61'de et girer: vingt et un, trente et un; diğerlerinde kısa çizgi: vingt-deux.",
      "70 = soixante-dix (60 + 10), 71 = soixante et onze, 80 = quatre-vingts (4 × 20), 81 = quatre-vingt-un, 90 = quatre-vingt-dix, 99 = quatre-vingt-dix-neuf.",
      "cent, deux cents (ardından sayı gelince s düşer: deux cent cinq); mille hiç değişmez: deux mille.",
      "Saat: Il est trois heures. et quart (çeyrek geçe), et demie (buçuk), moins le quart (çeyrek kala), moins dix (on kala); midi ve minuit heure almaz: Il est midi.",
      "Resmî saatte 24 saat kullanılır ve dakika düz okunur: Le train part à 18 h 30 (dix-huit heures trente).",
      "Tarih: le + sayı + ay: le 14 juillet; ayın ilk günü le premier: le 1er mai. Gün ve ay adları küçük harfle yazılır.",
      "Yıl ve ay en ile: en 2026, en mars; mevsimler: en été, en automne, en hiver, ama au printemps.",
    ],
    table: {
      caption: "Sayılar (70–99), Saat ve Tarih Kalıpları",
      head: ["Kategori", "Kalıp / Kuruluş", "Fransızca Örnek", "Türkçe Karşılığı"],
      rows: [
        ["70–79 (60 + 10…19)", "soixante + dix…dix-neuf", "soixante et onze (71)", "yetmiş bir"],
        ["80–89 (4 × 20)", "quatre-vingts / quatre-vingt-…", "quatre-vingts (80), quatre-vingt-un (81)", "seksen, seksen bir"],
        ["90–99 (4 × 20 + 10…19)", "quatre-vingt-dix…dix-neuf", "quatre-vingt-quinze (95)", "doksan beş"],
        ["Saat (günlük dil)", "Il est … heures (et quart / et demie / moins…)", "Il est dix heures moins le quart.", "Saat ona çeyrek var."],
        ["Tarih ve ayın 1'i", "le + sayı (le premier) + ay", "le premier mai / le 14 juillet", "1 Mayıs / 14 Temmuz"],
      ],
    },
    examples: [
      { text: "— Quelle heure est-il ? — Il est neuf heures et quart.", tr: "— Saat kaç? — Dokuzu çeyrek geçiyor." },
      { text: "Le cours commence à dix heures moins le quart.", tr: "Ders ona çeyrek kala başlıyor." },
      { text: "Mon anniversaire, c'est le 21 avril.", tr: "Doğum günüm 21 Nisan'da." },
      { text: "Nous sommes le premier janvier.", tr: "Bugün 1 Ocak." },
      { text: "Ça fait quatre-vingt-dix-neuf euros, s'il vous plaît.", tr: "Doksan dokuz euro tutuyor, lütfen." },
      { text: "Elle est née en 1998, au printemps.", tr: "1998'de, ilkbaharda doğdu." },
    ],
    watch: [
      "Türkçe « dokuzu çeyrek geçiyor », « ona çeyrek var » der; Fransızcada önce saat söylenir: « neuf heures et quart », « dix heures moins le quart ».",
      "Ayın günü için sıra sayısı kullanılmaz: « le 2 mai » (le deux mai), « le deuxième mai » değil; yalnızca 1 için « le premier ».",
      "Gün ve ay adlarını büyük harfle yazma: « lundi 3 mars », « Lundi 3 Mars » değil.",
      "80 « quatre-vingts »tır ama 81 « quatre-vingt-un »: s düşer, et girmez. Belçika ve İsviçre'de septante (70) ve nonante (90) da duyulur.",
    ],
    tip: "70'ten sonra hesap yap: 70 = 60 + 10, 80 = 4 × 20, 90 = 4 × 20 + 10. « quatre-vingt-dix-sept » = 4 × 20 + 17 = 97.",
    check: [
      {
        prompt: "80 sayısının Fransızcası hangisi?",
        options: ["quatre-vingts", "quatre-vingt-dix", "soixante-vingt", "quatre-vingt"],
        answer: 0,
        why: "80 = 4 × 20; arkasından sayı gelmediği için vingt -s alır.",
      },
      {
        prompt: "Saat 9.45'i günlük dilde nasıl söylersin?",
        options: ["Il est neuf heures moins le quart.", "Il est dix heures moins le quart.", "Il est neuf heures et quart.", "Il est dix heures et demie."],
        answer: 1,
        why: "Çeyrek kala, bir sonraki saatten moins le quart ile söylenir.",
      },
      {
        prompt: "Mon anniversaire est le ___ mai. (1)",
        options: ["un", "première", "unième", "premier"],
        answer: 3,
        why: "Ayın ilk günü için sıra sayısı le premier kullanılır.",
      },
    ],
  },
  {
    topic: "basics_fr_questions",
    language: "fr",
    title: "Soru sözcükleri ve soru kurma",
    level: "A1",
    summary:
      "Soru sözcükleri (qui, que, où, quand, comment, pourquoi…) üç ayrı biçimde kullanılabilir: tonlamayla, est-ce que ile ya da özne ile fiilin yer değiştirdiği devrik soruyla.",
    rules: [
      "qui (kim), que / quoi (ne), où (nerede, nereye), quand (ne zaman), comment (nasıl), pourquoi (neden), combien (de) (kaç, ne kadar).",
      "quel (hangi, ne) isme uyar: quel, quelle, quels, quelles: Quel âge as-tu ? Quelle est ton adresse ?",
      "Konuşmada: Tu vas où ? Standart: Où est-ce que tu vas ? Resmî ve yazıda devrik: Où vas-tu ?",
      "que başta ya da devrikte gelir (Que fais-tu ? Qu'est-ce que tu fais ?); sonda ve edattan sonra quoi olur: Tu fais quoi ? De quoi tu parles ?",
      "Devrik soruda fiil ile özne kısa çizgiyle bağlanır; iki sesli harf çakışırsa araya -t- girer: Parlez-vous anglais ? Où va-t-il ? A-t-elle faim ?",
      "Özne isimse isim başta kalır, fiilden sonra zamir eklenir: Pourquoi Marie pleure-t-elle ?",
      "qui özne olunca fiil tekil kalır: Qui veut du café ? pourquoi sorusuna parce que ile cevap verilir.",
    ],
    table: {
      caption: "Soru Sözcükleri ve Üç Soru Düzeyi",
      head: ["Soru Sözcüğü", "Günlük (Tonlama)", "Standart (est-ce que)", "Resmî (Devrik)"],
      rows: [
        ["où (nerede/nereye)", "Tu vas où ?", "Où est-ce que tu vas ?", "Où vas-tu ?"],
        ["quand (ne zaman)", "Il part quand ?", "Quand est-ce qu'il part ?", "Quand part-il ?"],
        ["que / quoi (ne)", "Tu fais quoi ?", "Qu'est-ce que tu fais ?", "Que fais-tu ?"],
        ["pourquoi (neden)", "Tu ris pourquoi ?", "Pourquoi est-ce que tu ris ?", "Pourquoi ris-tu ?"],
        ["combien de (kaç)", "Tu as combien de frères ?", "Combien de frères est-ce que tu as ?", "Combien de frères as-tu ?"],
        ["quel/quelle (hangi)", "Tu prends quel bus ?", "Quel bus est-ce que tu prends ?", "Quel bus prends-tu ?"],
      ],
    },
    examples: [
      { text: "Comment tu t'appelles ?", tr: "Adın ne?" },
      { text: "Où est-ce que vous habitez ?", tr: "Nerede oturuyorsunuz?" },
      { text: "Quand part le train pour Lyon ?", tr: "Lyon treni ne zaman kalkıyor?" },
      { text: "— Pourquoi apprends-tu le français ? — Parce que j'aime cette langue.", tr: "— Neden Fransızca öğreniyorsun? — Çünkü bu dili seviyorum." },
      { text: "Combien de frères et sœurs as-tu ?", tr: "Kaç kardeşin var?" },
      { text: "Quelle est ta couleur préférée ?", tr: "En sevdiğin renk ne?" },
    ],
    watch: [
      "« ne » cümlenin sonunda kalırsa quoi olur: « Tu fais quoi ? », « Tu fais que ? » değil.",
      "Türkçedeki « ne » isimle birlikte quel olur: « Quel est ton nom ? », « Qu'est-ce que est ton nom ? » değil.",
      "est-ce que ile devrik birlikte kullanılmaz: « Où est-ce que tu vas ? » ya da « Où vas-tu ? », « Où est-ce que vas-tu ? » değil.",
      "« kaç » ismi doğrudan almaz, araya de girer: « combien de livres », « combien livres » değil.",
    ],
    tip: "Günlük konuşmada tonlama ya da est-ce que yeter. Devriği önce sık kalıplarda tanı: « Comment allez-vous ? », « Quelle heure est-il ? », « Avez-vous des questions ? »",
    check: [
      {
        prompt: "Tu fais ___ ce soir ?",
        options: ["que", "quel", "quoi", "qu'est-ce que"],
        answer: 2,
        why: "Cümlenin sonunda « ne » quoi olur.",
      },
      {
        prompt: "___ est ton adresse ?",
        options: ["Quoi", "Quelle", "Quel", "Qu'est-ce que"],
        answer: 1,
        why: "quel isme uyar; adresse dişil olduğu için quelle.",
      },
      {
        prompt: "Combien ___ frères as-tu ?",
        options: ["des", "du", "les", "de"],
        answer: 3,
        why: "combien'den sonra isim de ile gelir: combien de.",
      },
    ],
  },

  // ---------------------------------------------------------------- A2
  {
    topic: "basics_fr_lieux",
    language: "fr",
    title: "Yer edatları; ülke ve şehirle à / en / au / aux, chez",
    level: "A2",
    summary:
      "Türkçenin -de, -e ve -den ekleri Fransızcada edatlarla karşılanır. Şehir ya da ülke adlarında edat, adın cinsiyetine ve sayısına göre seçilir; birinin evi için chez kullanılır.",
    rules: [
      "Şehirde ve şehre: à: Je suis à Paris. Je vais à Istanbul.",
      "Dişil ülke (çoğu -e ile biter) ve sesli harfle başlayan ülke: en: en France, en Turquie, en Italie, en Iran.",
      "Eril ülke: au: au Japon, au Canada, au Maroc, au Mexique. Çoğul ülke: aux: aux États-Unis, aux Pays-Bas.",
      "Nereden: dişil ülke ve şehir de / d' (de France, d'Italie, de Paris); eril ülke du (du Japon); çoğul des (des États-Unis).",
      "Kıta ve dişil bölgeler de en alır: en Europe, en Asie, en Bretagne.",
      "chez + kişi: birinin evi ya da iş yeri: chez moi, chez Paul, chez le médecin, chez le coiffeur.",
      "Yer edatları: dans (içinde), sur (üstünde), sous (altında), devant (önünde), derrière (arkasında), entre (arasında), à côté de (yanında), en face de (karşısında), près de (yakınında), loin de (uzağında).",
      "de ile biten edatlarda de + le = du, de + les = des: à côté du cinéma, près des magasins.",
    ],
    table: {
      caption: "Ülke, Şehir ve Kişi İsimleriyle Yer Edatları",
      head: ["Yer Türü", "Bulunma / Yönelme (-de / -e)", "Ayrılma (-den / -dan)", "Örnek"],
      rows: [
        ["Şehirler", "à", "de (d')", "à Paris / d'Istanbul"],
        ["Dişil / sesliyle başlayan ülke", "en", "de (d')", "en France, en Italie / de Turquie, d'Iran"],
        ["Eril ülke (ünsüzle başlayan)", "au", "du", "au Japon, au Maroc / du Canada"],
        ["Çoğul ülke", "aux", "des", "aux États-Unis / des Pays-Bas"],
        ["Kişi (evi / iş yeri)", "chez", "de chez", "chez Paul, chez le dentiste"],
      ],
    },
    examples: [
      { text: "J'habite à Izmir, en Turquie.", tr: "Türkiye'de, İzmir'de oturuyorum." },
      { text: "Cet été, nous allons au Portugal, puis aux États-Unis.", tr: "Bu yaz Portekiz'e, ardından ABD'ye gidiyoruz." },
      { text: "Elle vient du Canada, mais elle vit en Italie.", tr: "Kanada'dan geliyor ama İtalya'da yaşıyor." },
      { text: "Ce soir, on dîne chez mes parents.", tr: "Bu akşam annemlerde yemek yiyoruz." },
      { text: "Je dois aller chez le dentiste demain.", tr: "Yarın dişçiye gitmem gerek." },
      { text: "La pharmacie est en face de la gare, à côté de la banque.", tr: "Eczane garın karşısında, bankanın yanında." },
    ],
    watch: [
      "Türkçenin -de ve -e eki aynı edata düşer: « Je suis en France » (Fransa'da), « Je vais en France » (Fransa'ya). Ayrı bir edat arama.",
      "Ülkenin cinsiyetini öğren: « au Mexique », « au Cambodge » -e ile bitse de eril.",
      "Birinin evine giderken « à la maison de Paul » yerine « chez Paul » de; meslekte de: « chez le boulanger », « à le boulanger » değil.",
      "venir de ile dişil ülkede artikel düşer: « Je viens de France », « Je viens de la France » değil; eril ülkede birleşir: « du Japon ».",
    ],
    tip: "Ülke adını artikeliyle öğren: la France → en France, le Japon → au Japon, les États-Unis → aux États-Unis. Artikel edatı söyler.",
    check: [
      {
        prompt: "J'habite ___ Japon.",
        options: ["en", "à", "au", "aux"],
        answer: 2,
        why: "Eril ülke adıyla au kullanılır: le Japon → au Japon.",
      },
      {
        prompt: "Elle vient ___ Italie.",
        options: ["de la", "d'", "du", "des"],
        answer: 1,
        why: "Dişil ülkeden gelişte artikel düşer: de France, d'Italie.",
      },
      {
        prompt: "Ce soir, on dîne ___ mes parents.",
        options: ["chez", "à", "dans", "au"],
        answer: 0,
        why: "Birinin evi için chez + kişi kullanılır.",
      },
    ],
  },
  {
    topic: "basics_fr_pronominaux",
    language: "fr",
    title: "Dönüşlü fiiller (se lever)",
    level: "A2",
    summary:
      "Dönüşlü fiiller özneyle aynı kişiyi gösteren bir zamirle (me, te, se…) çekilir. Günlük rutinin çoğu (uyanmak, kalkmak, giyinmek, yatmak) bu fiillerle anlatılır.",
    rules: [
      "Zamir özneye uyar: je me lève, tu te lèves, il / elle / on se lève, nous nous levons, vous vous levez, ils / elles se lèvent.",
      "Sesli harften önce me, te, se → m', t', s': je m'appelle, il s'habille.",
      "Sık fiiller: se réveiller, se lever, se laver, se brosser les dents, s'habiller, se coucher, se promener, se dépêcher, s'appeler, se souvenir de, s'amuser.",
      "Çoğulda karşılıklılık da anlatır: Ils se téléphonent tous les jours (birbirlerini arıyorlar).",
      "Olumsuzda ne zamirin önüne, pas fiilin arkasına: Je ne me lève pas tôt.",
      "Passé composé hep être ile: je me suis levé(e), nous nous sommes couchés. Ortaç çoğunlukla özneye uyar: elle s'est habillée.",
      "Mastarda zamir yine özneye uyar: Je vais me coucher. Nous voulons nous reposer.",
      "Olumlu emirde zamir arkaya geçer, te → toi: Lève-toi ! Dépêchez-vous ! Olumsuzda önde kalır: Ne te lève pas.",
    ],
    table: {
      caption: "Dönüşlü Fiillerin (se lever) Zamanlara Göre Çekimi",
      head: ["Kişi / Yapı", "Présent", "Passé Composé (être ile)", "Emir / Mastar"],
      rows: [
        ["je", "je me lève", "je me suis levé(e)", "Je vais me lever."],
        ["tu", "tu te lèves", "tu t'es levé(e)", "Lève-toi ! / Ne te lève pas !"],
        ["il / elle / on", "il / elle se lève", "elle s'est levée", "Il doit se lever."],
        ["nous", "nous nous levons", "nous nous sommes levé(e)s", "Levons-nous !"],
        ["vous", "vous vous levez", "vous vous êtes levé(e)(s)", "Levez-vous !"],
        ["ils / elles", "ils / elles se lèvent", "elles se sont levées", "Ils veulent se lever."],
      ],
    },
    examples: [
      { text: "Je me réveille à sept heures et je me lève tout de suite.", tr: "Saat yedide uyanıyorum ve hemen kalkıyorum." },
      { text: "Le week-end, nous nous couchons tard.", tr: "Hafta sonu geç yatıyoruz." },
      { text: "Elle s'est habillée très vite ce matin.", tr: "Bu sabah çok hızlı giyindi." },
      { text: "Ils se sont rencontrés à l'université.", tr: "Üniversitede tanıştılar." },
      { text: "Je ne me souviens pas de son nom.", tr: "Adını hatırlamıyorum." },
      { text: "Dépêche-toi, on va être en retard !", tr: "Acele et, geç kalacağız!" },
    ],
    watch: [
      "Türkçede dönüşlülük bazen görünür (yıkanmak), bazen görünmez (kalkmak, uyanmak, yatmak); Fransızcada zamir zorunlu: « je me lève », « je lève » değil.",
      "Passé composé'de avoir kullanma: « je me suis levé », « je m'ai levé » değil; dişil özneyle uyum: « elle s'est levée ».",
      "Mastarda zamiri özneye uydur: « je vais me coucher », « je vais se coucher » değil.",
      "Zamirli ve zamirsiz biçim farklı şeydir: « je lave la voiture » (arabayı yıkıyorum), « je me lave » (yıkanıyorum).",
    ],
    tip: "Fiili zamiriyle ezberle: « se lever », « s'habiller ». Sözlükte yanında se varsa çekimde de hep bir zamir olacak.",
    check: [
      {
        prompt: "Hier soir, nous ___ couchés tard.",
        options: ["avons", "nous avons", "nous sommes", "sommes"],
        answer: 2,
        why: "Dönüşlü fiil passé composé'de être alır ve zamiri korur.",
      },
      {
        prompt: "Je vais ___ coucher.",
        options: ["se", "me", "te", "nous"],
        answer: 1,
        why: "Mastarda da dönüşlü zamir özneye uyar: je → me.",
      },
      {
        prompt: "« Kalk! » (tu) nasıl söylenir?",
        options: ["Lève-toi !", "Lève-te !", "Te lève !", "Lève !"],
        answer: 0,
        why: "Olumlu emirde zamir arkaya geçer ve te, toi olur.",
      },
    ],
  },
  {
    topic: "basics_fr_comparaison",
    language: "fr",
    title: "Karşılaştırma ve en üstünlük",
    level: "A2",
    summary:
      "Karşılaştırma plus (daha), moins (daha az) ve aussi / autant (kadar) ile, karşılaştırılan şey que ile kurulur. En üstünlükte başa belirli artikel gelir: le plus, la moins.",
    rules: [
      "Sıfat ve zarfla: plus / moins / aussi + sıfat + que: plus grand que, moins cher que, aussi vite que.",
      "İsimle: plus de / moins de / autant de + isim + que: J'ai plus de travail que toi.",
      "Fiille: fiil + plus que / moins que / autant que: Il travaille autant que moi.",
      "Düzensizler: bon → meilleur, le meilleur (sıfat); bien → mieux, le mieux (zarf); mauvais → pire ya da plus mauvais.",
      "En üstünlük: le / la / les + plus / moins + sıfat (+ de): la plus belle ville du monde.",
      "Sıfat isimden sonra geliyorsa artikel tekrar edilir: le restaurant le plus cher, les questions les plus difficiles.",
      "que'den sonra vurgulu zamir gelir: plus âgé que moi, aussi grande qu'elle.",
    ],
    table: {
      caption: "Karşılaştırma ve En Üstünlük Kalıpları",
      head: ["Sözcük Türü", "Daha Fazla (+)", "Eşit (=)", "Daha Az (-)", "En Üstünlük"],
      rows: [
        ["Sıfat / Zarf", "plus … que", "aussi … que", "moins … que", "le / la / les plus (moins) …"],
        ["İsim", "plus de + isim + que", "autant de + isim + que", "moins de + isim + que", "le plus de / le moins de + isim"],
        ["Fiil", "fiil + plus que", "fiil + autant que", "fiil + moins que", "fiil + le plus / le moins"],
        ["Düzensiz: bon (iyi - sıfat)", "meilleur(e) que", "aussi bon(ne) que", "moins bon(ne) que", "le meilleur / la meilleure"],
        ["Düzensiz: bien (iyi - zarf)", "mieux que", "aussi bien que", "moins bien que", "le mieux"],
      ],
    },
    examples: [
      { text: "Le train est plus rapide que le bus, mais moins confortable que la voiture.", tr: "Tren otobüsten daha hızlı ama arabadan daha az rahat." },
      { text: "Ma sœur est aussi grande que moi.", tr: "Kız kardeşim benim kadar uzun." },
      { text: "Cette année, j'ai moins de temps libre que l'année dernière.", tr: "Bu yıl geçen yıla göre daha az boş vaktim var." },
      { text: "Ce gâteau est meilleur que l'autre.", tr: "Bu pasta öbüründen daha güzel." },
      { text: "Elle chante mieux que moi.", tr: "Benden daha iyi şarkı söylüyor." },
      { text: "C'est la question la plus difficile de l'examen.", tr: "Sınavın en zor sorusu bu." },
    ],
    watch: [
      "Türkçede « daha » düşebilir (« Ali'den uzun »); Fransızcada plus zorunlu, « -den » de que olur: « plus grand que moi ».",
      "« plus bon » ve « plus bien » deme: « meilleur » (sıfat: Ce vin est meilleur), « mieux » (zarf: Il parle mieux).",
      "İsimden sonraki sıfatta artikeli tekrar et: « l'élève le plus sérieux », « l'élève plus sérieux » değil.",
      "« -in en … »deki ilgi de ile kurulur: « la plus haute montagne d'Europe », « en Europe » da olur ama de daha yaygındır.",
    ],
    tip: "meilleur ile mieux'yü ayırmak için cümleyi karşılaştırmasız söyle: « bon » diyebiliyorsan meilleur, « bien » diyebiliyorsan mieux.",
    check: [
      {
        prompt: "Ce gâteau est ___ que l'autre.",
        options: ["plus bon", "meilleur", "mieux", "plus bien"],
        answer: 1,
        why: "bon sıfatının karşılaştırması düzensizdir: meilleur.",
      },
      {
        prompt: "Elle chante ___ que moi.",
        options: ["meilleur", "plus bien", "bonne", "mieux"],
        answer: 3,
        why: "Fiili niteleyen bien zarfının karşılaştırması mieux'dür.",
      },
      {
        prompt: "C'est la question ___ difficile de l'examen.",
        options: ["plus", "le plus", "la plus", "la plus que"],
        answer: 2,
        why: "En üstünlükte artikel isme uyar ve sıfattan önce tekrar edilir: la plus.",
      },
    ],
  },
  {
    topic: "basics_fr_imperatif",
    language: "fr",
    title: "Emir kipi",
    level: "A2",
    summary:
      "Emir kipi (impératif) rica, öneri, talimat ve yasak bildirir. Yalnızca tu, nous ve vous kişileri vardır ve özne zamiri söylenmez.",
    rules: [
      "Présent'taki tu / nous / vous biçimi, zamirsiz: Prends ! Prenons ! Prenez ! nous biçimi « -elim » demektir: Allons-y !",
      "-er fiillerinde ve aller'de tu biçiminin -s'si düşer: tu parles → Parle !, tu vas → Va ! (-ir / -re fiillerinde kalır: Finis ! Attends !)",
      "y ve en'den önce bu -s geri gelir: Vas-y ! Manges-en !",
      "Düzensizler: être → sois, soyons, soyez; avoir → aie, ayons, ayez; savoir → sache, sachons, sachez; vouloir → veuillez (resmî: Veuillez patienter).",
      "Olumsuz emir: ne … pas fiili sarar: Ne parle pas si fort ! Ne mangez pas trop vite.",
      "Olumlu emirde zamirler fiilden sonra, kısa çizgiyle gelir ve me / te → moi / toi olur: Regarde-moi. Lève-toi. Donne-le-moi.",
      "Olumsuz emirde zamirler fiilin önünde, normal biçimlerinde kalır: Ne me regarde pas. Ne te lève pas. Ne le lui dis pas.",
    ],
    examples: [
      { text: "Ferme la porte, s'il te plaît.", tr: "Kapıyı kapat lütfen." },
      { text: "Allons au parc cet après-midi !", tr: "Bu öğleden sonra parka gidelim!" },
      { text: "Soyez prudents sur la route.", tr: "Yolda dikkatli olun." },
      { text: "Donne-moi ton numéro, je t'appelle ce soir.", tr: "Bana numaranı ver, bu akşam seni ararım." },
      { text: "Ne t'inquiète pas, tout va bien.", tr: "Merak etme, her şey yolunda." },
      { text: "Ce livre ? Prête-le-moi, je te le rends demain.", tr: "Bu kitap mı? Bana ödünç ver, yarın geri veririm." },
    ],
    watch: [
      "-er fiilinde tu emrine -s koyma: « Mange ! », « Manges ! » değil; -s yalnızca y / en'den önce döner: « Manges-en ».",
      "Olumlu emirde me değil moi: « Donne-moi », « Donne-me » değil; olumsuzda me geri gelir: « Ne me donne pas ».",
      "Türkçedeki « gidelim » istek kipinin karşılığı nous emridir: « Partons ! »; konuşmada « On y va ! » da çok sık.",
      "Dönüşlü fiilde zamiri unutma: « Assieds-toi », « Asseyez-vous », « Assieds ! » değil.",
    ],
    tip: "Emri kurmak için présent'taki tu / nous / vous biçimini al ve zamiri sil; -er fiillerinde tu'nun -s'sini de at.",
    table: {
      "caption": "Emir Kipi (L’Impératif) ve Zamirler",
      "head": [
        "Kişi",
        "Olumlu Emir",
        "Olumsuz Emir",
        "Zamirli Örnek"
      ],
      "rows": [
        [
          "Tu",
          "Parle ! (s düşer)",
          "Ne parle pas !",
          "Donne-le-moi ! / Ne me le donne pas !"
        ],
        [
          "Nous",
          "Parlons !",
          "Ne parlons pas !",
          "Allons-y ! / N’y allons pas !"
        ],
        [
          "Vous",
          "Parlez !",
          "Ne parlez pas !",
          "Écoutez-moi ! / Ne m’écoutez pas !"
        ]
      ]
    },
    check: [
      {
        prompt: "___ la porte, s'il te plaît ! (fermer, tu)",
        options: ["Fermes", "Ferme", "Fermons", "Fermez"],
        answer: 1,
        why: "-er fiilinin tu emrinde özne söylenmez ve -s düşer.",
      },
      {
        prompt: "Ton numéro ? Donne-___, s'il te plaît.",
        options: ["moi-le", "le-me", "le-moi", "me-le"],
        answer: 2,
        why: "Olumlu emirde önce le, sonra moi gelir: donne-le-moi.",
      },
      {
        prompt: "___ prudents sur la route ! (être, vous)",
        options: ["Êtes", "Soyons", "Étez", "Soyez"],
        answer: 3,
        why: "être'nin emri düzensizdir: vous için soyez.",
      },
    ],
  },
  {
    topic: "basics_fr_depuis",
    language: "fr",
    title: "Zaman ifadeleri: depuis, il y a, pendant, dans",
    level: "A2",
    summary:
      "Süre bildiren küçük sözcükler fiilin zamanını da belirler: depuis hâlâ süren durumu, il y a geçmişteki bir anı, pendant bir eylemin süresini, dans ise gelecekteki bir anı anlatır.",
    rules: [
      "depuis + süre ya da başlangıç: « -dır, -den beri »; durum hâlâ sürüyorsa fiil présent: J'habite ici depuis trois ans. depuis 2020, depuis lundi.",
      "Ça fait / Il y a + süre + que + présent, depuis ile aynı anlamdadır: Ça fait deux ans que j'apprends le français.",
      "il y a + süre: « … önce »; geçmişte bitmiş olay, fiil çoğunlukla passé composé: Je suis arrivé il y a deux ans.",
      "pendant + süre: bir eylemin ne kadar sürdüğü (geçmiş, şimdi ya da gelecek): J'ai dormi pendant huit heures.",
      "dans + süre: şimdiden itibaren « … sonra »: Le film commence dans dix minutes.",
      "en + süre: bir işi bitirmek için gereken süre: J'ai lu ce livre en deux jours.",
      "pour + süre: planlanan süre, çoğunlukla gitmek / gelmek fiilleriyle: Je pars à Rome pour une semaine.",
      "Olumsuz cümlede depuis passé composé ile de gelir: Je ne l'ai pas vu depuis un mois.",
    ],
    examples: [
      { text: "J'apprends le français depuis six mois.", tr: "Altı aydır Fransızca öğreniyorum." },
      { text: "Ça fait une heure que je t'attends !", tr: "Bir saattir seni bekliyorum!" },
      { text: "Il est parti il y a dix minutes.", tr: "On dakika önce gitti." },
      { text: "Nous avons attendu le bus pendant quarante minutes.", tr: "Kırk dakika otobüs bekledik." },
      { text: "Le train arrive dans un quart d'heure.", tr: "Tren çeyrek saat sonra geliyor." },
      { text: "Elle a écrit ce rapport en une journée.", tr: "Bu raporu bir günde yazdı." },
    ],
    watch: [
      "Türkçe « altı aydır öğreniyorum »daki süren durum için passé composé değil présent: « J'apprends depuis six mois », « J'ai appris depuis six mois » değil.",
      "il y a burada « var » değil « önce »dir ve sürenin önüne gelir: « il y a deux jours » (iki gün önce).",
      "dans + süre gelecektir (« üç gün sonra »); « üç günde bitirdim » için en: « J'ai fini en trois jours ».",
      "Bitmiş bir sürede depuis kullanma: « J'ai travaillé pendant deux heures » (iki saat çalıştım ve bitti), « depuis deux heures » hâlâ çalışıyorum demektir.",
    ],
    tip: "Önce sor: eylem hâlâ sürüyor mu? Sürüyorsa depuis + présent. Bittiyse ne zaman bittiğini il y a, ne kadar sürdüğünü pendant söyler.",
    table: {
      "caption": "Süre Bildiren Zaman Edatları",
      "head": [
        "Edat",
        "Kullanım Zamanı",
        "Cümlenin Fiil Zamanı",
        "Örnek"
      ],
      "rows": [
        [
          "depuis",
          "Hâlâ devam eden eylemler",
          "Présent",
          "J’habite ici depuis trois ans."
        ],
        [
          "pendant",
          "Tamamlanmış belirli bir süre",
          "Passé Composé / Futur",
          "J’ai dormi pendant huit heures."
        ],
        [
          "en",
          "Eylemin tamamlanma süresi",
          "Herhangi bir zaman",
          "J’ai fini ce livre en deux jours."
        ],
        [
          "pour",
          "Planlanan gelecek süre",
          "Futur / Présent",
          "Il part pour deux mois."
        ]
      ]
    },
    check: [
      {
        prompt: "J'apprends le français ___ six mois.",
        options: ["il y a", "depuis", "dans", "en"],
        answer: 1,
        why: "Hâlâ süren durum için depuis + présent kullanılır.",
      },
      {
        prompt: "J'ai acheté cette voiture ___ trois ans.",
        options: ["depuis", "dans", "il y a", "pendant"],
        answer: 2,
        why: "Geçmişte bir kez olup bitmiş olay için « … önce » il y a ile söylenir.",
      },
      {
        prompt: "Le film commence ___ dix minutes.",
        options: ["dans", "il y a", "depuis", "en"],
        answer: 0,
        why: "Şimdiden itibaren « … sonra » dans + süre ile söylenir.",
      },
    ],
  },

  // ---------------------------------------------------------------- B1
  {
    topic: "basics_fr_plus_que_parfait",
    language: "fr",
    title: "Plus-que-parfait (geçmişin geçmişi)",
    level: "B1",
    summary:
      "Plus-que-parfait, geçmişteki bir olaydan daha önce olmuş şeyi anlatır; Türkçedeki « -mişti »ye yakındır. Aktarılan sözde ve gerçekleşmemiş geçmiş şartta da kullanılır.",
    rules: [
      "Kuruluş: avoir ya da être'nin imparfait'i + ortaç: j'avais fini, tu avais vu, il était parti, nous étions arrivés.",
      "Yardımcı fiil seçimi ve uyum passé composé ile aynı: elle était déjà partie, ils s'étaient couchés.",
      "Geçmişteki bir andan önce bitmiş eylem: Quand je suis arrivé, le film avait commencé.",
      "Sık eşlik eden sözcükler: déjà, jamais, pas encore, avant: Je n'avais jamais vu la mer.",
      "Geçmiş bir çerçevede aktarılan sözde passé composé → plus-que-parfait: Il a dit qu'il avait oublié.",
      "Gerçekleşmemiş geçmiş şart: si + plus-que-parfait, ana cümlede conditionnel passé: Si j'avais su, je serais venu.",
      "Pişmanlık ve keşke: si seulement + plus-que-parfait: Si seulement j'avais écouté !",
    ],
    examples: [
      { text: "Quand nous sommes arrivés, le film avait déjà commencé.", tr: "Vardığımızda film çoktan başlamıştı." },
      { text: "Elle était fatiguée parce qu'elle n'avait pas dormi.", tr: "Uyumamış olduğu için yorgundu." },
      { text: "Je n'avais jamais vu la mer avant ce voyage.", tr: "Bu yolculuktan önce denizi hiç görmemiştim." },
      { text: "Ils étaient déjà partis quand j'ai téléphoné.", tr: "Telefon ettiğimde çoktan gitmişlerdi." },
      { text: "Il m'a dit qu'il avait perdu son portefeuille.", tr: "Cüzdanını kaybettiğini söyledi." },
      { text: "Si seulement j'avais écouté tes conseils !", tr: "Keşke tavsiyelerini dinleseydim!" },
    ],
    watch: [
      "Türkçe sıra belliyse « -di » ile yetinir; Fransızcada geçmişteki bir andan önce olanı plus-que-parfait gösterir: « le film avait déjà commencé », « a déjà commencé » değil.",
      "être alan fiillerde yardımcıyı ve uyumu unutma: « elle était partie », « elle avait parti » değil.",
      "Olaylar anlatıldığı sırayla oluyorsa plus-que-parfait gerekmez: « Il est entré et il s'est assis ».",
      "si'den sonra conditionnel yazma: « si j'avais su », « si j'aurais su » değil.",
    ],
    tip: "Geçmişte bir anı referans noktası yap (« vardığımda »); o andan önce olup bitmiş her şey plus-que-parfait'e kayar.",
    table: {
      "caption": "Plus-que-parfait Kurulum Tablosu",
      "head": [
        "Özne",
        "Imparfait Yardımcı Fiil",
        "Participe Passé",
        "Örnek"
      ],
      "rows": [
        [
          "J’ / Je",
          "avais / étais",
          "mangé / parti(e)",
          "Quand il est venu, j’étais déjà parti."
        ],
        [
          "Tu",
          "avais / étais",
          "fini / sorti(e)",
          "Tu avais déjà tout compris."
        ],
        [
          "Nous",
          "avions / étions",
          "vu / arrivé(e)s",
          "Nous avions réservé une table."
        ]
      ]
    },
    check: [
      {
        prompt: "Quand nous sommes arrivés, le film ___ déjà commencé.",
        options: ["a", "aura", "avait", "ait"],
        answer: 2,
        why: "Geçmişteki bir andan önce bitmiş eylem plus-que-parfait ile anlatılır.",
      },
      {
        prompt: "Elle ___ déjà partie quand j'ai téléphoné.",
        options: ["avait", "était", "a", "aura"],
        answer: 1,
        why: "partir être alır; plus-que-parfait'te être'nin imparfait'i gelir.",
      },
      {
        prompt: "Si j'___ su, je serais venu.",
        options: ["avais", "aurais", "ai", "aurai"],
        answer: 0,
        why: "si'den sonra conditionnel gelmez: si + plus-que-parfait.",
      },
    ],
  },
  {
    topic: "basics_fr_gerondif",
    language: "fr",
    title: "Gérondif ve participe présent",
    level: "B1",
    summary:
      "-ant ile biten biçim iki şekilde kullanılır: en ile (gérondif) Türkçedeki « -arken, -arak, -ınca » gibi zarf-fiillerin karşılığıdır; tek başına (participe présent) çoğunlukla yazıda « -an » ya da « -dığı için » anlamı taşır.",
    rules: [
      "Kuruluş: présent'taki nous biçiminin gövdesi + -ant: nous parlons → parlant, nous finissons → finissant, nous prenons → prenant. Düzensizler: être → étant, avoir → ayant, savoir → sachant.",
      "Gérondif = en + -ant: en parlant. Öznesi ana cümlenin öznesiyle aynı olmalıdır.",
      "Gérondif eşzamanlılık (-arken), yol ya da araç (-arak) ve koşul (-rsa) bildirir: Il chante en travaillant. C'est en lisant qu'on apprend. En partant maintenant, tu arriveras à l'heure.",
      "tout en + -ant zıtlığı ya da iki eylemin aynı anda olmasını vurgular: Tout en étant riche, il vit simplement.",
      "Participe présent (en'siz) değişmez; « qui + fiil » yerine ya da neden bildirmek için kullanılır: des étudiants parlant français; Étant malade, il est resté chez lui.",
      "Fiilden türeyen sıfat ise isme uyar: une histoire intéressante, des enfants obéissants.",
      "Daha önce bitmiş eylem için ayant / étant + ortaç: Ayant fini son travail, il est sorti.",
    ],
    examples: [
      { text: "Je fais la cuisine en écoutant la radio.", tr: "Radyo dinlerken yemek yapıyorum." },
      { text: "C'est en forgeant qu'on devient forgeron.", tr: "Demirci, demir döve döve olunur." },
      { text: "En prenant le métro, vous gagnerez du temps.", tr: "Metroya binerseniz zaman kazanırsınız." },
      { text: "Il est tombé en descendant l'escalier.", tr: "Merdivenden inerken düştü." },
      { text: "Étant malade, elle n'est pas venue au cours.", tr: "Hasta olduğu için derse gelmedi." },
      { text: "Nous cherchons un assistant parlant turc et français.", tr: "Türkçe ve Fransızca konuşan bir asistan arıyoruz." },
    ],
    watch: [
      "Türkçede « -ken »in öznesi farklı olabilir; gérondif'te olamaz: « J'ai vu Paul en sortant » = ben çıkarken gördüm. Farklı özne için pendant que: « Pendant que je sortais, Paul entrait ».",
      "Gérondif'te en'i unutma: « Il chante en travaillant », « Il chante travaillant » değil.",
      "Participe présent uyum yapmaz (« des femmes parlant arabe »), sıfat olmuş biçim yapar (« des femmes charmantes »).",
      "Bazı sıfatların yazımı fiil biçiminden farklıdır: fatiguant / fatigant (yorucu), convainquant / convaincant (ikna edici), précédant / précédent (önceki).",
    ],
    tip: "Türkçede « -arken » ya da « -arak » diyebiliyorsan ve iki eylemi aynı kişi yapıyorsa: en + -ant.",
    table: {
      "caption": "Gérondif ve Participe Présent",
      "head": [
        "Yapı",
        "Kurulum Kuralı",
        "Anlam / İşlev",
        "Örnek"
      ],
      "rows": [
        [
          "Gérondif",
          "En + nous kökü + -ant",
          "Aynı anda yapılan iki eylem (yaparak)",
          "Il mange en lisant le journal."
        ],
        [
          "Participe Présent",
          "Yalnızca nous kökü + -ant",
          "Eylemi niteleyen sıfat / yan cümle",
          "Une personne parlant trois langues."
        ]
      ]
    },
    check: [
      {
        prompt: "Il est tombé ___ l'escalier.",
        options: ["en descendu", "en descendant", "en descendre", "à descendant"],
        answer: 1,
        why: "« -arken » anlamındaki gérondif en + -ant ile kurulur.",
      },
      {
        prompt: "savoir fiilinin -ant biçimi hangisi?",
        options: ["savant", "sachent", "sachant", "savoyant"],
        answer: 2,
        why: "savoir düzensizdir: -ant biçimi sachant.",
      },
      {
        prompt: "« Ben çıkarken Paul giriyordu » cümlesinin doğru çevirisi hangisi?",
        options: ["Pendant que je sortais, Paul entrait.", "En sortant, Paul entrait.", "Paul entrait en sortant."],
        answer: 0,
        why: "Gérondif'in öznesi ana cümleninkiyle aynı olmalı; özneler farklıysa pendant que kullanılır.",
      },
    ],
  },
  {
    topic: "basics_fr_ordre_pronoms",
    language: "fr",
    title: "İki zamir bir arada (me le, le lui)",
    level: "B1",
    summary:
      "Bir fiilin hem doğrudan (le, la, les) hem dolaylı (lui, leur) nesnesi zamir olunca ikisi de fiilin önüne, sabit bir sırayla dizilir. Olumlu emirde sıra değişir.",
    rules: [
      "Sıra: me / te / se / nous / vous → le / la / les → lui / leur → y → en: Il me le donne. Je le lui donne. Je leur en parle. Il y en a.",
      "Zamirler çekimli fiilin önüne, birleşik zamanda yardımcı fiilin önüne gelir: Je le lui ai donné.",
      "Mastarlı yapıda mastarın önüne: Je vais le lui dire. Tu peux me l'expliquer ?",
      "Olumsuzda ne zamirlerin önüne, pas çekimli fiilin arkasına: Je ne le lui ai pas dit.",
      "Olumlu emirde: fiil + doğrudan + dolaylı, kısa çizgiyle; me / te → moi / toi: Donne-le-moi. Dis-le-leur. moi + en → m'en: Donne-m'en.",
      "Olumsuz emirde normal sıra: Ne me le donne pas.",
      "Doğrudan nesne me / te / nous / vous ise dolaylı nesne zamir olarak yanına gelemez, à + vurgulu zamir olur: Je te présente à lui.",
      "avoir ile kurulan zamanda ortaç öndeki le / la / les'e uyar: Ces photos ? Je te les ai montrées.",
    ],
    examples: [
      { text: "— Tu me prêtes ton vélo ? — Oui, je te le prête.", tr: "— Bisikletini bana ödünç verir misin? — Evet, veririm." },
      { text: "La lettre ? Je la lui ai envoyée hier.", tr: "Mektup mu? Dün ona gönderdim." },
      { text: "Ces photos ? Je vais te les montrer.", tr: "Bu fotoğraflar mı? Sana göstereceğim." },
      { text: "Des bonbons ? Je leur en ai donné trois.", tr: "Şeker mi? Onlara üç tane verdim." },
      { text: "Ne le lui dis pas, c'est une surprise !", tr: "Ona söyleme, sürpriz!" },
      { text: "Ton adresse ? Donne-la-moi, s'il te plaît.", tr: "Adresin mi? Bana ver lütfen." },
    ],
    watch: [
      "Türkçede nesne zamiri çoğu zaman düşer (« ona verdim »); Fransızcada belirli bir şeyden söz ediyorsan le / la / les da söylenir: « Je le lui ai donné ».",
      "le ile lui'nin sırasını karıştırma: « Je le lui donne », « Je lui le donne » değil. me / te / nous / vous ise le'nin önünde: « Il me le donne ».",
      "Olumlu emirde moi sona gelir: « Donne-le-moi », « Donne-moi-le » değil.",
      "lui hem « ona (erkeğe) » hem « ona (kadına) » demektir: « Je lui parle » Marie için de Paul için de doğru.",
    ],
    tip: "Emir dışında sırayı bir dizi gibi ezberle: me le lui y en. Önce kişi (me, te, nous, vous), sonra le / la / les, sonra lui / leur, en sonda y ve en.",
    table: {
      "caption": "Çift Zamirlerin Sıralaması",
      "head": [
        "1. Grup",
        "2. Grup (COD)",
        "3. Grup (COI)",
        "4. Grup",
        "5. Grup"
      ],
      "rows": [
        [
          "me, te, se, nous, vous",
          "le, la, les",
          "lui, leur",
          "y",
          "en"
        ],
        [
          "Il me le donne.",
          "Je le lui dis.",
          "Elle leur en parle.",
          "On s’y intéresse.",
          "Donne-m’en !"
        ]
      ]
    },
    check: [
      {
        prompt: "Le cadeau ? Je ___ donne demain. (à Marie)",
        options: ["lui le", "le lui", "la lui", "lui la"],
        answer: 1,
        why: "Sıra le / la / les, sonra lui / leur; cadeau eril olduğu için le lui.",
      },
      {
        prompt: "Des bonbons ? Je ___ ai donné trois. (aux enfants)",
        options: ["en leur", "leur les", "les leur", "leur en"],
        answer: 3,
        why: "Miktar en ile anılır ve en sona gelir: leur en.",
      },
      {
        prompt: "Hangisi doğru?",
        options: ["Ne me le donne pas !", "Ne le me donne pas !", "Ne donne-le-moi pas !", "Ne me donne-le pas !"],
        answer: 0,
        why: "Olumsuz emirde zamirler fiilin önünde, normal sırasıyla kalır: me le.",
      },
    ],
  },
  {
    topic: "basics_fr_adverbes",
    language: "fr",
    title: "-ment zarfları: kuruluş ve yer",
    level: "B1",
    summary:
      "Fransızcada sıfatların çoğundan -ment ekiyle zarf yapılır (Türkçedeki « -ca, -ce » ya da « … bir şekilde » gibi). Zarfın cümledeki yeri fiilin zamanına ve zarfın uzunluğuna bağlıdır.",
    rules: [
      "Dişil sıfat + -ment: lent → lente → lentement, heureux → heureuse → heureusement, doux → douce → doucement.",
      "Sıfat sesli harfle bitiyorsa eril biçime eklenir: vrai → vraiment, poli → poliment, absolu → absolument.",
      "-ant → -amment, -ent → -emment (ikisi de « aman » okunur): courant → couramment, évident → évidemment, prudent → prudemment. lent istisnadır: lentement.",
      "Bazılarında -ément: précis → précisément, énorme → énormément, profond → profondément. Düzensizler: gentil → gentiment, bref → brièvement.",
      "bon → bien, mauvais → mal, meilleur → mieux.",
      "Basit zamanda zarf çekimli fiilden hemen sonra gelir: Il parle lentement. Je vais souvent au cinéma.",
      "Birleşik zamanda kısa ve sık zarflar (bien, mal, déjà, toujours, souvent, beaucoup, vraiment) yardımcı fiil ile ortacın arasına girer: J'ai bien dormi. Uzun -ment zarfları çoğunlukla ortaçtan sonra gelir: Il a répondu calmement.",
      "Bütün cümleyi niteleyen zarf başa gelir: Heureusement, personne n'a été blessé.",
    ],
    examples: [
      { text: "Parlez plus lentement, s'il vous plaît.", tr: "Lütfen daha yavaş konuşun." },
      { text: "Elle parle couramment trois langues.", tr: "Üç dili akıcı konuşuyor." },
      { text: "Évidemment, il est encore en retard.", tr: "Tabii ki yine geç kaldı." },
      { text: "J'ai bien compris votre question.", tr: "Sorunuzu iyi anladım." },
      { text: "Heureusement, personne n'a été blessé.", tr: "Neyse ki kimse yaralanmadı." },
      { text: "Il a répondu très poliment à toutes les questions.", tr: "Bütün sorulara çok kibarca cevap verdi." },
    ],
    watch: [
      "Türkçede sıfat ve zarf çoğu zaman aynıdır (« güzel konuşuyor »); Fransızcada fiili niteleyen sözcük zarf olmalı: « Il parle bien », « Il parle bon » değil; « Elle conduit prudemment », « prudente » değil.",
      "Zarfı özne ile fiil arasına koyma: « Je vais souvent au cinéma », « Je souvent vais » değil.",
      "-amment / -emment yazımında çift m vardır: « évidemment », « couramment »; « évidament » yazma.",
      "Bazı sıfatlar zarf gibi değişmeden kullanılır: parler fort, coûter cher, travailler dur, sentir bon.",
    ],
    tip: "Zarfı bulmak için sıfatın dişilini söyle ve -ment ekle (heureuse → heureusement); sıfat -ant ya da -ent ile bitiyorsa -amment ya da -emment.",
    table: {
      "caption": "Fransızca Zarf Türetme Kuralları",
      "head": [
        "Sıfat Türü",
        "Kural",
        "Sıfat Örneği",
        "Türemiş Zarf"
      ],
      "rows": [
        [
          "Sessizle biten",
          "Dişil sıfat + -ment",
          "lent(e) / grand(e)",
          "lentement / grandement"
        ],
        [
          "Sesliyle biten",
          "Eril sıfat + -ment",
          "vrai / poli",
          "vraiment / poliment"
        ],
        [
          "-ent ile biten",
          "-emment eki alır",
          "patient / prudent",
          "patiemment / prudemment"
        ],
        [
          "-ant ile biten",
          "-amment eki alır",
          "courant / constant",
          "couramment / constamment"
        ]
      ]
    },
    check: [
      {
        prompt: "évident → ___",
        options: ["évidentement", "évidament", "évidemment", "évidamment"],
        answer: 2,
        why: "-ent ile biten sıfattan zarf -emment ile yapılır.",
      },
      {
        prompt: "Il parle ___ le français.",
        options: ["bon", "bien", "bonne", "meilleur"],
        answer: 1,
        why: "Fiili niteleyen sözcük zarf olmalı: bon değil bien.",
      },
      {
        prompt: "lent → ___",
        options: ["lentement", "lentamment", "lentemment", "lenttement"],
        answer: 0,
        why: "lent kuralın istisnasıdır: dişil lente + -ment = lentement.",
      },
    ],
  },

  // ---------------------------------------------------------------- B2
  {
    topic: "basics_fr_subjonctif_passe",
    language: "fr",
    title: "Subjonctif passé ve subjonctiften kaçınma",
    level: "B2",
    summary:
      "Subjonctif passé, subjonctif isteyen bir yapıda daha önce olmuş eylemi anlatır. Ana cümle ile yan cümlenin öznesi aynıysa ise subjonctif yerine çoğunlukla mastar kullanılır.",
    rules: [
      "Kuruluş: avoir ya da être'nin subjonctif présent'ı + ortaç: que j'aie fini, que tu aies vu, qu'il ait compris, que nous ayons pris, qu'elle soit partie, qu'ils se soient trompés.",
      "Yan cümledeki eylem ana cümledekinden önce olduysa ya da gelecekteki bir andan önce bitmiş olacaksa subjonctif passé: Je suis content que tu sois venu. Il faut que tu aies fini avant midi.",
      "Ana fiilin zamanı seçimi değiştirmez: Je regrettais qu'il soit parti si tôt.",
      "Özne aynıysa que + subjonctif yerine mastar: Je veux partir. Je suis content d'être venu.",
      "Geçmiş mastar: avoir / être + ortaç: Elle est contente d'avoir réussi. Olumsuzda ne pas önde: Je regrette de ne pas être venu.",
      "Bağlaçların aynı özneli edat karşılıkları: pour que → pour, afin que → afin de, avant que → avant de, sans que → sans, à condition que → à condition de, de peur que → de peur de.",
      "bien que'nin mastarlı karşılığı yoktur: özne aynı olsa da subjonctif kalır (Bien qu'il soit fatigué, il travaille) ya da malgré + isim kullanılır (Malgré sa fatigue, il travaille).",
    ],
    examples: [
      { text: "Je suis ravi que vous soyez venus.", tr: "Gelmenize çok sevindim." },
      { text: "Il est possible qu'elle ait oublié notre rendez-vous.", tr: "Randevumuzu unutmuş olabilir." },
      { text: "Bien qu'il ait beaucoup travaillé, il n'a pas réussi.", tr: "Çok çalışmış olmasına rağmen başaramadı." },
      { text: "Je regrette de ne pas avoir appelé ma mère hier.", tr: "Dün annemi aramadığım için üzgünüm." },
      { text: "Je t'appelle avant de partir.", tr: "Çıkmadan önce seni ararım." },
      { text: "Je t'appelle avant que tu partes.", tr: "Sen çıkmadan önce seni ararım." },
    ],
    watch: [
      "Türkçe « gelmene sevindim » ile « geldiğine sevindim »i ayırmaz; Fransızcada olmuş bir eylem için subjonctif passé: « content que tu sois venu »; « que tu viennes » şimdi ya da sonra gelmen demektir.",
      "Özne aynıyken que kurma: « Je suis content d'être venu », « Je suis content que je sois venu » değil.",
      "avant que subjonctif alır, après que indicatif: « avant qu'il parte », « après qu'il est parti » (günlük dilde subjonctif de duyulur ama özenli yazıda indicatif).",
      "Geçmiş mastarda être alan fiillerde uyumu unutma: « Elle est contente d'être arrivée à l'heure ».",
    ],
    tip: "« que »nun iki yanında farklı kişiler var mı? Yoksa mastara geç; varsa subjonctif. Eylem ana fiilden önce bittiyse passé: que tu sois venu, que j'aie fini.",
    table: {
      "caption": "Subjonctif Passé Kurulumu",
      "head": [
        "Özne",
        "Subjonctif Yardımcı Fiil",
        "Participe Passé",
        "Örnek"
      ],
      "rows": [
        [
          "que j’",
          "aie / sois",
          "terminé / venu(e)",
          "Je suis content que tu aies fini."
        ],
        [
          "qu’il",
          "ait / soit",
          "appris / parti(e)",
          "Il est rare qu’il soit parti si tôt."
        ],
        [
          "que nous",
          "ayons / soyons",
          "compris / arrivé(e)s",
          "Avant que nous soyons arrivés."
        ]
      ]
    },
    check: [
      {
        prompt: "Je suis content que tu ___ venu hier.",
        options: ["es", "sois", "étais", "seras"],
        answer: 1,
        why: "Ana cümleden önce olmuş eylem için subjonctif passé: que tu sois venu.",
      },
      {
        prompt: "« Geldiğim için memnunum » cümlesinin doğru çevirisi hangisi?",
        options: ["Je suis content que je sois venu.", "Je suis content que je suis venu.", "Je suis content de venir.", "Je suis content d'être venu."],
        answer: 3,
        why: "Özne aynıysa que yerine geçmiş mastar gelir: d'être venu.",
      },
      {
        prompt: "Je t'appelle ___ partir.",
        options: ["avant que", "avant", "avant de", "après de"],
        answer: 2,
        why: "Özne aynıysa avant que yerine avant de + mastar kullanılır.",
      },
    ],
  },
  {
    topic: "basics_fr_passif",
    language: "fr",
    title: "Edilgen çatı (être + ortaç, on, se faire)",
    level: "B2",
    summary:
      "Edilgen çatı être + ortaç ile kurulur ama Fransızca onu Türkçe kadar sık kullanmaz: konuşmada çoğunlukla on, genel kurallarda se + fiil, başa gelen olaylarda se faire tercih edilir.",
    rules: [
      "être + ortaç; zamanı être taşır: Le pont est construit / a été construit / était construit / sera construit.",
      "Ortaç özneye uyar: Les lettres ont été envoyées. La décision a été prise.",
      "Eylemi yapan par ile verilir; duygu ve durum bildiren fiillerde çoğunlukla de: Il a été arrêté par la police. Elle est aimée de tous. La maison est entourée d'arbres.",
      "Yalnızca doğrudan nesne alan fiiller edilgen olur; téléphoner à, demander à, dire à gibi fiillerde on kullanılır: On m'a demandé de venir.",
      "Konuşmada edilgenin yerine on + etken: On a volé ma voiture. On parle français ici.",
      "se + fiil genel kural ve alışkanlık bildirir: Ce vin se boit frais. Ça ne se fait pas.",
      "se faire + mastar, kişinin başına gelen ya da yaptırdığı şeyi anlatır: Il s'est fait voler son portefeuille. Je me suis fait couper les cheveux.",
    ],
    examples: [
      { text: "Ce château a été construit au XVIe siècle.", tr: "Bu şato 16. yüzyılda inşa edildi." },
      { text: "Les résultats seront publiés lundi.", tr: "Sonuçlar pazartesi yayımlanacak." },
      { text: "Le voleur a été arrêté par la police.", tr: "Hırsız polis tarafından yakalandı." },
      { text: "On m'a volé mon téléphone dans le métro.", tr: "Metroda telefonum çalındı." },
      { text: "Ce plat se mange froid.", tr: "Bu yemek soğuk yenir." },
      { text: "Elle s'est fait renverser par une voiture.", tr: "Ona bir araba çarptı." },
    ],
    watch: [
      "Türkçe edilgeni çok kullanır (« çalındı », « söylendi »); Fransızca konuşmada on daha doğaldır: « On m'a dit que… », « Il m'a été dit que… » çok resmî kalır.",
      "Dolaylı nesneli fiili edilgen yapma: « On m'a demandé de partir », « J'ai été demandé de partir » değil.",
      "Edilgende ortaç uyumunu unutma: « La réunion a été annulée », « Les maisons ont été vendues ».",
      "se faire + mastar'da fait uyum yapmaz: « Elle s'est fait couper les cheveux », « s'est faite couper » değil.",
    ],
    tip: "Türkçe « -ıldı » cümlesinde yapan önemli değilse ve konuşuyorsan önce on'u dene: « Le musée a été fermé » → « On a fermé le musée ».",
    table: {
      "caption": "Fransızca Edilgen Çatı (Voix Passive)",
      "head": [
        "Zaman",
        "Etken Cümle",
        "Edilgen Cümle",
        "Yardımcı Fiil"
      ],
      "rows": [
        [
          "Présent",
          "Le chat mange la souris.",
          "La souris est mangée par le chat.",
          "est + mangée"
        ],
        [
          "Passé Composé",
          "Le chat a mangé la souris.",
          "La souris a été mangée par le chat.",
          "a été + mangée"
        ],
        [
          "Futur Simple",
          "Le chat mangera la souris.",
          "La souris sera mangée par le chat.",
          "sera + mangée"
        ]
      ]
    },
    check: [
      {
        prompt: "La décision a été ___ hier.",
        options: ["pris", "prise", "prises", "prendre"],
        answer: 1,
        why: "Edilgende ortaç özneye uyar: la décision → prise.",
      },
      {
        prompt: "Hangisi doğru?",
        options: ["On m'a demandé de partir.", "J'ai été demandé de partir.", "Je suis demandé de partir."],
        answer: 0,
        why: "demander à dolaylı nesne aldığı için edilgen olmaz; on kullanılır.",
      },
      {
        prompt: "Elle s'est ___ couper les cheveux.",
        options: ["faite", "faire", "fait", "faits"],
        answer: 2,
        why: "se faire + mastar yapısında fait uyum yapmaz.",
      },
    ],
  },

  // ---------------------------------------------------------------- C1
  {
    topic: "basics_fr_passe_simple",
    language: "fr",
    title: "Passé simple (okurken tanımak)",
    level: "C1",
    summary:
      "Passé simple romanların, masalların ve tarih metinlerinin geçmiş zamanıdır; konuşmada yerini passé composé almıştır. Yazman gerekmez ama okurken tanıman gerekir, en çok da 3. kişi biçimlerini.",
    rules: [
      "-er fiilleri: -ai, -as, -a, -âmes, -âtes, -èrent: il parla, ils parlèrent; il alla, ils allèrent.",
      "-ir fiillerinin ve çoğu -re fiilinin sonu -is, -is, -it, -îmes, -îtes, -irent: il finit, ils finirent; il prit, ils prirent; il fit, ils firent; il mit, il dit, il vit (voir).",
      "u'lu biçimler: -us, -us, -ut, -ûmes, -ûtes, -urent: il fut (être), ils furent; il eut (avoir), ils eurent; il put, il dut, il voulut, il sut, il lut, il connut, il crut, il vécut.",
      "venir ve tenir ailesi: il vint, ils vinrent; il tint, ils tinrent; il devint, il revint.",
      "Ayrıca bilinmesi gerekenler: naître → il naquit, mourir → il mourut, écrire → il écrivit.",
      "Anlatıda passé simple olayları, imparfait arka planı verir; passé composé ile karışmaz: Il faisait nuit lorsque nous arrivâmes.",
      "Okurken kafanda passé composé'ye çevir: il fut = il a été, ils eurent = ils ont eu, elle naquit = elle est née.",
    ],
    examples: [
      { text: "Il ouvrit la porte et entra sans un mot.", tr: "Kapıyı açtı ve tek kelime etmeden içeri girdi." },
      { text: "Ce fut une soirée inoubliable.", tr: "Unutulmaz bir akşamdı." },
      { text: "Ils eurent peur et s'enfuirent.", tr: "Korktular ve kaçtılar." },
      { text: "Victor Hugo naquit en 1802 et mourut en 1885.", tr: "Victor Hugo 1802'de doğdu ve 1885'te öldü." },
      { text: "Quand elle vit la lettre, elle comprit tout.", tr: "Mektubu görünce her şeyi anladı." },
      { text: "Il faisait nuit lorsque nous arrivâmes au village.", tr: "Köye vardığımızda hava karanlıktı." },
    ],
    watch: [
      "Passé simple'ı konuşmada ya da gündelik yazıda kullanma; « Hier, je mangeai au restaurant » kulağa eski ve tuhaf gelir: « j'ai mangé ».",
      "il vit iki fiile ait olabilir: « il vit à Paris » (vivre, présent: Paris'te yaşıyor), « il vit la mer » (voir, passé simple: denizi gördü). Bağlama bak.",
      "il finit, il dit, il rit hem présent hem passé simple olabilir; çevredeki zamanlar imparfait ise büyük olasılıkla passé simple'dır.",
      "« ils parlèrent » (konuştular) ile « ils parlent » (konuşuyorlar) farklıdır: -èrent sonu okunur.",
    ],
    tip: "Tanımadığın bir geçmiş biçim görürsen sonuna bak: -a / -èrent, -it / -irent, -ut / -urent. Gövdeden fiili bul ve kafanda passé composé'ye çevir.",
    table: {
      "caption": "Passé Simple Düzenli Uçlar",
      "head": [
        "Grup",
        "Uçlar (-er / -ir / -re)",
        "Parler (1. Grup)",
        "Finir (2. Grup)"
      ],
      "rows": [
        [
          "Je",
          "-ai / -is / -us",
          "je parlai",
          "je finis"
        ],
        [
          "Tu",
          "-as / -is / -us",
          "tu parlas",
          "tu finis"
        ],
        [
          "Il",
          "-a / -it / -ut",
          "il parla",
          "il finit"
        ],
        [
          "Ils",
          "-èrent / -irent / -urent",
          "ils parlèrent",
          "ils finirent"
        ]
      ]
    },
    check: [
      {
        prompt: "« Ils eurent peur. » cümlesinde eurent hangi fiilin biçimi?",
        options: ["être", "avoir", "aller", "voir"],
        answer: 1,
        why: "eurent, avoir'ın passé simple'ıdır (ils ont eu).",
      },
      {
        prompt: "« Il vit la mer. » ne demek?",
        options: ["Denizde yaşıyor.", "Denizi görüyor.", "Denizi gördü."],
        answer: 2,
        why: "Burada vit, voir'ın passé simple'ıdır: il a vu.",
      },
      {
        prompt: "« Elle naquit en 1900. » cümlesinin passé composé karşılığı hangisi?",
        options: ["Elle est née en 1900.", "Elle a né en 1900.", "Elle naît en 1900.", "Elle était née en 1900."],
        answer: 0,
        why: "naquit, naître'nin passé simple'ıdır; passé composé'de être alır: elle est née.",
      },
    ],
  },
  {
    topic: "basics_fr_concession",
    language: "fr",
    title: "Taviz ve nüans: quoique, encore que, si … que",
    level: "C1",
    summary:
      "Özenli yazıda bir düşünceyi kabul edip sınırlamanın birçok yolu vardır. Bağlacın seçimi kipi de belirler: çoğu subjonctif ister, même si ise indicatif.",
    rules: [
      "bien que / quoique + subjonctif: « -mesine rağmen »; quoique biraz daha yazınsaldır: Quoiqu'il fasse froid, nous sortirons.",
      "encore que + subjonctif, söyleneni sonradan sınırlar (« gerçi … ya »): Il a raison, encore que ce soit discutable.",
      "si / aussi + sıfat + que + subjonctif: « ne kadar … olursa olsun »: Si difficile que ce soit, je le ferai. Aussi intelligent qu'il soit, il se trompe parfois.",
      "quel que + être'nin subjonctif'i, quel özneye uyar: Quelles que soient vos raisons… quoi que (ayrı yazılır) « ne … -rsa »: Quoi que tu dises, je ne changerai pas d'avis.",
      "même si + indicatif: varsayımsal taviz: Même si tu insistes, je refuse.",
      "İsimle: malgré, en dépit de: Malgré la pluie, le match a eu lieu.",
      "avoir beau + mastar: « ne kadar … -sa da »: J'ai beau essayer, je n'y arrive pas.",
      "Zarflar ve kalıplar: pourtant, cependant, néanmoins, toutefois, tout de même; certes … mais; n'en … pas moins: Elle n'en reste pas moins nécessaire.",
    ],
    examples: [
      { text: "Quoiqu'il ait beaucoup d'expérience, il manque de patience.", tr: "Çok deneyimli olmasına rağmen sabırsız." },
      { text: "Si étrange que cela puisse paraître, il avait raison.", tr: "Ne kadar tuhaf görünse de haklıydı." },
      { text: "Quelles que soient les difficultés, nous continuerons.", tr: "Zorluklar ne olursa olsun devam edeceğiz." },
      { text: "J'accepte votre proposition, encore que le délai me paraisse un peu court.", tr: "Teklifinizi kabul ediyorum, gerçi süre bana biraz kısa görünüyor." },
      { text: "Elle a beau s'entraîner, elle ne progresse pas.", tr: "Ne kadar çalışsa da ilerleme kaydetmiyor." },
      { text: "Certes, la solution est coûteuse ; elle n'en reste pas moins nécessaire.", tr: "Çözüm pahalı, doğru; ama yine de gerekli." },
    ],
    watch: [
      "quoique (rağmen) ile quoi que (ne … -rsa) karışır: « Quoi que tu fasses » (ne yaparsan yap), « Quoique tu fasses des efforts » (çaba göstermene rağmen).",
      "même si subjonctif almaz: « même si tu as raison », « même si tu aies raison » değil.",
      "quel que ayrı yazılır ve uyar: « quelle que soit la raison », « quelque soit la raison » değil.",
      "Türkçe « -sa da » hem gerçek hem varsayımsal tavizi anlatır; Fransızcada gerçek taviz bien que / quoique (+ subjonctif), varsayımsal taviz même si (+ indicatif).",
    ],
    tip: "Bir paragrafta aynı bağlacı tekrarlama: bien que, certes … mais, pourtant ve avoir beau gibi farklı yollarla taviz ver; metin daha olgun okunur.",
    table: {
      "caption": "Ödün ve Karşıtlık İfadeleri",
      "head": [
        "Bağlaç",
        "Gerektirdiği Kip / Yapı",
        "Örnek",
        "Türkçe Çeviri"
      ],
      "rows": [
        [
          "bien que / quoique",
          "Subjonctif",
          "Bien qu’il soit jeune, il est sage.",
          "Genç olmasına rağmen olgundur."
        ],
        [
          "malgré",
          "İsim veya zamir",
          "Malgré la tempête, ils ont marché.",
          "Fırtınaya rağmen yürüdüler."
        ],
        [
          "même si",
          "Indicatif (Normal zaman)",
          "Même s’il pleut, je viens.",
          "Yağmur yağsa bile geliyorum."
        ]
      ]
    },
    check: [
      {
        prompt: "Même si tu ___ raison, je refuse.",
        options: ["aies", "as", "auras", "aurais"],
        answer: 1,
        why: "même si subjonctif ya da conditionnel değil indicatif alır.",
      },
      {
        prompt: "___ tu dises, je ne changerai pas d'avis.",
        options: ["Quoique", "Bien que", "Même si", "Quoi que"],
        answer: 3,
        why: "« Ne söylersen söyle » ayrı yazılan quoi que + subjonctif ile kurulur.",
      },
      {
        prompt: "J'ai beau ___, je n'y arrive pas.",
        options: ["essayer", "essayé", "essaie", "essayant"],
        answer: 0,
        why: "avoir beau'dan sonra mastar gelir.",
      },
    ],
  },
]
