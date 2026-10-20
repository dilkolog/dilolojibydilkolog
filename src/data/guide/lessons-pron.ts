import type { TopicLesson } from './lessonTypes'

/**
 * Pronunciation lessons for a Turkish speaker: what Turkish does not have (nasal vowels, the French r, th, vowel
 * length) and where Turkish habits mislead (stress on the last syllable, reading every letter). Original text; the
 * sound comparisons are approximate on purpose ("Türkçe ü gibi").
 */
export const PRON_LESSONS: TopicLesson[] = [
  {
    topic: "basics_fr_pron_nasales",
    language: "fr",
    level: "A1",
    title: "Burun ünlüleri: an, on, in (vin, vent, vont)",
    summary:
      "Fransızcada ünlü + n/m bazen “n” sesi vermez, ünlüyü genizden okutur. Türkçede olmayan bu sesler, Türk öğrenicinin en çok “n” ekleyerek bozduğu yerdir.",
    rules: [
      "Üç ana burun ünlüsü vardır: an/en (blanc, enfant), on (bon, mon), in/ain/ein (vin, pain, plein). Ünlü ağızdan ve buruntan birlikte çıkar, n/m ayrı bir ses olarak duyulmaz.",
      "Ünlüden sonra n/m geliyor ve onun ardından başka bir ünsüz ya da sözcük sonu varsa ünlü genizsel olur: bon, vin, blanc, champ, important.",
      "n/m'nin ardından bir ünlü gelirse (ya da n/m ikizse) ünlü genizsel olmaz, n sesi okunur: bon /bɔ̃/ ama bonne /bɔn/; fin /fɛ̃/ ama fine /fin/.",
      "Genizsel ünlüyü çıkarırken dilin ucunu damağa değdirme: “bon” demek “bon-n” demek değildir; dil sakin kalır, ses burundan da çıkar.",
      "Üç ünlü anlam ayırır: vin /vɛ̃/ (şarap), vent /vɑ̃/ (rüzgâr), vont /vɔ̃/ (giderler). Aynı çiftler: blanc (beyaz) / blond (sarışın).",
    ],
    table: {
      caption: "Burun ünlüleri",
      head: ["Yazım", "Ses (yaklaşık)", "Örnek"],
      rows: [
        ["an, am, en, em", "“a” ile “o” arası, genizden", "enfant, dans, temps"],
        ["on, om", "kapalı “o”, genizden", "bon, mon, nom"],
        ["in, im, ain, ein", "“e” ile “i” arası, genizden", "vin, pain, plein"],
        ["bonne, fine, une", "burun ünlüsü YOK: n açıkça okunur", "bonne, fine, une"],
      ],
    },
    examples: [
      { text: "Mon enfant mange du pain blanc.", tr: "Çocuğum beyaz ekmek yiyor." },
      { text: "Un bon copain, une bonne copine.", tr: "İyi bir arkadaş (erkek), iyi bir arkadaş (kız)." },
      { text: "Le vent est fort, mais le vin est bon.", tr: "Rüzgâr kuvvetli ama şarap güzel." },
      { text: "Nous prenons un bain chaud demain.", tr: "Yarın sıcak bir banyo yapacağız." },
      { text: "Il est blond, elle est blanche.", tr: "O (erkek) sarışın, o (kadın) beyaz tenli." },
    ],
    watch: [
      "“bon”u “bon-n” gibi sonunda n sesiyle okumak çok yaygındır; n yoktur, ünlü genizdendir. Ama “bonne”da n gerçekten okunur.",
      "“an” ile “on”u karıştırmak anlam değiştirir: blanc (beyaz) / blond (sarışın), vent (rüzgâr) / vont (giderler).",
    ],
    tip: "Önce “a”yı söyle, burnunu kapatır gibi hissedince ses burundan da çıkıyorsa doğru yoldasın; sonra dilinin ucunu hiçbir yere değdirmeden bitir.",
    check: [
      {
        prompt: "“bonne” sözcüğünde n nasıl okunur?",
        options: [
          "Ünlü genizsel olur ve n duyulmaz",
          "n açıkça okunur, ünlü genizsel değildir",
          "n sessizdir, o ünlüsü uzar",
        ],
        answer: 1,
        why: "n'nin ardından ünlü (burada sessiz e) geldiğinde ünlü genizsel olmaz; n gerçek bir ünsüz gibi okunur: bon /bɔ̃/ ama bonne /bɔn/.",
      },
      {
        prompt: "“blanc” (beyaz) ile “blond” (sarışın) sözcüklerini ne ayırır?",
        options: [
          "blanc'ta an sesi /ɑ̃/, blond'da on sesi /ɔ̃/",
          "İkisi de aynı okunur",
          "blanc'ta on sesi, blond'da an sesi",
        ],
        answer: 0,
        why: "an/en ile on iki ayrı burun ünlüsüdür; blanc /blɑ̃/, blond /blɔ̃/.",
      },
      {
        prompt: "“vin” (şarap) sözcüğünün sonundaki n için hangisi doğrudur?",
        options: [
          "Ayrı bir n sesi olarak okunur",
          "Okunmaz; ünlü /ɛ̃/ genizden çıkar",
          "Okunmaz ve ünlü sessizleşir",
        ],
        answer: 1,
        why: "in ünlüsü genizden okunur; n harfi yazıda kalır ama ayrı bir ses vermez.",
      },
    ],
  },
  {
    topic: "basics_fr_pron_u_ou_r",
    language: "fr",
    level: "A1",
    title: "u / ou / eu ve Fransızca r",
    summary:
      "Türkçedeki ü, u, ö sesleri Fransızca u, ou, eu'yu doğrudan karşılar; asıl zorluk, dil ucuyla değil boğazdan çıkan r'dir.",
    rules: [
      "Fransızca u, Türkçe ü gibi okunur: tu, rue, sur, lune. ou ise Türkçe u gibidir: vous, rouge, tout. İkisini karıştırmak anlam değiştirir: tu (sen) / tout (hepsi), dessus (üstünde) / dessous (altında).",
      "eu ve œu, Türkçe ö'ye yakındır: deux, peu, bleu. Sondaki r'den önce biraz açık okunur: peur, sœur, fleur.",
      "au ve eau, kapalı o gibidir: chaud, beau, eau. oi, “ua” gibi okunur: moi (mua), voir (vuar). ai kısa e gibidir: j'ai, mais.",
      "Fransızca r boğazın gerisinden çıkar ve dil ucu titremez; Türkçedeki “h” ile “ğ” arası, hafif hırıltılı bir ses gibi düşün: rue, rouge, Paris, merci.",
      "ch Türkçe ş (chat), j ise Türkçe “Jale”deki j'dir (je, jour). gn Türkçe “ny” gibidir (montagne).",
    ],
    table: {
      caption: "Yazım → yaklaşık Türkçe ses",
      head: ["Yazım", "Türkçeye yakın", "Örnek"],
      rows: [
        ["u", "ü", "tu, rue, sur"],
        ["ou", "u", "vous, rouge, tout"],
        ["eu, œu", "ö", "deux, peu, sœur"],
        ["eau, au", "kapalı o", "beau, chaud, eau"],
        ["oi", "ua", "moi, voir, trois"],
        ["ch / j", "ş / j (Jale)", "chat / je, jour"],
      ],
    },
    examples: [
      { text: "Tu as vu la rue rouge ?", tr: "Kırmızı sokağı gördün mü?" },
      { text: "Vous avez deux sœurs ?", tr: "İki kız kardeşiniz var mı?" },
      { text: "Le chat est dessous, pas dessus.", tr: "Kedi altında, üstünde değil." },
      { text: "Moi, je voudrais du beurre.", tr: "Ben tereyağı istiyorum." },
      { text: "Le chapeau est beau et très chaud.", tr: "Şapka güzel ve çok sıcak." },
    ],
    watch: [
      "r'yi Türkçedeki dil ucu r'siyle (titrek) çıkarmak, Fransızca için en bariz yabancı aksandır; boğaz r'si gerekir.",
      "“ou” yerine “ü” ya da “u” yerine “ou” demek: tu / tout, rue / roue ayrı sözcüklerdir. Türkçedeki u ve ü ayrımı burada tam işine yarar.",
      "“eu”yu “e-u” diye iki ünlü okumak yanlıştır; tek bir ö sesidir.",
    ],
    tip: "r için önce “gargara” yapar gibi boğazını hafifçe sürt, sonra aynı sesi kısa tut: “rue” demeden önce “hü” de, sonra sesi kıs.",
    check: [
      {
        prompt: "“tu” (sen) sözcüğündeki u hangi Türkçe sese benzer?",
        options: ["Türkçe ü", "Türkçe u", "Türkçe o"],
        answer: 0,
        why: "Fransızca u, dudaklar büzülerek söylenen ü'dür. Türkçe u'ya benzeyen Fransızca yazım “ou”dur.",
      },
      {
        prompt: "“dessous” (altında) sözcüğündeki ou hangi Türkçe sese yakındır?",
        options: ["ü", "u", "ö", "o"],
        answer: 1,
        why: "ou, Türkçe u gibi okunur: dessous /dsu/. dessus (üstünde) ise ü ile okunur.",
      },
      {
        prompt: "Fransızca r sesi nasıl çıkarılır?",
        options: [
          "Dil ucu titreyerek, Türkçe r gibi",
          "Boğazın gerisinde, dil ucu titremeden, hafif sürtünmeyle",
          "Dudaklar büzülerek",
        ],
        answer: 1,
        why: "Fransızca r (küçük dil r'si, uvüler r) boğazın gerisinden çıkar. Dil ucu bu sesin içinde yer almaz.",
      },
    ],
  },
  {
    topic: "basics_fr_pron_liaison",
    language: "fr",
    level: "A2",
    title: "Okunmayan harfler ve liaison (les amis, ils ont)",
    summary:
      "Fransızcada yazılan her harf okunmaz; ama sessiz bir sonu olan sözcük ünlüyle başlayan sözcüğün önüne geldiğinde bu sessiz harf bazen “uyanır”. Bu bağlama liaison denir.",
    rules: [
      "Sözcük sonundaki ünsüzler çoğunlukla okunmaz: petit /pti/, grand /ɡʁɑ̃/, trop, vous, ils, chaud. -er ile biten fiillerde r okunmaz: parler /paʁle/.",
      "Sonda c, r, f, l (CaReFuL) çoğu zaman okunur: avec, bonjour, neuf, mal. İstisnalar çoktur; sözcüğü sesiyle öğren.",
      "h sessizdir: homme, hôtel, heure. “h aspiré” olan sözcüklerde (les haricots, le héros) h yine okunmaz ama bağlamayı engeller.",
      "Liaison: okunmayan sonu olan sözcük, ünlüyle (ya da sessiz h ile) başlayan sözcükten önce gelirse son ünsüz okunur: les amis /lezami/ (s → z), un ami /œ̃nami/, petit ami /ptitami/, grand homme /ɡʁɑ̃tɔm/ (d → t).",
      "Liaison genelde zorunludur: artikel + isim (les enfants), sıfat + isim (petit ami), zamir + fiil (ils ont, nous avons), kısa edat + sözcük (dans un). Yasak: et'den sonra (et ils), tekil isimden sonra fiil gelirse genelde yapılmaz.",
      "Enchaînement: okunan ünsüz sonraki ünlüyle hece kurar: il a → i-la, elle est → e-lè. Sınır ses akışında kaybolur.",
    ],
    table: {
      caption: "Liaison örnekleri",
      head: ["Yazı", "Okunuş (yaklaşık)", "Not"],
      rows: [
        ["les amis", "le-za-mi", "s → z"],
        ["ils ont", "il-zon", "s → z"],
        ["petit ami", "pe-ti-ta-mi", "t okunur"],
        ["grand homme", "gran-tom", "d → t"],
        ["et ils", "e il", "et'den sonra liaison yok"],
      ],
    },
    examples: [
      { text: "Les amis ont un petit appartement.", tr: "Arkadaşların küçük bir dairesi var." },
      { text: "Ils sont arrivés à huit heures.", tr: "Saat sekizde vardılar." },
      { text: "Vous avez un grand ami en hiver ?", tr: "Kışın büyük bir arkadaşınız var mı?" },
      { text: "Nous avons dix euros et il a un hôtel.", tr: "On avromuz var ve onun bir oteli var." },
    ],
    watch: [
      "Türkçedeki alışkanlıkla her harfi okumak: “petit”in t'si, “grand”in d'si tek başına okunmaz.",
      "Liaison'da s ve x z sesi, d ise t sesi olur: les amis (lezami), grand homme (grantom).",
      "“et ils”, “et elle” gibi sözlerde liaison yapılmaz; “et”den sonra her zaman kısa bir ayrım vardır.",
    ],
    tip: "Önce sözcüğü tek başına sesle öğren (petit = pti). Ünlüyle başlayan sözcüğün önüne gelince “sessiz harf uyanıyor mu?” diye sor: artikel, sıfat ve zamirde cevap hemen her zaman evettir.",
    check: [
      {
        prompt: "Tek başına söylenen “petit” sözcüğünün sonundaki t okunur mu?",
        options: ["Hayır, okunmaz", "Evet, her zaman", "Evet, ama çok hafif"],
        answer: 0,
        why: "Sondaki t okunmaz: petit /pti/. Yalnızca liaison ile (petit ami) okunur.",
      },
      {
        prompt: "“les amis” nasıl okunur?",
        options: ["le-sa-mi", "le-za-mi", "le-a-mi", "lez-za-mi"],
        answer: 1,
        why: "Liaison'da s sesi z'ye dönüşür ve sonraki sözcükle hece kurar: /lezami/.",
      },
      {
        prompt: "Hangisinde liaison YAPILMAZ?",
        options: ["les enfants", "un ami", "et ils", "ils ont"],
        answer: 2,
        why: "et'den sonra liaison yapılmaz. Artikel+isim, zamir+fiil ve sıfat+isim bağlarında yapılır.",
      },
    ],
  },
  {
    topic: "basics_es_pron_vocales_bv",
    language: "es",
    level: "A1",
    title: "Ünlüler, h, b/v ve qu/gu",
    summary:
      "İspanyolca yazıldığı gibi okunur: Türkçenin bu yönden en yakın akrabasıdır. Birkaç harfin kuralını bilince okuma sorunu kalmaz.",
    rules: [
      "Beş ünlü vardır (a, e, i, o, u) ve her biri her yerde aynı net sesi taşır; vurgusuz hecede bile zayıflamaz. ca-sa, to-ma-te.",
      "h her zaman sessizdir: hola /ola/, hotel, hijo. ch ise Türkçe ç'dir: chico, noche.",
      "b ile v aynı sesi verir: iki dudakla söylenen b. “vaca”daki v alt dudak-üst diş v'si DEĞİLDİR. İki ünlü arasında sesi biraz yumuşar ama yine iki dudakla çıkar.",
      "qu + e/i → k (u okunmaz): queso, quiero. gu + e/i → g (u okunmaz): guerra, guitarra. u'nun okunması gerekiyorsa üstüne iki nokta konur (ü): pingüino.",
      "ñ, Türkçe “ny” gibidir: año, niño, español.",
    ],
    table: {
      caption: "Okunması dikkat isteyen harfler",
      head: ["Yazım", "Ses", "Örnek"],
      rows: [
        ["h", "okunmaz", "hola, hombre"],
        ["b, v", "ikisi de b", "vaca, bien, vino"],
        ["ch", "ç", "chico, noche"],
        ["qu(e, i)", "k", "queso, quién"],
        ["gu(e, i)", "g (u okunmaz)", "guerra, guitarra"],
        ["gü(e, i)", "gv", "pingüino"],
        ["ñ", "ny", "año, niño"],
      ],
    },
    examples: [
      { text: "Hola, ¿vives en un hotel?", tr: "Merhaba, bir otelde mi yaşıyorsun?" },
      { text: "La vaca bebe agua.", tr: "İnek su içiyor." },
      { text: "Quiero queso y una guitarra.", tr: "Peynir ve bir gitar istiyorum." },
      { text: "El chico español tiene un año.", tr: "İspanyol çocuk bir yaşında." },
    ],
    watch: [
      "h'yi Türkçe h gibi okumak (hola → “hola”) sık yapılan bir hatadır; h hiç duyulmaz.",
      "v'yi Türkçe v gibi diş-dudakla okumak anlaşılır ama yabancı duyulur; b ve v'yi aynı çıkar.",
      "“queso”yu “kweso”, “guerra”yı “gverra” diye okumak yanlıştır; u burada okunmaz.",
    ],
    tip: "İspanyolcada neredeyse hiçbir istisna yoktur: harfin kuralını bir kere öğrenince her sözcükte aynı çalışır. Tereddüt ettiğinde yazıldığı gibi oku.",
    check: [
      {
        prompt: "“hola” sözcüğünde h nasıl okunur?",
        options: ["Türkçe h gibi", "Okunmaz", "k gibi"],
        answer: 1,
        why: "h İspanyolcada her zaman sessizdir: hola /ola/.",
      },
      {
        prompt: "“vaso” sözcüğündeki v hangi sese yakındır?",
        options: [
          "Türkçe b (iki dudakla)",
          "Türkçe v (alt dudak üst dişte)",
          "Türkçe f",
          "Okunmaz",
        ],
        answer: 0,
        why: "İspanyolcada b ve v aynı sesi verir: iki dudakla söylenen b /b/ (kelime içinde biraz yumuşar).",
      },
      {
        prompt: "“queso” (peynir) nasıl okunur?",
        options: ["keso", "kweso", "çeso", "kuyeso"],
        answer: 0,
        why: "qu, e ve i'den önce yalnızca k sesi verir; u okunmaz: /keso/.",
      },
    ],
  },
  {
    topic: "basics_es_pron_j_c_ll_rr",
    language: "es",
    level: "A1",
    title: "j, g, c, z, ll ve r/rr",
    summary:
      "Türkçede olmayan ya da yanıltan birkaç ses: gırtlaktan j, z ve c'nin bölgeye göre değişen okunuşu, ll/y ve anlam ayıran r / rr.",
    rules: [
      "j ve ge/gi, Türkçe “h”nin daha sert ve gırtlaktan çıkan hâlidir: jamón, gente, gigante. ga/go/gu ise Türkçe g'dir: gato, gusto.",
      "ca/co/cu → k: casa, como, cuando. ce/ci ve z → Latin Amerika ve Güney İspanya'da s (cena = “sena”, zapato = “sapato”), Kuzey/Orta İspanya'da dil ucu dişler arasında th sesidir. İkisi de doğrudur; birini seç ve tutarlı ol.",
      "ll ve y çoğu bölgede Türkçe y gibi okunur: calle /kaye/, llamar, yo. (Arjantin ve Uruguay'da ş ya da j'ye kayar.)",
      "r kelime başında, n/l/s'den sonra ve rr yazıldığında titrek okunur (dil ucu birkaç kez vurur): rojo, perro, carro. İki ünlü arasında tek r, dil ucuyla tek vuruştur: pero, caro, mira.",
      "Tek r ile rr anlam ayırır: pero (ama) / perro (köpek), caro (pahalı) / carro (araba).",
    ],
    table: {
      caption: "Yaklaşık Türkçe karşılıkları",
      head: ["Yazım", "Ses", "Örnek"],
      rows: [
        ["j, ge, gi", "gırtlaktan h", "jamón, gente"],
        ["ca, co, cu", "k", "casa, como"],
        ["ce, ci, z", "s (ya da th)", "cena, zapato"],
        ["ll, y", "y", "calle, yo"],
        ["r başta / rr", "titrek r", "rojo, perro"],
        ["r (ünlüler arası)", "tek vuruş", "pero, caro"],
      ],
    },
    examples: [
      { text: "El perro rojo corre por la calle.", tr: "Kırmızı köpek sokakta koşuyor." },
      { text: "Mi gente come jamón en junio.", tr: "Halkım haziranda jambon yer." },
      { text: "El carro es caro.", tr: "Araba pahalı." },
      { text: "Yo llamo a mi hermana.", tr: "Ben kız kardeşimi arıyorum." },
    ],
    watch: [
      "j'yi Türkçedeki Jale'nin j'si gibi okumak yanlıştır; İspanyolca j gırtlaktan h/kh sesidir.",
      "“ll”yi iki ayrı l olarak okumak (ka-lle yerine kal-le): tek bir y sesi çıkar.",
      "“rr” yerine tek r söylemek anlam değiştirir: pero / perro, caro / carro.",
    ],
    tip: "rr için “tr-rr-tr” gibi dilin ucunu üst damakta hafifçe titret; olmuyorsa önce tek vuruşlu r'yi (ara, pero) alıştır.",
    check: [
      {
        prompt: "“jamón” sözcüğündeki j hangi sese yakındır?",
        options: ["Türkçe j (Jale)", "Gırtlaktan h (kh)", "Türkçe c (cam)", "Türkçe y"],
        answer: 1,
        why: "İspanyolca j, gırtlaktan çıkan sert bir h sesidir; Türkçe j ile alakası yoktur.",
      },
      {
        prompt: "“perro” (köpek) ile “pero” (ama) sözcüklerini ne ayırır?",
        options: [
          "Vurgu yeri",
          "rr titrek, tek r tek vuruşlu",
          "Hiçbir şey, aynı okunurlar",
        ],
        answer: 1,
        why: "rr çok vuruşlu titrek r'dir; tek r tek vuruşlu. Bu fark anlamı değiştirir.",
      },
      {
        prompt: "“calle” sözcüğündeki ll çoğu bölgede nasıl okunur?",
        options: ["Ayrı iki l", "Türkçe y gibi", "lh gibi", "ç gibi"],
        answer: 1,
        why: "ll çoğu bölgede y gibidir: calle /kaye/.",
      },
    ],
  },
  {
    topic: "basics_es_pron_acento",
    language: "es",
    level: "A2",
    title: "Hece vurgusu ve tilde (´)",
    summary:
      "İspanyolcada vurgu yeri iki basit kurala göre belirlenir; kurala uymayan sözcüklerde tilde (´) vurguyu gösterir. Türkçe vurgu alışkanlığı (son hece) burada yanıltır.",
    rules: [
      "Ünlüyle ya da n/s ile biten sözcüklerde vurgu sondan bir önceki hecededir: CA-sa, HA-blan, LU-nes.",
      "n ve s dışındaki ünsüzle biten sözcüklerde vurgu son hecededir: ha-BLAR, ciu-DAD, fe-LIZ.",
      "Bu kurala uymayan sözcüklerde vurgulu ünlünün üstüne tilde konur: ca-FÉ, in-GLÉS, ÁR-bol, te-LÉ-fo-no. Tilde varsa kural değil tilde geçerlidir.",
      "Vurgu kuralını bilince tilde'yi okurken “ne zaman gerekli?” diye düşünürsün: yazıdaki tilde sana vurgunun nerede olduğunu açıkça söyler.",
      "Bazı sözcüklerde tilde anlam ayırır (vurgu aynıdır): él (o) / el (artikel), sí (evet) / si (eğer), tú (sen) / tu (senin), qué (ne) / que (ki).",
    ],
    table: {
      caption: "Vurgu kuralı",
      head: ["Sözcük sonu", "Vurgu", "Örnek"],
      rows: [
        ["ünlü, n, s", "sondan bir önceki hece", "CA-sa, HA-blan, LU-nes"],
        ["n ve s dışı ünsüz", "son hece", "ha-BLAR, ciu-DAD"],
        ["kurala uymayan", "tilde gösterir", "ca-FÉ, ÁR-bol, te-LÉ-fo-no"],
      ],
    },
    examples: [
      { text: "El sábado vamos al café con él.", tr: "Cumartesi onunla kafeye gidiyoruz." },
      { text: "¿Qué teléfono tienes?", tr: "Hangi telefonun var?" },
      { text: "Mi tío habla inglés y francés.", tr: "Amcam İngilizce ve Fransızca konuşuyor." },
      { text: "Sí, el árbol es muy grande.", tr: "Evet, ağaç çok büyük." },
    ],
    watch: [
      "Türkçede vurgu çoğunlukla son hecededir; bu yüzden “casa”yı ca-SA, “hablan”ı ha-BLAN demek çok yaygındır. Doğrusu CA-sa, HA-blan.",
      "Tilde'yi ihmal ederek yazmak vurguyu ve bazen anlamı kaybettirir: él / el, sí / si.",
    ],
    tip: "Yeni bir sözcüğü ilk duyduğunda vurgulu heceyi ayrıca öğren. Yazıda tilde yoksa iki kuraldan biri zaten sana yeri söyler.",
    check: [
      {
        prompt: "“casa” sözcüğünde vurgu hangi hecededir?",
        options: ["İlk hece (CA-sa)", "Son hece (ca-SA)", "İki hece eşit"],
        answer: 0,
        why: "Ünlüyle biten sözcüklerde vurgu sondan bir önceki hecededir: CA-sa.",
      },
      {
        prompt: "“hablar” sözcüğünde vurgu hangi hecededir?",
        options: ["İlk hece (HA-blar)", "Son hece (ha-BLAR)", "Her hece eşit"],
        answer: 1,
        why: "n/s dışı bir ünsüzle (r) biten sözcüklerde vurgu son hecededir: ha-BLAR.",
      },
      {
        prompt: "“teléfono” sözcüğünde tilde neden vardır?",
        options: [
          "Vurgu sondan üçüncü hecede olduğu için, kural dışı",
          "Çünkü sözcük yabancıdır",
          "Çünkü sözcük sonu ünlüdür",
        ],
        answer: 0,
        why: "Ünlüyle biten sözcükte kural sondan bir önceki heceyi verir; vurgu daha önce olduğu için tilde konur: te-LÉ-fo-no.",
      },
    ],
  },
  {
    topic: "basics_en_pron_th_w_v",
    language: "en",
    level: "A1",
    title: "th, w ve v: Türkçede olmayan sesler",
    summary:
      "th'nin iki sesi, w ile v ayrımı ve okunmayan harfler: İngilizcenin Türk öğreniciye en çok “yabancı aksan” bırakan yerleri.",
    rules: [
      "th iki ses verir: sesli /ð/ (the, this, mother, they) ve sessiz /θ/ (think, three, thank, mouth). İkisi de dil ucu üst ve alt dişlerin arasındayken hava sürtünerek çıkar. s, z, t, d ile değiştirme.",
      "w, dudaklar yuvarlak ve dişler dudağa değmeden çıkan bir sestir: we, water, window (“u” ile “o” arası). v ise üst dişlerin alt dudağa değmesiyle çıkar: very, visit, love.",
      "h nefesten çıkar, Türkçe h gibidir: hat, house. Bazı sözcüklerde hiç okunmaz: hour, honest.",
      "ng tek bir burun sesidir: sing, long, thing. g ayrıca okunmaz. (Türkçedeki “tango”daki ng ise iki ses.)",
      "Bazı baş harfler okunmaz: kn- (know, knife), wr- (write, wrong), gn- (gnome).",
    ],
    table: {
      caption: "Dil ve dudak yerleri",
      head: ["Yazım", "Ses", "Örnek"],
      rows: [
        ["th (sessiz)", "dil iki dişin arasında, titreşim yok", "think, three, mouth"],
        ["th (sesli)", "dil iki dişin arasında, titreşimli", "the, this, mother"],
        ["w", "dudaklar yuvarlak, dişe değmez", "we, water, window"],
        ["v", "üst diş alt dudağa değer", "very, visit, love"],
        ["kn-, wr-", "ilk harf okunmaz", "know, write, wrong"],
        ["ng", "tek burun sesi", "sing, long"],
      ],
    },
    examples: [
      { text: "I think this is the third thing.", tr: "Bence bu üçüncü şey." },
      { text: "We want very warm water.", tr: "Çok sıcak su istiyoruz." },
      { text: "My mother thanks them.", tr: "Annem onlara teşekkür ediyor." },
      { text: "I know the weather is wet.", tr: "Havanın ıslak olduğunu biliyorum." },
      { text: "He is singing a long song.", tr: "O uzun bir şarkı söylüyor." },
    ],
    watch: [
      "th'yi s/z (think → sink) ya da t/d (this → dis) diye söylemek anlamı da bozar: think / sink / tink.",
      "w yerine v söylemek (“wery” ya da “vindow”) çok yaygındır: iki sesin dudak yerleri farklıdır.",
      "“sing”i “sin-g” diye iki sesle okumak; “know”da k'yi okumak.",
    ],
    tip: "th için dilini hafifçe dişlerinin arasından dışarı çıkar ve “fısılda”: sessizse think, titreşiyorsa this. Boğazına elini koy: this'te titreşim hissedersin.",
    check: [
      {
        prompt: "“think” sözcüğündeki th nasıl çıkarılır?",
        options: [
          "Dil ucu üst dişlerin arkasına vurup t gibi",
          "Dil ucu iki dişin arasında, hava sürtünerek",
          "Alt dudak üst dişe değerek f gibi",
        ],
        answer: 1,
        why: "th dil ucu iki dişin arasındayken sürtünme ile çıkar; t ya da f gibi söylemek yanlıştır.",
      },
      {
        prompt: "“west” ve “vest” sözcüklerini hangi ses fark ayırır?",
        options: [
          "w'da dudaklar yuvarlak ve dişe değmez, v'de alt dudak üst dişe değer",
          "Aynı okunurlar",
          "w'da dil dişlerin arasına girer",
        ],
        answer: 0,
        why: "w ve v iki farklı ses: w dudaklarla, v diş-dudakla çıkar.",
      },
      {
        prompt: "“know” sözcüğünde baştaki k okunur mu?",
        options: ["Evet", "Hayır, okunmaz", "Yalnızca vurguluysa"],
        answer: 1,
        why: "kn- ile başlayan sözcüklerde k okunmaz: know /nəʊ/.",
      },
    ],
  },
  {
    topic: "basics_en_pron_vowels",
    language: "en",
    level: "A1",
    title: "Kısa ve uzun ünlüler (ship / sheep) ve schwa",
    summary:
      "Türkçede ünlü uzunluğu anlam ayırmaz, İngilizcede ayırır. Ayrıca vurgusuz hecelerdeki “schwa” sesi, yazılan ünlüyü okuduğumuzdan çok farklı yapar.",
    rules: [
      "Kısa /ɪ/ ve uzun /iː/ iki farklı sestir: ship (gemi) / sheep (koyun), bit / beat, sit / seat. Uzun ünlüde ağız gergin, ses uzar; kısa olanda gevşektir.",
      "/ʊ/ ve /uː/: full (dolu) / fool (aptal), pull (çekmek) / pool (havuz). Uzun olan daha öne ve daha dudak büzülmüştür.",
      "/æ/ (cat, bad) Türkçe e ile a arasındadır; ağız geniş açılır. /e/ (bed, red) ise Türkçe e'ye yakındır. bad / bed ayrı sözcüklerdir.",
      "/ʌ/ (cup, bus) kısa bir a gibidir; /ɑː/ (car, father) uzun a'dır: cup / cop, but / bat.",
      "Schwa /ə/: vurgusuz hecelerdeki kısa, belirsiz ünlü. İngilizcenin en sık sesidir: about, banana, teacher, today, the. Yazılan harf ne olursa olsun aynı sese dönüşür.",
    ],
    table: {
      caption: "Kısa ve uzun ünlüler",
      head: ["Kısa", "Uzun", "Fark"],
      rows: [
        ["ship /ɪ/", "sheep /iː/", "gemi / koyun"],
        ["sit /ɪ/", "seat /iː/", "oturmak / koltuk"],
        ["full /ʊ/", "fool /uː/", "dolu / aptal"],
        ["pull /ʊ/", "pool /uː/", "çekmek / havuz"],
        ["bad /æ/", "bed /e/", "kötü / yatak"],
      ],
    },
    examples: [
      { text: "The ship is next to the sheep.", tr: "Gemi, koyunların yanında." },
      { text: "Please sit on the seat.", tr: "Lütfen koltuğa otur." },
      { text: "The bad bed is in the back.", tr: "Kötü yatak arkada." },
      { text: "This pool is full of fools.", tr: "Bu havuz aptallarla dolu." },
    ],
    watch: [
      "Türkçede ünlü uzunluğuna dikkat edilmez; ship ve sheep'i aynı (“şip”) söylemek en sık hatadır.",
      "bad'i bed gibi söylemek anlamı değiştirir. Ağzı biraz daha açmak gerekir.",
      "Vurgusuz heceleri de tam ünlüyle okumak (ba-NA-na yerine ba-na-na) doğal olmayan bir ritim verir; vurgusuz hece zayıflar.",
    ],
    tip: "Uzun ünlüleri gerçekten uzat (iki heceymiş gibi) ve kısaları hızlı geç: ship – sheeeeep. Sonra vurgusuz hecede ünlüyü “e” gibi kısa, belirsiz bırak.",
    check: [
      {
        prompt: "“sheep” sözcüğündeki ee için ne söylenir?",
        options: ["Kısa, gevşek bir i", "Uzun, gergin bir i", "e ile a arası bir ses"],
        answer: 1,
        why: "ee uzun /iː/ sesidir. Kısa /ɪ/ ise ship'te duyulur.",
      },
      {
        prompt: "Hangi sözcük çifti esas olarak ünlü uzunluğuyla ayrılır?",
        options: ["cat – dog", "ship – sheep", "red – blue", "book – pen"],
        answer: 1,
        why: "ship /ɪ/ ve sheep /iː/ yalnızca ünlünün uzunluğu ve gerginliğiyle ayrılır.",
      },
      {
        prompt: "“banana” sözcüğünün vurgusuz heceleri nasıl okunur?",
        options: [
          "Hepsi tam ve net a",
          "Kısa, belirsiz schwa /ə/",
          "Hiç okunmaz",
        ],
        answer: 1,
        why: "banana /bəˈnɑːnə/: vurgusuz heceler schwa'ya zayıflar, yalnızca vurgulu hece net okunur.",
      },
    ],
  },
  {
    topic: "basics_en_pron_ed_s_stress",
    language: "en",
    level: "A2",
    title: "-ed ve -s sonları, kelime vurgusu",
    summary:
      "-ed ve -s ekleri yazıldığı gibi tek bir ses vermez; çok heceli sözcüklerde vurgu da Türkçedeki alışkanlıktan (son hece) farklıdır.",
    rules: [
      "-ed üç farklı okunur: sessiz ünsüzden sonra /t/ (worked, helped, watched), sesli ünsüz ve ünlüden sonra /d/ (played, lived, called), t ve d'den sonra ek hece /ɪd/ (wanted, needed).",
      "-s ve -es de üçtür: sessiz ünsüzden sonra /s/ (cats, books), sesli ünsüz ve ünlüden sonra /z/ (dogs, plays), s, z, sh, ch, j seslerinden sonra ek hece /ɪz/ (buses, watches, boxes).",
      "Çok heceli her sözcükte bir hece vurgulu olur ve bu hece daha uzun, güçlü ve yüksek söylenir; diğer heceler zayıflar. PHOtograph, phoTOgrapher, photoGRAPHic: sözcüğe ek gelince vurgu yer değiştirebilir.",
      "-tion, -sion ve -ic ile biten sözcüklerde vurgu bu eklerden hemen önceki hecededir: inforMAtion, eduCAtion, ecoNOMic.",
      "İki heceli bazı sözcüklerde isimde vurgu ilk, fiilde ikinci hecededir: REcord (isim) / reCORD (fiil), PREsent / preSENT.",
    ],
    table: {
      caption: "-ed ve -s sesleri",
      head: ["Ek", "Ne zaman", "Örnek"],
      rows: [
        ["-ed /t/", "sessiz ünsüzden sonra", "worked, helped"],
        ["-ed /d/", "sesli ünsüz ve ünlüden sonra", "played, lived"],
        ["-ed /ɪd/", "t, d sonrası: ek hece", "wanted, needed"],
        ["-s /s/", "sessiz ünsüzden sonra", "cats, books"],
        ["-s /z/", "sesli ünsüz ve ünlüden sonra", "dogs, plays"],
        ["-es /ɪz/", "s, z, sh, ch, x sonrası: ek hece", "buses, watches"],
      ],
    },
    examples: [
      { text: "She worked and played until he wanted dinner.", tr: "O, onun akşam yemeği istediği zamana kadar çalıştı ve oynadı." },
      { text: "The dogs and the cats watched the buses.", tr: "Köpekler ve kediler otobüsleri izledi." },
      { text: "Please record the record before it ends.", tr: "Lütfen plak bitmeden önce kaydedin." },
      { text: "We need more information about the education.", tr: "Eğitimle ilgili daha fazla bilgiye ihtiyacımız var." },
    ],
    watch: [
      "-ed'i her zaman ayrı bir hece okumak (work-ed) yanlıştır: yalnızca t ve d'den sonra ek hece olur (wanted, needed). worked tek hecedir.",
      "Her -s'yi s sesiyle okumak (dogs → “dogs”): sesli ünsüzden sonra z sesidir.",
      "Vurguyu Türkçe alışkanlıkla son heceye koymak (informaTION): -tion'dan önceki hecede olmalıdır (inforMAtion).",
    ],
    tip: "Yeni bir çok heceli sözcük öğrenirken vurgulu heceyi ayrıca ezberle; sözlük sesindeki vurgu işaretine (ˈ) bak ve o heceyi büyük harflerle not et.",
    check: [
      {
        prompt: "“worked” sözcüğündeki -ed nasıl okunur?",
        options: ["/t/ (ek hece yok)", "/d/", "/ɪd/ (ek hece)"],
        answer: 0,
        why: "k sessiz bir ünsüzdür; ondan sonra -ed /t/ olur: worked /wɜːkt/, tek hece.",
      },
      {
        prompt: "“wanted” ve “worked” sözcüklerinden hangisinde -ed ayrı bir hece olur?",
        options: ["worked", "wanted", "ikisinde de", "hiçbirinde"],
        answer: 1,
        why: "t'den sonra -ed ek hece /ɪd/ olur: wanted iki hecedir; worked tek.",
      },
      {
        prompt: "“information” sözcüğünde vurgu hangi hecededir?",
        options: ["1. hece (IN-)", "2. hece (-FOR-)", "3. hece (-MA-)", "4. hece (-TION)"],
        answer: 2,
        why: "-tion'dan hemen önceki hece vurgu alır: inforMAtion.",
      },
    ],
  },
]
