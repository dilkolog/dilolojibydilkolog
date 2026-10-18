# Eksik A1 Rehber Dersleri Taslağı

Bu dosya, Kelime Koçu Rehber (Grammar Guide) müfredatındaki eksik A1 derslerinin tam içerik taslaklarını içerir.
Her ders, `src/data/guide/lessonTypes.ts` içindeki `TopicLesson` arayüzüne birebir uyumlu olarak; `topic`, `title`, `level`, `summary`, `rules`, `table`, `examples`, `watch`, `tip` ve 3 soruluk `check` alanlarıyla hazırlanmıştır.

---

## 1. Sayılar, Saat ve Takvim (Üç Dil)

### 1.1. Fransızca: Sayılar, Saat ve Takvim (`basics_fr_numbers_time_calendar`)

```ts
{
  topic: "basics_fr_numbers_time_calendar",
  language: "fr",
  title: "Sayılar, Saat ve Takvim",
  level: "A1",
  summary: "Günlük hayatta alışveriş yaparken, randevu alırken ve zamanı belirtirken sayıları, saatleri ve takvim ifadelerini doğru kullanmak temeldir.",
  rules: [
    "Sayılar: 1–20 arası tekil sözcüklerdir (un, deux, trois...). 21, 31, 41 gibi sayılarda 'et-un' gelir (vingt et un). 70 (soixante-dix), 80 (quatre-vingts), 90 (quatre-vingt-dix) Fransızca'ya özgü yirmilik tabana dayanır.",
    "Saat sorma: 'Quelle heure est-il ?' kalıbıyla sorulur. Cevap daima 'Il est + saat + heure(s)' kalıbıyla başlar.",
    "Buçuk 'et demie', çeyrek geçe 'et quart', çeyrek kala 'moins le quart' ile söylenir. Öğlen 'midi', gece yarısı 'minuit' olarak adlandırılır.",
    "Günler: lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche. Günlerden önce 'le' artikeli gelirse 'her ... günü' (düzenli) anlamına gelir: le lundi (her pazartesi).",
    "Aylar ve mevsimler 'en' edatı alır: en mai (mayısta), en été (yazın). Yalnızca ilkbahar 'au printemps' olur.",
    "Tarih söylerken gün numarası önüne 'le' gelir ve ayın ilk günü için 'premier' kullanılır: le 1er mai (le premier mai), le 15 octobre."
  ],
  table: {
    caption: "Fransızca Zaman ve Saat İfadeleri",
    head: ["Kavram", "Fransızca", "Örnek Cümle", "Türkçesi"],
    rows: [
      ["Tam saat", "Il est huit heures.", "Il est huit heures pile.", "Saat tam sekiz."],
      ["Çeyrek geçe", "et quart", "Il est huit heures et quart.", "Saat sekizi çeyrek geçiyor."],
      ["Buçuk", "et demie", "Il est huit heures et demie.", "Saat sekiz buçuk."],
      ["Çeyrek kala", "moins le quart", "Il est neuf heures moins le quart.", "Saat dokuza çeyrek var."],
      ["Öğlen / Gece", "midi / minuit", "À midi, on déjeune ensemble.", "Öğleyin birlikte öğle yemeği yeriz."],
      ["Tarih", "le + sayı + ay", "Mon anniversaire est le 12 juillet.", "Doğum günüm 12 Temmuz'da."]
    ]
  },
  examples: [
    { text: "Quelle heure est-il, s'il vous plaît ?", tr: "Saat kaç, lütfen?" },
    { text: "Il est sept heures et demie du matin.", tr: "Sabah saat yedi buçuk." },
    { text: "Le train part à dix heures moins le quart.", tr: "Tren ona çeyrek kala kalkıyor." },
    { text: "Nous avons rendez-vous le mardi 14 novembre.", tr: "14 Kasım Salı günü randevumuz var." },
    { text: "En France, les vacances scolaires commencent en juillet.", tr: "Fransa'da okul tatilleri temmuzda başlar." },
    { text: "Il a soixante-quinze ans et habite à Lyon.", tr: "Yetmiş beş yaşında ve Lyon'da yaşıyor." }
  ],
  watch: [
    "Saati söylerken 'C'est huit heures' değil, daima 'Il est huit heures' denir.",
    "Demie kelimesi saatten sonra 'e' alır: 'huit heures et demie' (saat dişil olduğu için uyumlanır).",
    "Ayın 1'i hariç tüm günlerde normal sayılar kullanılır: 'le deux mai' denir, 'le deuxième mai' denmez."
  ],
  tip: "Haftanın günlerinden önce Türkçe gibi 'pazartesi günü' yerine sadece günün adını ya da 'le' artikeliyle söyleyin: 'Je viens lundi' (Bu pazartesi geliyorum), 'Je viens le lundi' (Pazartesileri gelirim).",
  check: [
    {
      prompt: "Saat sekiz buçuk demek için hangi ifade doğrudur?",
      options: ["Il est huit heures et demie.", "C'est huit heures et demi.", "Il a huit heures demi.", "Il fait huit heures et quart."],
      answer: 0,
      why: "Saatler 'Il est ...' ile başlar ve buçuk için 'et demie' kullanılır."
    },
    {
      prompt: "Ayın ilk gününü belirtirken hangi kullanım doğrudur?",
      options: ["le premier avril", "le un avril", "l'un avril", "le premier d'avril"],
      answer: 0,
      why: "Fransızca'da ayın 1. günü daima sıra sayısı olan 'le premier' ile söylenir."
    },
    {
      prompt: "75 sayısının Fransızca karşılığı hangisidir?",
      options: ["soixante-quinze", "septante-cinq", "soixante-dix-cinq", "quatre-vingt-quinze"],
      answer: 0,
      why: "Standart Fransızca'da 75, 60 + 15 mantığıyla 'soixante-quinze' olarak söylenir."
    }
  ]
}
```

---

### 1.2. İspanyolca: Sayılar, Saat ve Takvim (`basics_es_numbers_time_calendar`)

