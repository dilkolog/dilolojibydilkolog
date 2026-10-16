import type { TopicLesson } from './lessonTypes'

export const EN_LESSONS_4: TopicLesson[] = [
  // A2
  {
    topic: 'basics_en_stative_dynamic',
    language: 'en',
    title: 'Durum ve eylem fiilleri (stative vs dynamic)',
    level: 'A2',
    summary: 'İngilizcede bazı fiiller fiziksel bir eylemi değil, zihinsel bir durumu, duyguyu ya da sahipliği anlatır. Bu durum fiilleri normalde -ing eki almaz; ancak bazı fiiller iki anlama da sahiptir.',
    rules: [
      'Durum fiilleri (stative verbs): know, believe, understand, love, hate, want, need, prefer, belong, seem, matter. Bu fiiller şu anda sürse bile present simple ile kullanılır: I understand you (I am understanding you değil).',
      'Fiziksel duyu fiilleri: see, hear, taste, smell, feel. Bunlar da genel algı bildirirken -ing almaz: I see a bird, Can you hear that?',
      'İki anlama da gelen kilit fiiller:',
      '• think: görüş bildirmek (I think it is great - bence) vs zihinsel eylem (I am thinking about the offer - düşünüyorum).',
      '• have: sahiplik (I have a car - arabam var) vs eylem (I am having breakfast / shower / lunch - yapıyorum, yiyorum).',
      '• see: gözle görmek/anlamak (I see what you mean) vs randevulaşmak/görüşmek (I am seeing the doctor tomorrow).',
      '• taste/smell: tadı/kokusu öyle olmak (The soup tastes good) vs bilerek tatmak/koklamak (The chef is tasting the soup).',
      '• feel: fikir/inanç (I feel that is wrong) vs fiziksel his/dokunma (I am feeling much better today).'
    ],
    examples: [
      { text: "I have two sisters, but right now I'm having a cup of tea.", tr: "İki kız kardeşim var ama şu anda bir fincan çay içiyorum." },
      { text: "What do you think of this idea? — I'm thinking about it.", tr: "Bu fikir hakkında ne düşünüyorsun? — Üzerine düşünüyorum." },
      { text: "This coffee smells wonderful.", tr: "Bu kahve harika kokuyor." },
      { text: "Why are you smelling the milk? Is it sour?", tr: "Sütü neden kokluyorsun? Bozulmuş mu?" },
      { text: "I see a ship on the horizon.", tr: "Ufukta bir gemi görüyorum." },
      { text: "Are you seeing anyone at the moment?", tr: "Şu sıralar biriyle görüşüyor musun (biriyle çıkıyor musun)?" }
    ],
    watch: [
      "Türkçedeki 'anlıyorum, seviyorum' kalıbını motamot -ing yapmak: 'I am understanding' değil 'I understand'; 'I am loving this car' yerine standart İngilizcede 'I love this car'.",
      "Have sahiplik bildirirken -ing eklemek: 'I am having a laptop' değil 'I have a laptop'.",
      "Soru kurarken Do/Does yerine Are/Is kullanmak: 'Are you wanting tea?' değil 'Do you want tea?'."
    ],
    tip: "Gözünüzü kapatın: Fiil bir videoda fiziksel olarak hareket halinde gösterilebiliyorsa eylemdir (-ing alabilir); sadece zihinde veya varlıkta duruyorsa durumdur (present simple).",
    check: [
      {
        prompt: "Excuse me, ___ you remember my name?",
        options: ["do", "are", "have"],
        answer: 0,
        why: "Remember bir durum fiilidir; şimdiki zamanda do ile sorulur."
      },
      {
        prompt: "Why ___ the soup? — Because it might be too hot.",
        options: ["do you taste", "are you tasting", "taste you"],
        answer: 1,
        why: "Çorbayı bilerek kaşıkla tatma eylemi devam ettiği için dynamic anlamda -ing alır."
      },
      {
        prompt: "I ___ a lot of work to do today.",
        options: ["am having", "have", "having"],
        answer: 1,
        why: "Sahiplik ve iş yükü durum fiilidir; -ing almaz."
      }
    ]
  },
  // B1
  {
    topic: 'basics_en_articles_institutions',
    language: 'en',
    title: 'Kurumlarda artikel: school, hospital, prison, bed',
    level: 'B1',
    summary: 'Okul, hastane, cezaevi, kilise veya yatak gibi yerlere asıl amaçları için (öğrenci, hasta veya mahkûm olarak) gidildiğinde "the" kullanılmaz; sadece bina veya mekan olarak ziyaret edildiğinde "the" gelir.',
    rules: [
      'Asıl amaçla kullanım (artikelsiz / sıfır artikel):',
      '• go to school / be at school: okula gitmek (öğrenci olarak ders almak için).',
      '• go to hospital / be in hospital (İngiliz İngilizcesi): hastanede yatmak (hasta olarak tedavi görmek).',
      '• be in prison: cezaevinde olmak (mahkûm olarak ceza çekmek).',
      '• go to university / college: üniversite okumak (öğrenci olmak).',
      '• go to bed: uyumaya gitmek (yatmak).',
      '• go to church: ibadete gitmek.',
      'Sıradan bir bina veya fiziksel nesne olarak kullanım (the ile):',
      '• go to the school: okula gitmek (örneğin veli toplantısı veya tadilat için binaya gitmek).',
      '• visit someone in the hospital (Amerikan İngilizcesi hariç genel kural): hastanedeki binayı ziyaret etmek.',
      '• sit on the bed: yatağın üzerine oturmak (mobilya nesnesi).',
      'Home sözcüğü ise asla "to" almaz: go home, come home, arrive home.'
    ],
    examples: [
      { text: "Ali is in hospital with a broken arm.", tr: "Ali kırık kolu nedeniyle hastanede yatıyor (hasta)." },
      { text: "I went to the hospital to visit Ali.", tr: "Ali'yi ziyaret etmek için hastaneye (binaya) gittim." },
      { text: "Children must stay in school until they are eighteen.", tr: "Çocuklar on sekiz yaşına kadar okula devam etmelidir (öğrenci olarak)." },
      { text: "My mother went to the school to talk to the headteacher.", tr: "Annem müdürle görüşmek için okula (binaya) gitti." },
      { text: "It's time to go to bed.", tr: "Yatma (uyuma) vakti geldi." },
      { text: "Don't jump on the bed!", tr: "Yatağın üstünde zıplama!" }
    ],
    watch: [
      "Hasta olan biri için 'in the hospital' demek (İngiliz İngilizcesinde 'in hospital' hasta, 'in the hospital' ziyaretçidir; Amerikan İngilizcesinde ikisinde de the kullanılabilir ama İngiliz standardı ayrımı korur).",
      "Eve gitmek için to eklemek: 'go to home' kesinlikle yanlıştır, doğrusu 'go home'.",
      "Hapishanede yatan mahkûm için the koymak: 'He is in the prison' binayı kasteder, cezasını çeken için 'He is in prison' denir."
    ],
    tip: "O yerin 'amacı' için mi oradasın? Artikel yok (at school, in hospital, in prison). Sadece 'binayı/odayı' mı kastediyorsun? 'The' var (the school, the hospital).",
    check: [
      {
        prompt: "Kenan broke his leg and he is now in ___.",
        options: ["hospital", "the hospital", "a hospital"],
        answer: 0,
        why: "Hasta olarak tedavi gördüğü için kurum artikelsiz kullanılır: in hospital."
      },
      {
        prompt: "The teacher asked the parents to come to ___ for a meeting.",
        options: ["school", "the school", "schools"],
        answer: 1,
        why: "Veliler öğrenci olarak değil, binayı toplantı için ziyaret ettiğinden 'the school' denir."
      },
      {
        prompt: "I am exhausted. I am going to ___.",
        options: ["the bed", "bed", "a bed"],
        answer: 1,
        why: "Uyumak amacıyla yatmaya gitmek artikelsizdir: go to bed."
      }
    ]
  },
  {
    topic: 'basics_en_causatives_advanced',
    language: 'en',
    title: 'Ettirgen çatı incelikleri: have, get, make, let',
    level: 'B1',
    summary: 'Bir eylemi başkasına yaptırmak (ettirgen yapı) İngilizcede have, get, make ve let fiilleriyle kurulur. Her birinin fiil tamlayıcısı (to\'lu veya to\'suz mastar) ve zorlama derecesi farklıdır.',
    rules: [
      'have someone do something: to\'suz yalın fiil; birine işi rica etmek, görev vermek veya ücretiyle yaptırmak: I had the technician repair my laptop.',
      'get someone to do something: to\'lu mastar; birini ikna ederek, rica ederek veya teşvik ederek yaptırmak: I got my brother to help me with homework.',
      'make someone do something: to\'suz yalın fiil; zorlamak veya mecbur bırakmak: The police made him pull over. (Edilgen hali to alır: He was made to wait).',
      'let someone do something: to\'suz yalın fiil; izin vermek: She let her daughter stay up late.',
      'have/get something done: edilgen ettirgen (işin kime yaptırıldığı önemli değil, işin yapılması önemli): I had my hair cut. / I must get my car serviced.'
    ],
    examples: [
      { text: "I had the plumber fix the leaky pipe yesterday.", tr: "Dün tesisatçıya sızdıran boruyu tamir ettirdim." },
      { text: "She finally got her husband to eat more vegetables.", tr: "Sonunda kocasını daha çok sebze yemeye ikna etti (yedirmeyi başardı)." },
      { text: "The teacher made all students rewrite their essays.", tr: "Öğretmen bütün öğrencilere kompozisyonlarını baştan yazdırdı (zorunlu kıldı)." },
      { text: "Please let me explain what happened.", tr: "Lütfen ne olduğunu açıklamama izin ver." },
      { text: "We need to get our carpets cleaned before the holiday.", tr: "Bayramdan önce halılarımızı yıkatmamız (temizletmemiz) gerekiyor." },
      { text: "Where did you have your suit tailored?", tr: "Takım elbiseni nerede diktirdin?" }
    ],
    watch: [
      "Have ile to kullanmak: 'I had him to fix' değil 'I had him fix'.",
      "Get ile to'yu unutmak: 'I got him fix' değil 'I got him to fix'.",
      "Make'in etkeninde to kullanmak: 'He made me to cry' değil 'He made me cry'.",
      "Kuaförde saç kestirirken 'I cut my hair' demek: Kendiniz makası alıp kesmediyseniz mutlaka 'I had my hair cut' demelisiniz."
    ],
    tip: "Have = to'suz (görevlendirme). Get = to'lu (ikna). Make = to'suz (zorlama). Let = to'suz (izin).",
    check: [
      {
        prompt: "I will get my assistant ___ you the agenda.",
        options: ["email", "to email", "emailed"],
        answer: 1,
        why: "Get + kişi + to + yalın fiil kuralı gereği 'to email' olmalıdır."
      },
      {
        prompt: "The strict boss made everyone ___ on Saturday.",
        options: ["work", "to work", "working"],
        answer: 0,
        why: "Make + kişi + to'suz yalın fiil ile kurulur."
      },
      {
        prompt: "You look fantastic! Did you have your hair ___?",
        options: ["cut", "to cut", "cutting"],
        answer: 0,
        why: "Have something done kalıbında fiilin 3. hali (V3) kullanılır (cut-cut-cut)."
      }
    ]
  },
  // B2
  {
    topic: 'basics_en_cleft_variations',
    language: 'en',
    title: 'Vurgu cümleleri: it-clefts ve wh-clefts',
    level: 'B2',
    summary: 'Cümledeki belirli bir bilgiyi (özne, nesne, yer veya zaman) dinleyicinin dikkatine sunmak veya bir yanlışı düzeltmek için parçalı vurgu cümleleri (cleft sentences) kullanılır.',
    rules: [
      'It-cleft formülü: It + is/was + vurgulanan öge + that/who + cümlenin geri kalanı.',
      'Örnek: "Kerem broke the vase yesterday." cümlesi:',
      '• Özneyi vurgulamak: It was Kerem who/that broke the vase (Vazoyu kıran Kerem\'di).',
      '• Nesneyi vurgulamak: It was the vase that Kerem broke (Kerem\'in kırdığı şey vazoydu).',
      '• Zamanı vurgulamak: It was yesterday that Kerem broke the vase (Kerem vazoyu dün kırdı).',
      'Wh-cleft (pseudo-cleft) formülü: What + özne + fiil + is/was + vurgulanan şey.',
      '• What I need is a cup of strong coffee (İhtiyacım olan tek şey sert bir kahve).',
      '• What surprised me was his calm reaction (Beni şaşırtan şey onun sakin tepkisiydi).',
      'All-cleft (tek şey vurgusu): All you need is love. All I did was ask a simple question.',
      'The reason why / The place where / The person who ile vurgu: The person who called you was Selin.'
    ],
    examples: [
      { text: "It was not me who made that terrible mistake.", tr: "O korkunç hatayı yapan ben değildim." },
      { text: "It was in London that they first met, not Paris.", tr: "İlk tanıştıkları yer Paris değil Londra'ydı." },
      { text: "What we really want to know is the truth.", tr: "Bizim gerçekten öğrenmek istediğimiz şey gerçektir." },
      { text: "What happened was that the car broke down on the motorway.", tr: "Olan şey, arabanın otoyolda bozulmasıydı." },
      { text: "All I want is an honest answer.", tr: "Bütün istediğim dürüst bir cevap." },
      { text: "The reason why she resigned was poor management.", tr: "İstifa etmesinin nedeni kötü yönetimdi." }
    ],
    watch: [
      "It-cleft yapısında çoğul özneye çoğul 'they' koymak: 'They were the children who made noise' değil 'It was the children who made noise'. Giriş daima tekil 'It is/was' ile yapılır.",
      "Wh-cleft yapısında 'Which' veya 'That' ile başlamak: 'Which I want is...' değil 'What I want is...'.",
      "All-cleft sonrasında do fiili varsa ikinci fiili to ile bağlamak: 'All I did was to cry' yerine doğal olan 'All I did was cry'dır."
    ],
    tip: "Düz cümlenin önüne 'It is/was' koyup vurgulamak istediğin parçayı arkasına al, geri kalanını 'that' ile bağla.",
    check: [
      {
        prompt: "___ was my brother who solved the puzzle.",
        options: ["He", "There", "It"],
        answer: 2,
        why: "İt-cleft kalıbı daima 'It was/is...' ile başlar."
      },
      {
        prompt: "___ I really admire about her is her honesty.",
        options: ["What", "Which", "That"],
        answer: 0,
        why: "Pseudo-cleft vurgusunda cümlenin başında 'What' kullanılır."
      },
      {
        prompt: "All she did ___ complain about the weather.",
        options: ["was", "is to", "were"],
        answer: 0,
        why: "Geçmiş zamanlı all-cleft yapısında 'All she did was + yalın fiil' kullanılır."
      }
    ]
  },
  {
    topic: 'basics_en_double_comparatives',
    language: 'en',
    title: 'Paralel karşılaştırma: the more ... the better',
    level: 'B2',
    summary: 'İki durumun birbiriyle doğru veya ters orantılı olarak değiştiğini anlatmak için "the + comparative ..., the + comparative ..." kalıbı kullanılır (Ne kadar ... o kadar ...).',
    rules: [
      'Standart kalıp: The + [karşılaştırma derecesi] + [cümle 1], the + [karşılaştırma derecesi] + [cümle 2].',
      'Tek heceli sıfatlar: The sooner you start, the earlier you will finish (Ne kadar erken başlarsan o kadar erken bitirirsin).',
      'Uzun sıfatlar: The more expensive the hotel, the better the service should be.',
      'İsimle kullanım: The more books you read, the more knowledge you gain.',
      'Ters orantı: The more I study, the less I feel I know (Ne kadar çalışırsam o kadar az bildiğimi hissediyorum).',
      'Kısa konuşma kalıpları: The sooner, the better (Ne kadar erken, o kadar iyi). The more, the merrier (Ne kadar kalabalık, o kadar neşeli).'
    ],
    examples: [
      { text: "The higher you climb, the colder it gets.", tr: "Ne kadar yükseğe tırmanırsan hava o kadar soğur." },
      { text: "The more you practise speaking, the more confident you become.", tr: "Konuşma pratiği ne kadar çok yaparsan o kadar özgüven kazanırsın." },
      { text: "The less sugar you consume, the healthier you will be.", tr: "Ne kadar az şeker tüketirsen o kadar sağlıklı olursun." },
      { text: "When should we leave? — The earlier, the better.", tr: "Ne zaman çıkmalıyız? — Ne kadar erken, o kadar iyi." },
      { text: "The older I get, the more I value peace and quiet.", tr: "Yaşım ilerledikçe huzur ve sessizliğe o kadar çok değer veriyorum." },
      { text: "The more complex the problem, the simpler the solution must be.", tr: "Sorun ne kadar karmaşıksa çözüm o kadar yalın olmalıdır." }
    ],
    watch: [
      "İlk parçanın başına 'The' koyup ikinci parçanın başına koymamak: 'The more you study, better you score' değil; her iki taraf da mutlaka 'the' ile başlamalıdır.",
      "As much as ile karıştırmak: Bu orantı kalıbında 'as much' değil karşılaştırma hali (more, better, less, higher) kullanılır.",
      "Cümle sıralamasını soru cümlesi gibi devrik yapmak: 'The more do you study' değil 'The more you study'."
    ],
    tip: "Her iki yarının da başında 'the' olmalı: The [karşılaştırma], the [karşılaştırma]. Türkçe karşılığı: 'Ne kadar ..., o kadar ...'.",
    check: [
      {
        prompt: "The more you exercise, ___ you feel.",
        options: ["better", "the better", "the best"],
        answer: 1,
        why: "Kalıp simetriktir; ikinci cümlenin de 'the + comparative' ile başlaması gerekir."
      },
      {
        prompt: "The ___ you drive, the safer the journey is.",
        options: ["more slow", "slower", "slowly"],
        answer: 1,
        why: "Tek heceli sıfatlarda comparative -er eki alır: slower."
      },
      {
        prompt: "Hangisi doğrudur?",
        options: ["The more money he makes, the more he spends.", "More money he makes, the more he spends.", "The more money he makes, more he spends."],
        answer: 0,
        why: "Her iki tarafta da 'the' bulunmalıdır."
      }
    ]
  },
  {
    topic: 'basics_en_prepositional_verbs',
    language: 'en',
    title: 'Üç parçalı phrasal verb\'ler ve ikili edatlar',
    level: 'B2',
    summary: 'Bazı phrasal verb\'ler fiil + zarf + edat olmak üzere üç parçadan oluşur (ör. look forward to, put up with). Bu yapılar asla araya nesne almaz, bölünmez ve sonlarındaki edat daima isim veya -ing ister.',
    rules: [
      'Üç parçalı phrasal verb\'ler daima bitişik kalır; aralarına hiçbir nesne veya zamir giremez: I look forward to your email (look your email forward to denmez).',
      'En sık kullanılan hayati yapılar:',
      '• look forward to: sabırsızlıkla/dört gözle beklemek. (To bir edattır, fiil -ing alır: look forward to seeing you).',
      '• put up with: katlanmak, tahammül etmek (tolerate): I cannot put up with this noise anymore.',
      '• run out of: bitmek, tükenmek: We have run out of petrol.',
      '• get on / along with: biriyle iyi geçinmek: Do you get along with your colleagues?',
      '• look up to: hayranlık duymak, saygı beslemek (admire): He has always looked up to his older brother.',
      '• look down on: birini küçük görmek, hor görmek (despise): You should never look down on anyone.',
      '• come up with: (fikir, çözüm, plan) ortaya atmak, üretmek: She came up with a brilliant idea.',
      '• cut down on: (tüketimi) kısmak, azaltmak: I am trying to cut down on coffee.',
      '• catch up with: yetişmek, aradaki farkı kapatmak: Go ahead, I will catch up with you later.',
      '• get away with: yaptığı yanına kâr kalmak, cezasız kurtulmak: He cheated and got away with it.'
    ],
    examples: [
      { text: "I'm really looking forward to meeting your family.", tr: "Ailenle tanışmayı gerçekten dört gözle bekliyorum." },
      { text: "How can you put up with his constant complaining?", tr: "Onun sürekli şikayet etmesine nasıl katlanabiliyorsun?" },
      { text: "We've run out of time, so let's wrap up.", tr: "Vaktimiz tükendi, hadi toparlayalım." },
      { text: "Scientists are trying to come up with a cure.", tr: "Bilim insanları bir tedavi üretmeye (bulmaya) çalışıyorlar." },
      { text: "You must cut down on sweet foods for your teeth.", tr: "Dişlerin için tatlı yiyecekleri azaltmalısın." },
      { text: "Don't think you can get away with breaking the rules.", tr: "Kuralları çiğnemenin yanına kâr kalacağını sanma." }
    ],
    watch: [
      "Look forward to sonrasında yalın fiil kullanmak: 'I look forward to hear from you' en yaygın hatadır; to burada edat olduğu için doğrusu 'I look forward to hearing from you'dur.",
      "Araya zamir sokmaya çalışmak: 'run it out of' denmez, 'run out of it' denir.",
      "Edatlardan birini düşürmek: 'put up his noise' değil 'put up with his noise'."
    ],
    tip: "Üç parçalı phrasal verb'leri tek bir kelime gibi blok halinde ezberleyin ve sondaki edatın peşinden isim veya -ing getirin.",
    check: [
      {
        prompt: "I am looking forward to ___ you at the conference.",
        options: ["see", "seeing", "saw"],
        answer: 1,
        why: "Look forward to kalıbındaki to bir edattır; peşinden gelen eylem -ing alır."
      },
      {
        prompt: "We have run out ___ bread. Can you buy some?",
        options: ["of", "off", "from"],
        answer: 0,
        why: "Kalıp 'run out of' biçimindedir."
      },
      {
        prompt: "Nobody should look ___ on people who have less money.",
        options: ["up", "down", "off"],
        answer: 1,
        why: "Hor görmek, küçük görmek anlamındaki kalıp 'look down on'dur."
      }
    ]
  },
  // C1
  {
    topic: 'basics_en_inversion_conditionals',
    language: 'en',
    title: 'Şart cümlelerinde devriklik: had I known, were I, should you',
    level: 'C1',
    summary: 'Resmî, edebi ve ileri düzey İngilizcede "if" bağlacı atılarak yardımcı fiil başa getirilir ve devrik şart cümlesi kurulur. Bu yapı Type 1 (should), Type 2 (were) ve Type 3 (had) için geçerlidir.',
    rules: [
      'Type 3 (Geçmiş Şart) Devrikliği: If + had yerine "Had + özne + V3" gelir:',
      '• Düz: If I had known about the meeting, I would have attended.',
      '• Devrik: Had I known about the meeting, I would have attended.',
      'Type 2 (Hayali/Şimdiki Şart) Devrikliği: If yerine "Were + özne + to + fiil" (ya da were + özne):',
      '• Düz: If I were in your position, I would accept the job.',
      '• Devrik: Were I in your position, I would accept the job.',
      '• Fiil varsa: Were the negotiations to fail, the consequences would be severe (If the negotiations failed...).',
      'Type 1 (Olası Şart) Devrikliği: "Should + özne + yalın fiil":',
      '• Düz: If you need any assistance, please contact me.',
      '• Devrik: Should you need any assistance, please contact me (Herhangi bir yardıma ihtiyaç duyacak olursanız...).',
      'Olumsuz devrik şart cümlelerinde not kısaltılmaz: "Had we not missed the train..." (Hadn\'t we missed denmez).'
    ],
    examples: [
      { text: "Had we known the road was blocked, we would have taken another route.", tr: "Yolun kapalı olduğunu bilseydik başka bir güzergâh seçerdik." },
      { text: "Were I you, I wouldn't worry so much about what others think.", tr: "Senin yerinde olsaydım başkalarının ne düşündüğü hakkında bu kadar endişelenmezdim." },
      { text: "Were they to discover the error, the project would be cancelled.", tr: "Hatayı keşfedecek olurlarsa proje iptal edilir." },
      { text: "Should you have any further questions, do not hesitate to ask.", tr: "Başka sorunuz olacak olursa sormaktan çekinmeyiniz." },
      { text: "Had it not been for your support, I couldn't have finished this dissertation.", tr: "Senin desteğin olmasaydı bu tezi bitiremezdim." },
      { text: "Should anyone call for me, tell them I'll be back at two.", tr: "Beni arayan olursa saat ikide döneceğimi söyle." }
    ],
    watch: [
      "Devrik cümlede hem if hem devrik yardımcı fiil kullanmak: 'If had I known' kesinlikle yanlıştır; if atıldığı için devriklik yapılır: 'Had I known'.",
      "Olumsuzda kısaltma yapmak: 'Hadn't we arrived' değil 'Had we not arrived'.",
      'Should devrikliğinde özne tekil olsa bile fiile -s takısı eklemek: \'Should he arrives\' değil \'Should he arrive\' (should bir modal olduğu için fiil yalındır).'
    ],
    tip: "If'i at, yardımcı fiili (Had / Were / Should) cümlenin en başına taşı: If I had seen -> Had I seen.",
    check: [
      {
        prompt: "___ you need any further information, please let us know.",
        options: ["Should", "If should", "Had"],
        answer: 0,
        why: "Type 1 devrik şart yapısı 'Should + özne + yalın fiil' ile kurulur."
      },
      {
        prompt: "___ known about the change of venue, I would have arrived earlier.",
        options: ["Had I", "If had I", "Were I"],
        answer: 0,
        why: "Type 3 devrik şart yapısında if atılır ve 'Had + özne + V3' başa gelir."
      },
      {
        prompt: "___ the price to drop significantly, we would buy more shares.",
        options: ["Were", "Had", "Should"],
        answer: 0,
        why: "Type 2 geleceğe dönük hayali devriklik 'Were + özne + to + fiil' ile kurulur."
      }
    ]
  },
  {
    topic: 'basics_en_subjunctive_mandative',
    language: 'en',
    title: 'Emir ve tavsiye dilek kipi (mandative subjunctive)',
    level: 'C1',
    summary: 'Önem, zorunluluk veya tavsiye bildiren fiil ve sıfatlardan sonra (demand, insist, recommend, essential) that cümleciğinde özne ne olursa olsun fiil yalın (bare infinitive) kalır (-s veya zaman eki almaz).',
    rules: [
      'Tetikleyici fiiller: demand, insist, recommend, suggest, propose, urge, require, request, order.',
      'Tetikleyici sıfatlar: It is essential / crucial / vital / important / imperative / necessary that...',
      'Mandative subjunctive kuralı: That cümleciğindeki fiil kişi ve zamana bakılmaksızın yalındır (base form):',
      '• Standart kural: The doctor insisted that he take a few days off (takes değil, take!).',
      '• Be fiili doğrudan \'be\' kalır: It is vital that she be present at the hearing (is değil, be!).',
      'Olumsuz yapısı: Fiilin önüne doğrudan \'not\' getirilir (do/does/did kullanılmaz):',
      '• I recommend that you not mention this to anyone.',
      '• The judge ordered that the suspect not leave the country.',
      'İngiliz İngilizcesinde alternatif olarak \'should + fiil\' de yaygındır: insisted that he should take.'
    ],
    examples: [
      { text: "The committee recommended that the policy be changed immediately.", tr: "Komite politikanın derhal değiştirilmesini tavsiye etti." },
      { text: "It is crucial that every candidate arrive on time.", tr: "Her adayın vaktinde gelmesi hayati önem taşır." },
      { text: "My lawyer suggested that I not answer any questions without him.", tr: "Avukatım onun yanında olmadan hiçbir soruya cevap vermememi önerdi." },
      { text: "The manager insists that no one leave before the deadline is met.", tr: "Müdür, teslim tarihi karşılanmadan kimsenin çıkmaması konusunda ısrarcı." },
      { text: "It is essential that clean water be accessible to all villagers.", tr: "Tüm köylülerin temiz suya erişebilmesi elzemdir." },
      { text: "The regulations require that every passenger wear a seatbelt.", tr: "Yönetmelikler her yolcunun emniyet kemeri takmasını zorunlu kılar." }
    ],
    watch: [
      "Özne he/she/it diye fiile -s takısı eklemek: 'insisted that she stays' mandative kuralına göre yanlıştır; doğrusu 'insisted that she stay'dir.",
      "Be fiilini çekimlemek: 'vital that he is informed' yerine 'vital that he be informed'.",
      "Olumsuzda do/did kullanmak: 'suggested that he doesn't go' yerine 'suggested that he not go'."
    ],
    tip: "Demand, suggest veya essential that gördüyseniz ardındaki fiili soyun: ne -s, ne -ed, ne de yardımcı fiil. Sadece yalın kök fiil veya 'be'.",
    check: [
      {
        prompt: "It is essential that he ___ here before nine.",
        options: ["is", "be", "was"],
        answer: 1,
        why: "Essential that yapısından sonra subjunctive olarak yalın 'be' kullanılır."
      },
      {
        prompt: "The doctor recommended that she ___ more exercise.",
        options: ["take", "takes", "took"],
        answer: 0,
        why: "Subjunctive kuralında özne she olsa dahi fiil -s almaz; yalın 'take' kalır."
      },
      {
        prompt: "The board demanded that the CEO ___ immediately.",
        options: ["resigns", "resign", "resigned"],
        answer: 1,
        why: "Demand that ardındaki fiil yalın biçimde (resign) olmalıdır."
      }
    ]
  },
  {
    topic: 'basics_en_participle_advanced',
    language: 'en',
    title: 'İleri ortaç cümlecikleri ve bağımsız yapılar (nominative absolute)',
    level: 'C1',
    summary: 'İleri düzey yazı dilinde yan cümleleri kısaltmak için ortaçlar (having done, being done) ve kendi bağımsız öznesi olan mutlak ortaçlar (nominative absolute) kullanılır.',
    rules: [
      'Zaman sırası (Perfect Participle): Bir eylem diğerinden önce tamamlanmışsa "Having + V3" kullanılır:',
      '• Having finished her degree, Aylin moved to Berlin (Derecesini bitirdikten sonra...).',
      'Edilgen hal: "Having been + V3": Having been warned twice, he still continued.',
      'Neden-sonuç kısaltması: "Being" veya "Having been":',
      '• Being unable to find a taxi, we had to walk home.',
      'Dangling participle (askıda kalan ortaç) hatası: Kısaltılan cümlenin öznesi ana cümlenin öznesiyle aynı olmalıdır:',
      '• Hatalı: Walking down the street, the trees were beautiful (Sanki ağaçlar sokakta yürüyormuş gibi).',
      '• Doğru: Walking down the street, I admired the beautiful trees.',
      'Nominative Absolute (Kendi öznesi olan bağımsız yapı): Yan cümlenin öznesi farklı olduğunda özne başta tutulur:',
      '• Weather permitting, we will have a picnic on Sunday (Hava müsaade ederse...).',
      '• All tickets having been sold out, hundreds of fans returned home disappointed.'
    ],
    examples: [
      { text: "Having spent all his savings, Cem had to move back in with his parents.", tr: "Bütün birikimini harcamış olan Cem, ailesinin yanına taşınmak zorunda kaldı." },
      { text: "Having been rejected by five journals, the paper was finally accepted.", tr: "Beş dergi tarafından reddedilmiş olan makale sonunda kabul edildi." },
      { text: "Not knowing what to say, she remained silent throughout the interview.", tr: "Ne diyeceğini bilemediği için mülakat boyunca sessiz kaldı." },
      { text: "Time permitting, we will discuss the financial report at the end.", tr: "Zaman elverirse sonunda mali raporu ele alacağız." },
      { text: "The meeting having ended, everyone rushed to the cafeteria.", tr: "Toplantı bittiğinde (bitmiş olduğundan) herkes kafeteryaya koştu." },
      { text: "His voice trembling with emotion, he thanked his mentors.", tr: "Sesi duyguyla titreyerek danışmanlarına teşekkür etti." }
    ],
    watch: [
      "Özne uyuşmazlığı (Dangling modifier): Cümlenin öznesinin ortacı yapan kişi/nesne olduğuna dikkat edin.",
      "Zaman sırasını atlamak: Öncelik varsa yalın -ing yerine 'Having + V3' tercih edilmelidir.",
      "Olumsuzu yanlış yere koymak: 'Having not heard' değil 'Not having heard'."
    ],
    tip: "Önce olan eylem için: Having + V3. Eşzamanlı eylem veya sebep için: V-ing. Bağımsız farklı özne varsa: Özne + V-ing.",
    check: [
      {
        prompt: "___ the book twice, she remembered almost every detail.",
        options: ["Read", "Having read", "Being read"],
        answer: 1,
        why: "Kitabı daha önce okuyup bitirme eylemi tamamlandığı için 'Having read' kullanılır."
      },
      {
        prompt: "Weather ___, we are going to set sail early in the morning.",
        options: ["permits", "permitted", "permitting"],
        answer: 2,
        why: "'Weather permitting' bağımsız bir nominative absolute kalıbıdır (Hava müsaade ederse)."
      },
      {
        prompt: "Hangisinde dangling participle hatası YOKTUR?",
        options: [
          "Walking into the room, the window was broken.",
          "Walking into the room, I noticed the broken window.",
          "Walking into the room, a loud noise was heard."
        ],
        answer: 1,
        why: "Odaya yürüyen kişi 'I' öznesidir; pencere veya ses yürüyemez."
      }
    ]
  },
  {
    topic: 'basics_en_punctuation_flow',
    language: 'en',
    title: 'Akademik bağlaçlar ve akış: however, therefore, on the contrary',
    level: 'C1',
    summary: 'İleri düzey yazıda düşünceler arasındaki mantıksal geçişler (zıtlık, sonuç, ekleme, yalanlama) doğru bağlaçlar ve noktalama işaretleriyle (noktalı virgül ve virgül) kurulur.',
    rules: [
      'Geçiş zarfları (Conjunctive Adverbs): However, therefore, furthermore, nevertheless, moreover, consequently.',
      'İki bağımsız cümleyi bağlarken noktalama: Noktalı virgül (;) + bağlaç + virgül (,):',
      '• The evidence was inconclusive; however, the investigation continued.',
      '• (Veya iki ayrı cümle: The evidence was inconclusive. However, the investigation continued.)',
      'Hayati Nüans: "On the other hand" vs "On the contrary":',
      '• On the other hand: İki farklı yönü/seçeneği kıyaslar (Öte yandan): He is very talented. On the other hand, he lacks discipline.',
      '• On the contrary: Önceki cümlenin yanlış olduğunu söyler, yalanlar (Tam aksine): He is not lazy. On the contrary, he is the hardest worker here.',
      'Furthermore / Moreover: Yeni ve daha güçlü bir argüman ekler (Üstelik, dahası).',
      'Nonetheless / Nevertheless: Bütün bunlara rağmen, yine de (Despite this).'
    ],
    examples: [
      { text: "Sales dropped sharply; consequently, the company had to cut operating costs.", tr: "Satışlar keskin şekilde düştü; sonuç olarak şirket operasyonel maliyetleri kısmak zorunda kaldı." },
      { text: "She was exhausted; nevertheless, she managed to run the last five kilometres.", tr: "Bitkin düşmüştü; yine de son beş kilometreyi koşmayı başardı." },
      { text: "The theory sounds reasonable; in practice, however, it fails completely.", tr: "Teori mantıklı duyuluyor; uygulamada ise tam aksine büsbütün çöküyor." },
      { text: "\"Did you find the exam easy?\" \"On the contrary, it was the hardest test I've ever taken.\"", tr: "\"Sınavı kolay mı buldun?\" \"Tam tersine, şimdiye kadar girdiğim en zor testti.\"" },
      { text: "City life offers many cultural amenities; on the other hand, it can be noisy and stressful.", tr: "Şehir hayatı birçok kültürel olanak sunar; öte yandan gürültülü ve stresli olabilir." },
      { text: "The applicant has excellent qualifications; furthermore, she speaks three languages fluently.", tr: "Adayın mükemmel nitelikleri var; dahası, üç dili akıcı bir şekilde konuşuyor." }
    ],
    watch: [
      "Virgülle bağlama hatası (Comma splice): 'The car was old, however it worked' yanlıştır. Ancak 'The car was old; however, it worked' veya 'The car was old. However, it worked' denir.",
      "On the contrary ile on the other hand'i karıştırmak: Fikir dengesi kurarken 'on the contrary' denmez; sadece önceki iddiayı çürütürken denir.",
      "Although ile but'ı aynı cümlede kullanmak: 'Although it rained, but we went out' kesinlikle yanlıştır."
    ],
    tip: "Önceki iddiayı tamamen reddedip 'tam tersine' diyorsanız: On the contrary. İki farklı yönü tartıyorsanız: On the other hand.",
    check: [
      {
        prompt: "The results were disappointing. ___, they decided to repeat the experiment.",
        options: ["Nevertheless", "Although", "Because"],
        answer: 0,
        why: "Yeni cümleye büyük harfle başlayan ve 'yine de / buna rağmen' anlamı veren geçiş zarfı 'Nevertheless'tir."
      },
      {
        prompt: "He isn't arrogant at all. ___, he is one of the most modest people I know.",
        options: ["On the other hand", "On the contrary", "Moreover"],
        answer: 1,
        why: "Önceki iddia yalanlandığı ve tam tersi savunulduğu için 'On the contrary' kullanılır."
      },
      {
        prompt: "The device is very lightweight; ___, it has an incredible battery life.",
        options: ["furthermore", "whereas", "despite"],
        answer: 0,
        why: "Noktalı virgülden sonra yeni bir olumlu argüman eklemek için 'furthermore' uygundur."
      }
    ]
  }
]
