import type { TopicLesson } from './lessonTypes'

export const EN_LESSONS_2: TopicLesson[] = [
  // A1
  {
    topic: "basics_en_pronouns",
    language: "en",
    title: "Zamirler ve iyelik (I / me / my / mine)",
    level: "A1",
    summary: "Türkçede iyelik ve hâl ekleriyle yapılan işi İngilizcede ayrı sözcükler yapar: özne, nesne, iyelik sıfatı ve iyelik zamiri.",
    rules: [
      "Özne zamirleri fiilden önce gelir: I, you, he, she, it, we, they.",
      "Nesne zamirleri fiilden ve edattan sonra gelir: me, you, him, her, it, us, them: She called me. Look at them.",
      "İyelik sıfatları isimden önce gelir: my, your, his, her, its, our, their: my car, their house.",
      "İyelik zamirleri ismin yerini tutar, arkasından isim gelmez: mine, yours, his, hers, ours, theirs: This bag is mine.",
      "He/his erkek, she/her kadın, it/its eşya ve hayvan içindir; sahibine göre seçilir, sahip olunan şeye göre değil.",
      "İngilizcede özne düşmez: 'Is raining' değil 'It is raining'."
    ],
    examples: [
      { text: "I know her, but she doesn't know me.", tr: "Ben onu tanıyorum ama o beni tanımıyor." },
      { text: "This is my brother and that is his wife.", tr: "Bu benim kardeşim, şu da onun karısı." },
      { text: "\"Whose phone is this?\" \"It's hers.\"", tr: "\"Bu kimin telefonu?\" \"Onun.\"" },
      { text: "Our flat is small, but theirs is huge.", tr: "Bizim daire küçük ama onlarınki çok büyük." },
      { text: "The cat is eating its food.", tr: "Kedi mamasını yiyor." }
    ],
    watch: [
      "Türkçede 'o' tek olduğu için he ve she'yi karıştırmak: annenizden söz ederken 'he' değil 'she' deyin.",
      "Özneyi düşürmek: 'Is very nice' değil 'It is very nice'; 'Am tired' değil 'I am tired'.",
      "Its ile it's'i karıştırmak: its = onun (iyelik), it's = it is.",
      "İyelik zamirinden sonra isim kullanmak: 'mine car' değil 'my car'; 'This car is mine'."
    ],
    tip: "Arkasından isim geliyorsa my/your/her; tek başına duruyorsa mine/yours/hers.",
    check: [
      {
        prompt: "This isn't your pen. It's ___.",
        options: ["mine", "my", "me"],
        answer: 0,
        why: "Arkasından isim gelmeyen iyelik zamiri mine olur."
      },
      {
        prompt: "My mother called, and I talked to ___ for an hour.",
        options: ["she", "her", "hers"],
        answer: 1,
        why: "Edattan sonra nesne zamiri gelir: her."
      },
      {
        prompt: "The cat is hungry. Give it ___ food.",
        options: ["it's", "it", "its"],
        answer: 2,
        why: "Its iyelik sıfatıdır; it's ise it is demektir."
      }
    ]
  },
  {
    topic: "basics_en_there_is",
    language: "en",
    title: "There is / there are (var, yok)",
    level: "A1",
    summary: "Bir yerde bir şeyin var olup olmadığını söylemek için there is / there are kullanılır; Türkçedeki 'var' ve 'yok'un karşılığıdır.",
    rules: [
      "Tekil ve sayılamayan isimle there is (there's), çoğulla there are: There's a bank. There are two banks.",
      "Olumsuz: there isn't / there aren't; 'hiç' anlamı için any: There aren't any eggs.",
      "Soru: Is there…? / Are there…?; kısa cevap: Yes, there is. / No, there aren't.",
      "Geçmişte there was / there were, gelecekte there will be olur.",
      "Yer bildiren söz genellikle sona gelir: There is a park near my house.",
      "Sahiplik için have kullanılır, there is değil: I have a car (bir arabam var)."
    ],
    examples: [
      { text: "There's a good restaurant on this street.", tr: "Bu sokakta iyi bir restoran var." },
      { text: "There are twenty students in my class.", tr: "Sınıfımda yirmi öğrenci var." },
      { text: "Is there any milk in the fridge?", tr: "Buzdolabında süt var mı?" },
      { text: "There weren't many people at the concert.", tr: "Konserde çok insan yoktu." },
      { text: "There will be a meeting tomorrow at ten.", tr: "Yarın saat onda bir toplantı olacak." }
    ],
    watch: [
      "'Var'ı have ile çevirmek: 'In the room has a table' değil 'There is a table in the room'.",
      "'Bir arabam var' için there is kullanmak: 'There is my car' değil 'I have a car'.",
      "Çoğulla is kullanmak: 'There is many cars' değil 'There are many cars'.",
      "There'yi düşürmek: 'Is a problem' değil 'There is a problem'."
    ],
    tip: "'Var' bir yerde bulunmaksa there is; birine aitse have.",
    check: [
      {
        prompt: "___ two banks on this street.",
        options: ["There is", "There are", "It has"],
        answer: 1,
        why: "Çoğul isimle there are kullanılır."
      },
      {
        prompt: "Is there ___ milk in the fridge?",
        options: ["any", "many", "a"],
        answer: 0,
        why: "Soruda sayılamayan isimle any kullanılır."
      },
      {
        prompt: "\"Bir arabam var\" nasıl söylenir?",
        options: ["There is a car of me.", "There is my car.", "I have a car."],
        answer: 2,
        why: "Sahiplik have ile söylenir, there is ile değil."
      }
    ]
  },
  {
    topic: "basics_en_demonstratives",
    language: "en",
    title: "This / that / these / those",
    level: "A1",
    summary: "İşaret sözcükleri yakını ve uzağı, tekili ve çoğulu ayırır: bu, şu/o, bunlar, şunlar/onlar.",
    rules: [
      "Yakın: this (tekil), these (çoğul); uzak: that (tekil), those (çoğul).",
      "İsimden önce sıfat gibi ya da tek başına zamir olarak kullanılır: this book / This is my book.",
      "İsim çoğulsa işaret sözcüğü de çoğul olur: these shoes, those people.",
      "This zamanda şimdiyi ya da yakını gösterir: this week, this morning; that geçmişi ya da uzakta kalanı: that day.",
      "Telefonda kendinizi tanıtırken this kullanılır: Hi, this is Ayşe.",
      "That, söylenen bir şeye geri dönmek için de kullanılır: That's a good idea."
    ],
    examples: [
      { text: "This coffee is really good.", tr: "Bu kahve gerçekten güzel." },
      { text: "Can you see that tower over there?", tr: "Oradaki şu kuleyi görebiliyor musun?" },
      { text: "These are my children, Ali and Elif.", tr: "Bunlar benim çocuklarım, Ali ve Elif." },
      { text: "Those shoes are too expensive.", tr: "O ayakkabılar çok pahalı." },
      { text: "\"I passed the exam!\" \"That's great!\"", tr: "\"Sınavı geçtim!\" \"Harika!\"" }
    ],
    watch: [
      "Çoğul isimle this/that: 'this shoes' değil 'these shoes'; 'that people' değil 'those people'.",
      "These'in sesini this ile karıştırmak: these uzun 'i' ile ve sonu 'z' sesiyle söylenir.",
      "Türkçedeki 'şu' ile 'o' arasında ayrım aramak: İngilizcede uzak olan için tek sözcük var, that."
    ],
    tip: "Tekil ya da çoğul, yakın ya da uzak: iki soru, dört sözcük.",
    check: [
      {
        prompt: "___ shoes over there are too expensive.",
        options: ["That", "Those", "These", "This"],
        answer: 1,
        why: "Uzaktaki (over there) çoğul şeyler için those kullanılır."
      },
      {
        prompt: "(Telefonda) Hi, ___ is Ayşe. Can I speak to Ali?",
        options: ["this", "these", "those"],
        answer: 0,
        why: "Telefonda kendini tanıtırken this kullanılır."
      },
      {
        prompt: "Look at ___ flowers in my hand.",
        options: ["those", "that", "these"],
        answer: 2,
        why: "Yakındaki (elimdeki) çoğul şeyler için these kullanılır."
      }
    ]
  },
  {
    topic: "basics_en_questions",
    language: "en",
    title: "Soru sözcükleri ve soru düzeni",
    level: "A1",
    summary: "İngilizcede soru, Türkçedeki gibi bir ekle değil sözcük sırasıyla kurulur: yardımcı fiil özneden önce gelir, gerekirse do/does/did eklenir.",
    rules: [
      "Be ve yardımcı fiiller (can, will, have) özneyle yer değiştirir: You are ready → Are you ready?",
      "Başka yardımcı yoksa do/does/did eklenir, asıl fiil yalın kalır: She works → Does she work?",
      "Soru sözcüğü en başa gelir, sonra aynı düzen: Where do you live? What did she say?",
      "Soru sözcükleri: what, where, when, why, who, which, whose, how; how many / how much / how often / how long.",
      "Who ya da what öznenin kendisini soruyorsa do kullanılmaz: Who called you? What happened?",
      "Edat genellikle sonda kalır: Who are you talking to? Where are you from?"
    ],
    examples: [
      { text: "Where do your parents live?", tr: "Annenle baban nerede yaşıyor?" },
      { text: "What time does the film start?", tr: "Film saat kaçta başlıyor?" },
      { text: "Why didn't you call me?", tr: "Neden beni aramadın?" },
      { text: "Who told you that?", tr: "Bunu sana kim söyledi?" },
      { text: "How long have you been in London?", tr: "Ne zamandır Londra'dasın?" },
      { text: "Which bus goes to the airport?", tr: "Hangi otobüs havalimanına gidiyor?" }
    ],
    watch: [
      "Düz cümleyi soru tonuyla söylemek: 'You like coffee?' yerine 'Do you like coffee?'.",
      "Do'yu unutmak: 'Where you live?' değil 'Where do you live?'.",
      "Özne sorusunda do kullanmak: 'Who did call you?' değil 'Who called you?'.",
      "Does/did'den sonra fiili çekimlemek: 'Where does she works?' değil 'Where does she work?'."
    ],
    tip: "Soru sırası: soru sözcüğü + yardımcı + özne + fiil. Yardımcı yoksa do getirin.",
    check: [
      {
        prompt: "Where ___ your parents live?",
        options: ["do", "are", "does"],
        answer: 0,
        why: "Asıl fiil live olduğu için çoğul özneyle do eklenir."
      },
      {
        prompt: "Who ___ you about the party?",
        options: ["did tell", "told", "does told"],
        answer: 1,
        why: "Who öznenin kendisini soruyorsa do/did kullanılmaz."
      },
      {
        prompt: "What time ___ the film start?",
        options: ["is", "do", "does"],
        answer: 2,
        why: "Tekil özneli (the film) soruda does gelir, fiil yalın kalır."
      }
    ]
  },
  {
    topic: "basics_en_time_prepositions",
    language: "en",
    title: "Zaman edatları (in / on / at)",
    level: "A1",
    summary: "Türkçede -de ekiyle söylenen zamanlar İngilizcede üç edata ayrılır: büyük dilimler in, günler on, saatler at.",
    rules: [
      "At: saat ve kısa anlar: at 7 o'clock, at noon, at midnight, at the weekend (İngiliz kullanımı), at night.",
      "On: günler ve tarihler: on Monday, on 5 May, on my birthday, on Friday morning.",
      "In: ay, yıl, mevsim, yüzyıl ve günün bölümleri: in June, in 2024, in winter, in the morning.",
      "Next, last, this, every, tomorrow, yesterday önünde edat kullanılmaz: next week, last Monday, every day.",
      "Bir süre sonra anlamında in: The bus leaves in ten minutes (on dakika sonra).",
      "Amerikan İngilizcesinde hafta sonu için on the weekend denir."
    ],
    examples: [
      { text: "The meeting starts at half past nine.", tr: "Toplantı dokuz buçukta başlıyor." },
      { text: "We usually go to the market on Saturdays.", tr: "Genelde cumartesileri pazara gideriz." },
      { text: "She was born in 1998, in August.", tr: "1998'de, ağustosta doğdu." },
      { text: "I can't sleep at night when it's hot.", tr: "Hava sıcakken geceleri uyuyamıyorum." },
      { text: "I'll see you next Friday.", tr: "Gelecek cuma görüşürüz." }
    ],
    watch: [
      "Next/last ile edat kullanmak: 'in next week' değil 'next week'; 'at last Monday' değil 'last Monday'.",
      "Günlerle in kullanmak: 'in Monday' değil 'on Monday'.",
      "'In the night' ile 'at night'ı karıştırmak: genel olarak geceleri için 'at night'.",
      "'Sonra' anlamındaki in'i 'after' ile çevirmek: 'after ten minutes' değil 'in ten minutes' (şimdiden itibaren)."
    ],
    tip: "Büyükten küçüğe: in (ay, yıl) → on (gün) → at (saat).",
    check: [
      {
        prompt: "My birthday is ___ 12 March.",
        options: ["in", "at", "on"],
        answer: 2,
        why: "Günler ve tarihler on alır."
      },
      {
        prompt: "The shop opens ___ nine o'clock.",
        options: ["at", "on", "in"],
        answer: 0,
        why: "Saatlerle at kullanılır."
      },
      {
        prompt: "\"Gelecek hafta görüşürüz\" hangisiyle söylenir?",
        options: ["See you in next week.", "See you next week.", "See you at next week."],
        answer: 1,
        why: "Next, last, this ve every önünde edat kullanılmaz."
      }
    ]
  },
  // A2
  {
    topic: "basics_en_past_continuous",
    language: "en",
    title: "Past continuous ve past simple (when / while)",
    level: "A2",
    summary: "Past continuous geçmişte bir anda süren işi (-iyordu), past simple ise o sırada olan kısa ve bitmiş olayı anlatır.",
    rules: [
      "Kuruluş: was/were + -ing: I was reading, they were waiting.",
      "Geçmişte belli bir anda süren iş: At eight o'clock I was having dinner.",
      "Süren işi kesen kısa olay past simple olur: I was cooking when the phone rang.",
      "While genellikle süren işle (continuous), when çoğunlukla kısa olayla (simple) gelir: While I was walking, I saw Ali.",
      "Aynı anda süren iki iş: While she was studying, her brother was playing games.",
      "Art arda olan olaylar past simple ile sıralanır: He opened the door, turned on the light and sat down.",
      "Durum fiilleri (know, want, like) continuous olmaz: I knew the answer."
    ],
    examples: [
      { text: "I was taking a shower when you called.", tr: "Sen aradığında duş alıyordum." },
      { text: "While we were driving home, it started to rain.", tr: "Eve giderken yağmur yağmaya başladı." },
      { text: "What were you doing at midnight?", tr: "Gece yarısı ne yapıyordun?" },
      { text: "She wasn't listening, so she didn't hear the question.", tr: "Dinlemiyordu, bu yüzden soruyu duymadı." },
      { text: "When the teacher came in, the students stopped talking.", tr: "Öğretmen içeri girince öğrenciler konuşmayı kesti." }
    ],
    watch: [
      "Kesen olayı da continuous yapmak: 'I was sleeping when the phone was ringing' değil '… when the phone rang'.",
      "Was ile were'ü karıştırmak: 'they was' değil 'they were'; 'you was' değil 'you were'.",
      "'When' sırayı değiştirir: 'When he arrived, we were eating' (yemek sürüyordu) ile 'When he arrived, we ate' (o gelince yemeğe başladık) aynı değil."
    ],
    tip: "Uzun çizgi (was/were + -ing) üstüne kısa nokta (past simple): arka plan ve olay.",
    check: [
      {
        prompt: "I was cooking when the phone ___.",
        options: ["was ringing", "rang", "rings"],
        answer: 1,
        why: "Süren işi kesen kısa olay past simple olur."
      },
      {
        prompt: "What ___ you doing at midnight?",
        options: ["was", "did", "were"],
        answer: 2,
        why: "You ile past continuous were + -ing ile kurulur."
      },
      {
        prompt: "Hangisi doğru?",
        options: ["I knew the answer.", "I was knowing the answer.", "I was know the answer."],
        answer: 0,
        why: "Know bir durum fiilidir; continuous yapılmaz."
      }
    ]
  },
  {
    topic: "basics_en_ability",
    language: "en",
    title: "Yetenek: can / could / be able to",
    level: "A2",
    summary: "Can ve could yapabilmeyi ve izin istemeyi anlatır; can'in bulunmadığı zamanlarda be able to kullanılır.",
    rules: [
      "Can + yalın fiil, bütün kişilerde aynı: I can swim, she can swim (cans değil).",
      "Olumsuz can't (cannot), soru Can you…?: Can you drive?",
      "Geçmişteki genel yetenek could: When I was five, I could read.",
      "Geçmişte tek bir durumda başarılan iş için could değil was able to / managed to: The fire spread fast, but everyone was able to escape.",
      "Olumsuzda tek durum için de couldn't olur: I couldn't find my keys.",
      "Can'in gelecek ve bitişik biçimi yoktur: will be able to, have been able to, to be able to.",
      "Rica ve izin: Can I…? (gündelik), Could you…? (daha kibar)."
    ],
    examples: [
      { text: "My grandmother can speak three languages.", tr: "Büyükannem üç dil konuşabiliyor." },
      { text: "I couldn't sleep last night because of the noise.", tr: "Dün gece gürültü yüzünden uyuyamadım." },
      { text: "After a long search, we were able to find a flat.", tr: "Uzun bir aramadan sonra bir daire bulabildik." },
      { text: "You'll be able to speak English fluently in a year.", tr: "Bir yıl içinde akıcı İngilizce konuşabileceksin." },
      { text: "Could you close the window, please?", tr: "Pencereyi kapatabilir misiniz, lütfen?" }
    ],
    watch: [
      "Can'den sonra to: 'I can to swim' değil 'I can swim'.",
      "Will ile can'i birleştirmek: 'I will can' değil 'I will be able to'.",
      "Tek seferlik başarı için could: 'Yesterday I could pass the exam' değil 'I was able to / managed to pass the exam'.",
      "He/she ile -s eklemek: 'She cans' ya da 'She can speaks' değil 'She can speak'."
    ],
    tip: "Can'in yetmediği her zamanda be able to'yu çekimleyin: was able to, will be able to.",
    check: [
      {
        prompt: "I ___ swim when I was six.",
        options: ["could", "can", "will can"],
        answer: 0,
        why: "Geçmişteki genel yetenek could ile söylenir."
      },
      {
        prompt: "You'll ___ speak English well in a year.",
        options: ["can", "could", "be able to"],
        answer: 2,
        why: "Can'in gelecek biçimi yoktur; will be able to kullanılır."
      },
      {
        prompt: "The fire spread quickly, but everyone ___ escape.",
        options: ["could", "was able to", "can"],
        answer: 1,
        why: "Geçmişte tek seferlik bir başarı için was able to kullanılır, could değil."
      }
    ]
  },
  {
    topic: "basics_en_obligation",
    language: "en",
    title: "Zorunluluk: have to ve must",
    level: "A2",
    summary: "Must ve have to 'zorunda olmak' demektir; olumsuzlarında anlam ayrılır: mustn't yasak, don't have to gereksiz.",
    rules: [
      "Must çoğunlukla konuşanın kendi düşündüğü zorunluluk: I must call my mother.",
      "Have to dışarıdan gelen kural ya da zorunluluk: I have to wear a uniform at work.",
      "Have to çekimlenir: she has to, did you have to, I had to, I'll have to.",
      "Must'ın geçmişi yoktur; geçmişte had to kullanılır: Yesterday I had to work late.",
      "Mustn't = yapmamalısın, yasak: You mustn't smoke here.",
      "Don't have to = gerek yok, istersen yaparsın: You don't have to come tomorrow.",
      "Gündelik konuşmada have got to da olur: I've got to go."
    ],
    examples: [
      { text: "All passengers must show their passports.", tr: "Bütün yolcular pasaportlarını göstermek zorunda." },
      { text: "I have to get up at six every day.", tr: "Her gün altıda kalkmak zorundayım." },
      { text: "We had to wait two hours for the train.", tr: "Tren için iki saat beklemek zorunda kaldık." },
      { text: "You mustn't tell anyone about this.", tr: "Bunu kimseye söylememelisin." },
      { text: "It's Sunday, so I don't have to work.", tr: "Bugün pazar, çalışmam gerekmiyor." }
    ],
    watch: [
      "Mustn't ile don't have to'yu karıştırmak: 'You mustn't pay' (ödemen yasak) değil 'You don't have to pay' (ödemen gerekmiyor).",
      "Must'ı geçmişte kullanmak: 'Yesterday I must work' değil 'Yesterday I had to work'.",
      "Must'tan sonra to: 'You must to go' değil 'You must go'.",
      "Have to'yu he/she ile çekimlememek: 'She have to' değil 'She has to'."
    ],
    tip: "Olumsuzda sorun: yasak mı (mustn't), yoksa gerek mi yok (don't have to)?",
    check: [
      {
        prompt: "You ___ smoke here. It's forbidden.",
        options: ["don't have to", "mustn't", "needn't"],
        answer: 1,
        why: "Yasak mustn't ile söylenir."
      },
      {
        prompt: "Yesterday I ___ work late.",
        options: ["had to", "must", "have to"],
        answer: 0,
        why: "Must'ın geçmişi yoktur; geçmişte had to kullanılır."
      },
      {
        prompt: "It's Sunday, so I ___ get up early.",
        options: ["must", "mustn't", "don't have to"],
        answer: 2,
        why: "Gerek yoksa don't have to kullanılır; mustn't yasak demektir."
      }
    ]
  },
  {
    topic: "basics_en_place_prepositions",
    language: "en",
    title: "Yer ve hareket edatları (in / on / at, into, through)",
    level: "A2",
    summary: "Türkçede -de, -e, -den ekleriyle söylenen yer ve yön İngilizcede edatlarla söylenir; durmak ile hareket etmek ayrı edat alır.",
    rules: [
      "In: bir şeyin içinde, kapalı alanda ya da şehir, ülke gibi büyük yerde: in the box, in the kitchen, in Istanbul.",
      "On: bir yüzeyin üstünde, duvarda, katta: on the table, on the wall, on the second floor.",
      "At: belli bir nokta, adres ya da etkinlik yeri: at the door, at the bus stop, at 15 Park Road, at a party, at work.",
      "Hareketin yönü: to (-e doğru), into (içine), onto (üstüne), out of (içinden dışarı), from (-den).",
      "Through içinden geçip öbür yana, across bir yandan öbür yana, along boyunca, past önünden geçerek.",
      "Konum: under, above, next to, between, behind, in front of, opposite.",
      "Home ile edat kullanılmaz: go home, get home; ama be at home."
    ],
    examples: [
      { text: "Your keys are on the table in the kitchen.", tr: "Anahtarların mutfakta, masanın üstünde." },
      { text: "I'll meet you at the station at five.", tr: "Seninle beşte istasyonda buluşurum." },
      { text: "She ran into the room and jumped onto the bed.", tr: "Odaya koştu ve yatağın üstüne atladı." },
      { text: "The train goes through a long tunnel.", tr: "Tren uzun bir tünelden geçiyor." },
      { text: "We walked along the river and across the bridge.", tr: "Nehir boyunca yürüdük ve köprünün karşısına geçtik." },
      { text: "I got home late and went straight to bed.", tr: "Eve geç vardım ve doğruca yatağa gittim." }
    ],
    watch: [
      "Home ile to kullanmak: 'go to home' değil 'go home'.",
      "Hareket için in: 'He came in the room' yerine 'He came into the room' (içeri girdi).",
      "Ulaşımda in/on ayrımı: in a car / in a taxi, ama on a bus / on a train / on a plane.",
      "Arrive ile to: 'arrive to London' değil 'arrive in London', 'arrive at the airport'."
    ],
    tip: "Duruyorsa in/on/at, gidiyorsa to/into/onto: önce hareket var mı diye bakın.",
    check: [
      {
        prompt: "Let's go ___.",
        options: ["to home", "home", "at home"],
        answer: 1,
        why: "Go home kalıbında edat kullanılmaz."
      },
      {
        prompt: "She ran ___ the room and closed the door.",
        options: ["into", "at", "on"],
        answer: 0,
        why: "İçeri doğru hareket into ile söylenir."
      },
      {
        prompt: "I'll meet you ___ the bus stop.",
        options: ["in", "on", "at"],
        answer: 2,
        why: "Durak gibi belli bir nokta at alır."
      }
    ]
  },
  // B1
  {
    topic: "basics_en_conditionals",
    language: "en",
    title: "Birinci ve ikinci koşul cümleleri (if / unless)",
    level: "B1",
    summary: "Birinci koşul gerçekleşmesi olası durumu (-rsa … -ecek), ikinci koşul şimdi ya da gelecekte gerçek dışı, hayalî durumu (-sa … -erdi) anlatır.",
    rules: [
      "Birinci koşul: If + present simple, will + yalın fiil: If it rains, we'll stay at home.",
      "İkinci koşul: If + past simple, would + yalın fiil: If I had more time, I would learn Japanese.",
      "İkinci koşulda be için bütün kişilerde were kullanılabilir: If I were you, I'd accept the offer.",
      "If'li bölümde will ya da would kullanılmaz: 'If it will rain' değil 'If it rains'.",
      "Unless = if … not: Unless you hurry, you'll miss the bus.",
      "Sıra değişebilir; if başta ise araya virgül konur, sonda ise konmaz.",
      "Would yerine could ya da might da gelebilir: If we left now, we might catch the train."
    ],
    examples: [
      { text: "If you heat ice, it melts.", tr: "Buzu ısıtırsan erir." },
      { text: "If I finish early, I'll call you.", tr: "Erken bitirirsem seni ararım." },
      { text: "We won't go out unless the weather gets better.", tr: "Hava düzelmezse dışarı çıkmayacağız." },
      { text: "If I won the lottery, I would travel around the world.", tr: "Piyangoyu kazansam dünyayı gezerdim." },
      { text: "What would you do if you lost your job?", tr: "İşini kaybetsen ne yapardın?" },
      { text: "If I were you, I wouldn't sign that contract.", tr: "Yerinde olsam o sözleşmeyi imzalamazdım." }
    ],
    watch: [
      "If'li bölüme will koymak: Türkçedeki '-ecek olursa' etkisiyle 'If you will come' değil 'If you come'.",
      "İkinci koşulda iki tarafa da would: 'If I would have money' değil 'If I had money'.",
      "Olası durumu hayalî kurmak: yarın gerçekten olabilecekse birinci koşul ('If it rains tomorrow…').",
      "Unless ile ayrıca not kullanmak: 'Unless you don't study' değil 'Unless you study'."
    ],
    tip: "Gerçekten olabilir mi? present + will. Hayal mi? past + would.",
    check: [
      {
        prompt: "If it ___ tomorrow, we'll stay at home.",
        options: ["rains", "will rain", "rained"],
        answer: 0,
        why: "Birinci koşulda if'li bölüm present simple olur, will almaz."
      },
      {
        prompt: "If I ___ more money, I would buy a house.",
        options: ["have", "had", "would have"],
        answer: 1,
        why: "İkinci koşulda if'li bölüm past simple olur."
      },
      {
        prompt: "We'll miss the bus ___ we hurry.",
        options: ["if", "when", "unless"],
        answer: 2,
        why: "Unless \"if … not\" demektir: acele etmezsek."
      }
    ]
  },
  {
    topic: "basics_en_used_to",
    language: "en",
    title: "Used to, would, be used to, get used to",
    level: "B1",
    summary: "Used to geçmişteki ve artık olmayan alışkanlığı (-erdi), be used to ise bir şeye alışkın olmayı anlatır; birbirine benzeseler de ayrı yapılardır.",
    rules: [
      "Used to + yalın fiil: geçmişte olan, artık olmayan alışkanlık ve durum: I used to live in Bursa.",
      "Olumsuz ve soru did ile, used to → use to: I didn't use to like fish. Did you use to play?",
      "Would + yalın fiil yalnızca geçmişte tekrarlanan eylemler için, durumlar için değil: Every summer we would go to the village.",
      "Durum fiilleriyle (be, have, live, like, know) would değil used to: I used to have long hair.",
      "Be used to + isim/-ing: bir şeye alışkın olmak: I'm used to getting up early.",
      "Get used to + isim/-ing: bir şeye alışmak (süreç): She is getting used to the cold.",
      "Şimdiki alışkanlık için used to kullanılmaz; usually ile present simple: I usually walk to work."
    ],
    examples: [
      { text: "I used to smoke, but I gave up five years ago.", tr: "Eskiden sigara içerdim ama beş yıl önce bıraktım." },
      { text: "There used to be a cinema on this corner.", tr: "Eskiden bu köşede bir sinema vardı." },
      { text: "On Sundays my grandfather would take us fishing.", tr: "Pazar günleri dedem bizi balığa götürürdü." },
      { text: "Did you use to wear glasses?", tr: "Eskiden gözlük takar mıydın?" },
      { text: "He's used to driving on the left now.", tr: "Artık soldan araba sürmeye alışkın." },
      { text: "It took me months to get used to the new job.", tr: "Yeni işe alışmam aylar sürdü." }
    ],
    watch: [
      "Be used to'dan sonra yalın fiil: 'I'm used to work late' değil 'I'm used to working late'.",
      "Şimdiki alışkanlık için used to: 'I used to drink tea every morning' geçmiştir; bugün için 'I usually drink tea'.",
      "Soru ve olumsuzda -d'yi korumak: 'Did you used to' değil 'Did you use to'.",
      "Durumla would: 'I would live in Ankara' değil 'I used to live in Ankara'."
    ],
    tip: "To'dan sonra fiil yalınsa (used to go) geçmiş alışkanlık; -ing ise (be used to going) alışkınlık.",
    check: [
      {
        prompt: "I ___ live in Bursa, but now I live in Izmir.",
        options: ["used to", "am used to", "use to"],
        answer: 0,
        why: "Artık olmayan geçmiş durum used to + yalın fiil ile söylenir."
      },
      {
        prompt: "She's used to ___ up early.",
        options: ["get", "getting", "got"],
        answer: 1,
        why: "Be used to'daki to edattır; arkasından -ing gelir."
      },
      {
        prompt: "Did you ___ wear glasses?",
        options: ["using to", "used to", "use to"],
        answer: 2,
        why: "Did'li soruda -d düşer: use to."
      }
    ]
  },
  {
    topic: "basics_en_past_perfect",
    language: "en",
    title: "Past perfect (had done)",
    level: "B1",
    summary: "Geçmişteki bir olaydan daha önce olmuş olanı anlatır: 'geçmişin geçmişi'. Türkçedeki -mişti'ye yakındır.",
    rules: [
      "Kuruluş: had + V3 (past participle), bütün kişilerde aynı: I had left, she had seen.",
      "Kısaltma: I'd, she'd; olumsuz hadn't; soru Had you…?",
      "Geçmişteki iki olaydan önce olanı gösterir: When I arrived, the train had left (ben geldiğimde tren gitmişti).",
      "Sıra zaten açıksa (after, before ile) past simple de yeter: After she finished, she went home.",
      "Already, just, never, by the time sık gelir: By the time we got there, the shop had closed.",
      "Dolaylı anlatımda present perfect ya da past simple geriye kayar: 'I've lost my key' → He said he had lost his key."
    ],
    examples: [
      { text: "When we got to the cinema, the film had already started.", tr: "Sinemaya vardığımızda film çoktan başlamıştı." },
      { text: "I had never seen the sea before I moved to Izmir.", tr: "İzmir'e taşınmadan önce denizi hiç görmemiştim." },
      { text: "She was nervous because she hadn't flown before.", tr: "Daha önce uçmadığı için gergindi." },
      { text: "Had you met him before the party?", tr: "Onunla partiden önce tanışmış mıydın?" },
      { text: "He told me he had forgotten my birthday.", tr: "Bana doğum günümü unuttuğunu söyledi." }
    ],
    watch: [
      "Her geçmiş cümlede past perfect kullanmak: tek bir geçmiş olay ya da sıralı olaylar için past simple yeter.",
      "When'in anlamını gözden kaçırmak: 'When I arrived, she left' (ben gelince çıktı) ile 'When I arrived, she had left' (ben geldiğimde çıkmıştı) farklı.",
      "Had'den sonra V2: 'had went' değil 'had gone'; 'had saw' değil 'had seen'."
    ],
    tip: "Geçmişte bir an seçin: ondan önce olmuşsa had + V3.",
    check: [
      {
        prompt: "When we got to the cinema, the film ___ already started.",
        options: ["had", "has", "was"],
        answer: 0,
        why: "Geçmişteki bir andan önce olan iş had + V3 ile söylenir."
      },
      {
        prompt: "She had never ___ the sea before.",
        options: ["saw", "seen", "see"],
        answer: 1,
        why: "Had'den sonra V3 (past participle) gelir."
      },
      {
        prompt: "\"Ben geldiğimde o çıkmıştı\" hangisidir?",
        options: ["When I arrived, she left.", "When I had arrived, she left.", "When I arrived, she had left."],
        answer: 2,
        why: "Önce olan iş (çıkmak) past perfect olur."
      }
    ]
  },
  {
    topic: "basics_en_question_tags",
    language: "en",
    title: "Soru ekleri (question tags)",
    level: "B1",
    summary: "Cümlenin sonundaki kısa soru, Türkçedeki 'değil mi?' karşılığıdır: onay bekler ya da bir şeyi doğrulamak ister.",
    rules: [
      "Olumlu cümleye olumsuz, olumsuz cümleye olumlu tag gelir: It's cold, isn't it? You don't smoke, do you?",
      "Tag cümledeki yardımcı fiili tekrar eder; yoksa do/does/did kullanılır: She likes tea, doesn't she?",
      "Tag'deki özne zamirdir: Your brother lives here, doesn't he?",
      "Düzensiz olanlar: I am → aren't I? / Let's → shall we? / buyruk → will you?",
      "Never, nobody, nothing, hardly gibi olumsuz anlamlı sözcükler olumlu tag alır: He never calls, does he?",
      "Ses düşerse onay bekliyorsunuz, yükselirse gerçekten soruyorsunuz."
    ],
    examples: [
      { text: "You're from Antalya, aren't you?", tr: "Antalyalısın, değil mi?" },
      { text: "She didn't come to the meeting, did she?", tr: "Toplantıya gelmedi, değil mi?" },
      { text: "They've finished the project, haven't they?", tr: "Projeyi bitirdiler, değil mi?" },
      { text: "I'm late again, aren't I?", tr: "Yine geç kaldım, değil mi?" },
      { text: "Let's order a pizza, shall we?", tr: "Pizza söyleyelim, olur mu?" },
      { text: "Nobody called, did they?", tr: "Kimse aramadı, değil mi?" }
    ],
    watch: [
      "Her cümleye aynı tag: Türkçedeki tek 'değil mi?' yüzünden 'isn't it?' her yerde yanlış; 'You like it, don't you?'.",
      "İki tarafı da olumlu ya da olumsuz yapmak: 'He is busy, is he?' değil 'He is busy, isn't he?'.",
      "Tag'de ismi tekrar etmek: 'Ali is here, isn't Ali?' değil 'Ali is here, isn't he?'."
    ],
    tip: "Cümlenin yardımcı fiilini bulun, tersine çevirin, zamirle bitirin.",
    check: [
      {
        prompt: "You don't smoke, ___?",
        options: ["don't you", "do you", "aren't you"],
        answer: 1,
        why: "Olumsuz cümleye olumlu tag gelir ve aynı yardımcı fiil kullanılır."
      },
      {
        prompt: "I'm late again, ___?",
        options: ["isn't it", "amn't I", "aren't I"],
        answer: 2,
        why: "I am'in tag'i düzensizdir: aren't I."
      },
      {
        prompt: "She likes tea, ___?",
        options: ["doesn't she", "isn't she", "don't she"],
        answer: 0,
        why: "Yardımcı fiil yoksa do/does kullanılır; she ile doesn't."
      }
    ]
  },
  // B2
  {
    topic: "basics_en_third_conditional",
    language: "en",
    title: "Üçüncü koşul ve wish / if only",
    level: "B2",
    summary: "Üçüncü koşul geçmişte olmamış bir durumu ve sonucunu hayal eder (-saydı … -ardı); wish ve if only ise pişmanlığı ve keşkeyi anlatır.",
    rules: [
      "Üçüncü koşul: If + past perfect, would have + V3: If I had studied, I would have passed.",
      "Would have yerine could have ya da might have da gelebilir: If we had left earlier, we might have caught the train.",
      "Kısaltmada 'd iki anlama gelir: If I'd known (had), I'd have told you (would).",
      "Şimdiki durumdan şikâyet: wish / if only + past simple: I wish I had a car (keşke arabam olsa).",
      "Geçmişteki pişmanlık: wish / if only + past perfect: I wish I hadn't said that (keşke söylemeseydim).",
      "Başkasının davranışından yakınma ya da değişiklik isteği: wish + would: I wish you would stop shouting.",
      "If only, wish ile aynıdır ama daha duygusaldır: If only I had listened to you!"
    ],
    examples: [
      { text: "If you had told me earlier, I would have helped you.", tr: "Bana daha önce söyleseydin sana yardım ederdim." },
      { text: "We wouldn't have got lost if we had taken a map.", tr: "Yanımıza harita alsaydık kaybolmazdık." },
      { text: "I wish I spoke French as well as you.", tr: "Keşke senin kadar iyi Fransızca konuşsam." },
      { text: "She wishes she had accepted that job.", tr: "O işi kabul etmiş olmayı diliyor." },
      { text: "If only I hadn't left my phone on the bus!", tr: "Keşke telefonumu otobüste unutmasaydım!" },
      { text: "I wish it would stop raining.", tr: "Keşke yağmur dursa." }
    ],
    watch: [
      "If'li bölümde would have: 'If I would have known' değil 'If I had known'.",
      "Wish ile şimdiki zaman: 'I wish I have more time' değil 'I wish I had more time'.",
      "Kendiniz için wish + would: 'I wish I would be taller' değil 'I wish I were taller'.",
      "Would have'i 'would of' diye yazmak: konuşmadaki 'would've' sesine aldanmayın."
    ],
    tip: "Wish bir zaman geriye kayar: şimdi → past simple, geçmiş → past perfect.",
    check: [
      {
        prompt: "If I ___ about the party, I would have come.",
        options: ["knew", "had known", "would know"],
        answer: 1,
        why: "Üçüncü koşulda if'li bölüm past perfect olur."
      },
      {
        prompt: "I wish I ___ more free time these days.",
        options: ["had", "have", "will have"],
        answer: 0,
        why: "Şimdiki durumdan yakınırken wish + past simple kullanılır."
      },
      {
        prompt: "I wish I ___ that to her yesterday.",
        options: ["didn't say", "wouldn't say", "hadn't said"],
        answer: 2,
        why: "Geçmişteki pişmanlık wish + past perfect ile söylenir."
      }
    ]
  },
  {
    topic: "basics_en_future_perfect",
    language: "en",
    title: "Future continuous ve future perfect",
    level: "B2",
    summary: "Future continuous gelecekte belli bir anda sürecek işi (-iyor olacak), future perfect gelecekteki bir andan önce bitmiş olacak işi (-miş olacak) anlatır.",
    rules: [
      "Future continuous: will be + -ing: This time tomorrow I'll be lying on the beach.",
      "Planlanmış, olağan akışta olacak işler için de kullanılır: I'll be seeing Ali at work, so I can give it to him.",
      "Kibarca plan sormak: Will you be using the car tonight?",
      "Future perfect: will have + V3: By June I will have finished the course.",
      "Future perfect çoğunlukla by (en geç, -e kadar) ve by the time ile gelir.",
      "Süreyi vurgulamak için future perfect continuous: By May I'll have been working here for ten years.",
      "By the time'dan sonra will değil present simple gelir: By the time you arrive, we'll have eaten."
    ],
    examples: [
      { text: "Don't call at nine; I'll be having dinner.", tr: "Dokuzda arama, akşam yemeği yiyor olacağım." },
      { text: "This time next week we'll be flying to Tokyo.", tr: "Haftaya bu saatte Tokyo'ya uçuyor olacağız." },
      { text: "By the end of the year, she will have saved enough money.", tr: "Yıl sonuna kadar yeterince para biriktirmiş olacak." },
      { text: "The film will have started by the time we get there.", tr: "Biz oraya varana kadar film başlamış olacak." },
      { text: "Will you be passing the post office on your way home?", tr: "Eve giderken postanenin önünden geçecek misin?" }
    ],
    watch: [
      "By ile until'i karıştırmak: 'by Friday' = en geç cumaya kadar (bitmiş olacak), 'until Friday' = cumaya kadar sürecek.",
      "By the time'dan sonra will: 'by the time you will arrive' değil 'by the time you arrive'.",
      "Will have'den sonra V2: 'will have went' değil 'will have gone'."
    ],
    tip: "O anda sürüyor mu? will be + -ing. O ana kadar bitmiş mi? will have + V3.",
    check: [
      {
        prompt: "By the time you arrive, we ___ dinner.",
        options: ["will have eaten", "eat", "are eating"],
        answer: 0,
        why: "Gelecekteki bir andan önce bitmiş olacak iş will have + V3 ile söylenir."
      },
      {
        prompt: "I'll have finished the report ___ Friday.",
        options: ["until", "since", "by"],
        answer: 2,
        why: "By \"en geç\" demektir ve future perfect ile gelir."
      },
      {
        prompt: "\"O saatte uyuyor olacağım\" hangisidir?",
        options: ["I'll have slept at that time.", "I'll be sleeping at that time.", "I'll sleep at that time."],
        answer: 1,
        why: "Gelecekte belli bir anda süren iş will be + -ing ile söylenir."
      }
    ]
  },
  {
    topic: "basics_en_causative",
    language: "en",
    title: "Ettirgen yapı: have / get something done",
    level: "B2",
    summary: "Bir işi kendiniz yapmayıp başkasına yaptırdığınızı anlatır; Türkçedeki -tir/-dir ettirgen ekinin karşılığıdır.",
    rules: [
      "Have + nesne + V3: I had my hair cut (saçımı kestirdim).",
      "Get + nesne + V3 aynı anlamdadır, daha gündeliktir: We got the car repaired.",
      "Bütün zamanlarda have/get çekimlenir: I'm having my flat painted. She has had her phone fixed.",
      "İstemeden başa gelen kötü olay için de kullanılır: He had his wallet stolen (cüzdanı çalındı).",
      "İşi yapan kişi söylenecekse by ile: I had the report checked by a lawyer.",
      "Birine bir iş yaptırmak (kişi önemliyse): have someone do / get someone to do: I had the mechanic check the brakes. I got my brother to help me."
    ],
    examples: [
      { text: "I'm going to have my eyes tested next week.", tr: "Gelecek hafta gözlerimi muayene ettireceğim." },
      { text: "Where do you usually get your hair cut?", tr: "Saçını genelde nerede kestirirsin?" },
      { text: "We had a new kitchen installed last year.", tr: "Geçen yıl yeni bir mutfak taktırdık." },
      { text: "She had her bag stolen on the metro.", tr: "Metroda çantası çalındı." },
      { text: "I'll get someone to look at your computer.", tr: "Bilgisayarına birine baktırırım." }
    ],
    watch: [
      "Kendiniz yapmadığınız işi düz cümleyle söylemek: 'I cut my hair' kendi saçınızı kestiğiniz anlamına gelir; berberde 'I had my hair cut'.",
      "Sözcük sırası: 'I had cut my hair' (past perfect) değil 'I had my hair cut'.",
      "Get someone ile to'yu unutmak: 'I got him fix it' değil 'I got him to fix it'; have ile to yok: 'I had him fix it'."
    ],
    tip: "Türkçede -tir eki duyuyorsanız (kestirdim, yaptırdım) have/get + nesne + V3.",
    check: [
      {
        prompt: "I had my hair ___ yesterday.",
        options: ["cut", "to cut", "cutting"],
        answer: 0,
        why: "Ettirgen yapı have + nesne + V3 ile kurulur."
      },
      {
        prompt: "I got my brother ___ me with the boxes.",
        options: ["help", "to help", "helped"],
        answer: 1,
        why: "Get someone kalıbında fiil to ile gelir."
      },
      {
        prompt: "\"Arabamı tamir ettirdim\" hangisidir?",
        options: ["I had repaired my car.", "I repaired my car.", "I had my car repaired."],
        answer: 2,
        why: "İşi başkasına yaptırmak had + nesne + V3 ile söylenir."
      }
    ]
  },
  // C1
  {
    topic: "basics_en_hedging",
    language: "en",
    title: "Yazıda bağlama ve temkinli dil (whereas, nonetheless, albeit)",
    level: "C1",
    summary: "Akademik ve resmî yazıda fikirler ince bağlaçlarla karşılaştırılır, iddialar da temkinli bir dille (hedging) yumuşatılır.",
    rules: [
      "Karşıtlık: whereas / while iki olguyu karşılaştırır: Some prefer cities, whereas others choose the countryside.",
      "Buna rağmen: nonetheless / nevertheless / even so cümle başında virgülle ya da noktalı virgülden sonra: The plan was costly; nonetheless, it was approved.",
      "Albeit (= although it was, ama) yalnızca sıfat, zarf ya da isim öbeğiyle gelir, tam cümleyle değil: a slow, albeit steady, improvement.",
      "Ekleme ve sonuç: moreover, furthermore, consequently, thus, hence; resmî yazıda and, but, so yerine.",
      "Temkinli fiiller: appear, seem, tend, suggest, indicate: The results suggest that…",
      "Temkinli kalıplar: it could be argued that, it is likely that, to some extent, there is some evidence that.",
      "Kip fiilleri ve zarflarla yumuşatma: may, might, could; possibly, arguably, largely, relatively."
    ],
    examples: [
      { text: "Urban populations are growing, whereas rural areas are losing residents.", tr: "Kent nüfusu artıyor, kırsal kesim ise nüfus kaybediyor." },
      { text: "The evidence is limited; nonetheless, the trend is clear.", tr: "Kanıtlar sınırlı; yine de eğilim açık." },
      { text: "The economy recovered, albeit slowly.", tr: "Ekonomi, yavaş da olsa, toparlandı." },
      { text: "It could be argued that social media has made us less patient.", tr: "Sosyal medyanın bizi daha sabırsız yaptığı ileri sürülebilir." },
      { text: "These findings appear to support the original hypothesis.", tr: "Bu bulgular ilk hipotezi destekliyor gibi görünüyor." },
      { text: "Remote work tends to increase productivity, at least to some extent.", tr: "Uzaktan çalışma, en azından bir ölçüde, verimliliği artırma eğiliminde." }
    ],
    watch: [
      "Albeit'ten sonra tam cümle: 'albeit it was slow' değil 'albeit slowly' ya da 'although it was slow'.",
      "Nonetheless ile however'ı bağlaç gibi kullanmak: iki cümleyi virgülle bağlamaz; 'It was late, however we continued' değil 'It was late; however, we continued'.",
      "Kesin dilde yazmak: 'This proves that…' yerine çoğu zaman 'This suggests that…' daha uygun.",
      "Fazla temkin: tek cümlede 'it might possibly be suggested that perhaps' gibi yığmak iddiayı boşaltır."
    ],
    tip: "Bir iddia, bir temkin: her cümleye tek bir yumuşatıcı yeter.",
    check: [
      {
        prompt: "The economy recovered, ___ slowly.",
        options: ["albeit", "despite", "whereas"],
        answer: 0,
        why: "Albeit tam cümle değil, bir sıfat ya da zarf öbeği alır."
      },
      {
        prompt: "The plan was costly; ___, it was approved.",
        options: ["moreover", "nonetheless", "consequently"],
        answer: 1,
        why: "Beklenene rağmen olan sonuç nonetheless ile bağlanır."
      },
      {
        prompt: "Hangisi daha temkinli bir iddiadır?",
        options: ["This proves that sleep improves memory.", "Sleep improves memory.", "The results suggest that sleep may improve memory."],
        answer: 2,
        why: "Suggest ve may gibi sözcükler iddiayı yumuşatır."
      }
    ]
  }
]