```ts
{
  topic: "basics_es_numbers_time_calendar",
  language: "es",
  title: "Sayılar, Saat ve Takvim",
  level: "A1",
  summary: "İspanyolca günlük iletişimde saatleri, sayıları ve gün/ay/mevsim takvim sistemini hatasız kullanma kuralları.",
  rules: [
    "Saat sorma: '¿Qué hora es?' kalıbıyla sorulur. Saat 'bir' için tekil 'Es la una', diğer tüm saatler için çoğul 'Son las + sayı' kalıbı kullanılır.",
    "Dakikalar: geçe için 'y', kala için 'menos' kullanılır. Çeyrek 'cuarto', buçuk 'media'dır: Son las tres y media (üç buçuk), Son las cinco menos cuarto (beşe çeyrek var).",
    "Günün bölümleri: Saat ile birlikte sabah 'de la mañana', öğleden sonra 'de la tarde', gece 'de la noche' kullanılır.",
    "Günler erildir ve daima 'el / los' ile kullanılır: el lunes (pazartesi / pazartesi günü), los domingos (pazarları). Günlerden önce 'en' edatı KULLANILMAZ.",
    "Aylar ve yıllar 'en' edatı alır: en enero (ocakta), en 2026 (2026'da). Mevsimler de 'en' alır: en verano (yazın), en primavera (ilkbaharda).",
    "Tarih söyleme: 'el + gün + de + ay' kalıbıyla kurulur: el 15 de marzo."
  ],
  table: {
    caption: "İspanyolca Saat ve Zaman Kalıpları",
    head: ["Zaman Biçimi", "İspanyolca Kalıp", "Örnek", "Anlamı"],
    rows: [
      ["Saat 1 (Tekil)", "Es la una (+ dakika)", "Es la una y diez.", "Saat biri on geçiyor."],
      ["Diğer Saatler (Çoğul)", "Son las + saat", "Son las cuatro en punto.", "Saat tam dört."],
      ["Buçuk", "y media", "Son las seis y media.", "Saat altı buçuk."],
      ["Kala", "menos + dakika", "Son las diez menos cuarto.", "Saat ona çeyrek var."],
      ["Düzenli gün", "los + gün (çoğul)", "Los sábados voy al cine.", "Cumartesileri sinemaya giderim."],
      ["Tarih", "el + sayı + de + ay", "Hoy es el 5 de mayo.", "Bugün 5 Mayıs."]
    ]
  },
  examples: [
    { text: "¿Qué hora es? — Son las dos y cuarto de la tarde.", tr: "Saat kaç? — Öğleden sonra ikiyi çeyrek geçiyor." },
    { text: "La clase de español empieza a las nueve en punto.", tr: "İspanyolca dersi tam dokuzda başlıyor." },
    { text: "El examen final es el 24 de junio.", tr: "Final sınavı 24 Haziran'da." },
    { text: "No trabajo los lunes por la mañana.", tr: "Pazartesi sabahları çalışmıyorum." },
    { text: "Viajamos a España en agosto, en pleno verano.", tr: "Ağustosta, yazın ortasında İspanya'ya seyahat ediyoruz." }
  ],
  watch: [
    "Günlerden önce ASLA 'en' kullanmayın: 'en lunes' YANLIŞ, 'el lunes' DOĞRUDUR.",
    "Saat 1 tekildir: 'Son las una' değil, 'Es la una' denir.",
    "Sayılar 16-29 arası tek kelime olarak bitişik yazılır: dieciséis, veinticinco. 31'den itibaren 'treinta y uno' şeklinde ayrı yazılır."
  ],
  tip: "Belli bir saatte bir şey yapacağınızı söylerken saatin başına 'a' edatı gelir: 'a la una' (saat birde), 'a las ocho' (saat sekizde).",
  check: [
    {
      prompt: "'Saat biri çeyrek geçiyor' cümlesinin doğru İspanyolcası hangisidir?",
      options: ["Es la una y cuarto.", "Son las una y cuarto.", "Es la una con cuarto.", "Son las una menos cuarto."],
      answer: 0,
      why: "Saat bir tekil olduğu için 'Es la una' kullanılır ve çeyrek geçe için 'y cuarto' denir."
    },
    {
      prompt: "'Salı günleri spor yaparım' demek için günün başına ne gelmelidir?",
      options: ["Los martes", "En martes", "Por martes", "De martes"],
      answer: 0,
      why: "İspanyolca'da günün tekrar ettiğini anlatmak için çoğul belirli artikel ('los martes') kullanılır; 'en' edatı günlerle kullanılmaz."
    },
    {
      prompt: "'25' sayısının doğru yazılışı hangisidir?",
      options: ["veinticinco", "veinte y cinco", "veintecinco", "diezycinco"],
      answer: 0,
      why: "21-29 arasındaki sayılar İspanyolca'da bitişik tek sözcük olarak ('veinticinco') yazılır."
    }
  ]
}
```

---

### 1.3. İngilizce: Sayılar, Saat ve Takvim (`basics_en_numbers_time_calendar`)

