import type { TopicLesson } from './lessonTypes'

export const EN_LESSONS_7: TopicLesson[] = [
  {
    topic: "basics_en_conditional_alternatives",
    language: "en",
    level: "B2",
    title: "Koşulun diğer yolları: provided that, as long as, unless, in case, otherwise",
    summary: "“if” dışında koşul bildiren bağlaçlar ve aralarındaki farklar: provided that / as long as (şartıyla), unless (-mezse), in case (önlem olarak), otherwise (yoksa), supposing (varsayalım).",
    rules: [
      "Şart bildiren güçlü bağlaçlar: provided (that), providing (that), as long as, so long as “yeter ki, şartıyla” demektir: You can borrow my car provided that you drive carefully.",
      "unless = if … not: Unless you hurry, you will miss the train (= If you don’t hurry, …). unless’ten sonra olumsuz fiil kullanılmaz: “Unless you don’t hurry” yanlıştır.",
      "in case ≠ if: in case “-ebilir diye, önlem olarak” demektir. Take an umbrella in case it rains = yağmur yağabilir diye şemsiye al; If it rains, take an umbrella = yağarsa al.",
      "otherwise “yoksa, aksi halde” anlamında iki cümleyi bağlar: Hurry up; otherwise we will be late. Daha konuşma dilinde or else de kullanılır.",
      "Resmî ve tek koşul: on condition that, only if: You may enter on condition that you show your ID. Only if cümlenin başındaysa ana cümlede devrik yapı gelir: Only if you pay will we ship the order.",
      "Varsayım sorusu: supposing / suppose / what if: Supposing you won the lottery, what would you do? (gerçek dışı varsayımda past simple).",
      "Bu bağlaçlardan sonra gelecek zaman (will) kullanılmaz; present simple ya da present perfect gelir: You can go provided that you finish your homework (“provided that you will finish” değil).",
      "Resmî dilde bağlaç yerine devrik yapı da kullanılır: Should you need help, call me (= If you need help, call me)."
    ],
    table: {
      caption: "Koşul bildiren bağlaçlar",
      head: [
        "Bağlaç",
        "Anlam",
        "Örnek"
      ],
      rows: [
        [
          "provided that / providing",
          "yeter ki, şartıyla",
          "You can go provided that you call me."
        ],
        [
          "as long as / so long as",
          "-dığı sürece, yeter ki",
          "I will help as long as you listen."
        ],
        [
          "unless",
          "-mezse (if … not)",
          "Unless you hurry, you will be late."
        ],
        [
          "in case",
          "-ebilir diye (önlem)",
          "Take a coat in case it gets cold."
        ],
        [
          "otherwise / or else",
          "yoksa, aksi halde",
          "Hurry; otherwise we will miss it."
        ],
        [
          "on condition that",
          "resmî: şartıyla",
          "You may enter on condition that you register."
        ],
        [
          "supposing / what if",
          "varsayalım ki",
          "Supposing it rains, what will we do?"
        ],
        [
          "should + özne (devrik)",
          "resmî: eğer … olursa",
          "Should you need help, call me."
        ]
      ]
    },
    examples: [
      {
        text: "You can borrow my laptop provided that you return it on Monday.",
        tr: "Pazartesi geri getirmen şartıyla dizüstü bilgisayarımı ödünç alabilirsin."
      },
      {
        text: "Unless you leave now, you will miss the last train.",
        tr: "Şimdi çıkmazsan son treni kaçıracaksın."
      },
      {
        text: "Take a spare key in case you lose yours.",
        tr: "Seninkini kaybedersin diye yedek bir anahtar al."
      },
      {
        text: "Book early; otherwise you will not find a seat.",
        tr: "Erken rezervasyon yap; yoksa yer bulamazsın."
      },
      {
        text: "I will lend you the money as long as you pay me back soon.",
        tr: "Yakında geri ödemen şartıyla sana parayı ödünç veririm."
      },
      {
        text: "Supposing you won the lottery, what would you do?",
        tr: "Piyangoyu kazandığını varsayalım, ne yapardın?"
      }
    ],
    watch: [
      "“in case” “if” anlamına gelmez: “Take an umbrella in case it rains” önlemdir; yağmurun yağacağını varsaymaz. Türkçede “yağarsa” diye çevirmek yanıltır.",
      "“Unless you don’t …” ya da “unless it won’t …” gibi olumsuz yapılar yanlıştır; unless zaten olumsuz anlam taşır: Unless you hurry.",
      "provided that, as long as ve unless’ten sonra gelecek için will kullanma: “provided that you will pay” yerine “provided that you pay”."
    ],
    tip: "Önce anlamı sor: şart mı (provided that / as long as), şartsa yoksa mı (unless / otherwise), yoksa önlem mi (in case)? Sonra yan cümleyi present simple ile kur.",
    check: [
      {
        prompt: "___ you hurry, you’ll miss the bus.",
        options: [
          "Unless",
          "Provided",
          "In case",
          "Otherwise"
        ],
        answer: 0,
        why: "Unless = if … not: Unless you hurry (= If you don’t hurry)."
      },
      {
        prompt: "Take a coat ___ it gets cold.",
        options: [
          "in case",
          "unless",
          "provided",
          "otherwise"
        ],
        answer: 0,
        why: "Önlem anlamı için in case kullanılır: soğuk olabilir diye."
      },
      {
        prompt: "You can borrow my car ___ you drive carefully.",
        options: [
          "provided that",
          "unless",
          "in case",
          "otherwise"
        ],
        answer: 0,
        why: "Şart anlamı için provided that kullanılır: dikkatli kullanman şartıyla."
      }
    ]
  }
]
