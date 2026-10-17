import type { TopicLesson } from './lessonTypes'

export const EN_LESSONS_3: TopicLesson[] = [
  // A1
  {
    topic: "basics_en_present_continuous",
    language: "en",
    title: "Şimdiki zaman (present continuous)",
    level: "A1",
    summary: "Present continuous şu anda ya da bu günlerde geçici olarak süren işleri anlatır. Türkçedeki -iyor'un bir kısmını karşılar, ama her -iyor'u değil: alışkanlık ve genel gerçekler present simple ister.",
    rules: [
      "Kuruluş: am/is/are + fiil-ing: I am working, she is reading, they are playing.",
      "-ing yazımı: sondaki sessiz e düşer (make → making), tek heceli kısa fiilde son ünsüz ikilenir (run → running, sit → sitting), -ie → -y olur (lie → lying).",
      "Olumsuz: am not / isn't / aren't + -ing; soru: Are you listening? What is she doing?",
      "Şu an (now, right now, at the moment) ve geçici durumlar (today, this week, these days) için kullanılır.",
      "Alışkanlık, düzenli program ve genel gerçek present simple ile söylenir: I work in a bank (hep) / I'm working at home today (bugün).",
      "Durum fiilleri (know, like, love, want, need, believe, understand, belong, seem) genellikle -ing almaz: I understand, 'I am understanding' değil.",
      "Bazı fiillerin hem durum hem eylem anlamı vardır: I think it's good (görüş) / I'm thinking about it (düşünme eylemi); I have a car / I'm having lunch."
    ],
    table: {
      caption: "Present Continuous Kurulum ve -ing Yazım Kuralları",
      head: ["Kategori", "Kural / Formül", "Örnek", "Türkçe Karşılığı"],
      rows: [
        ["Olumlu (+)", "am / is / are + V-ing", "I'm working, she's reading", "Çalışıyorum, okuyor"],
        ["Olumsuz (-)", "am not / isn't / aren't + V-ing", "They aren't listening", "Dinlemiyorlar"],
        ["Soru (?)", "Am / Is / Are + özne + V-ing?", "What are you doing?", "Ne yapıyorsun?"],
        ["Yazım (-ing)", "-e düşer / CVC ikilenir / -ie → -y", "make → making, run → running, lie → lying", "Yazım değişimi"],
        ["Durum fiilleri", "-ing almaz (Present Simple kullanılır)", "I understand / I have a car", "Anlıyorum / Arabam var"],
      ],
    },
    examples: [
      { text: "Shh! The children are sleeping.", tr: "Şşş! Çocuklar uyuyor." },
      { text: "I'm reading a great book these days.", tr: "Bu aralar çok güzel bir kitap okuyorum." },
      { text: "\"What are you doing?\" \"I'm looking for my glasses.\"", tr: "\"Ne yapıyorsun?\" \"Gözlüğümü arıyorum.\"" },
      { text: "She usually drives to work, but today she's taking the bus.", tr: "Genelde işe arabayla gider ama bugün otobüse biniyor." },
      { text: "I don't understand this word.", tr: "Bu kelimeyi anlamıyorum." },
      { text: "We're having dinner. Can I call you back?", tr: "Yemek yiyoruz. Seni sonra arayabilir miyim?" }
    ],
    watch: [
      "Türkçedeki -iyor her yerde kullanıldığı için alışkanlığa continuous demek: 'I am drinking tea every morning' değil 'I drink tea every morning'.",
      "Durum fiillerini -ing ile kullanmak: 'I am knowing him' değil 'I know him'; 'Are you understanding?' değil 'Do you understand?'.",
      "Be'yi düşürmek: 'She working now' değil 'She is working now'.",
      "-ing yazımında hata: 'makeing', 'runing', 'lieing' değil 'making', 'running', 'lying'."
    ],
    tip: "Şu an ya da bu günlerde mi? am/is/are + -ing. Her zaman mı? present simple.",
    check: [
      {
        prompt: "Look! It ___.",
        options: ["snows", "is snowing", "snow"],
        answer: 1,
        why: "Şu anda gözümüzün önünde süren iş present continuous ile söylenir."
      },
      {
        prompt: "I ___ coffee every morning.",
        options: ["drink", "am drinking", "drinking"],
        answer: 0,
        why: "Her sabah yapılan alışkanlık present simple ile söylenir."
      },
      {
        prompt: "I ___ what you mean.",
        options: ["am understanding", "understanding", "understand"],
        answer: 2,
        why: "Understand bir durum fiilidir; -ing almaz."
      }
    ]
  },
  // B1
  {
    topic: "basics_en_present_perfect_continuous",
    language: "en",
    title: "Present perfect continuous (have been doing)",
    level: "B1",
    summary: "Geçmişte başlayıp şimdiye kadar süren ya da az önce bitip izi görülen bir işi, süreci ve süreyi vurgulayarak anlatır. 'Ne zamandır …-iyorsun?' sorusunun cevabıdır.",
    rules: [
      "Kuruluş: have/has been + -ing: I have been waiting, she has been working.",
      "Hâlâ süren iş ve süresi: for + süre, since + başlangıç noktası: I've been learning English for three years.",
      "Az önce biten ama sonucu görülen iş: \"Why are you out of breath?\" \"I've been running.\"",
      "'Ne zamandır?' sorusu How long have you been + -ing? ile sorulur.",
      "Present perfect simple sonucu ya da miktarı söyler (kaç tane, bitti mi): I've written three emails. Continuous süreci ve süreyi: I've been writing emails all morning.",
      "Durum fiilleri continuous olmaz; süre yine present perfect simple ile verilir: I've known her for ten years."
    ],
    table: {
      caption: "Present Perfect Continuous ve Simple Karşılaştırması",
      head: ["Özellik", "Present Perfect Continuous (have been V-ing)", "Present Perfect Simple (have V3)"],
      rows: [
        ["Temel odak", "Eylemin süreci ve ne kadar sürdüğü (How long?)", "Eylemin tamamlanmış sonucu veya miktarı (How many?)"],
        ["Süren eylem", "I've been waiting for forty minutes.", "I've lived here since 2018."],
        ["Görünür iz / sonuç", "I've been running (nefes nefeseyim).", "I've painted two walls (iş bitti)."],
        ["Miktar / sayı ile", "Kullanılmaz ('been drinking 3 cups' yanlış)", "She has read three books this month."],
        ["Durum fiilleri (know, be)", "Kullanılmaz ('have been knowing' yanlış)", "We've known each other for ten years."],
      ],
    },
    examples: [
      { text: "I've been waiting for you for forty minutes!", tr: "Kırk dakikadır seni bekliyorum!" },
      { text: "How long have you been living in Ankara?", tr: "Ne zamandır Ankara'da yaşıyorsun?" },
      { text: "It's been raining since this morning.", tr: "Sabahtan beri yağmur yağıyor." },
      { text: "Your eyes are red. Have you been crying?", tr: "Gözlerin kızarmış. Ağladın mı?" },
      { text: "She's been painting the kitchen all day, and she's painted two walls so far.", tr: "Bütün gün mutfağı boyuyor; şimdiye kadar iki duvarı boyadı." },
      { text: "We've known each other since primary school.", tr: "İlkokuldan beri birbirimizi tanıyoruz." }
    ],
    watch: [
      "Türkçedeki şimdiki zamanı aktarmak: 'I am waiting for an hour' değil 'I have been waiting for an hour'.",
      "Durum fiiliyle continuous: 'I have been knowing him for years' değil 'I have known him for years'.",
      "Miktar söylerken continuous: 'I've been drinking three cups of coffee' değil 'I've drunk three cups of coffee'.",
      "Been'i atlamak: 'I have working here since May' değil 'I have been working here since May'."
    ],
    tip: "Süreyi mi söylüyorsunuz (how long)? have been + -ing. Sonucu mu (how many, bitti mi)? have + V3.",
    check: [
      {
        prompt: "I ___ English for five years.",
        options: ["am learning", "have been learning", "learn"],
        answer: 1,
        why: "Geçmişte başlayıp hâlâ süren iş, süreyle birlikte have been + -ing ile söylenir."
      },
      {
        prompt: "So far this month, she ___ three books.",
        options: ["has read", "has been reading", "is reading"],
        answer: 0,
        why: "Miktar (üç kitap) söylenince present perfect simple kullanılır."
      },
      {
        prompt: "We ___ each other since 2010.",
        options: ["are knowing", "have been knowing", "have known"],
        answer: 2,
        why: "Know bir durum fiilidir; süre present perfect simple ile verilir."
      }
    ],
    practice: "present_perfect"
  },
  {
    topic: "basics_en_future_continuous",
    language: "en",
    title: "Future continuous (will be doing)",
    level: "B1",
    summary: "Gelecekte belli bir anda sürüyor olacak işi anlatır (-iyor olacağım). Ayrıca olağan akışta zaten olacak işleri söylemenin ve karşıdakinin planını kibarca sormanın yoludur.",
    rules: [
      "Kuruluş: will be + -ing, bütün kişilerde aynı: I'll be working, they'll be travelling.",
      "Gelecekte belli bir anda süren iş: at this time tomorrow, at eight tonight, this time next week.",
      "Olumsuz won't be + -ing; soru Will you be + -ing?",
      "Karşıdakinin planını kibarca sormak (bir şey istemeden önce): Will you be using the printer this afternoon?",
      "Zaten olacak, olağan akışta gerçekleşecek iş: I'll be seeing Ayşe at work tomorrow, so I can tell her.",
      "Durum fiilleri (know, own, believe) bu yapıya girmez: I'll know the results tomorrow.",
      "While, when gibi zaman bağlaçlarından sonra will gelmez: While you're travelling, I'll be working."
    ],
    table: {
      caption: "Future Continuous (will be doing) Kullanım Özeti",
      head: ["Kullanım Amacı", "Yapı / İpucu", "Örnek Cümle", "Türkçe Anlamı"],
      rows: [
        ["Gelecekte belli bir anda süren iş", "at this time tomorrow, at 8 tonight", "At ten tomorrow, I'll be taking an exam.", "Yarın onda sınava giriyor olacağım."],
        ["Olağan akışta gerçekleşecek eylem", "will be + V-ing (doğal program)", "I'll be seeing Ayşe at work tomorrow.", "Yarın işte Ayşe'yi göreceğim (zaten)."],
        ["Kibarca plan sorma", "Will you be + V-ing?", "Will you be using the car tonight?", "Bu akşam arabayı kullanacak mısın?"],
        ["Zaman bağlacı ile birlikte", "While + Present Cont., will be V-ing", "While you're having fun, I'll be working.", "Sen eğlenirken ben çalışıyor olacağım."],
      ],
    },
    examples: [
      { text: "At ten tomorrow morning, I'll be taking an exam.", tr: "Yarın sabah saat onda sınava giriyor olacağım." },
      { text: "Don't phone after nine; the baby will be sleeping.", tr: "Dokuzdan sonra arama, bebek uyuyor olacak." },
      { text: "This time next month, we'll be lying on a beach in Bodrum.", tr: "Gelecek ay bu zamanlar Bodrum'da bir kumsalda uzanıyor olacağız." },
      { text: "Will you be using the car tonight? I need to go to the airport.", tr: "Bu akşam arabayı kullanacak mısın? Havalimanına gitmem gerekiyor." },
      { text: "I'll be passing the bakery on my way home, so I'll get some bread.", tr: "Eve dönerken fırının önünden geçeceğim, biraz ekmek alırım." },
      { text: "While you're having fun, I'll be working.", tr: "Sen eğlenirken ben çalışıyor olacağım." }
    ],
    watch: [
      "'Yarın bu saatte' gibi bir anda süren iş için yalın will: 'This time tomorrow I will fly to Paris' değil 'This time tomorrow I'll be flying to Paris'.",
      "Be'yi atlamak: 'I will working' değil 'I will be working'.",
      "Durum fiilini continuous yapmak: 'I'll be knowing the results' değil 'I'll know the results'.",
      "Zaman bağlacından sonra will: 'while you will be sleeping' değil 'while you're sleeping'."
    ],
    tip: "Gelecekteki o anın fotoğrafını düşünün: fotoğrafta iş sürüyorsa will be + -ing.",
    check: [
      {
        prompt: "At this time tomorrow, we ___ on the beach.",
        options: ["will lying", "will be lying", "will be lie"],
        answer: 1,
        why: "Future continuous will be + fiil-ing ile kurulur."
      },
      {
        prompt: "\"Bu akşam arabayı kullanacak mısın?\" sorusunun kibar biçimi hangisidir?",
        options: ["Will you be using the car tonight?", "Will you using the car tonight?", "Are you use the car tonight?"],
        answer: 0,
        why: "Karşıdakinin planı kibarca Will you be + -ing? ile sorulur."
      },
      {
        prompt: "Hangisi doğru?",
        options: ["I'll knowing the results tomorrow.", "I'll be knowing the results tomorrow.", "I'll know the results tomorrow."],
        answer: 2,
        why: "Know bir durum fiilidir; future continuous yapılmaz."
      }
    ]
  },
  // B2
  {
    topic: "basics_en_past_perfect_continuous",
    language: "en",
    title: "Past perfect continuous (had been doing)",
    level: "B2",
    summary: "Geçmişteki bir andan önce başlayıp o ana kadar süren işi anlatır. Süreyi ya da geçmişte görülen bir durumun nedenini vurgular.",
    rules: [
      "Kuruluş: had been + -ing, bütün kişilerde aynı: I had been waiting, they had been working.",
      "Geçmişteki bir ana kadar süren iş ve süresi, for ya da since ile: She had been living in Paris for two years when she met him.",
      "Geçmişte görülen bir sonucun nedeni: The ground was wet because it had been raining.",
      "Past perfect simple bitmiş işi ya da miktarı, continuous süreci anlatır: He had written ten pages / He had been writing for hours.",
      "Durum fiilleri continuous olmaz: I had known him for years ('had been knowing' değil).",
      "Dolaylı anlatımda present perfect continuous buna kayar: \"I've been working all day.\" → She said she had been working all day."
    ],
    table: {
      caption: "Past Perfect Continuous (had been doing) ve Simple Karşılaştırması",
      head: ["Özellik", "Past Perfect Continuous (had been V-ing)", "Past Perfect Simple (had V3)"],
      rows: [
        ["Temel vurgu", "Geçmişteki bir ana kadar süren eylemin süresi", "Geçmişteki bir andan önce tamamlanmış eylem"],
        ["Süreç örneği", "We had been waiting for an hour when the bus came.", "When we arrived, the bus had already left."],
        ["Geçmişteki iz / neden", "His hands were dirty because he had been fixing the car.", "She was nervous because she hadn't flown before."],
        ["Miktar ve durum fiilleri", "Kullanılmaz ('had been knowing / writing 3 letters' yanlış)", "She had written forty novels. / I had known him for years."],
      ],
    },
    examples: [
      { text: "We had been waiting for an hour when the bus finally came.", tr: "Otobüs sonunda geldiğinde bir saattir bekliyorduk." },
      { text: "His hands were dirty because he had been fixing the car.", tr: "Arabayı tamir ettiği için elleri kirliydi." },
      { text: "How long had you been working there before you got promoted?", tr: "Terfi almadan önce ne zamandır orada çalışıyordun?" },
      { text: "She was exhausted. She had been studying all night.", tr: "Bitkindi. Bütün gece ders çalışmıştı." },
      { text: "They had been driving for six hours, so they stopped at a hotel.", tr: "Altı saattir araba kullanıyorlardı, bu yüzden bir otelde durdular." }
    ],
    watch: [
      "Süre varken past continuous: 'I was waiting for an hour when the bus came' yerine 'I had been waiting for an hour when the bus came' daha doğrudur.",
      "Miktar söylerken continuous: 'She had been writing three letters' değil 'She had written three letters'.",
      "Durum fiiliyle continuous: 'I had been knowing her' değil 'I had known her'.",
      "Sözcükleri eksik bırakmak: 'I had waiting' ya da 'I been waiting' değil 'I had been waiting'."
    ],
    tip: "Geçmişte bir an seçip geriye bakın: o ana kadar süren bir iş varsa had been + -ing.",
    check: [
      {
        prompt: "When I arrived, they ___ for two hours.",
        options: ["had been playing", "have been playing", "are playing"],
        answer: 0,
        why: "Geçmişteki bir ana kadar süren iş had been + -ing ile söylenir."
      },
      {
        prompt: "The streets were wet because it ___ all night.",
        options: ["has been raining", "had been raining", "is raining"],
        answer: 1,
        why: "Geçmişte görülen bir sonucun nedeni past perfect continuous ile söylenir."
      },
      {
        prompt: "By the time she retired, she ___ forty novels.",
        options: ["had been writing", "has been writing", "had written"],
        answer: 2,
        why: "Miktar (kırk roman) söylenince past perfect simple kullanılır."
      }
    ]
  },
  {
    topic: "basics_en_preferences",
    language: "en",
    title: "Tercih ve uyarı: would rather / prefer / had better",
    level: "B2",
    summary: "Would rather ve prefer tercih, had better ise güçlü bir tavsiye ya da uyarı bildirir. Arkalarından gelen fiil biçimleri birbirinden farklıdır.",
    rules: [
      "Would rather + yalın fiil (to yok): I'd rather stay at home tonight.",
      "İki seçenek: would rather A than B, ikisi de yalın: I'd rather walk than take a taxi.",
      "Başkasının yapmasını tercih etmek: would rather + özne + past simple; anlam şimdi ya da gelecektir: I'd rather you didn't smoke here.",
      "Prefer genel tercih içindir: prefer + isim/-ing + to: I prefer tea to coffee; I prefer walking to driving. Tek bir durumda: would prefer + to + fiil: I'd prefer to stay.",
      "Had better + yalın fiil: 'yapsan iyi olur, yoksa sonu kötü': You'd better take an umbrella.",
      "Had better şimdi ve gelecek içindir; olumsuzu had better not: You'd better not be late.",
      "Kısaltmada 'd iki şeyi gösterir: I'd rather = would rather, you'd better = had better."
    ],
    table: {
      caption: "Tercih ve Uyarı Kalıpları (Would Rather / Prefer / Had Better)",
      head: ["Kalıp", "Formül / Fiil Biçimi", "Örnek", "Anlam ve Kullanım"],
      rows: [
        ["would rather (aynı özne)", "would rather (not) + V1 (yalın) (+ than V1)", "I'd rather walk than take a taxi.", "Spesifik tercih (-meyi tercih ederim)"],
        ["would rather (farklı özne)", "would rather + özne + Past Simple (V2)", "I'd rather you didn't smoke here.", "Başkasından şimdiki/gelecek beklenti"],
        ["prefer / would prefer", "prefer V-ing to V-ing / would prefer to V1", "She prefers tea to coffee. / I'd prefer to stay.", "Genel tercih (prefer) / anlık (would prefer)"],
        ["had better", "had better (not) + V1 (yalın)", "You'd better leave now. / You'd better not be late.", "Güçlü uyarı ('yapsan iyi olur, yoksa kötü')"],
      ],
    },
    examples: [
      { text: "I'd rather have fish than meat tonight.", tr: "Bu akşam et yerine balık yemeyi tercih ederim." },
      { text: "Would you rather go out or stay in?", tr: "Dışarı çıkmayı mı tercih edersin, evde kalmayı mı?" },
      { text: "I'd rather you didn't tell anyone about this.", tr: "Bunu kimseye söylememeni tercih ederim." },
      { text: "She prefers working from home to working in the office.", tr: "Evden çalışmayı ofiste çalışmaya tercih ediyor." },
      { text: "You'd better leave now, or you'll miss the train.", tr: "Şimdi çıksan iyi olur, yoksa treni kaçırırsın." },
      { text: "We'd better not wake the baby.", tr: "Bebeği uyandırmasak iyi olur." }
    ],
    watch: [
      "Would rather'dan sonra to: 'I'd rather to stay' değil 'I'd rather stay'.",
      "Had better'dan sonra to ya da çekimli fiil: 'You'd better to go' ya da 'You'd better went' değil 'You'd better go'.",
      "Olumsuzu yanlış yere koymak: 'You hadn't better go' değil 'You'd better not go'.",
      "Prefer ile than: 'I prefer tea than coffee' değil 'I prefer tea to coffee'."
    ],
    tip: "Rather ve better'dan sonra fiil yalındır; yalnızca araya başka bir özne girince (I'd rather you…) past simple gelir.",
    check: [
      {
        prompt: "I'd rather ___ at home tonight.",
        options: ["stay", "to stay", "staying"],
        answer: 0,
        why: "Would rather'dan sonra yalın fiil gelir."
      },
      {
        prompt: "It's going to rain. You'd better ___ an umbrella.",
        options: ["to take", "took", "take"],
        answer: 2,
        why: "Had better'dan sonra to'suz yalın fiil gelir."
      },
      {
        prompt: "I prefer tea ___ coffee.",
        options: ["than", "to", "from"],
        answer: 1,
        why: "Prefer A to B kalıbında karşılaştırma to ile yapılır."
      }
    ]
  },
  {
    topic: "basics_en_emphasis",
    language: "en",
    title: "Vurgu: do / does / did, so / such",
    level: "B2",
    summary: "Olumlu bir cümleye do/does/did eklemek söyleneni vurgular ya da bir itirazı düzeltir; so ve such ise bir niteliğin derecesini öne çıkarır.",
    rules: [
      "Vurgulu do: olumlu cümlede do/does/did + yalın fiil; konuşmada do vurguyla söylenir: I do like your new haircut.",
      "Bir itirazı ya da yanlış izlenimi düzeltir: \"You didn't call.\" \"I did call! Twice.\"",
      "Emir cümlesinde sıcak bir ısrar: Do sit down. Do help yourself.",
      "So + sıfat ya da zarf (arkasında isim yok): It was so cold. She speaks so fast.",
      "Such + (a/an) + (sıfat) + isim: such a nice day, such good weather, such kind people.",
      "Sonuç bildirmek için that eklenir: It was so late that we took a taxi. / It was such a long film that I fell asleep.",
      "Miktarda so many / so much / so few / so little: There were so many people."
    ],
    table: {
      caption: "Vurgu Yapıları: Do / Does / Did ve So / Such",
      head: ["Vurgu Yapısı", "Kural / Formül", "Örnek", "Kullanım Amacı"],
      rows: [
        ["do / does / did + V1", "Olumlu cümlede yardımcı fiil + yalın fiil", "I do like your haircut. / I did call!", "Duyguyu güçlendirme veya itirazı düzeltme"],
        ["so + sıfat / zarf", "so + adjective / adverb (+ that...)", "The hotel was so expensive (that...)", "İsim olmadan sıfat veya zarfın derecesini vurgulama"],
        ["such + (a/an) + isim", "such + a/an + (sıfat) + tekil isim", "It was such a beautiful view.", "Sıfat + isim öbeğini birlikte vurgulama"],
        ["such + çoğul / sayılamayan", "such + (sıfat) + çoğul/sayılamayan isim", "such good weather / such kind people", "Çoğul ve sayılamayanlarda a/an gelmez"],
        ["so + miktar sözcüğü", "so many / so much / so few / so little", "There were so many tourists.", "Miktar vurgusunda such değil so kullanılır"],
      ],
    },
    examples: [
      { text: "I do understand your concerns, but we have no choice.", tr: "Endişelerini gerçekten anlıyorum ama başka seçeneğimiz yok." },
      { text: "\"You never help me.\" \"That's not true. I did help you last week.\"", tr: "\"Bana hiç yardım etmiyorsun.\" \"Doğru değil. Geçen hafta sana yardım ettim ya.\"" },
      { text: "She does look tired today.", tr: "Bugün gerçekten yorgun görünüyor." },
      { text: "The hotel was so expensive that we stayed only one night.", tr: "Otel o kadar pahalıydı ki yalnızca bir gece kaldık." },
      { text: "It was such a beautiful view that nobody spoke.", tr: "Manzara öyle güzeldi ki kimse konuşmadı." },
      { text: "I've never seen so many tourists here.", tr: "Burada hiç bu kadar çok turist görmemiştim." }
    ],
    watch: [
      "Vurgulu do'dan sonra çekimli fiil: 'She does looks' ya da 'I did called' değil 'She does look', 'I did call'.",
      "So ile isim: 'so a nice day' ya da 'so nice weather' değil 'such a nice day', 'such nice weather'.",
      "Such ile tekil sayılabilir isimde a'yı unutmak: 'such nice person' değil 'such a nice person'.",
      "Türkçedeki 'o kadar' yüzünden sıfatın önüne so much koymak: 'so much beautiful' değil 'so beautiful'; so much miktar içindir."
    ],
    tip: "Arkadan isim geliyorsa such (a), yalnızca sıfat ya da zarf geliyorsa so.",
    check: [
      {
        prompt: "It was ___ a boring film that I fell asleep.",
        options: ["so", "such", "very"],
        answer: 1,
        why: "Arkasında a + sıfat + isim olduğu için such kullanılır."
      },
      {
        prompt: "\"You don't like my cooking.\" \"I ___ like it! I just wasn't hungry.\"",
        options: ["do", "am", "does"],
        answer: 0,
        why: "İtirazı düzeltmek için olumlu cümleye vurgulu do eklenir."
      },
      {
        prompt: "There were ___ people that we couldn't get in.",
        options: ["such", "so much", "so many"],
        answer: 2,
        why: "Sayılabilir çoğul isimle (people) so many kullanılır."
      }
    ]
  },
  {
    topic: "basics_en_ellipsis",
    language: "en",
    title: "Kısa cevaplar: so do I, neither, I think so",
    level: "B2",
    summary: "İngilizce aynı sözcükleri tekrar etmekten kaçınır: yardımcı fiil, so, neither ve not ile cümlenin bir kısmı atlanır ya da onun yerine kısa bir sözcük geçer.",
    rules: [
      "Olumluya katılmak: So + yardımcı fiil + özne: \"I love jazz.\" \"So do I.\"",
      "Olumsuza katılmak: Neither / Nor + yardımcı fiil + özne: \"I can't swim.\" \"Neither can I.\"",
      "Yardımcı fiil önceki cümleye uyar: be → am/is/are, present simple → do/does, past simple → did; can, have, will kendileri tekrar edilir.",
      "Katılmamak: özne + vurgulu yardımcı fiil: \"I'm hungry.\" \"I'm not.\" / \"I don't like it.\" \"I do.\"",
      "Think, hope, expect, suppose, be afraid ile so ve not bütün bir cümlenin yerine geçer: I think so. I hope not. I'm afraid not.",
      "Think, believe ve expect'in olumsuzunda I don't think so daha doğaldır; hope ve be afraid ile I hope not, I'm afraid not denir.",
      "Tekrarlanan sayılabilir isim yerine one/ones: I don't like the red shirt; I prefer the blue one.",
      "Fiil öbeği yardımcı fiilde ya da to'da kesilir: \"Are you coming?\" \"I'd like to.\" / He said he would help, and he did."
    ],
    table: {
      caption: "Kısa Cevaplar ve Eksiltili Yapılar (Ellipsis & Substitution)",
      head: ["Durum / İşlev", "Kalıp / Formül", "Örnek Diyalog", "Türkçe Karşılığı"],
      rows: [
        ["Olumluya katılma", "So + yardımcı fiil + özne", "\"I'm tired.\" — \"So am I.\" / \"I went.\" — \"So did I.\"", "\"Ben de (öyleyim / gittim).\""],
        ["Olumsuza katılma", "Neither / Nor + yardımcı fiil + özne", "\"I can't swim.\" — \"Neither can I.\"", "\"Ben de (yüzemem).\""],
        ["Fikre katılmama", "Özne + ters yardımcı fiil", "\"I don't like it.\" — \"I do.\"", "\"Ben severim.\""],
        ["Cümle yerine so / not", "think / hope / be afraid + so / not", "I think so. / I don't think so. / I hope not.", "Sanırım öyle. / Sanmıyorum. / Umarım olmaz."],
        ["İsim / fiil kısaltma", "one / ones (isim) veya to / yardımcı fiil", "the blue one / \"Are you coming?\" — \"I'd like to.\"", "mavi olanı / \"Gelmek isterim.\""],
      ],
    },
    examples: [
      { text: "\"I'm really tired.\" \"So am I.\"", tr: "\"Çok yorgunum.\" \"Ben de.\"" },
      { text: "\"I didn't see the match.\" \"Neither did I.\"", tr: "\"Maçı izlemedim.\" \"Ben de izlemedim.\"" },
      { text: "\"Will it rain tomorrow?\" \"I hope not.\"", tr: "\"Yarın yağmur yağacak mı?\" \"Umarım yağmaz.\"" },
      { text: "\"Is the shop open on Sundays?\" \"I don't think so.\"", tr: "\"Dükkân pazarları açık mı?\" \"Sanmıyorum.\"" },
      { text: "My brother likes horror films, but I don't.", tr: "Ağabeyim korku filmlerini sever ama ben sevmem." },
      { text: "These glasses are dirty. Can I have some clean ones?", tr: "Bu bardaklar kirli. Temiz birkaç tane alabilir miyim?" }
    ],
    watch: [
      "Türkçedeki tek 'ben de' yüzünden olumsuza so ile cevap vermek: \"I don't eat meat.\" \"So do I.\" yanlış; \"Neither do I.\" ya da \"I don't either.\"",
      "Yardımcı fiil yerine asıl fiili tekrar etmek: \"I went to the party.\" \"So went I.\" değil \"So did I.\"",
      "Neither'dan sonra ikinci bir olumsuzluk: 'Neither don't I' değil 'Neither do I'.",
      "So'yu atlamak: \"Is he coming?\" \"I think.\" eksik kalır; \"I think so.\""
    ],
    tip: "Önceki cümlenin yardımcı fiilini bulun: cümle olumluysa so + o, olumsuzsa neither + o.",
    check: [
      {
        prompt: "\"I can't drive.\" \"___ can I.\"",
        options: ["So", "Neither", "Either"],
        answer: 1,
        why: "Olumsuz bir cümleye katılırken neither + yardımcı fiil + özne kullanılır."
      },
      {
        prompt: "\"She went to Paris last year.\" \"So ___ I.\"",
        options: ["did", "went", "was"],
        answer: 0,
        why: "Past simple cümleye did ile katılınır."
      },
      {
        prompt: "\"Is the museum open today?\" \"I don't think ___.\"",
        options: ["it", "yes", "so"],
        answer: 2,
        why: "Think'ten sonra so bütün cümlenin yerine geçer."
      }
    ]
  },
  {
    topic: "basics_en_phrasal_verbs",
    language: "en",
    title: "Phrasal verb'ler: ayrılabilen ve ayrılmayan",
    level: "B2",
    summary: "Phrasal verb, bir fiilin up, off, out, on gibi küçük sözcüklerle birleşip çoğu zaman yeni bir anlam kazanmasıdır. Nesnenin nereye gireceği phrasal verb'ün türüne bağlıdır.",
    rules: [
      "Nesnesiz olanlar tek başına durur: The plane took off. My car broke down.",
      "Ayrılabilenlerde isim nesne ortada ya da sonda olabilir: turn off the light / turn the light off.",
      "Nesne zamirse (it, them, him) mutlaka ortaya girer: turn it off, pick her up ('turn off it' değil).",
      "Ayrılmayanlarda nesne hep sonda kalır: look after the children / look after them; get over a cold / get over it.",
      "Üç parçalılar (look forward to, get on with, run out of, come up with) bölünmez: We've run out of milk.",
      "Aynı phrasal verb'ün birkaç anlamı olabilir: take off = havalanmak ya da (giysi) çıkarmak; pick up = yerden almak, birini arabayla almak ya da (bir dili) kapmak.",
      "Gündelik dilde phrasal verb, resmî dilde tek sözcüklü fiil yaygındır: put off ~ postpone, find out ~ discover, go up ~ increase."
    ],
    examples: [
      { text: "Could you turn the music down? I'm on the phone.", tr: "Müziğin sesini kısabilir misin? Telefondayım." },
      { text: "I've lost my glasses. Can you help me look for them?", tr: "Gözlüğümü kaybettim. Aramama yardım eder misin?" },
      { text: "Please take your shoes off before you come in.", tr: "Lütfen içeri girmeden ayakkabılarını çıkar." },
      { text: "Who looks after your kids when you're at work?", tr: "Sen işteyken çocuklarına kim bakıyor?" },
      { text: "The meeting has been put off until next week.", tr: "Toplantı gelecek haftaya ertelendi." },
      { text: "She picked up a lot of Spanish while she was living in Madrid.", tr: "Madrid'de yaşarken epey İspanyolca kaptı." }
    ],
    watch: [
      "Zamiri sona koymak: 'Turn off it' ya da 'Pick up her' değil 'Turn it off', 'Pick her up'.",
      "Ayrılmayanı bölmek: 'look the children after' değil 'look after the children'.",
      "Küçük sözcüğü atlamak: 'I'll pick you at six' değil 'I'll pick you up at six'; 'Find when it starts' değil 'Find out when it starts'.",
      "Anlamı sözcüklerden çıkarmaya çalışmak: give up 'vermek' değil 'bırakmak', put up with 'katlanmak' demektir."
    ],
    tip: "Yeni bir phrasal verb'ü bir zamirle birlikte öğrenin: 'turn it off', 'look after them'. Nesnenin yeri böyle akılda kalır.",
    table: {
      "caption": "Phrasal Verbs Types and Object Position",
      "head": [
        "Type",
        "Separable?",
        "Pronoun Position",
        "Example"
      ],
      "rows": [
        [
          "Separable transitive",
          "Yes",
          "Must go between verb and particle",
          "Turn off the light. / Turn it off."
        ],
        [
          "Inseparable transitive",
          "No",
          "Object always follows preposition",
          "She is looking for her keys / looking for them."
        ],
        [
          "Intransitive",
          "No object",
          "No object needed",
          "The plane took off on time."
        ],
        [
          "Three-part phrasal",
          "No",
          "Never separable",
          "I look forward to hearing from you."
        ]
      ]
    },
    check: [
      {
        prompt: "This music is too loud. Please turn ___.",
        options: ["off it", "it off", "it of"],
        answer: 1,
        why: "Nesne zamirse ayrılabilen phrasal verb'ün ortasına girer."
      },
      {
        prompt: "Hangisi doğru?",
        options: ["Can you look after the kids tonight?", "Can you look the kids after tonight?", "Can you after look the kids tonight?"],
        answer: 0,
        why: "Look after ayrılmaz; nesne hep sonda kalır."
      },
      {
        prompt: "We've run ___ milk. Can you buy some?",
        options: ["out", "of out", "out of"],
        answer: 2,
        why: "Run out of üç parçalıdır ve bölünmez; nesneden önce of gerekir."
      }
    ]
  },
  {
    topic: "basics_en_future_in_past",
    language: "en",
    title: "Geçmişteki gelecek (was going to, would, was about to)",
    level: "B2",
    summary: "Geçmişteki bir andan bakıp o zaman için gelecekte olanı anlatır: planlar, beklentiler ve çoğu zaman gerçekleşmeyen niyetler. Türkçedeki -ecekti'nin karşılığıdır.",
    rules: [
      "Was/were going to + yalın fiil: geçmişteki plan ya da niyet, çoğunlukla gerçekleşmemiştir: I was going to call you, but I forgot.",
      "Would + yalın fiil: geçmişten bakınca gelecekte olacak olan; dolaylı anlatımda ve hikâyede sık: She said she would be late. He knew he would never see her again.",
      "Was/were about to + yalın fiil: tam bir şeyi yapmak üzereyken: I was about to leave when you phoned.",
      "Was/were supposed to: ayarlanmış ama çoğunlukla bozulmuş plan ya da beklenti: The train was supposed to arrive at six.",
      "Past continuous geçmişte ayarlanmış randevu için: I couldn't stay because I was meeting Ali that evening.",
      "Gerçekleşmemiş niyetin ardından çoğunlukla but gelir: We were going to buy that house, but the price went up."
    ],
    examples: [
      { text: "I was going to tell you, but I didn't want to spoil the surprise.", tr: "Sana söyleyecektim ama sürprizi bozmak istemedim." },
      { text: "We were about to go to bed when the doorbell rang.", tr: "Tam yatmak üzereydik ki kapı zili çaldı." },
      { text: "He promised he would help me move.", tr: "Taşınmama yardım edeceğine söz verdi." },
      { text: "At the time, nobody knew that the small shop would become a global brand.", tr: "O zamanlar kimse o küçük dükkânın dünya çapında bir markaya dönüşeceğini bilmiyordu." },
      { text: "The meeting was supposed to start at nine, but it started at ten.", tr: "Toplantı dokuzda başlayacaktı ama onda başladı." },
      { text: "I couldn't come to the party because I was flying to Izmir the next morning.", tr: "Partiye gelemedim çünkü ertesi sabah İzmir'e uçacaktım." }
    ],
    watch: [
      "Türkçedeki '-ecekti'yi will ile çevirmek: 'I will call you yesterday' değil 'I was going to call you yesterday'.",
      "Geçmişte söylenmiş sözü aktarırken will'i korumak: 'He said he will come' yerine 'He said he would come'.",
      "About to'dan sonra -ing: 'I was about to leaving' değil 'I was about to leave'.",
      "Supposed'ın -d'sini düşürmek: 'It was suppose to start' değil 'It was supposed to start'."
    ],
    tip: "Geçmişteki bir koltuğa oturup ileriye bakın: will → would, am going to → was going to.",
    table: {
      "caption": "Future in the Past Structures",
      "head": [
        "Structure",
        "Grammar Formula",
        "Nuance",
        "Example"
      ],
      "rows": [
        [
          "was/were going to",
          "was/were going to + V1",
          "Unfulfilled intention or plan",
          "I was going to call you, but my battery died."
        ],
        [
          "would",
          "would + V1",
          "Past prediction or future from past perspective",
          "He knew that one day he would succeed."
        ],
        [
          "was/were about to",
          "was/were about to + V1",
          "Immediate action interrupted",
          "She was about to leave when the phone rang."
        ]
      ]
    },
    check: [
      {
        prompt: "I ___ call you last night, but I fell asleep.",
        options: ["will", "was going to", "am going to"],
        answer: 1,
        why: "Geçmişteki gerçekleşmemiş niyet was going to ile söylenir."
      },
      {
        prompt: "We were ___ leave when it started to rain.",
        options: ["about to", "about", "going"],
        answer: 0,
        why: "Tam yapmak üzere olmak was/were about to + yalın fiil ile söylenir."
      },
      {
        prompt: "She told me she ___ help me the next day.",
        options: ["will", "is going to", "would"],
        answer: 2,
        why: "Geçmişten bakınca gelecek would ile söylenir."
      }
    ]
  },
  // C1
  {
    topic: "basics_en_future_perfect_continuous",
    language: "en",
    title: "Future perfect continuous (will have been doing)",
    level: "C1",
    summary: "Gelecekteki bir ana kadar bir işin ne kadar süredir sürmüş olacağını anlatır: 'o zamana kadar … yıldır …-iyor olacağım'. Az kullanılır ama süreyi vurgulamanın tek doğal yoludur.",
    rules: [
      "Kuruluş: will have been + -ing, bütün kişilerde aynı: By May I will have been working here for ten years.",
      "Hemen her zaman bir süreyle (for) ve gelecekteki bir noktayla (by, by the time, next month, in 2030) gelir.",
      "O anda iş hâlâ sürüyor olabilir ya da tam o anda bitebilir; vurgu süredir.",
      "Future perfect simple bitmiş işi ya da miktarı söyler: By June she will have written three chapters. Continuous süreyi: …she will have been writing for a year.",
      "By the time'dan sonra, anlam gelecek olsa da present simple gelir: By the time you arrive, I'll have been waiting for an hour.",
      "Durum fiilleri bu yapıya girmez: By then we will have known each other for twenty years.",
      "Şimdiye dair güçlü bir tahmin için de kullanılır: Don't ask him to cook tonight; he'll have been working all day."
    ],
    examples: [
      { text: "Next month, I will have been teaching for twenty years.", tr: "Gelecek ay yirmi yıldır öğretmenlik yapıyor olacağım." },
      { text: "By the time the plane lands, we'll have been flying for eleven hours.", tr: "Uçak indiğinde on bir saattir uçuyor olacağız." },
      { text: "In 2030, this company will have been operating for a century.", tr: "2030'da bu şirket yüz yıldır faaliyette olacak." },
      { text: "By the end of this year, they will have been living together for five years.", tr: "Bu yılın sonunda beş yıldır birlikte yaşıyor olacaklar." },
      { text: "Don't ask him to cook tonight; he'll have been working all day.", tr: "Bu akşam ondan yemek yapmasını isteme; bütün gün çalışmış olacak." }
    ],
    watch: [
      "Süreyi Türkçedeki gibi şimdiki zamanla vermek: 'Next year I am working here for ten years' değil 'Next year I will have been working here for ten years'.",
      "Miktar söylerken continuous: 'By June I will have been reading 30 books' değil 'By June I will have read 30 books'.",
      "By the time'dan sonra will: 'by the time you will arrive' değil 'by the time you arrive'.",
      "Sözcükleri eksik bırakmak: 'will have working' ya da 'will been working' değil 'will have been working'."
    ],
    tip: "Gelecekteki bir andan geriye doğru 'kaç yıldır?' diye sorabiliyorsanız will have been + -ing.",
    table: {
      "caption": "Future Perfect Continuous",
      "head": [
        "Component",
        "Formula",
        "Emphasis",
        "Example"
      ],
      "rows": [
        [
          "Positive",
          "will have been + V-ing",
          "Duration of an action up to a future point",
          "By midnight, we will have been driving for 8 hours."
        ],
        [
          "Time markers",
          "by then, for [duration], by the time",
          "Süreç vurgusu",
          "By next year, she will have been teaching for 10 years."
        ]
      ]
    },
    check: [
      {
        prompt: "By next June, she ___ at this school for fifteen years.",
        options: ["will teach", "will have been teaching", "is teaching"],
        answer: 1,
        why: "Gelecekteki bir ana kadarki süre will have been + -ing ile söylenir."
      },
      {
        prompt: "By the time you ___, I'll have been waiting for two hours.",
        options: ["arrive", "will arrive", "will have arrived"],
        answer: 0,
        why: "By the time'dan sonra gelecek anlamında present simple gelir."
      },
      {
        prompt: "By the end of the course, we ___ 40 essays.",
        options: ["will have been writing", "will be writing", "will have written"],
        answer: 2,
        why: "Miktar (40 kompozisyon) söylenince future perfect simple kullanılır."
      }
    ]
  },
  {
    topic: "basics_en_unreal_past",
    language: "en",
    title: "Gerçek dışı geçmiş: it's time, as if, suppose",
    level: "C1",
    summary: "Bazı kalıplardan sonra gelen geçmiş zaman geçmişi değil, şimdiki ya da hayalî bir durumu anlatır: 'artık … vakti', 'sanki …', 'diyelim ki …'.",
    rules: [
      "It's (high / about) time + özne + past simple: çoktan yapılması gereken iş: It's time we went home. It's high time you found a job.",
      "It's time + to + yalın fiil daha nötrdür: It's time to go.",
      "As if / as though + past simple: şimdiki gerçek dışı ya da şüpheli durum: He talks as if he knew everything (aslında bilmiyor).",
      "As if + present: gerçek olabilecek bir izlenim: It looks as if it's going to rain.",
      "As if + past perfect: geçmişe dair gerçek dışı durum: She looked at me as if she had never seen me before.",
      "Suppose / supposing / what if + past simple: hayalî durum: Suppose you lost your job, what would you do?",
      "Be fiilinde resmî dilde bütün kişilerle were: He behaves as if he were the boss."
    ],
    examples: [
      { text: "It's late. It's time we left.", tr: "Geç oldu. Artık gitme vaktimiz geldi." },
      { text: "It's high time the city did something about the traffic.", tr: "Belediyenin trafik için bir şey yapmasının vakti çoktan geldi." },
      { text: "He spends money as if he were a millionaire.", tr: "Milyonermiş gibi para harcıyor." },
      { text: "It looks as if the shop is closed.", tr: "Dükkân kapalı gibi görünüyor." },
      { text: "She talked about the trip as if she had been there herself.", tr: "Geziden sanki oraya kendisi gitmiş gibi söz etti." },
      { text: "Suppose you won the lottery, would you stop working?", tr: "Diyelim ki piyangoyu kazandın, çalışmayı bırakır mıydın?" }
    ],
    watch: [
      "It's time'dan sonra şimdiki zaman: 'It's time we go' değil 'It's time we went' (ya da 'It's time to go').",
      "Geçmiş biçimi geçmiş sanmak: 'as if he knew' şimdiyi anlatır; geçmişteki gerçek dışı durum için had + V3 gerekir.",
      "İki yapıyı karıştırmak: 'It's time we to leave' değil 'It's time we left' ya da 'It's time for us to leave'.",
      "Resmî yazıda like'ı bağlaç yapmak: 'He acts like he knows' konuşmada duyulur, yazıda 'He acts as if he knew'."
    ],
    tip: "Bu kalıplardan sonra geçmiş zaman görünce zamanı değil uzaklığı düşünün: gerçek değil, istenen ya da hayal edilen.",
    table: {
      "caption": "Unreal Past Structures (Wish & If only)",
      "head": [
        "Structure",
        "Tense Used",
        "Regret / Desire Timeframe",
        "Example"
      ],
      "rows": [
        [
          "wish + Past Simple",
          "Past Simple (were)",
          "Present regret (I want it to be different now)",
          "I wish I spoke French fluently."
        ],
        [
          "wish + Past Perfect",
          "Past Perfect (had done)",
          "Past regret (I wish it had happened)",
          "I wish I had accepted that offer."
        ],
        [
          "wish + would",
          "would + base verb",
          "Complaint about another person’s habit",
          "I wish you would stop interrupting me."
        ],
        [
          "It’s time + Subject",
          "Past Simple",
          "Overdue action (vakti geldi de geçiyor)",
          "It’s time we started the meeting."
        ]
      ]
    },
    check: [
      {
        prompt: "It's high time you ___ a job.",
        options: ["found", "find", "will find"],
        answer: 0,
        why: "It's high time + özne kalıbında past simple gelir."
      },
      {
        prompt: "She looked at me as if she ___ me before.",
        options: ["has never seen", "had never seen", "never sees"],
        answer: 1,
        why: "Geçmişe dair gerçek dışı durum as if + past perfect ile söylenir."
      },
      {
        prompt: "___ you lost your passport abroad, what would you do?",
        options: ["Unless", "Even", "Suppose"],
        answer: 2,
        why: "Hayalî bir durum suppose + past simple ile kurulur."
      }
    ]
  },
  {
    topic: "basics_en_noun_phrases",
    language: "en",
    title: "Yoğun yazı dili: isimleştirme ve kısaltılmış ilgi cümleleri",
    level: "C1",
    summary: "Resmî ve akademik yazıda bilgi fiil cümleleri yerine yoğun isim öbekleriyle verilir: fiiller isme dönüşür, ilgi cümleleri kısalır, nitelikler ismin önüne ya da arkasına yerleşir.",
    rules: [
      "İsimleştirme: fiil ya da sıfat isme dönüşür: decide → decision, fail → failure, important → importance. The government decided to… → The government's decision to…",
      "İsimleştirilen fiilin öznesi 's ya da of ile, nesnesi of ile gelir: the rapid growth of cities; the committee's rejection of the proposal.",
      "Kısaltılmış ilgi cümlesi: who/which + be atılır: the people (who are) waiting outside; the decisions (which were) taken last year.",
      "Etken anlam -ing ile, edilgen anlam V3 ile kısaltılır: students taking the exam; a report published in 2020.",
      "Edat öbeği ismi arkadan niteler: a rise in prices, a solution to the problem, the man in the grey suit.",
      "Bazı sıfatlar ismin arkasına gelir: the people responsible, the people involved, the only seats available.",
      "Ön niteleme isim + isim ve birleşik sıfatlarla yapılır: energy consumption, a five-year plan, a well-known writer."
    ],
    examples: [
      { text: "The rapid growth of online shopping has changed city centres.", tr: "Çevrimiçi alışverişin hızlı büyümesi şehir merkezlerini değiştirdi." },
      { text: "The committee's rejection of the proposal surprised everyone.", tr: "Kurulun öneriyi reddetmesi herkesi şaşırttı." },
      { text: "Passengers travelling with children may board first.", tr: "Çocukla seyahat eden yolcular önce binebilir." },
      { text: "Most of the paintings stolen in 2015 have never been found.", tr: "2015'te çalınan tabloların çoğu hiç bulunamadı." },
      { text: "There has been a sharp increase in energy prices.", tr: "Enerji fiyatlarında keskin bir artış oldu." },
      { text: "The people responsible for the delay have apologised.", tr: "Gecikmeden sorumlu kişiler özür diledi." }
    ],
    watch: [
      "Türkçedeki sırayı izlemek: '2015'te çalınan tablolar' için 'the stolen in 2015 paintings' değil 'the paintings stolen in 2015'.",
      "Etken ve edilgeni karıştırmak: 'the report publishing last year' değil 'the report published last year'.",
      "Artışın neyde olduğunu of ile söylemek: 'an increase of prices' değil 'an increase in prices' (of miktar içindir: an increase of 5%).",
      "Yoğunluğu abartmak: üst üste dört beş isim ('the city centre parking fee increase plan') okuru yorar; bir kısmını of ya da bir cümleyle açın."
    ],
    tip: "Resmî bir paragrafı yoğunlaştırırken önce fiili isme çevirin, sonra 'who is / which was'ları atın.",
    table: {
      "caption": "Noun Phrase Structure and Modifiers",
      "head": [
        "Position",
        "Element Type",
        "Function",
        "Example"
      ],
      "rows": [
        [
          "Pre-modifiers",
          "Determiner + Adjective + Noun adjunct",
          "İsimden önce gelen niteleyiciler",
          "A fascinating artificial intelligence model."
        ],
        [
          "Head noun",
          "Core noun",
          "Temel isim",
          "The new research project."
        ],
        [
          "Post-modifiers",
          "Prepositional phrase / Relative clause",
          "İsimden sonra gelen niteleyiciler",
          "The report published by the department."
        ]
      ]
    },
    check: [
      {
        prompt: "Hangisi doğru?",
        options: ["the decisions took last year", "the decisions taken last year", "the decisions taking last year"],
        answer: 1,
        why: "Edilgen anlamlı kısaltılmış ilgi cümlesi V3 ile kurulur."
      },
      {
        prompt: "There has been a sharp rise ___ the number of tourists.",
        options: ["in", "at", "on"],
        answer: 0,
        why: "Rise ve increase'te artışın neyde olduğu in ile söylenir."
      },
      {
        prompt: "\"Hükümet vergileri artırmaya karar verdi\" cümlesinin isimleştirilmiş hâli hangisidir?",
        options: ["the government's deciding of raise taxes", "the government decision raising of taxes", "the government's decision to raise taxes"],
        answer: 2,
        why: "Fiil isme döner (decide → decision), öznesi 's ile, ardındaki fiil to ile gelir."
      }
    ]
  },
  {
    topic: "basics_en_register",
    language: "en",
    title: "Resmî ve gündelik dil (register)",
    level: "C1",
    summary: "Aynı şey karşıdakine ve ortama göre farklı sözcük ve yapılarla söylenir. E-postada, toplantıda ya da arkadaşla konuşurken doğru tonu seçmek ileri düzeyin işaretidir.",
    rules: [
      "Resmî dilde tek sözcüklü fiiller, gündelikte phrasal verb'ler yaygındır: postpone / put off, investigate / look into, tolerate / put up with.",
      "Resmî yazıda kısaltma kullanılmaz: do not, I am, it is; gündelikte don't, I'm, it's.",
      "Resmî dilde edilgen ve kişisiz yapılar sıktır: It has been decided that…, Applicants are required to…",
      "Rica dolaylılaştıkça resmîleşir: Can you…? → Could you…? → Would you mind…? → I would be grateful if you could…",
      "Resmî bağlaçlar: however, therefore, in addition, regarding; gündelik karşılıkları: but, so, also, about.",
      "Edatı soru sonunda bırakmak gündelik, başa almak resmîdir: Who did you speak to? / To whom did you speak?",
      "Gündelik dolgu sözcükleri (stuff, things, a bit, kind of, gonna) resmî yazıda yer almaz."
    ],
    examples: [
      { text: "I would be grateful if you could send me the documents by Friday.", tr: "Belgeleri cumaya kadar gönderebilirseniz minnettar olurum." },
      { text: "Can you send me that stuff by Friday?", tr: "O şeyleri cumaya kadar atar mısın?" },
      { text: "The meeting has been postponed until further notice.", tr: "Toplantı ikinci bir duyuruya kadar ertelendi." },
      { text: "They've put off the meeting again.", tr: "Toplantıyı yine ertelediler." },
      { text: "We regret to inform you that your application has been unsuccessful.", tr: "Başvurunuzun olumlu sonuçlanmadığını üzülerek bildiririz." },
      { text: "Sorry, you didn't get the job.", tr: "Üzgünüm, işi alamadın." }
    ],
    watch: [
      "Türkçedeki 'siz' resmîliğini tek bir sözcükte aramak: İngilizcede you hep aynıdır; resmîlik fiil seçimi, kalıplar ve dolaylılıkla kurulur.",
      "Resmî e-postada gündelik açılış ve kısaltma: 'Hi guys, I'm writing cos…' değil 'Dear Ms Taylor, I am writing to…'.",
      "Gündelik konuşmada aşırı resmîlik: arkadaşa 'I would be grateful if you could pass the salt' demek soğuk ya da alaycı duyulur.",
      "Bir metinde iki tonu karıştırmak: resmî bir raporun ortasında 'a lot of stuff' ya da 'gonna' göze batar."
    ],
    tip: "Yazmadan önce sorun: bunu kime, hangi ortamda söylüyorum? Sonra fiilleri, kısaltmaları ve ricaları ona göre seçin.",
    table: {
      "caption": "Register: Informal vs Neutral vs Formal",
      "head": [
        "Informal (Everyday)",
        "Neutral (Standard)",
        "Formal (Academic/Business)",
        "Context"
      ],
      "rows": [
        [
          "ask for",
          "request",
          "inquire about",
          "Talebi iletme"
        ],
        [
          "look into",
          "investigate",
          "examine / probe",
          "İnceleme yapma"
        ],
        [
          "get rid of",
          "remove",
          "eliminate / discard",
          "Ortadan kaldırma"
        ],
        [
          "put off",
          "delay",
          "postpone / defer",
          "Erteleme"
        ]
      ]
    },
    check: [
      {
        prompt: "Resmî bir e-postada en uygun rica hangisidir?",
        options: ["I would be grateful if you could send me the report.", "Send me the report.", "Can you send me the report, mate?"],
        answer: 0,
        why: "Resmî ricada dolaylı kalıplar kullanılır: I would be grateful if you could…"
      },
      {
        prompt: "\"Put off\" fiilinin resmî karşılığı hangisidir?",
        options: ["cancel", "delay off", "postpone"],
        answer: 2,
        why: "Put off ertelemek demektir; resmî dildeki karşılığı postpone'dur."
      },
      {
        prompt: "Resmî bir raporda hangisi daha uygundur?",
        options: ["We're gonna look into it.", "The matter will be investigated.", "We'll check it out."],
        answer: 1,
        why: "Resmî yazıda kısaltma ve phrasal verb yerine edilgen yapı ve tek sözcüklü fiil yeğlenir."
      }
    ]
  },
  {
    topic: "basics_en_discourse_markers",
    language: "en",
    title: "Konuşmada söylem belirleyicileri (actually, anyway, mind you)",
    level: "C1",
    summary: "Konuşmada bazı küçük sözcükler cümlenin içeriğini değil yönünü gösterir: düzeltme, konuya dönme, ekleme ya da yumuşatma. Yerinde kullanılınca İngilizce çok daha doğal duyulur.",
    rules: [
      "Actually: beklenmeyen bir bilgi ya da düzeltme ('aslında'): \"Are you Spanish?\" \"Actually, I'm Portuguese.\"",
      "Anyway: konudan sapınca ana konuya dönmek ya da konuşmayı kapatmak: Anyway, as I was saying… / Anyway, I'd better go.",
      "Mind you (özellikle İngiliz İngilizcesinde): az önce söyleneni biraz dengeleyen bir ek: The hotel was expensive. Mind you, the view was amazing.",
      "By the way: yan bir konuyu açmak: By the way, did you get my email?",
      "I mean: söyleneni açıklamak ya da düzeltmek: It was good. I mean, not perfect, but good.",
      "Still / even so: karşıt bir şeye rağmen: It's a long way. Still, it's worth the trip.",
      "Well, you know, sort of gibi dolgu sözcükleri düşünme payı verir; aşırısı akıcılığı değil dağınıklığı gösterir."
    ],
    examples: [
      { text: "\"Did you enjoy the film?\" \"Actually, I fell asleep halfway through.\"", tr: "\"Filmi beğendin mi?\" \"Aslında yarısında uyuyakaldım.\"" },
      { text: "Anyway, let's get back to the main point.", tr: "Neyse, asıl konuya dönelim." },
      { text: "He's not very friendly. Mind you, he's always on time.", tr: "Pek cana yakın biri değil. Gerçi hep tam vaktinde gelir." },
      { text: "By the way, Selin says hello.", tr: "Bu arada, Selin selam söyledi." },
      { text: "I don't really like the city. I mean, it's fine, but it's too crowded for me.", tr: "Şehri pek sevmiyorum. Yani fena değil ama bana fazla kalabalık." },
      { text: "The flight was delayed for three hours. Still, we arrived in time for dinner.", tr: "Uçuş üç saat rötar yaptı. Yine de akşam yemeğine yetiştik." }
    ],
    watch: [
      "Actually'yi 'şu anda' sanmak: 'şu anda' currently ya da at the moment'tır; 'Actually, I live in Izmir' 'Aslında İzmir'de yaşıyorum' demektir.",
      "Anyway ile however'ı karıştırmak: anyway konuya döner ya da 'neyse, yine de' der; resmî yazıda zıtlık için however kullanılır.",
      "By the way ile ana konuya geçmek: by the way yalnızca yan bir konuyu açar.",
      "Her cümleye dolgu sözcüğü koymak: 'like, you know, actually' yığını akıcılık değil kararsızlık izlenimi verir."
    ],
    tip: "Bir belirleyiciyi önce dinlerken fark edin, sonra kullanın: ne anlama geldiğine değil, hangi anda söylendiğine bakın.",
    table: {
      "caption": "Discourse Markers in English Flow",
      "head": [
        "Category",
        "Markers",
        "Position in Sentence",
        "Example"
      ],
      "rows": [
        [
          "Contrast / Concession",
          "however, nevertheless, on the other hand",
          "Sentence initial with comma",
          "However, further tests are needed."
        ],
        [
          "Cause & Consequence",
          "therefore, consequently, as a result",
          "Signals logical deduction",
          "Therefore, we adjusted our methodology."
        ],
        [
          "Addition / Amplification",
          "furthermore, moreover, in addition",
          "Adds stronger supporting point",
          "Furthermore, the cost was significantly lower."
        ]
      ]
    },
    check: [
      {
        prompt: "\"Are you a teacher?\" \"___, I'm a nurse.\"",
        options: ["Actually", "Currently", "By the way"],
        answer: 0,
        why: "Beklenmeyen bir düzeltme actually ile yapılır."
      },
      {
        prompt: "___, as I was saying, the project starts in May.",
        options: ["Mind you", "Anyway", "Actually"],
        answer: 1,
        why: "Konudan saptıktan sonra ana konuya anyway ile dönülür."
      },
      {
        prompt: "(Konuyu değiştirerek) \"___, did you call your mother?\"",
        options: ["I mean", "Still", "By the way"],
        answer: 2,
        why: "Yan bir konu by the way ile açılır."
      }
    ]
  }
]