```ts
{
  topic: "basics_en_numbers_time_calendar",
  language: "en",
  title: "Sayılar, Saat ve Takvim",
  level: "A1",
  summary: "İngilizcede saat söyleme (dijital ve geleneksel), sıra sayıları ve zaman edatlarının (at, on, in) kusursuz kullanımı.",
  rules: [
    "Saat sorma: 'What time is it?' veya 'What's the time?' kalıbıyla sorulur. Yanıt 'It is / It's ...' ile başlar.",
    "Geleneksel saat söyleme: önce dakika, sonra 'past' (geçe) veya 'to' (kala) gelir: It's quarter past three (3'ü çeyrek geçiyor), It's twenty to five (5'e yirmi var), It's half past six (altı buçuk).",
    "Dijital saat söyleme (kolay yol): Sayılar düz okunur: 7:15 (seven fifteen), 8:30 (eight thirty), 9:45 (nine forty-five).",
    "Zaman edatları altın kuralı (AT - ON - IN):",
    "  • AT: Kesin saatler ve özel anlar için: at 8 o'clock, at noon, at midnight, at night, at the weekend.",
    "  • ON: Günler ve tam tarihler için: on Monday, on Friday morning, on May 15th, on my birthday.",
    "  • IN: Aylar, yıllar, mevsimler ve uzun dönemler için: in June, in 2026, in summer, in the morning.",
    "Sıra sayıları tarihler için vazgeçilmezdir: 1st (first), 2nd (second), 3rd (third), 4th (fourth)... 21st (twenty-first)."
  ],
  table: {
    caption: "İngilizce Zaman Edatları (IN - ON - AT)",
    head: ["Edat", "Kullanım Kuralı", "Örnekler", "İstisnalar"],
    rows: [
      ["at", "Kesin saat ve belirli anlar", "at 7:30, at noon, at midnight", "at night, at the weekend"],
      ["on", "Günler ve belirli tarihler", "on Tuesday, on 4th July, on Christmas Day", "on Sunday afternoon"],
      ["in", "Aylar, yıllar, mevsimler, günün bölümleri", "in April, in 2026, in winter, in the evening", "in the morning / in the afternoon"]
    ]
  },
  examples: [
    { text: "The meeting starts at half past nine.", tr: "Toplantı dokuz buçukta başlıyor." },
    { text: "My sister was born on the 22nd of August, in 2005.", tr: "Kız kardeşim 2005'te, 22 Ağustos'ta doğdu." },
    { text: "We always go hiking on Saturday mornings.", tr: "Cumartesi sabahları hep doğa yürüyüşüne çıkarız." },
    { text: "In winter, the sun sets around five o'clock.", tr: "Kışın güneş saat beş civarında batar." },
    { text: "Is the store open on Sundays?", tr: "Mağaza pazar günleri açık mı?" }
  ],
  watch: [
    "Günün bölümlerinde 'in the morning' denirken, önüne gün adı gelirse kural 'on'a döner: 'on Friday morning'.",
    "Tarih yazarken '15 May' yazılsa bile sesli okunurken 'the fifteenth of May' denir.",
    "'Every', 'last', 'next', 'this' sözcüklerinden önce ASLA edat (at, on, in) gelmez: 'on next Monday' YANLIŞTIR, 'next Monday' doğrudur."
  ],
  tip: "Zaman edatlarını bir piramit gibi düşünün: Taban en geniş olan IN (yıllar, aylar, mevsimler), orta kat ON (günler, tarihler), tepe nokta ise en dar olan AT (saatler).",
  check: [
    {
      prompt: "Boşluğa hangi edat gelmelidir? 'The concert begins ___ 8:15 pm ___ Friday.'",
      options: ["at / on", "in / on", "on / at", "at / in"],
      answer: 0,
      why: "Saatler 'at', günler ise 'on' edatı alır ('at 8:15 pm on Friday')."
    },
    {
      prompt: "'Dörde çeyrek var' ifadesinin İngilizce karşılığı hangisidir?",
      options: ["It's quarter to four.", "It's quarter past four.", "It's four to quarter.", "It's four quarter less."],
      answer: 0,
      why: "Kala durumunda 'quarter to' ve hedef saat kullanılır ('quarter to four')."
    },
    {
      prompt: "Hangi cümlede edat hatası YAPILMAMIŞTIR?",
      options: ["I will call you next Monday.", "I will call you on next Monday.", "I will call you in next Monday.", "I will call you at next Monday."],
      answer: 0,
      why: "'Next', 'last', 'this' gibi belirteçlerin önüne zaman edatı (on/in/at) gelmez."
    }
  ]
}
```

---

## 2. Fransızca Özel A1 Dersleri

### 2.1. Fransızca: Vurgu Zamirleri (`basics_fr_pronoms_toniques`)

