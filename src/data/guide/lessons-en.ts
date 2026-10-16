import type { TopicLesson } from './lessonTypes'

export const EN_LESSONS: TopicLesson[] = [
  // A1
  {
    topic: "basics_en_to_be",
    language: "en",
    title: "To be (am / is / are)",
    level: "A1",
    summary: "Türkçedeki -im, -sin, -dir eklerinin İngilizce karşılığı 'be' fiilidir. Kim, ne, nerede ve nasıl olduğunu söylerken kullanılır.",
    rules: [
      "I am, he/she/it is, we/you/they are: özneye göre biçim değişir.",
      "Konuşmada kısaltılır: I'm, he's, she's, it's, we're, you're, they're.",
      "Olumsuz için be'den sonra not gelir: I'm not, she isn't, they aren't.",
      "Soru için be özneden önce gelir: Is she a teacher? Are you tired?",
      "Kısa cevapta be tekrar edilir: Yes, I am. / No, she isn't.",
      "Cümlede başka fiil yoksa be zorunludur: 'She happy' değil 'She is happy'.",
      "Geçmişte was (I/he/she/it) ve were (we/you/they) olur: I was at home."
    ],
    examples: [
      { text: "I am a student, and my sister is a nurse.", tr: "Ben öğrenciyim, kız kardeşim de hemşire." },
      { text: "We aren't hungry right now.", tr: "Şu an aç değiliz." },
      { text: "Is your office near the station?", tr: "Ofisin istasyona yakın mı?" },
      { text: "\"Are they from Izmir?\" \"Yes, they are.\"", tr: "\"İzmirli mi onlar?\" \"Evet.\"" },
      { text: "It was very cold yesterday.", tr: "Dün hava çok soğuktu." }
    ],
    watch: [
      "Türkçede ek yettiği için be'yi atlamak: 'He very tired' değil 'He is very tired'.",
      "Başka bir fiille birlikte be kullanmak: 'I am agree' değil 'I agree'; 'I am go' değil 'I go'.",
      "Yaş söylerken have kullanmak: 'I have 25 years' değil 'I am 25'.",
      "Soruda sırayı unutmak: 'You are ready?' yerine 'Are you ready?'."
    ],
    tip: "Cümlede başka fiil yoksa bir am/is/are arayın; varsa be'ye gerek yok.",
    check: [
      {
        prompt: "My parents ___ teachers.",
        options: ["is", "are", "am"],
        answer: 1,
        why: "Çoğul özneyle (they, my parents) be fiili are olur."
      },
      {
        prompt: "She ___ at home yesterday.",
        options: ["is", "were", "was"],
        answer: 2,
        why: "Geçmişte he/she/it ile was kullanılır."
      },
      {
        prompt: "\"Yorgunum\" İngilizcede nasıl söylenir?",
        options: ["I am tired.", "I tired.", "I have tired.", "Me tired."],
        answer: 0,
        why: "Cümlede başka fiil yoksa be zorunludur: I am tired."
      }
    ]
  },
  {
    topic: "basics_en_present_simple",
    language: "en",
    title: "Geniş zaman ve şimdiki zaman",
    level: "A1",
    summary: "Present simple alışkanlıkları ve genel gerçekleri, present continuous ise şu anda ya da bu günlerde süren işleri anlatır.",
    rules: [
      "Present simple: fiilin yalın hâli; he/she/it ile -s alır: she works, he goes, it watches.",
      "Soru ve olumsuzda do/does kullanılır; does geldiğinde fiil -s almaz: Does she work? She doesn't work.",
      "Sıklık zarfları (always, usually, often, never) asıl fiilden önce, be'den sonra gelir.",
      "Present continuous: am/is/are + -ing: I am reading, they are waiting.",
      "Şimdi (now, at the moment) ve geçici durumlar (this week) için continuous kullanılır.",
      "Know, like, want, need, believe gibi durum fiilleri genellikle -ing almaz: I know, not 'I am knowing'."
    ],
    examples: [
      { text: "My brother works in a bank and usually takes the bus.", tr: "Erkek kardeşim bir bankada çalışır ve genelde otobüse biner." },
      { text: "Water boils at 100 degrees.", tr: "Su 100 derecede kaynar." },
      { text: "Does your father speak English?", tr: "Baban İngilizce konuşur mu?" },
      { text: "Be quiet, the baby is sleeping.", tr: "Sessiz ol, bebek uyuyor." },
      { text: "I'm staying with a friend this week.", tr: "Bu hafta bir arkadaşımda kalıyorum." }
    ],
    watch: [
      "Üçüncü tekil -s'yi unutmak: 'She live in Ankara' değil 'She lives in Ankara'.",
      "Does'tan sonra da -s eklemek: 'Does he likes' değil 'Does he like'.",
      "Türkçedeki -iyor her yerde kullanıldığı için alışkanlığa continuous demek: 'I am going to work every day' değil 'I go to work every day'.",
      "Durum fiillerini -ing ile kullanmak: 'I am wanting' değil 'I want'."
    ],
    tip: "he, she, it: fiile bir -s; do/does geldiyse -s ondadır, fiilde değil.",
    check: [
      {
        prompt: "My sister ___ in a hospital.",
        options: ["work", "works", "working"],
        answer: 1,
        why: "Geniş zamanda he/she/it ile fiil -s alır."
      },
      {
        prompt: "___ your brother like football?",
        options: ["Do", "Is", "Does"],
        answer: 2,
        why: "Üçüncü tekilde soru does ile kurulur, fiil yalın kalır."
      },
      {
        prompt: "Be quiet! The baby ___.",
        options: ["is sleeping", "sleeps", "sleep"],
        answer: 0,
        why: "Şu anda süren iş için present continuous kullanılır."
      }
    ]
  },
  {
    topic: "basics_en_past_simple",
    language: "en",
    title: "Geçmiş zaman (past simple)",
    level: "A1",
    summary: "Geçmişte başlayıp bitmiş olayları anlatır; Türkçedeki -di'li geçmiş zamanın karşılığıdır.",
    rules: [
      "Düzenli fiiller -ed alır: work → worked, live → lived, stop → stopped, study → studied.",
      "Sık kullanılan düzensiz fiiller ezberlenir: go → went, have → had, see → saw, make → made, take → took, buy → bought.",
      "Biçim bütün kişilerde aynıdır: I went, she went, they went.",
      "Olumsuz: didn't + yalın fiil: I didn't go.",
      "Soru: Did + özne + yalın fiil: Did you see him?",
      "Genellikle bitmiş bir zaman ifadesiyle gelir: yesterday, last week, in 2020, two days ago."
    ],
    examples: [
      { text: "We visited my grandparents last weekend.", tr: "Geçen hafta sonu büyükannemlerle büyükbabamları ziyaret ettik." },
      { text: "She went to Rome in 2019 and loved it.", tr: "2019'da Roma'ya gitti ve çok sevdi." },
      { text: "I didn't sleep well last night.", tr: "Dün gece iyi uyumadım." },
      { text: "Did you buy the tickets yesterday?", tr: "Biletleri dün aldın mı?" },
      { text: "They arrived two hours ago.", tr: "İki saat önce geldiler." }
    ],
    watch: [
      "Did'den sonra fiili de geçmiş yapmak: 'Did you went?' değil 'Did you go?'.",
      "Düzensiz fiile -ed eklemek: 'goed', 'buyed' değil 'went', 'bought'.",
      "Olumsuzda was kullanmak: 'I was not go' değil 'I didn't go'."
    ],
    tip: "Did bir kez geçmişi taşır; arkasındaki fiil hep yalın kalır.",
    check: [
      {
        prompt: "Did you ___ the film last night?",
        options: ["saw", "see", "seen", "seeing"],
        answer: 1,
        why: "Did geçmişi taşır; arkasındaki fiil yalın kalır."
      },
      {
        prompt: "We ___ to Antalya last summer.",
        options: ["go", "goed", "went"],
        answer: 2,
        why: "Go düzensizdir; geçmiş biçimi went olur."
      },
      {
        prompt: "\"Gitmedim\" hangisiyle söylenir?",
        options: ["I didn't go.", "I didn't went.", "I wasn't go."],
        answer: 0,
        why: "Geçmişte olumsuz didn't + yalın fiil ile kurulur."
      }
    ]
  },
  // A2
  {
    topic: "basics_en_plurals_quantifiers",
    language: "en",
    title: "Çoğullar ve miktar sözcükleri",
    level: "A2",
    summary: "İngilizcede isimler sayılabilir ya da sayılamaz olur; bu ayrım çoğul ekini ve some, any, much, many seçimini belirler.",
    rules: [
      "Çoğul çoğunlukla -s ile: book → books; -s, -sh, -ch, -x sonrası -es: box → boxes; ünsüz + y → -ies: city → cities.",
      "Düzensiz çoğullar: man → men, woman → women, child → children, person → people, foot → feet, tooth → teeth.",
      "Sayılamayan isimler (water, money, advice, information, furniture, news) çoğul olmaz ve a/an almaz.",
      "Some çoğunlukla olumlu cümlede, any olumsuz ve soru cümlesinde: I have some milk. Is there any milk?",
      "Many sayılabilir çoğulla, much sayılamayanla: many books, much time. Olumlu cümlede 'a lot of' daha doğaldır.",
      "A few (birkaç) sayılabilirle, a little (biraz) sayılamayanla kullanılır.",
      "Few / little ile a few / a little farkı: 'a' eki olumlu bir tondur (a few / a little = az da olsa var, yeterli; few / little = neredeyse hiç yok, yetersiz).",
      "Sayıdan sonra isim çoğul olur: two apples, three years."
    ],
    examples: [
      { text: "There are three children and two women in the room.", tr: "Odada üç çocuk ve iki kadın var." },
      { text: "Can you give me some advice?", tr: "Bana biraz tavsiye verebilir misin?" },
      { text: "We don't have any bread left.", tr: "Hiç ekmeğimiz kalmadı." },
      { text: "How much money did you spend?", tr: "Ne kadar para harcadın?" },
      { text: "I have a few friends in London.", tr: "Londra'da birkaç arkadaşım var." },
      { text: "He has few friends and feels lonely.", tr: "Neredeyse hiç arkadaşı yok ve kendini yalnız hissediyor ('few' olumsuz yetersizlik bildirir)." }
    ],
    watch: [
      "Türkçede sayıdan sonra isim tekil kaldığı için: 'two year' değil 'two years'.",
      "Sayılamayanı çoğul yapmak: 'informations', 'advices', 'furnitures' yanlış.",
      "People'ı tekil saymak: 'People is' değil 'People are'.",
      "Few ile a few arasındaki farkı kaçırmak: 'I have few friends' (neredeyse hiç yok, yalnızım) ile 'I have a few friends' (birkaç tane var, yeterli) farklı hissettirir.",
      "Much ile sayılabilir isim: 'much friends' değil 'many friends'."
    ],
    tip: "'How many?' sorusuna sayıyla cevap verebiliyorsanız isim sayılabilirdir.",
    check: [
      {
        prompt: "There are three ___ in the garden.",
        options: ["child", "childs", "children"],
        answer: 2,
        why: "Child düzensizdir; çoğulu children olur."
      },
      {
        prompt: "How ___ money do you need?",
        options: ["many", "much", "few"],
        answer: 1,
        why: "Money sayılamaz; sayılamayan isimle much kullanılır."
      },
      {
        prompt: "Can you give me some ___?",
        options: ["advice", "advices", "an advice"],
        answer: 0,
        why: "Advice sayılamaz: çoğul olmaz ve a/an almaz."
      }
    ]
  },
  {
    topic: "basics_en_future",
    language: "en",
    title: "Gelecek zaman (will / going to)",
    level: "A2",
    summary: "İngilizcede gelecek tek bir zamanla anlatılmaz: anlık karar, plan ve ayarlanmış randevu için ayrı yapılar vardır.",
    rules: [
      "Will + yalın fiil: konuşurken verilen karar, söz, teklif ve tahmin: I'll help you.",
      "Be going to + yalın fiil: önceden verilmiş karar ve plan: I'm going to study medicine.",
      "Going to, şimdiki kanıta dayalı tahmin için de kullanılır: Look at the clouds, it's going to rain.",
      "Present continuous: saati, yeri belli ayarlanmış işler: I'm meeting Ali at six.",
      "Olumsuz: won't (will not) / am not going to; soru: Will you…? / Are you going to…?",
      "When, if, before, after gibi zaman ve koşul bağlaçlarından sonra will değil present simple gelir: when I arrive."
    ],
    examples: [
      { text: "It's hot in here. I'll open the window.", tr: "Burası sıcak. Pencereyi açayım." },
      { text: "We're going to buy a new car next year.", tr: "Seneye yeni bir araba alacağız." },
      { text: "I'm flying to Berlin on Friday.", tr: "Cuma günü Berlin'e uçuyorum." },
      { text: "I think she'll pass the exam.", tr: "Bence sınavı geçecek." },
      { text: "Call me when you get home.", tr: "Eve varınca beni ara." }
    ],
    watch: [
      "Zaman bağlacından sonra will kullanmak: 'when I will arrive' değil 'when I arrive'.",
      "Will'den sonra to eklemek: 'I will to go' değil 'I will go'.",
      "Önceden yapılmış plan için will: kararı önceden verdiyseniz 'I'm going to' daha doğaldır."
    ],
    tip: "Karar şimdi mi verildi? will. Önceden mi? going to. Takvimde mi? -ing.",
    check: [
      {
        prompt: "Look at those black clouds! It ___ rain.",
        options: ["is going to", "will to", "goes to"],
        answer: 0,
        why: "Şimdiki kanıta dayalı tahmin be going to ile söylenir."
      },
      {
        prompt: "Call me when you ___ home.",
        options: ["will get", "get", "are going to get"],
        answer: 1,
        why: "When gibi zaman bağlaçlarından sonra gelecek için present simple gelir."
      },
      {
        prompt: "Konuşurken o anda verilen bir karar hangisiyle söylenir?",
        options: ["be going to + yalın fiil", "present continuous", "will + yalın fiil"],
        answer: 2,
        why: "Anlık karar, söz ve teklif will ile söylenir."
      }
    ]
  },
  {
    topic: "basics_en_comparatives",
    language: "en",
    title: "Karşılaştırma (-er / more, the -est / most)",
    level: "A2",
    summary: "İki şeyi karşılaştırmak için comparative, bir grubun en ...'sini söylemek için superlative, eşitlik için as … as kullanılır.",
    rules: [
      "Tek heceli sıfatlar -er / the -est alır: cheap → cheaper → the cheapest; big → bigger → the biggest.",
      "-y ile biten iki heceli sıfatlar -ier / -iest: happy → happier → the happiest.",
      "Uzun sıfatlar more / the most alır: expensive → more expensive → the most expensive.",
      "Düzensizler: good → better → the best; bad → worse → the worst; far → further → the furthest.",
      "Karşılaştırılan şeyden önce than gelir: Ankara is bigger than Izmir.",
      "Eşitlik as + sıfat + as ile: She is as tall as her mother; olumsuzu not as … as.",
      "Superlative'de genellikle in (yer, grup) ya da of kullanılır: the best student in the class."
    ],
    examples: [
      { text: "This hotel is cheaper than the one near the beach.", tr: "Bu otel sahildekinden daha ucuz." },
      { text: "Today is the hottest day of the year.", tr: "Bugün yılın en sıcak günü." },
      { text: "The second exam was more difficult than the first.", tr: "İkinci sınav birincisinden daha zordu." },
      { text: "My English is not as good as yours.", tr: "Benim İngilizcem seninki kadar iyi değil." },
      { text: "It's the best film I've ever seen.", tr: "Şimdiye kadar izlediğim en iyi film." }
    ],
    watch: [
      "İkisini birlikte kullanmak: 'more cheaper' değil 'cheaper'.",
      "Than yerine 'from' ya da 'then' kullanmak: 'bigger from' değil 'bigger than'.",
      "Superlative'de the'yi unutmak: 'She is best student' değil 'She is the best student'.",
      "Düzensizleri düzenli yapmak: 'gooder', 'badder' değil 'better', 'worse'."
    ],
    tip: "Kısa sıfata ek, uzun sıfata kelime: -er/-est ya da more/most, ikisi asla birlikte değil.",
    check: [
      {
        prompt: "My car is ___ than yours.",
        options: ["more fast", "faster", "fastest", "more faster"],
        answer: 1,
        why: "Tek heceli sıfat -er alır; more ile birlikte kullanılmaz."
      },
      {
        prompt: "This is the ___ hotel in the city.",
        options: ["most expensive", "more expensive", "expensivest"],
        answer: 0,
        why: "Uzun sıfatlarda superlative the most ile kurulur."
      },
      {
        prompt: "Ankara is not as big ___ Istanbul.",
        options: ["than", "from", "as"],
        answer: 2,
        why: "Eşitlik ve onun olumsuzu as … as kalıbıyla kurulur."
      }
    ]
  },
  {
    topic: "articles_en",
    language: "en",
    title: "Artikeller (a / an / the)",
    level: "A2",
    summary: "Türkçede olmayan artikeller, ismin belirsiz mi (a/an), belirli mi (the) yoksa genel mi (artikelsiz) olduğunu gösterir.",
    rules: [
      "A/an yalnızca sayılabilir tekil isimle ve ilk kez anılan, belirsiz bir şey için: I saw a dog.",
      "A ya da an harfe değil sese bakar: an apple, an hour, an MA; a university, a hospital.",
      "The daha önce anılan ya da dinleyicinin bildiği şey için: The dog was huge.",
      "Tek olan şeyler, superlative'ler, çalgılar, nehir, deniz ve dağ silsileleri the alır: the sun, the best, the piano, the Nile, the Alps.",
      "Genel anlamda sayılamayan ve çoğul isimler artikelsizdir: Music makes people happy.",
      "Meslek söylerken a/an gerekir: She is an engineer.",
      "Sporlar, öğünler ve asıl amacıyla kullanılan yerler artikelsizdir: play football, have lunch, go to school."
    ],
    examples: [
      { text: "I bought a jacket and a hat, but the hat was too small.", tr: "Bir ceket ve bir şapka aldım, ama şapka çok küçüktü." },
      { text: "My father is an architect.", tr: "Babam mimardır." },
      { text: "She plays the violin and he plays tennis.", tr: "Kız keman çalıyor, oğlan tenis oynuyor." },
      { text: "Life is short, so enjoy it.", tr: "Hayat kısa, tadını çıkar." },
      { text: "The Danube flows into the Black Sea.", tr: "Tuna, Karadeniz'e dökülür." },
      { text: "What a beautiful day!", tr: "Ne güzel bir gün!" }
    ],
    watch: [
      "Tekil sayılabilir ismi artikelsiz bırakmak: 'I have car' değil 'I have a car'; 'He is doctor' değil 'He is a doctor'.",
      "Genel anlamda the eklemek: 'The life is beautiful' değil 'Life is beautiful'.",
      "Yazıya bakıp an/a seçmek: 'a hour' değil 'an hour'; 'an university' değil 'a university'.",
      "Sayılamayan isme a/an vermek: 'an advice' değil 'some advice' ya da 'a piece of advice'.",
      "Asıl amacıyla kullanılan kurumlarda the eklememek: 'go to school' (öğrenci olarak gitmek), 'go to the school' (binayı ziyaret etmek); 'go to hospital' (hasta olarak yatmak), 'go to the hospital' (ziyaretçi olarak gitmek)."
    ],
    tip: "Türkçede 'bir' diyebiliyorsanız a/an, 'o bildiğimiz' diyebiliyorsanız the."
  },
  {
    topic: "present_perfect",
    language: "en",
    title: "Present perfect ve past simple",
    level: "A2",
    summary: "Present perfect geçmişi şimdiye bağlar (deneyim, süren durum, yeni sonuç); past simple ise belirli, bitmiş bir zamanda olanı anlatır.",
    rules: [
      "Present perfect: have/has + V3: I have seen, she has left.",
      "Hayat deneyimi (zaman belirtmeden) present perfect: Have you ever been to Japan? I've never eaten sushi.",
      "Been to ile gone to ayrımı: 'have been to' gidip dönmüş olmayı (ziyaret deneyimi), 'have gone to' ise bir yere gidip hâlâ orada olmayı belirtir: She has gone to Paris (hâlâ orada) vs. She has been to Paris twice (bulundu ve döndü).",
      "Geçmişte başlayıp süren durum: since + başlangıç noktası (since 2015), for + süre (for ten years).",
      "Just, already, yet, so far, this week (bitmemiş zaman) present perfect ile gelir.",
      "Belirli bitmiş zaman (yesterday, last year, ago, in 2010) varsa past simple: I saw him yesterday.",
      "When ile sorulan soru belirli zamanı sorar, past simple ister: When did you arrive?",
      "'This is the first time…' kalıbından sonra present perfect gelir."
    ],
    examples: [
      { text: "I have lived in Istanbul since 2018.", tr: "2018'den beri İstanbul'da yaşıyorum." },
      { text: "Have you ever tried Indian food?", tr: "Hiç Hint yemeği denedin mi?" },
      { text: "— Have you seen the new movie? — Yes, I watched it on Sunday.", tr: "— Yeni filmi gördün mü? — Evet, pazar günü izledim." },
      { text: "He has just left the office.", tr: "Az önce ofisten çıktı." },
      { text: "We met in 2015 and got married two years later.", tr: "2015'te tanıştık ve iki yıl sonra evlendik." },
      { text: "I haven't finished my report yet.", tr: "Raporumu henüz bitirmedim." }
    ],
    watch: [
      "Türkçedeki şimdiki zamanı aktarmak: 'I live here since 2018' değil 'I have lived here since 2018'.",
      "Belirli zamanla present perfect: 'I have seen him yesterday' değil 'I saw him yesterday'.",
      "Been to ile gone to'yu karıştırmak: 'She has gone to Italy' şu an İtalya'da olduğunu; 'She has been to Italy' ise daha önce gidip döndüğünü belirtir.",
      "For ile since'i karıştırmak: 'since five years' değil 'for five years'.",
      "Ever ile did kullanmak: 'Did you ever been' değil 'Have you ever been'."
    ],
    tip: "Cümlede yesterday, ago, last, in 2010 varsa present perfect'i unutun."
  },
  // B1
  {
    topic: "gerund_infinitive",
    language: "en",
    title: "Gerund ve infinitive",
    level: "B1",
    summary: "Bir fiilden sonra gelen ikinci fiil ya -ing (gerund) ya da to + yalın fiil (infinitive) olur; hangisinin geleceğini ilk fiil belirler.",
    rules: [
      "Enjoy, avoid, finish, mind, suggest, keep, consider + -ing: I enjoy cooking.",
      "Decide, hope, plan, refuse, want, promise, afford + to: She decided to leave.",
      "Edattan sonra her zaman -ing gelir: interested in learning, admit to stealing.",
      "Look forward to, be used to, object to'daki to bir edattır: look forward to seeing you.",
      "Be worth, can't help, it's no use + -ing: This book is worth reading.",
      "Remember / forget + -ing: yapılmış olanı anımsamak; + to: yapılacak işi unutmamak.",
      "Stop + -ing: bir işi bırakmak; stop + to: bir şey yapmak için durmak.",
      "Try + to: bir şeyi yapmak için çaba harcamak/zorlanmak; try + -ing: bir çözüm veya yöntem olarak denemek."
    ],
    examples: [
      { text: "He avoided talking about his new job.", tr: "Yeni işinden söz etmekten kaçındı." },
      { text: "We can't afford to buy a house this year.", tr: "Bu yıl ev almaya gücümüz yetmez." },
      { text: "Don't forget to lock the door when you leave.", tr: "Çıkarken kapıyı kilitlemeyi unutma." },
      { text: "I remember meeting her at a wedding.", tr: "Onunla bir düğünde tanıştığımı hatırlıyorum." },
      { text: "He stopped smoking two years ago.", tr: "İki yıl önce sigarayı bıraktı." },
      { text: "If you can't sleep, try drinking warm milk.", tr: "Uyuyamıyorsan ılık süt içmeyi dene (yöntem olarak)." },
      { text: "I'm looking forward to hearing from you.", tr: "Sizden haber almayı dört gözle bekliyorum." }
    ],
    watch: [
      "Edattan sonra yalın fiil: 'interested in learn' değil 'interested in learning'.",
      "Look forward to'dan sonra yalın fiil: 'look forward to see you' değil 'look forward to seeing you'.",
      "Stop to ile stop -ing'i karıştırmak: 'He stopped to smoke' sigara içmek için durdu demektir.",
      "Try to ile try -ing'i karıştırmak: 'Try to turn it off' (kapatmaya çabalamak) vs 'Try turning it off' (kapatmayı denemek).",
      "Suggest'ten sonra to: 'He suggested to go' değil 'He suggested going'."
    ],
    tip: "Edattan sonra -ing; 'to' edat mı diye bakmak için yerine bir isim koyun: 'look forward to the trip' oluyorsa to edattır."
  },
  {
    topic: "conn_en",
    language: "en",
    title: "Bağlaçlar (fikrin yönü)",
    level: "B1",
    summary: "Bağlaçlar iki fikrin ilişkisini gösterir: zıtlık, neden, sonuç, ekleme ya da koşul. Doğru bağlacı seçmek için önce fikrin yönüne bakılır.",
    rules: [
      "Zıtlık: but, however, nevertheless, although, though, whereas, despite / in spite of.",
      "Although + cümle, despite + isim ya da -ing: although it rained / despite the rain.",
      "Neden: because, since, as (+ cümle); because of, due to (+ isim).",
      "Sonuç: so, therefore, consequently, as a result.",
      "Ekleme (aynı yön): and, moreover, furthermore, in addition, also.",
      "Koşul: if, unless (= -medikçe, if … not), otherwise (= aksi hâlde), as long as.",
      "However, therefore, moreover cümle başında ve ardından virgülle kullanılır."
    ],
    examples: [
      { text: "The flat is small. However, it is very close to the centre.", tr: "Daire küçük. Ancak merkeze çok yakın." },
      { text: "Although she was tired, she finished the report.", tr: "Yorgun olmasına rağmen raporu bitirdi." },
      { text: "Despite the traffic, we arrived on time.", tr: "Trafiğe rağmen zamanında vardık." },
      { text: "The trains were cancelled; consequently, many people missed the meeting.", tr: "Trenler iptal edildi; bu yüzden birçok kişi toplantıyı kaçırdı." },
      { text: "I won't go out unless the rain stops.", tr: "Yağmur dinmedikçe dışarı çıkmam." },
      { text: "My brother loves football, whereas I prefer tennis.", tr: "Ağabeyim futbolu sever, oysa ben tenisi tercih ederim." }
    ],
    watch: [
      "Despite'tan sonra cümle: 'despite it was raining' değil 'despite the rain' ya da 'although it was raining'.",
      "Although ile but'ı birlikte kullanmak: Türkçedeki '-e rağmen … ama' yapısı İngilizcede yanlıştır.",
      "Unless'i olumsuzla kullanmak: 'unless you don't hurry' değil 'unless you hurry'.",
      "Moreover'ı zıtlık için kullanmak: moreover aynı yönde bilgi ekler."
    ],
    tip: "Önce sorun: ikinci fikir birinciyle aynı yönde mi, ters yönde mi, yoksa onun sonucu mu?"
  },
  {
    topic: "prep_en",
    language: "en",
    title: "Fiil, sıfat ve edat",
    level: "B1",
    summary: "Birçok fiil ve sıfat belirli bir edatla kalıplaşmıştır; bu edat Türkçedeki hâl ekinden tahmin edilemez, birlikte öğrenilmelidir.",
    rules: [
      "On: depend on, rely on, focus on, concentrate on, insist on, congratulate someone on.",
      "In: be interested in, succeed in, believe in.",
      "Of: be afraid of, be proud of, accuse someone of, remind someone of.",
      "For: apologise for, be responsible for, wait for, pay for.",
      "About: worry about, complain about, think about; with: deal with, be fed up with.",
      "To: belong to, contribute to, look forward to; from: suffer from; at: be good at.",
      "Evlilik ve boşanma: 'marry' ve 'divorce' fiilleri etken kullanımda edatsızdır: 'She married John' ('married with' değil). Sıfat / durum kullanımında ise 'to' gelir: 'She is married to John'.",
      "Edattan sonra fiil gelirse -ing olur: insist on paying, succeed in finding."
    ],
    examples: [
      { text: "It depends on the weather.", tr: "Havaya bağlı." },
      { text: "She is very good at solving problems.", tr: "Sorun çözmede çok iyidir." },
      { text: "He apologised for being late.", tr: "Geç kaldığı için özür diledi." },
      { text: "She married an architect last year.", tr: "Geçen yıl bir mimarla evlendi ('marry with' değil, etken fiil edatsızdır)." },
      { text: "I'm fed up with waiting for the bus.", tr: "Otobüs beklemekten bıktım." },
      { text: "This song reminds me of my childhood.", tr: "Bu şarkı bana çocukluğumu hatırlatıyor." },
      { text: "Who does this bag belong to?", tr: "Bu çanta kimin?" }
    ],
    watch: [
      "Türkçedeki hâl ekini çevirmek: '-e bağlı' diye 'depend to' değil 'depend on'; '-den korkmak' diye 'afraid from' değil 'afraid of'.",
      "'Biriyle evlenmek' için 'married with' demek: 'She married with John' yanlıştır; etken fiilde edatsız 'She married John', sıfatta ise 'She is married to John' denir.",
      "Edattan sonra yalın fiil: 'succeed in pass' değil 'succeed in passing'.",
      "Be used to ile used to'yu karıştırmak: 'I'm used to work' değil 'I'm used to working'."
    ],
    tip: "Kelimeyi hep edatıyla birlikte not edin: 'depend' değil 'depend on'."
  },
  {
    topic: "colloc_en",
    language: "en",
    title: "Eşdizimler (hangi fiil?)",
    level: "B1",
    summary: "Bazı isimler belirli fiillerle kalıplaşır; Türkçede hepsi 'yapmak' ya da 'etmek' olsa da İngilizcede make, do, take, have gibi farklı fiiller gerekir.",
    rules: [
      "Make: bir şey ortaya çıkarmak: make a mistake, make a decision, make an effort, make progress, make a profit.",
      "Do: iş, görev, genel etkinlik: do homework, do your best, do someone a favour, do the shopping.",
      "Take: take a photo, take a break, take a risk, take advantage of.",
      "Have: have a shower, have lunch, have a look, have fun.",
      "Pay attention, keep a promise, catch a cold, lose patience, save / waste time.",
      "Sıfatlar da kalıplaşır: heavy rain, strong coffee, strong wind."
    ],
    examples: [
      { text: "Everyone makes mistakes when they learn a language.", tr: "Dil öğrenirken herkes hata yapar." },
      { text: "Could you do me a favour?", tr: "Bana bir iyilik yapar mısın?" },
      { text: "Let's take a short break.", tr: "Kısa bir mola verelim." },
      { text: "Please pay attention to the instructions.", tr: "Lütfen talimatlara dikkat edin." },
      { text: "We got stuck in heavy rain on the motorway.", tr: "Otoyolda sağanağa yakalandık." },
      { text: "He always keeps his promises.", tr: "Sözünü hep tutar." }
    ],
    watch: [
      "'Hata yapmak'ı çevirmek: 'do a mistake' değil 'make a mistake'.",
      "'Karar vermek'i çevirmek: 'give a decision' değil 'make a decision'.",
      "'Fotoğraf çekmek'i çevirmek: 'pull a photo' değil 'take a photo'.",
      "'Sert kahve, şiddetli yağmur': 'hard coffee', 'strong rain' değil 'strong coffee', 'heavy rain'."
    ],
    tip: "Kelimeyi tek başına değil, fiiliyle öğrenin: 'decision' değil 'make a decision'."
  },
  {
    topic: "reported_speech",
    language: "en",
    title: "Dolaylı anlatım (reported speech)",
    level: "B1",
    summary: "Birinin söylediğini aktarırken, ana fiil geçmişteyse (said, told, asked) zamanlar bir adım geriye kayar ve zaman, yer ifadeleri değişir.",
    rules: [
      "Zaman bir adım geri: am/is → was, present simple → past simple, past simple ve present perfect → past perfect, will → would, can → could.",
      "Say kişi almaz (said that…), tell kişi ister (told me that…).",
      "Dolaylı soruda düz cümle sırası, do/did yok: He asked where I lived.",
      "Evet/hayır sorusu if ya da whether ile: She asked if I was ready.",
      "Emir: tell + kişi + to + fiil; olumsuzu not to: He told us not to be late.",
      "Zaman ve yer ifadeleri kayar: tomorrow → the next day, yesterday → the day before, here → there, now → then.",
      "Genel gerçekler, doğa kanunları veya aktarım anında hâlâ geçerli olan durumlarda zaman geriye kaydırılmayabilir: 'The teacher said that water boils at 100 degrees.'"
    ],
    examples: [
      { text: "She said that she was tired.", tr: "Yorgun olduğunu söyledi." },
      { text: "He told me he had finished the project.", tr: "Bana projeyi bitirdiğini söyledi." },
      { text: "They asked me where I worked.", tr: "Bana nerede çalıştığımı sordular." },
      { text: "The teacher explained that the Earth goes round the Sun.", tr: "Öğretmen, Dünya'nın Güneş etrafında döndüğünü açıkladı (evrensel gerçek)." },
      { text: "My boss asked whether I could stay late.", tr: "Patronum geç saate kadar kalıp kalamayacağımı sordu." },
      { text: "The doctor told him to stop smoking.", tr: "Doktor ona sigarayı bırakmasını söyledi." },
      { text: "She said she would call me the next day.", tr: "Ertesi gün beni arayacağını söyledi." }
    ],
    watch: [
      "Say'den sonra kişi: 'He said me' değil 'He told me' ya da 'He said to me'.",
      "Dolaylı soruda devrik sıra: 'He asked where did I live' değil 'He asked where I lived'.",
      "Zamanı geri kaydırmayı unutmak: 'She said she is coming tomorrow' yerine 'She said she was coming the next day'.",
      "Değişmeyen evrensel gerçeklerde gereksiz zaman kaydırmak: genel doğruları aktarırken present simple korunabilir ('He explained that water boils at 100°C')."
    ],
    tip: "Say'den sonra 'that', tell'den sonra 'kişi': said that / told me that."
  },
  {
    topic: "modals_en",
    language: "en",
    title: "Modal fiiller (must / can’t / should)",
    level: "B1",
    summary: "Modal fiiller zorunluluk, yasak, tavsiye, yetenek ve olasılık bildirir; her zaman yalın fiille kullanılır ve kişiye göre değişmez.",
    rules: [
      "Modaldan sonra yalın fiil gelir, to gelmez ve üçüncü tekilde -s yoktur: She can swim.",
      "Must ve have to: zorunluluk; mustn't: yasak.",
      "Don't have to ve needn't: gerek yok (yasak değil).",
      "Should: tavsiye; 'If I were you, I would…' da tavsiye kalıbıdır.",
      "Olasılık: must be (kesin olmalı), might / may / could be (olabilir), can't be (olamaz).",
      "Geçmişe çıkarım: must have + V3 (-miş olmalı), can't have + V3 (-miş olamaz).",
      "Geçmişteki genel yetenek could ile: I could swim when I was five.",
      "Must'ın geçmiş biçimi yoktur; geçmişteki zorunluluk için daima had to kullanılır: I had to wake up early yesterday."
    ],
    examples: [
      { text: "You must wear a seat belt in the car.", tr: "Arabada emniyet kemeri takmak zorundasın." },
      { text: "You mustn't smoke in the hospital.", tr: "Hastanede sigara içmemelisin (yasak)." },
      { text: "You don't have to come if you're busy.", tr: "Meşgulsen gelmek zorunda değilsin." },
      { text: "She isn't answering; she might be in a meeting.", tr: "Cevap vermiyor; toplantıda olabilir." },
      { text: "That can't be true.", tr: "Bu doğru olamaz." },
      { text: "I was late because I had to wait for the bus.", tr: "Geç kaldım çünkü otobüs beklemek zorundaydım." },
      { text: "The lights are off. They must have left already.", tr: "Işıklar kapalı. Çoktan çıkmış olmalılar." }
    ],
    watch: [
      "Modaldan sonra to: 'I must to go' değil 'I must go'.",
      "Üçüncü tekilde -s: 'She cans' ya da 'He musts' yanlış.",
      "Mustn't'ı 'gerek yok' sanmak: mustn't yasak; gerek yoksa 'don't have to'.",
      "Geçmiş zorunlulukta must kullanmak: 'Yesterday I must work' değil 'Yesterday I had to work'.",
      "Geçmiş çıkarımda had: 'must had left' değil 'must have left'."
    ],
    tip: "Mustn't = yapma! Don't have to = istersen yapma."
  },
  {
    topic: "passive_en",
    language: "en",
    title: "Edilgen yapı (passive)",
    level: "B1",
    summary: "Edilgen yapı, işi yapandan çok işin kendisi önemli olduğunda kullanılır; Türkçedeki -il / -in ekinin karşılığıdır.",
    rules: [
      "Kuruluş: be + V3 (past participle); zamanı be gösterir: is made, was built, will be announced.",
      "Present continuous: is being + V3; present perfect: has been + V3.",
      "Modaldan sonra: must / can / should + be + V3: must be cleaned.",
      "İşi yapan söylenecekse by ile: The book was written by Orhan Pamuk.",
      "Genel söylenti: It is said that… ya da He is said to be…",
      "Bir işi başkasına yaptırmak: have / get + nesne + V3: I had my hair cut."
    ],
    examples: [
      { text: "English is spoken in many countries.", tr: "İngilizce birçok ülkede konuşulur." },
      { text: "This bridge was built in 1973.", tr: "Bu köprü 1973'te yapıldı." },
      { text: "The winners will be announced tomorrow.", tr: "Kazananlar yarın açıklanacak." },
      { text: "The road is being repaired, so take another route.", tr: "Yol onarılıyor, başka bir yoldan git." },
      { text: "The letters haven't been sent yet.", tr: "Mektuplar henüz gönderilmedi." },
      { text: "I had my car washed yesterday.", tr: "Dün arabamı yıkattım." }
    ],
    watch: [
      "Be'yi atlamak: 'The bridge built in 1973' değil 'The bridge was built in 1973'.",
      "Düzensiz fiilin V3'ünü yanlış yazmak: 'was writed', 'was catched' değil 'was written', 'was caught'.",
      "Ettirgeni çevirmek: 'I cut my hair' saçımı kendim kestim demektir; berberde 'I had my hair cut'."
    ],
    tip: "Önce zamanı be'ye, sonra fiili hep V3'e verin: be + V3."
  },
  {
    topic: "relatives_en",
    language: "en",
    title: "İlgi cümleleri (who / which / whose / where)",
    level: "B1",
    summary: "İlgi cümleleri bir ismi tanımlar ya da ona bilgi ekler; Türkçede ismin önüne gelen -en, -dığı yapılarının karşılığıdır ve İngilizcede ismin arkasına gelir.",
    rules: [
      "Who kişiler, which şeyler için; that ikisinin yerine de geçebilir (virgülsüz cümlede).",
      "Whose sahiplik: the girl whose bike was stolen.",
      "Where yer, when zaman, why neden bildirir: the town where I grew up, the reason why he left.",
      "Virgüllü (ek bilgi veren) ilgi cümlesinde that kullanılmaz: My brother, who lives in Bursa, …",
      "Virgüllü which önceki cümlenin tamamına da atıf yapabilir: He passed, which surprised everyone.",
      "Edattan sonra kişi için whom, şey için which: the man to whom I spoke.",
      "What = the thing that; bir isimden sonra gelmez: Tell me what you want."
    ],
    examples: [
      { text: "The woman who lives next door is a pilot.", tr: "Yan dairede oturan kadın pilottur." },
      { text: "This is the phone which I bought last week.", tr: "Bu geçen hafta aldığım telefon." },
      { text: "I met a man whose brother works with you.", tr: "Kardeşi seninle çalışan bir adamla tanıştım." },
      { text: "That's the café where we first met.", tr: "İlk tanıştığımız kafe orası." },
      { text: "My sister, who is a doctor, works in Ankara.", tr: "Doktor olan ablam Ankara'da çalışıyor." },
      { text: "He missed the train, which made him late.", tr: "Treni kaçırdı, bu da onu geciktirdi." }
    ],
    watch: [
      "Kişi için which: 'the man which' değil 'the man who'.",
      "İsimden sonra what: 'the book what I read' değil 'the book that/which I read'.",
      "Zamiri tekrar etmek: 'the book which I read it' değil 'the book which I read'.",
      "Virgüllü cümlede that: 'My father, that is a teacher' değil 'My father, who is a teacher'."
    ],
    tip: "Türkçedeki sırayı ters çevirin: 'dün tanıştığım adam' = 'the man (who) I met yesterday'."
  },
  // B2
  {
    topic: "mixed_conditionals",
    language: "en",
    title: "Karma şart cümleleri",
    level: "B2",
    summary: "Karma şart cümleleri farklı zamanları birleştirir: geçmişteki bir koşulun bugünkü sonucunu ya da bugünkü bir özelliğin geçmişteki sonucunu anlatır.",
    rules: [
      "Geçmiş koşul → bugünkü sonuç: if + past perfect, would + yalın fiil: If I had studied, I would be a doctor now.",
      "Bugünkü (kalıcı) durum → geçmiş sonuç: if + past simple, would have + V3: If I were braver, I would have said something.",
      "If cümlesinde would kullanılmaz: if I had known, 'if I would have known' değil.",
      "Now, today, right now gibi ifadeler bugünkü sonucu, yesterday, last year geçmiş koşulu işaret eder.",
      "Be fiilinde bütün kişilerle were tercih edilir: if she were."
    ],
    examples: [
      { text: "If I had accepted that job, I would be living in London now.", tr: "O işi kabul etseydim şimdi Londra'da yaşıyor olurdum." },
      { text: "If he had taken his keys, he wouldn't be locked out.", tr: "Anahtarlarını alsaydı şimdi dışarıda kalmazdı." },
      { text: "If I weren't so shy, I would have spoken to her at the party.", tr: "Bu kadar utangaç olmasaydım partide onunla konuşurdum." },
      { text: "If we had left earlier, we would be at the beach by now.", tr: "Daha erken çıksaydık şu an çoktan sahilde olurduk." },
      { text: "If she were more careful, she wouldn't have lost her phone.", tr: "Daha dikkatli biri olsaydı telefonunu kaybetmezdi." }
    ],
    watch: [
      "If cümlesine would koymak: 'If I would have known' değil 'If I had known'.",
      "Geçmiş koşulda past simple: 'If I listened earlier' değil 'If I had listened earlier'.",
      "Bugünkü sonuç için would have: 'I would have been rich now' değil 'I would be rich now'."
    ],
    tip: "Her yarıya ayrı ayrı sorun: bu kısım ne zaman? Geçmişse had / would have, bugünse past simple / would."
  },
  {
    topic: "participle_clauses",
    language: "en",
    title: "Participle clauses",
    level: "B2",
    summary: "Participle clause, aynı özneli bir yan cümleyi -ing ya da V3 ile kısaltır; yazı dilinde cümleyi akıcı ve yoğun kılar.",
    rules: [
      "Etken ve aynı anda olan eylem: -ing: Opening the door, she saw a stranger.",
      "Neden bildiren etken eylem de -ing ile: Feeling tired, he went to bed early.",
      "Önce biten eylem: having + V3: Having finished his work, he went home.",
      "Edilgen anlam: V3: Written in simple English, the guide is easy to follow.",
      "Olumsuz: not + -ing: Not knowing what to say, I kept quiet.",
      "İsmi kısaltılmış ilgi cümlesiyle tanımlar: the letters sent yesterday (= which were sent).",
      "Yan cümlenin öznesi ana cümleninkiyle aynı olmalıdır."
    ],
    examples: [
      { text: "Walking through the park, I met an old friend.", tr: "Parkta yürürken eski bir arkadaşla karşılaştım." },
      { text: "Having read the contract, she signed it.", tr: "Sözleşmeyi okuduktan sonra imzaladı." },
      { text: "Not having a car, we took the train.", tr: "Arabamız olmadığı için trene bindik." },
      { text: "Woken by the noise, the baby started to cry.", tr: "Gürültüyle uyanan bebek ağlamaya başladı." },
      { text: "The photos taken during the trip are on my laptop.", tr: "Gezide çekilen fotoğraflar dizüstü bilgisayarımda." }
    ],
    watch: [
      "Özneler farklıyken kısaltmak: 'Walking home, the rain started' yağmur yürüyor anlamına gelir.",
      "Edilgen anlamda -ing: 'Writing in 1990, the book…' değil 'Written in 1990, the book…'.",
      "Having'den sonra V3'ü unutmak: 'Having finish' değil 'Having finished'.",
      "Olumsuzda not'u yanlış yere koymak: 'Knowing not' değil 'Not knowing'."
    ],
    tip: "Türkçedeki -ken, -ince, -dığı için, -dıktan sonra kısaltmalarını düşünün: -ing, having + V3 ya da V3."
  },
  // C1
  {
    topic: "inversion",
    language: "en",
    title: "Devrik yapı (inversion)",
    level: "C1",
    summary: "Olumsuz ya da kısıtlayıcı bir ifade cümle başına gelince yardımcı fiil özneden önce geçer; soru sırası olumlu bir cümlede vurgu için kullanılır.",
    rules: [
      "Never, rarely, seldom, little cümle başındaysa yardımcı fiil + özne: Never have I seen…",
      "Yardımcı fiil yoksa do / does / did eklenir: Rarely do we see… Little did he know…",
      "Hardly / scarcely had + özne + V3 … when; no sooner had + özne + V3 … than.",
      "Not only + devrik, but (also) ile devam eder: Not only was he late, but he also…",
      "Only after / only when / only by / not until ile başlayınca devriklik ana cümlededir: Not until the end did I understand.",
      "Under no circumstances, at no time, on no account da devrik yapı kurar.",
      "Şart cümlelerinde devriklik (conditional inversion): Resmî dilde 'if' atılarak yardımcı fiil başa alınır: Had I known (= If I had known), Were I you (= If I were you), Should you need help (= If you should need help).",
      "Bu yapılar resmî ve vurguludur; günlük konuşmada düz sıra daha yaygındır."
    ],
    examples: [
      { text: "Rarely have I met such a generous person.", tr: "Bu kadar cömert birine nadiren rastladım." },
      { text: "Little did she know that her life was about to change.", tr: "Hayatının değişmek üzere olduğundan hiç haberi yoktu." },
      { text: "No sooner had we sat down than the phone rang.", tr: "Oturur oturmaz telefon çaldı." },
      { text: "Had I known about the traffic, I would have taken the train.", tr: "Trafiği bilseydim trene binerdim ('If I had known' yerine devrik yapı)." },
      { text: "Not only did he forget the meeting, but he also lost the documents.", tr: "Toplantıyı unutmakla kalmadı, belgeleri de kaybetti." },
      { text: "Only after the meeting did I realise my mistake.", tr: "Hatamı ancak toplantıdan sonra fark ettim." },
      { text: "Under no circumstances should passengers open the doors.", tr: "Yolcular hiçbir koşulda kapıları açmamalıdır." }
    ],
    watch: [
      "Yardımcı fiili eklemeyi unutmak: 'Rarely we see' değil 'Rarely do we see'.",
      "'If' ile devrik yapıyı birleştirmek: 'If had I known' kesinlikle yanlıştır; ya 'If I had known' ya da devrik 'Had I known' denmelidir.",
      "Bağlaçları karıştırmak: 'hardly … than' ya da 'no sooner … when' değil 'hardly … when', 'no sooner … than'.",
      "Not until'de yan cümleyi devirmek: devrik olan ana cümledir: 'Not until I got home did I notice'.",
      "Did'den sonra geçmiş fiil: 'Little did he knew' değil 'Little did he know'."
    ],
    tip: "Cümle başındaki olumsuz ifadeden sonra bir soru sorar gibi devam edin: Never + have I…?"
  },
  {
    topic: "cleft",
    language: "en",
    title: "Vurgulu cümle (cleft)",
    level: "C1",
    summary: "Cleft cümle, bilginin bir parçasını öne çıkarmak için cümleyi ikiye böler; Türkçede vurguyu sözcük sırası ve tonlamayla verdiğimiz işi yapar.",
    rules: [
      "It-cleft: It is / was + vurgulanan öğe + who / that…: It was Ali who called.",
      "Kişide who ya da that, zaman, yer ve diğer öğelerde that: It was in Paris that we met.",
      "Wh-cleft: What + özne + fiil + is / was…: What I need is a holiday.",
      "Eylemi vurgulamak: What he did was (to) apologise.",
      "All (that) … is / was: tek istenen şeyi vurgular: All I want is some sleep.",
      "Nedeni vurgulamak: The reason (why) … is that / was…",
      "Wh-cleft'te tekil öğe tekil be alır: What I need is…"
    ],
    examples: [
      { text: "It was my teacher who inspired me to study abroad.", tr: "Beni yurt dışında okumaya özendiren öğretmenimdi." },
      { text: "It was during my trip to Spain that I learnt to cook.", tr: "Yemek yapmayı İspanya gezimde öğrendim." },
      { text: "What I really need is a good night's sleep.", tr: "Asıl ihtiyacım olan şey iyi bir gece uykusu." },
      { text: "What she did was call the police immediately.", tr: "Yaptığı şey hemen polisi aramak oldu." },
      { text: "All he wanted was an honest answer.", tr: "Tek istediği dürüst bir cevaptı." },
      { text: "The reason why he resigned is still a mystery.", tr: "İstifa etme nedeni hâlâ bir sır." }
    ],
    watch: [
      "It-cleft'te what kullanmak: 'It was yesterday what I met her' değil 'It was yesterday that I met her'.",
      "Wh-cleft'te be'yi atlamak: 'What I need a holiday' değil 'What I need is a holiday'.",
      "Kişiyi which ile vurgulamak: 'It was my sister which…' değil 'It was my sister who…'."
    ],
    tip: "Türkçede vurguyu fiilin hemen önüne koyarsınız; İngilizcede 'It was … that' çerçevesine koyun."
  },
  {
    topic: "subjunctive",
    language: "en",
    title: "Subjunctive",
    level: "C1",
    summary: "Subjunctive, öneri, talep ve zorunluluk bildiren yapılardan sonra fiilin yalın hâlini kullanır; ayrıca gerçek dışı durumlarda were biçimiyle görülür.",
    rules: [
      "Suggest, recommend, insist, demand, request, order + that + özne + yalın fiil: I suggest that he see a doctor.",
      "It is essential / vital / important / imperative + that + yalın fiil: It is essential that everyone be informed.",
      "Üçüncü tekilde de -s yoktur: that she submit, 'submits' değil.",
      "Be fiili bütün kişilerde be olur: that he be present.",
      "Olumsuzu not + yalın fiil, do kullanılmaz: that he not leave.",
      "Edilgen: be + V3: that the data be protected.",
      "Gerçek dışı durum ve dilek: If I were you…, I wish I knew…"
    ],
    examples: [
      { text: "The doctor recommended that he quit smoking.", tr: "Doktor sigarayı bırakmasını önerdi." },
      { text: "It is vital that every passenger be on board by nine.", tr: "Her yolcunun saat dokuza kadar uçağa binmiş olması hayati önem taşıyor." },
      { text: "They demanded that the manager resign.", tr: "Müdürün istifa etmesini talep ettiler." },
      { text: "She insisted that we not tell anyone.", tr: "Kimseye söylememizde ısrar etti." },
      { text: "If I were you, I would take the job.", tr: "Yerinde olsam işi kabul ederdim." },
      { text: "I wish I knew the answer.", tr: "Keşke cevabı bilsem." }
    ],
    watch: [
      "Üçüncü tekil -s eklemek: 'that he goes' değil 'that he go'.",
      "Olumsuzda doesn't: 'that she doesn't answer' değil 'that she not answer'.",
      "Be'yi çekimlemek: 'that everyone is informed' resmî dilde 'that everyone be informed'.",
      "Suggest'ten sonra to: 'I suggest him to go' değil 'I suggest that he go'."
    ],
    tip: "That'ten sonra fiili sözlükteki hâliyle bırakın: ne -s, ne -ed, ne do."
  }
]
