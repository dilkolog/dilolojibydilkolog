import type { TopicLesson } from './lessonTypes'

export const FR_LESSONS_7: TopicLesson[] = [
  {
    topic: "basics_fr_subordonnees_temporelles",
    language: "fr",
    level: "B2",
    title: "Zaman bağlaçları: dès que, jusqu’à ce que, avant que, après que",
    summary: "Bir olayı başka bir olaya göre zamanlayan bağlaçlar: hangisi gösterge (indicatif), hangisi subjonctif alır ve gelecek anlatılırken yan cümlede hangi zaman kullanılır.",
    rules: [
      "Eşzamanlılık: quand / lorsque + indicatif (Quand il pleut, je reste chez moi); süre vurgulanırsa pendant que, zıtlık da varsa tandis que ve alors que: Je lis pendant que tu cuisines.",
      "Hemen ardından: dès que, aussitôt que + indicatif. Gelecekte olacaksa yan cümlede futur antérieur (bitmiş) ya da futur simple kullanılır: Dès que j’aurai fini, je t’appellerai.",
      "Türkçedeki “geldiğinde, gelince” kalıbının aksine Fransızcada gelecek için quand / lorsque / dès que + futur gerekir: Quand tu viendras demain, apporte ton ordinateur (« Quand tu viens » yanlıştır).",
      "Birlikte gelişme: au fur et à mesure que, à mesure que + indicatif (… -dıkça): À mesure que le temps passait, il se sentait mieux.",
      "Önce gelen olay: avant que + subjonctif; henüz olmamış bir sınıra kadar: jusqu’à ce que, en attendant que + subjonctif: Ne partez pas avant qu’il soit revenu.",
      "Sonra gelen olay: après que + indicatif (norm budur; konuşmada subjonctif de duyulur ama yazıda ve sınavlarda indicatif beklenir): Après qu’il est parti, nous avons rangé la salle.",
      "Özne aynıysa bağlaç yerine edat yapısı: avant de + mastar, après + geçmiş mastar (après avoir / être + ortaç): Avant de partir, il a fermé la porte. Après avoir mangé, elle est sortie.",
      "Tekrar ve süre: chaque fois que, à chaque fois que, tant que (… sürece), depuis que, maintenant que (artık … olduğuna göre) hepsi indicatif alır: Tant que tu es malade, reste au lit."
    ],
    table: {
      caption: "Zaman bağlaçları ve kipleri",
      head: [
        "Bağlaç",
        "Kip",
        "Anlam",
        "Örnek"
      ],
      rows: [
        [
          "quand / lorsque",
          "indicatif (gelecekte: futur)",
          "-dığında",
          "Quand tu arriveras, appelle-moi."
        ],
        [
          "dès que / aussitôt que",
          "indicatif (futur / futur antérieur)",
          "-ır -maz",
          "Dès que j’aurai fini, je pars."
        ],
        [
          "pendant que / tandis que",
          "indicatif",
          "-erken / oysa",
          "Je travaille pendant qu’il dort."
        ],
        [
          "au fur et à mesure que",
          "indicatif",
          "-dıkça",
          "Il progresse au fur et à mesure qu’il lit."
        ],
        [
          "avant que / en attendant que",
          "subjonctif",
          "-meden önce / -ene kadar",
          "Attends avant qu’il parte."
        ],
        [
          "jusqu’à ce que",
          "subjonctif",
          "-ene kadar",
          "Reste jusqu’à ce que je revienne."
        ],
        [
          "après que",
          "indicatif",
          "-dıktan sonra",
          "Après qu’il est venu, nous avons dîné."
        ],
        [
          "tant que / depuis que",
          "indicatif",
          "-dığı sürece / -dığından beri",
          "Tant que tu es là, je reste."
        ]
      ]
    },
    examples: [
      {
        text: "Je t’appellerai dès que je serai arrivé à la gare.",
        tr: "İstasyona varır varmaz seni arayacağım."
      },
      {
        text: "Ne partez pas avant que le directeur soit revenu.",
        tr: "Müdür dönmeden gitmeyin."
      },
      {
        text: "Nous avons attendu jusqu’à ce que le feu passe au vert.",
        tr: "Işık yeşile dönene kadar bekledik."
      },
      {
        text: "Après qu’elle a appris la nouvelle, elle a pleuré.",
        tr: "Haberi öğrendikten sonra ağladı."
      },
      {
        text: "Il se sentait mieux à mesure que la discussion avançait.",
        tr: "Tartışma ilerledikçe kendini daha iyi hissediyordu."
      },
      {
        text: "Maintenant que tu es là, on peut commencer.",
        tr: "Artık sen geldiğine göre başlayabiliriz."
      }
    ],
    watch: [
      "Gelecek anlatırken yan cümlede şimdiki zaman kullanma: “Geldiğinde ara” için « Quand tu arriveras, appelle-moi » (« Quand tu arrives » yanlış).",
      "« Après que » ile subjonctif kullanma hatası çok yaygındır; norm indicatif: « Après qu’il est parti ». « Avant que » ise subjonctif ister.",
      "Özne aynıysa avant que yerine avant de + mastar kullan: « Avant de répondre, il a réfléchi » (« Avant qu’il réponde » iki farklı özne için)."
    ],
    tip: "Önce sor: olay yan cümlede önce mi geliyor? Evetse (avant que, jusqu’à ce que, en attendant que) subjonctif; sonra ya da aynı anda ise (après que, quand, dès que, pendant que) indicatif.",
    check: [
      {
        prompt: "Dès que nous ___ (finir), nous partirons.",
        options: [
          "aurons fini",
          "ayons fini",
          "aurions fini",
          "avions fini"
        ],
        answer: 0,
        why: "Gelecekte bitmiş bir olay için dès que + futur antérieur kullanılır: aurons fini."
      },
      {
        prompt: "« Reste ___ il revienne. » (O dönene kadar)",
        options: [
          "jusqu’à ce qu’",
          "pendant qu’",
          "après qu’",
          "dès qu’"
        ],
        answer: 0,
        why: "Henüz olmamış bir sınıra kadar: jusqu’à ce que + subjonctif (revienne)."
      },
      {
        prompt: "« Après qu’il ___ parti, nous avons mangé. »",
        options: [
          "est",
          "soit",
          "serait",
          "fût"
        ],
        answer: 0,
        why: "Norm olarak après que indicatif alır: est parti."
      }
    ]
  }
]