```ts
{
  topic: "basics_fr_pronoms_toniques",
  language: "fr",
  title: "Vurgu Zamirleri (Pronoms Toniques)",
  level: "A1",
  summary: "Özne zamirlerini güçlendirmek, edatlardan sonra kullanmak ve 'ben de / ya sen?' gibi kısa ifadeler kurmak için kullanılan tonik zamirler.",
  rules: [
    "Fransızca'da normal özne zamirleri (je, tu, il...) tek başına veya edatlardan sonra kullanılamaz. Yerine vurgu zamirleri (pronoms toniques) gelir:",
    "  • je → moi | tu → toi | il → lui | elle → elle",
    "  • nous → nous | vous → vous | ils → eux | elles → elles",
    "Kullanım Alanı 1 — Edatlardan sonra: avec moi (benimle), pour toi (senin için), chez lui (onun evinde), sans eux (onlar olmadan).",
    "Kullanım Alanı 2 — 'C'est' kalıbından sonra: C'est moi ! (Benim!), C'est lui (O!).",
    "Kullanım Alanı 3 — Özneye vurgu yaparken: 'Moi, j'aime le chocolat.' (Ben, ben çikolatayı severim).",
    "Kullanım Alanı 4 — Fiilsiz kısa cevaplar ve karşılaştırmalar: 'Qui veut du café ? — Moi !' (Kim kahve ister? — Ben!), 'Moi aussi' (Ben de), 'Et toi ?' (Ya sen?), 'plus grand que lui' (ondan daha uzun)."
  ],
  table: {
    caption: "Fransızca Özne ve Vurgu Zamirleri Karşılaştırması",
    head: ["Kişi", "Özne Zamiri", "Vurgu Zamiri", "Edatla Kullanım Örneği"],
    rows: [
      ["Ben (1. tekil)", "je", "moi", "Viens avec moi. (Benimle gel.)"],
      ["Sen (2. tekil)", "tu", "toi", "Ce cadeau est pour toi. (Bu hediye senin için.)"],
      ["O (erkil)", "il", "lui", "Je vais chez lui. (Onun evine gidiyorum.)"],
      ["O (dişil)", "elle", "elle", "Je parle souvent d'elle. (Sık sık ondan bahsederim.)"],
      ["Biz", "nous", "nous", "Restez avec nous. (Bizimle kalın.)"],
      ["Siz", "vous", "vous", "C'est grâce à vous. (Sizin sayenizde.)"],
      ["Onlar (erkil/karma)", "ils", "eux", "Je pense souvent à eux. (Sık sık onları düşünürüm.)"],
      ["Onlar (dişil)", "elles", "elles", "Nous partons sans elles. (Onlar olmadan gidiyoruz.)"]
    ]
  },
  examples: [
    { text: "Moi, je préfère le thé, et toi ?", tr: "Ben çayı tercih ederim, ya sen?" },
    { text: "Tu viens au cinéma avec nous ce soir ?", tr: "Bu akşam bizimle sinemaya geliyor musun?" },
    { text: "Qui a préparé ce gâteau ? — C'est lui !", tr: "Bu pastayı kim hazırladı? — O yaptı (O dur)!" },
    { text: "Ils sont très gentils ; j'ai confiance en eux.", tr: "Çok nazikler; onlara güveniyorum." },
    { text: "Paul est plus âgé que moi.", tr: "Paul benden daha yaşlıdır." }
  ],
  watch: [
    "Edatlardan sonra asla 'je, tu, il, ils' kullanılmaz: 'avec je' YANLIŞTIR, 'avec moi' doğrudur; 'pour il' YANLIŞTIR, 'pour lui' doğrudur.",
    "'C'est je' denmez, 'C'est moi' denir.",
    "3. çoğul erkil şahıs 'ils' zamirinin tonik hali 'eux' olur; 'avec ils' şeklinde kullanmamaya dikkat edin."
  ],
  tip: "Türkçedeki 'Ben de' kalıbının Fransızcası 'Je aussi' DEĞİL, 'Moi aussi'dir. Olumsuzu ise 'Moi non plus' (Ben de değil) şeklindedir.",
  check: [
    {
      prompt: "Boşluğa hangi zamir gelmelidir? 'Mes amis viennent chez ___ ce soir.'",
      options: ["moi", "je", "me", "mon"],
      answer: 0,
      why: "'Chez' bir edattır ve edatlardan sonra sadece vurgu zamiri ('moi') gelebilir."
    },
    {
      prompt: "'Onlar (erkekler) olmadan gidemeyiz' cümlesi nasıl çevrilir?",
      options: ["On ne peut pas partir sans eux.", "On ne peut pas partir sans ils.", "On ne peut pas partir sans leur.", "On ne peut pas partir sans lui."],
      answer: 0,
      why: "'Ils' zamirinin edat arkasındaki tonik karşılığı 'eux'tür."
    },
    {
      prompt: "Kapıyı çalan birine 'Benim!' demek için hangisi söylenir?",
      options: ["C'est moi !", "C'est je !", "Je suis !", "Il est moi !"],
      answer: 0,
      why: "'C'est' kalıbından sonra vurgu zamiri kullanılır ('C'est moi')."
    }
  ]
}
```

---

### 2.2. Fransızca: Yakın Gelecek (`basics_fr_futur_proche`)

```ts
{
  topic: "basics_fr_futur_proche",
  language: "fr",
  title: "Yakın Gelecek (Futur Proche)",
  level: "A1",
  summary: "Yakın zamanda gerçekleşecek ya da kesin olarak planlanmış olayları anlatmak için kullanılan son derece pratik 'aller + mastar' zaman yapısı.",
  rules: [
    "Formül: ALLER fiilinin şimdiki zaman çekimi + Ana Fiilin Mastar Hali (infinitif).",
    "Aller çekimi hatırlatması: je vais, tu vas, il/elle va, nous allons, vous allez, ils/elles vont.",
    "Kullanım amacı: Konuşma dilinde en sık kullanılan gelecek zamandır. Anlık kararlar, yakın planlar ve belirtisi görülen olaylar için idealdir: 'Il va pleuvoir' (Yağmur yağacak).",
    "Olumsuz Cümle: 'ne ... pas' kalıbı ALLER fiilini çevreler, mastar fiil dışarıda kalır: 'Je ne vais pas sortir' (Dışarı çıkmayacağım).",
    "Zamirli Fiiller (verbes pronominaux): Dönüşlü zamir mastar fiilin hemen önüne gelir ve özneye göre değişir: 'Je vais me coucher' (Yatacağım), 'Nous allons nous reposer' (Dinleneceğiz).",
    "Soru Cümlesi: 'Tu vas faire quoi ?' veya 'Est-ce que vous allez partir ?'"
  ],
  table: {
    caption: "Futur Proche Çekim Tablosu (Örnek: Manger / Se lever)",
    head: ["Şahıs", "Aller Çekimi", "Olumlu Örnek", "Olumsuz Örnek", "Dönüşlü Fiil"],
    rows: [
      ["je", "vais", "Je vais manger.", "Je ne vais pas manger.", "Je vais me lever."],
      ["tu", "vas", "Tu vas manger.", "Tu ne vas pas manger.", "Tu vas te lever."],
      ["il / elle", "va", "Elle va manger.", "Elle ne va pas manger.", "Il va se lever."],
      ["nous", "allons", "Nous allons manger.", "Nous ne allons pas manger.", "Nous allons nous lever."],
      ["vous", "allez", "Vous allez manger.", "Vous ne allez pas manger.", "Vous allez vous lever."],
      ["ils / elles", "vont", "Ils vont manger.", "Ils ne vont pas manger.", "Elles vont se lever."]
    ]
  },
  examples: [
    { text: "Ce soir, je vais regarder un film français.", tr: "Bu akşam bir Fransız filmi izleyeceğim." },
    { text: "Fais attention, tu vas tomber !", tr: "Dikkat et, düşeceksin!" },
    { text: "Nous n'allons pas rester longtemps.", tr: "Uzun süre kalmayacağız." },
    { text: "Qu'est-ce que vous allez faire ce week-end ?", tr: "Bu hafta sonu ne yapacaksınız?" },
    { text: "Demain matin, il va se réveiller tôt.", tr: "Yarın sabah erken uyanacak." }
  ],
  watch: [
    "Olumsuzlukta 'pas'ın yerini karıştırmayın: 'Je vais ne pas partir' YANLIŞTIR; 'ne' ve 'pas' aller fiilini sarar: 'Je ne vais pas partir'.",
    "Dönüşlü fiillerde zamir özneyle uyumlanır: 'Je vais se laver' YANLIŞ, 'Je vais me laver' DOĞRUDUR.",
    "Aller fiilini ana fiille birleştirmeyi unutmayın; mastar eki korunmalıdır ('Je vais mangé' değil 'Je vais manger')."
  ],
  tip: "Türkçedeki '-ecek / -acak' ekinin günlük konuşmadaki en doğal karşılığıdır. Karmaşık zaman eklerini ezberlemeden önce sadece 'aller' çekimini bilerek geleceğe dair her şeyi anlatabilirsiniz.",
  check: [
    {
      prompt: "'Bu akşam dışarı çıkmayacağız' cümlesinin doğru Futur Proche karşılığı hangisidir?",
      options: ["Nous n'allons pas sortir ce soir.", "Nous allons ne sortir pas ce soir.", "Nous ne sortons pas aller ce soir.", "Nous allons pas sortir ce soir."],
      answer: 0,
      why: "Olumsuz futur proche yapısında 'ne ... pas' aller fiilinin etrafına gelir: 'n'allons pas sortir'."
    },
    {
      prompt: "Boşluğa hangisi gelmelidir? 'Demain, je vais ___ tôt pour le travail.'",
      options: ["me réveiller", "se réveiller", "réveiller", "m'ai réveillé"],
      answer: 0,
      why: "Mastar haldeki dönüşlü fiilin zamiri özneye (je) göre değişerek 'me' olur."
    },
    {
      prompt: "'Gök bulutlu, yağmur yağacak' cümlesinde 'yağmur yağacak' nasıl söylenir?",
      options: ["Il va pleuvoir.", "Il va pleut.", "Il pleut aller.", "Il va à pleuvoir."],
      answer: 0,
      why: "Futur proche için 'aller' çekimi + mastar kullanılır; araya edat girmez: 'Il va pleuvoir'."
    }
  ]
}
```

---

## 3. İspanyolca Özel A1 Dersleri

### 3.1. İspanyolca: Muy ve Mucho Ayrımı (`basics_es_muy_mucho`)

```ts
{
  topic: "basics_es_muy_mucho",
  language: "es",
  title: "Muy ve Mucho Ayrımı",
  level: "A1",
  summary: "Türkçede ikisi de 'çok' olarak çevrilen ancak İspanyolcada sıfat/zarflarla (muy) veya isim/fiillerle (mucho) kullanılan iki temel sözcüğün net ayrımı.",
  rules: [
    "MUY: Bir zarftır, ASLA değişmez (cinsiyet veya çoğul eki almaz). Sıfatların ve diğer zarfların önüne gelir:",
    "  • muy + Sıfat: muy inteligente (çok zeki), muy cansado (çok yorgun), muy bonito (çok güzel).",
    "  • muy + Zarf: muy bien (çok iyi), muy tarde (çok geç), muy despacio (çok yavaş).",
    "MUCHO: İsmin önüne gelirse sıfattır ve ismin cinsiyetine ve sayısına göre 4 farklı şekle girer:",
    "  • mucho (+ erkil tekil isim): mucho dinero (çok para), mucho trabajo (çok iş).",
    "  • mucha (+ dişil tekil isim): mucha comida (çok yemek), mucha gente (çok insan).",
    "  • muchos (+ erkil çoğul isim): muchos libros (çok kitap), muchos amigos (çok arkadaş).",
    "  • muchas (+ dişil çoğul isim): muchas gracias (çok teşekkürler), muchas cosas (çok şey).",
    "MUCHO fiilden sonra gelirse 'çok miktar/derece' belirten değişmez bir zarf olur: 'Trabajo mucho' (Çok çalışıyorum), 'Te quiero mucho' (Seni çok seviyorum)."
  ],
  table: {
    caption: "Muy ve Mucho Kullanım Tablosu",
    head: ["Kelime", "Gramer Türü", "Bağlandığı Sözcük", "Örnek"],
    rows: [
      ["muy", "Zarf (değişmez)", "Sıfat", "Esta casa es muy grande."],
      ["muy", "Zarf (değişmez)", "Zarf", "Hablas español muy bien."],
      ["mucho / mucha", "Sıfat (sayılamayan isim)", "Tekil İsim (E / D)", "Tengo mucho calor / mucha sed."],
      ["muchos / muchas", "Sıfat (sayılabilen çoğul)", "Çoğul İsim (E / D)", "Hay muchos coches / muchas tiendas."],
      ["mucho", "Zarf (fiil niteleyici)", "Fiilden sonra", "Estudiamos mucho para el examen."]
    ]
  },
  examples: [
    { text: "Madrid es una ciudad muy hermosa.", tr: "Madrid çok güzel bir şehirdir." },
    { text: "Hoy tengo mucho trabajo en la oficina.", tr: "Bugün ofiste çok işim var." },
    { text: "Hay muchas personas esperando en la parada.", tr: "Durakta bekleyen çok insan var." },
    { text: "Mi hermano come mucho pero no engorda.", tr: "Kardeşim çok yer ama kilo almaz." },
    { text: "El tren va muy rápido.", tr: "Tren çok hızlı gidiyor." }
  ],
  watch: [
    "Sıfatların önüne ASLA 'mucho' koymayın: 'mucho grande' YANLIŞTIR, 'muy grande' DOĞRUDUR.",
    "İsimlerin önüne ASLA 'muy' koymayın: 'muy dinero' YANLIŞTIR, 'mucho dinero' DOĞRUDUR.",
    "Fiilden sonra 'muy' tek başına gelemez: 'como muy' denmez, 'como mucho' denir.",
    "Dört istisnai karşılaştırma sıfatında (mejor, peor, mayor, menor) ve zarfta (más, menos) 'muy' değil 'mucho' kullanılır: mucho mejor (çok daha iyi), mucho más (çok daha fazla)."
  ],
  tip: "Pratik formül: Arkasından 'nasıl?' sorusunun cevabı (sıfat/zarf) geliyorsa MUY; 'ne kadar / kaç tane?' sorusunun cevabı (isim/fiil miktarı) geliyorsa MUCHO seçin.",
  check: [
    {
      prompt: "Boşluklara sırasıyla hangileri gelmelidir? 'Este hotel es ___ caro y tiene ___ habitaciones.'",
      options: ["muy / muchas", "mucho / muy", "muy / mucho", "mucha / muchas"],
      answer: 0,
      why: "'Caro' sıfattır önüne 'muy' alır; 'habitaciones' dişil çoğul isimdir önüne 'muchas' alır."
    },
    {
      prompt: "'Seni çok seviyorum' cümlesinin doğru İspanyolcası hangisidir?",
      options: ["Te quiero mucho.", "Te quiero muy.", "Te mucho quiero.", "Te quiero mucha."],
      answer: 0,
      why: "Fiilden sonra eylemin miktarını anlatırken değişmez zarf olan 'mucho' kullanılır."
    },
    {
      prompt: "Hangi kullanım KURAL DIŞIDIR (hatalıdır)?",
      options: ["mucho simpático", "muy simpático", "mucho dinero", "muchas gracias"],
      answer: 0,
      why: "'Simpático' bir sıfattır ve sıfatların önüne 'mucho' değil 'muy' gelmelidir."
    }
  ]
}
```

---

### 3.2. İspanyolca: Olumlu Emir Kipi (`basics_es_imperativo_afirmativo`)

```ts
{
  topic: "basics_es_imperativo_afirmativo",
  language: "es",
  title: "Olumlu Emir Kipi (Imperativo Afirmativo)",
  level: "A1",
  summary: "Tavsiye vermek, talimat iletmek ve ricada bulunmak için günlük hayatta en çok kullanılan sen (tú) ve siz (usted) olumlu emir çekimleri.",
  rules: [
    "Tú (Sen) için Düzenli Emir Kuralı: Şimdiki zamanın (presente) 3. tekil şahıs (él/ella) çekimiyle BİREBİR AYNIDIR!",
    "  • -AR fiilleri → -a ile biter: hablar → ¡Habla! (Konuş!), escuchar → ¡Escucha! (Dinle!).",
    "  • -ER fiilleri → -e ile biter: comer → ¡Come! (Ye!), aprender → ¡Aprende! (Öğren!).",
    "  • -IR fiilleri → -e ile biter: escribir → ¡Escribe! (Yaz!), abrir → ¡Abre! (Aç!).",
    "Tú için 8 Temel Düzensiz Emir (kısa ve tektir):",
    "  • decir → di | hacer → haz | ir → ve | poner → pon",
    "  • salir → sal | ser → sé | tener → ten | venir → ven",
    "Usted (Resmî Siz) Kuralı: Sesli harf çapraz değişir (-AR fiiller -e, -ER/-IR fiiller -a alır):",
    "  • hablar → ¡Hable usted! | comer → ¡Coma usted! | escribir → ¡Escriba usted!",
    "Zamirlerin Yeri: Olumlu emir kipinde nesne ve dönüşlü zamirler fiilin SONUNA BİTİŞİR: ¡Cómpralo! (Onu satın al!), ¡Levántate! (Ayağa kalk!). Vurgu korunsun diye genellikle yazılı aksan işareti (tilde) eklenir."
  ],
  table: {
    caption: "Olumlu Emir Çekimleri (Tú ve Usted)",
    head: ["Fiil", "Tú (Sen)", "Usted (Siz)", "Zamirli Örnek (Tú)"],
    rows: [
      ["hablar (konuşmak)", "¡Habla!", "¡Hable!", "¡Háblame! (Benimle konuş!)"],
      ["comer (yemek)", "¡Come!", "¡Coma!", "¡Cómelo! (Onu ye!)"],
      ["abrir (açmak)", "¡Abre!", "¡Abra!", "¡Ábrela! (Onu aç!)"],
      ["hacer (yapmak - düzensiz)", "¡Haz!", "¡Haga!", "¡Hazlo! (Onu yap!)"],
      ["decir (söylemek - düzensiz)", "¡Di!", "¡Diga!", "¡Dime! (Bana söyle!)"],
      ["venir (gelmek - düzensiz)", "¡Ven!", "¡Venga!", "¡Ven aquí! (Buraya gel!)"]
    ]
  },
  examples: [
    { text: "¡Pasa, por favor, y siéntate!", tr: "Geç lütfen ve otur!" },
    { text: "¡Haz los deberes antes de salir!", tr: "Dışarı çıkmadan önce ödevlerini yap!" },
    { text: "¡Dime la verdad ahora mismo!", tr: "Bana hemen gerçeği söyle!" },
    { text: "¡Toma un vaso de agua!", tr: "Bir bardak su al/iç!" },
    { text: "¡Cierre la puerta, por favor!", tr: "Kapıyı kapatın, lütfen! (Usted - resmî)" }
  ],
  watch: [
    "'Tú' emri şimdiki zamanın 'tú' çekimiyle (-as / -es) DEĞİL, 3. şahsıyla (-a / -e) aynıdır: '¡Comes!' emir değil 'yiyorsun'dur; emir '¡Come!' şeklindedir.",
    "Zamir sona bitiştiğinde kelimenin doğal vurgusunun değişmemesi için yazılı tilde eklenir: compra + lo → cómpralo; dime (iki hecede tilde gerekmez).",
    "Olumsuz emir ('yapma') tamamen farklı bir kip (subjuntivo) gerektirir; bu dersteki kurallar yalnızca OLUMLU emir içindir."
  ],
  tip: "Sekiz düzensiz tú emrini ezberlemek için tekerleme mantığı: 'Ven Di Sal Haz Ten Ve Pon Sé' (Vin Diesel has ten weapons gibi hatırlanabilir!).",
  check: [
    {
      prompt: "Arkadaşına 'Kitabı oku!' demek için hangi emir formu doğrudur?",
      options: ["¡Lee el libro!", "¡Lees el libro!", "¡Lea el libro!", "¡Leer el libro!"],
      answer: 0,
      why: "-ER fiilleri tú için '-e' ile biter ('leer' → '¡Lee!')."
    },
    {
      prompt: "'Hacer' fiilinin sen (tú) için olumlu emri hangisidir?",
      options: ["¡Haz!", "¡Hace!", "¡Hagas!", "¡Haze!"],
      answer: 0,
      why: "'Hacer' fiilinin tú için olumlu emir formu düzensiz olup '¡Haz!'dır."
    },
    {
      prompt: "Boşluğa hangisi gelmelidir? 'Si tienes frío, ___ la chaqueta.'",
      options: ["ponte", "te pon", "poneste", "ponerte"],
      answer: 0,
      why: "Olumlu emirde zamir fiilin sonuna bitişir ('poner' düzensiz emri 'pon' + 'te' → 'ponte')."
    }
  ]
}
```

---

## 4. İngilizce Özel A1 Dersleri

### 4.1. İngilizce: Emir Kipi (`basics_en_imperatives`)

```ts
{
  topic: "basics_en_imperatives",
  language: "en",
  title: "Emir Kipi ve Talimatlar (Imperatives)",
  level: "A1",
  summary: "Doğrudan emir vermek, yol tarif etmek, tavsiyede bulunmak ve rica etmek için öznesiz yalın fiille kurulan en temel cümle yapısı.",
  rules: [
    "Olumlu Emir: Cümleye doğrudan fiilin yalın haliyle (base form) başlanır. Özne (you) SÖYLENMEZ: 'Open the window' (Pencereyi aç), 'Come here' (Buraya gel).",
    "Olumsuz Emir: Fiilin önüne daima 'Don't' (veya resmî dilde 'Do not') getirilir: 'Don't touch that' (Ona dokunma), 'Don't be late' (Geç kalma).",
    "'Be' fiiliyle emir: 'Be quiet' (Sessiz ol), 'Be careful' (Dikkatli ol), 'Don't be afraid' (Korkma).",
    "Nezaket ve Rica: Cümlenin başına veya sonuna 'please' eklenerek emir kibar bir ricaya dönüştürülür: 'Please sit down' veya 'Sit down, please'.",
    "Birlikte Yapma Önerisi (Let's): 'Hadi yapalım' demek için 'Let's + fiil' kullanılır: 'Let's go' (Hadi gidelim), olumsuzu 'Let's not stay here' (Hadi burada kalmayalım).",
    "Kullanım alanları: Talimatlar (Turn left), uyarılar (Watch out!), davetler (Have some cake), yemek tarifleri (Mix the eggs and flour)."
  ],
  table: {
    caption: "İngilizce Emir Kipi Kalıpları",
    head: ["Tür", "Formül", "Örnek", "Türkçesi"],
    rows: [
      ["Olumlu Emir", "Fiil (Yalın hal)", "Listen to me carefully.", "Beni dikkatlice dinle."],
      ["Olumsuz Emir", "Don't + Fiil", "Don't speak so loudly.", "Bu kadar yüksek sesle konuşma."],
      ["Kibar Rica", "Please + Fiil", "Please close the door.", "Lütfen kapıyı kapatın."],
      ["Durum Emri (Be)", "Be + Sıfat", "Be patient with children.", "Çocuklara karşı sabırlı ol."],
      ["Hadi Önerisi", "Let's + Fiil", "Let's take a break.", "Hadi bir mola verelim."],
      ["Olumsuz Öneri", "Let's not + Fiil", "Let's not waste any time.", "Hadi hiç vakit kaybetmeyelim."]
    ]
  },
  examples: [
    { text: "Turn right at the traffic lights and go straight ahead.", tr: "Trafik ışıklarından sağa dönün ve dosdoğru ilerleyin." },
    { text: "Don't forget to lock the door when you leave.", tr: "Çıkarken kapıyı kilitlemeyi unutma." },
    { text: "Please have a seat; the doctor will see you shortly.", tr: "Lütfen oturun; doktor birazdan sizi görecek." },
    { text: "Let's order some pizza tonight!", tr: "Hadi bu akşam pizza sipariş edelim!" },
    { text: "Don't worry, everything is going to be fine.", tr: "Endişelenme, her şey yoluna girecek." }
  ],
  watch: [
    "Emir cümlesinde özne kullanılmaz: 'You open the door' bir emir değil, durum ifadesidir ('Pencereyi sen açıyorsun'). Doğru emir: 'Open the door'.",
    "Olumsuz emirde üçüncü şahıslar için bile 'Doesn't' KULLANILMAZ; emir kipi daima 'Don't' ile kurulur: 'Don't do that!'.",
    "Fiile -ing veya -s takısı eklenmez: 'Opening the window' veya 'Opens the door' emir olamaz; fiil daima yalındır."
  ],
  tip: "Bir emir cümlesini anında daha nazik ve yumuşak hale getirmek için cümlenin sonuna bir virgül ve 'please' koyun: 'Help me, please.'",
  check: [
    {
      prompt: "Birine 'Burada bekleme!' demek için hangi cümle doğrudur?",
      options: ["Don't wait here!", "Not wait here!", "Doesn't wait here!", "No waiting here!"],
      answer: 0,
      why: "Olumsuz emir cümleleri daima 'Don't + fiilin yalın hali' kalıbıyla kurulur."
    },
    {
      prompt: "Boşluğa hangisi gelmelidir? '___ quiet, the baby is sleeping.'",
      options: ["Be", "You be", "Are", "Being"],
      answer: 0,
      why: "Sıfatlarla durum emri vermek için fiilin yalın hali olan 'Be' kullanılır ('Be quiet')."
    },
    {
      prompt: "'Hadi yürüyüşe çıkalım' önerisi İngilizce nasıl söylenir?",
      options: ["Let's go for a walk.", "Let go for a walk.", "Let's going for a walk.", "We go for a walk."],
      answer: 0,
      why: "Birlikte yapma önerisi 'Let's + yalın fiil' kalıbıyla kurulur ('Let's go')."
    }
  ]
}
```

---

### 4.2. İngilizce: Miktar Sözcükleri (`basics_en_quantifiers`)

```ts
{
  topic: "basics_en_quantifiers",
  language: "en",
  title: "Miktar Sözcükleri (Much, Many, A lot of, Some, Any)",
  level: "A1",
  summary: "Sayılabilen ve sayılamayan isimlerle miktar belirtme: olumlu, olumsuz ve soru cümlelerinde doğru sözcük seçimi.",
  rules: [
    "İsim Türü Ayrımı:",
    "  • Sayılabilen (Countable): Tek tek sayılabilen, çoğul eki (-s) alan isimler (apples, books, cars).",
    "  • Sayılamayan (Uncountable): Sıvılar, maddeler, soyut kavramlar; çoğul eki almaz (water, money, time, milk, information).",
    "MUCH vs. MANY:",
    "  • MANY: Sayılabilen çoğul isimlerle, özellikle soru ve olumsuzlarda: 'How many brothers do you have?', 'I don't have many books.'",
    "  • MUCH: Sayılamayan tekil isimlerle, özellikle soru ve olumsuzlarda: 'How much money is it?', 'We don't have much time.'",
    "A LOT OF / LOTS OF: Hem sayılabilen hem sayılamayan isimlerle OLUMLU cümlelerde en doğal tercihtir: 'I have a lot of friends', 'She has a lot of money.'",
    "SOME vs. ANY:",
    "  • SOME: Olumlu cümlelerde 'biraz' veya 'birkaç' anlamında: 'I have some questions', 'There is some milk.'",
    "  • ANY: Olumsuz cümlelerde ('hiç') ve genel sorularda: 'I don't have any money', 'Do you have any pets?'",
    "A FEW vs. A LITTLE:",
    "  • A few: Sayılabilen isimlerle 'birkaç tane (yeterli)': a few apples.",
    "  • A little: Sayılamayan isimlerle 'biraz (yeterli)': a little sugar."
  ],
  table: {
    caption: "İngilizce Miktar Belirteçleri Matrisi",
    head: ["Miktar Sözcüğü", "İsim Türü", "Cümle Türü", "Örnek"],
    rows: [
      ["many", "Sayılabilen Çoğul", "Soru & Olumsuz", "How many pens do you need?"],
      ["much", "Sayılamayan Tekil", "Soru & Olumsuz", "There isn't much coffee left."],
      ["a lot of", "Sayılabilen & Sayılamayan", "Çoğunlukla Olumlu", "We have a lot of time and a lot of cars."],
      ["some", "Sayılabilen & Sayılamayan", "Olumlu (ve rica/teklif)", "There are some books on the desk."],
      ["any", "Sayılabilen & Sayılamayan", "Olumsuz & Genel Soru", "Do you have any sugar? / I don't have any."],
      ["a few", "Sayılabilen Çoğul", "Olumlu ('birkaç')", "I have a few close friends."],
      ["a little", "Sayılamayan Tekil", "Olumlu ('biraz')", "Can I have a little water?"]
    ]
  },
  examples: [
    { text: "How much luggage do you have?", tr: "Ne kadar bagajınız var? (Luggage sayılamaz)" },
    { text: "There aren't many students in the classroom today.", tr: "Bugün sınıfta çok öğrenci yok." },
    { text: "She drinks a lot of water every day.", tr: "Her gün bolca (çok) su içer." },
    { text: "Would you like some tea? — Yes, please.", tr: "Biraz çay ister misiniz? (Teklif sorusunda 'some' kullanılır)" },
    { text: "We don't have any milk, so I will go to the store.", tr: "Hiç sütümüz yok, bu yüzden bakkala gideceğim." },
    { text: "I only have a little time before my train leaves.", tr: "Trenim kalkmadan önce sadece birazcık vaktim var." }
  ],
  watch: [
    "'Money' (para) ve 'time' (zaman) İngilizce'de SAYILAMAZ kabul edilir; 'many money' denmez, 'much money' veya 'a lot of money' denir.",
    "Olumlu cümlede 'I have much friends' demek kulağa yapay gelir; olumlu cümlelerde 'much/many' yerine 'a lot of' tercih edilir.",
    "İkram ve rica sorularında kural esner: Karşıdakine bir şey ikram ederken 'Do you want any cake?' yerine 'Would you like some cake?' denir."
  ],
  tip: "Sayılabilen isimler '-s' çoğul eki taşır (coins, hours, cups). Çoğul eki olan her şeyle MANY ve A FEW; çoğul eki almayan kütle ve soyut kavramlarla MUCH ve A LITTLE eşleştirin.",
  check: [
    {
      prompt: "Boşluğa hangisi gelmelidir? 'How ___ free time do you have this afternoon?'",
      options: ["much", "many", "few", "any"],
      answer: 0,
      why: "'Time' (zaman) sayılamayan bir isim olduğu için miktar sorusunda 'How much' kullanılır."
    },
    {
      prompt: "Boşluğa hangisi gelmelidir? 'I'm sorry, but we don't have ___ fresh apples today.'",
      options: ["any", "some", "much", "little"],
      answer: 0,
      why: "Olumsuz cümlelerde çoğul veya sayılamayan isimlerle 'hiç' anlamında 'any' kullanılır."
    },
    {
      prompt: "Hangi cümle dilbilgisi açısından DOĞRUDUR?",
      options: [
        "She has a lot of friends in London.",
        "She has much friends in London.",
        "She has a little friends in London.",
        "She doesn't have some friends in London."
      ],
      answer: 0,
      why: "Olumlu cümlelerde sayılabilen çoğul isimlerle çokluğu ifade etmek için en doğal yapı 'a lot of'dur."
    }
  ]
}
```
