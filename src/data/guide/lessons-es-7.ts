import type { TopicLesson } from './lessonTypes'

export const ES_LESSONS_7: TopicLesson[] = [
  {
    topic: "basics_es_perifrasis_obligacion_modal",
    language: "es",
    level: "B2",
    title: "Zorunluluk, tahmin ve süreç: tener que, deber de, ir + gerundio",
    summary: "Fiil çevrelemeleriyle zorunluluğu, tahmini, giderek artan süreci ve sonucu anlatmak: hay que, tener que, deber (de), soler, ir / venir + gerundio, llegar a, acabar + gerundio.",
    rules: [
      "Zorunluluk: tener que + mastar kişiseldir ve güçlüdür (Tengo que irme); hay que + mastar kişisizdir, genel kural bildirir (Hay que estudiar para aprobar); deber + mastar ahlaki ya da tavsiye niteliğinde zorunluluk (Debes descansar); haber de + mastar resmî ve yazı dilindedir (He de decirte algo).",
      "Tahmin: deber de + mastar “muhtemelen” demektir (Debe de estar en casa); deber + mastar ise zorunluluktur (Debe llegar a las nueve). Günlük dilde de atılması yaygındır ama sınavlarda ayrım beklenir.",
      "Yaklaşıklık: venir a + mastar “kabaca, aşağı yukarı” anlamı verir: Eso viene a costar cien euros.",
      "Süreç: ir + gerundio giderek artan ya da azalan gelişmeyi (La situación va mejorando), venir + gerundio belli bir süredir devam edeni (Vengo diciéndolo hace meses), andar + gerundio ortalıkta sürekli yapılan şeyi anlatır (Anda buscando trabajo).",
      "Alışkanlık: soler + mastar “genellikle yapmak” demektir ve çoğunlukla presente ya da imperfecto’da kullanılır: Suelo madrugar, solíamos cenar tarde.",
      "Sonuç: llegar a + mastar “bir noktaya varmak, sonunda …” (Nunca llegó a ser rico); acabar + gerundio ya da acabar por + mastar “sonunda … yapmak” (Acabó aceptando / Acabé por rendirme). Dikkat: acabar de + mastar “az önce” demektir.",
      "Zamir: perífrasisle zamir ya mastarın sonuna yapışır ya da çekimli fiilin önüne gelir: Tengo que hacerlo = Lo tengo que hacer.",
      "Olumsuzda anlam değişir: no tener que = gerekmez, zorunda değilsin (No tienes que venir); no deber = yapmamalısın, yasak ya da uygunsuz (No debes venir)."
    ],
    table: {
      caption: "Zorunluluk, tahmin ve süreç perífrasisleri",
      head: [
        "Kalıp",
        "Anlam",
        "Örnek"
      ],
      rows: [
        [
          "tener que + mastar",
          "kişisel zorunluluk",
          "Tengo que estudiar."
        ],
        [
          "hay que + mastar",
          "kişisiz zorunluluk / genel kural",
          "Hay que beber agua."
        ],
        [
          "deber + mastar",
          "ahlaki zorunluluk / tavsiye",
          "Debes descansar."
        ],
        [
          "deber de + mastar",
          "tahmin: muhtemelen",
          "Debe de estar enfermo."
        ],
        [
          "ir + gerundio",
          "giderek, aşama aşama",
          "El tiempo va mejorando."
        ],
        [
          "venir + gerundio",
          "bir süredir sürüp gelen",
          "Vengo diciéndolo."
        ],
        [
          "soler + mastar",
          "alışkanlık: genellikle",
          "Suelo madrugar."
        ],
        [
          "llegar a / acabar + gerundio",
          "sonuç: sonunda",
          "Acabó aceptando."
        ]
      ]
    },
    examples: [
      {
        text: "Para sacar el carnet hay que aprobar dos exámenes.",
        tr: "Ehliyet almak için iki sınavı geçmek gerekir."
      },
      {
        text: "No contesta; debe de estar en la ducha.",
        tr: "Cevap vermiyor; herhalde duşta."
      },
      {
        text: "La situación económica va mejorando poco a poco.",
        tr: "Ekonomik durum yavaş yavaş düzeliyor."
      },
      {
        text: "Los domingos solemos comer en casa de mis abuelos.",
        tr: "Pazarları genellikle büyükanne ve büyükbabamda yemek yeriz."
      },
      {
        text: "Después de mucho dudar, acabó aceptando la oferta.",
        tr: "Çok tereddüt ettikten sonra sonunda teklifi kabul etti."
      },
      {
        text: "No tienes que venir si estás ocupado.",
        tr: "Meşgulsen gelmek zorunda değilsin."
      }
    ],
    watch: [
      "« Debe de » (tahmin) ile « debe » (zorunluluk) karıştırılır: « Debe de ser tarde » “herhalde geç oldu”, « Debes ser puntual » “dakik olmalısın”.",
      "« No tienes que » (gerekmez) ile « no debes » (yapmamalısın) aynı anlama gelmez; Türkçedeki “-meli / -mek zorunda değil” ayrımına paraleldir.",
      "« Acabar de + mastar » “az önce” anlamı verir; “sonunda” için acabar + gerundio ya da acabar por + mastar kullan."
    ],
    tip: "Tek soru sor: kural mı, tahmin mi, süreç mi? Kural: tener que / hay que / deber; tahmin: deber de; süreç: ir, venir, andar + gerundio.",
    check: [
      {
        prompt: "Mañana ___ madrugar; el tren sale a las seis.",
        options: [
          "tengo que",
          "debe de",
          "suelo",
          "vengo"
        ],
        answer: 0,
        why: "Kişisel ve güçlü zorunluluk için tener que + mastar kullanılır."
      },
      {
        prompt: "« Debe de estar enfermo » cümlesi ne anlama gelir?",
        options: [
          "Herhalde hasta",
          "Hasta olmak zorunda",
          "Hasta olmamalı",
          "Hasta olmak üzere"
        ],
        answer: 0,
        why: "deber de + mastar tahmin bildirir: muhtemelen hasta."
      },
      {
        prompt: "El precio de la vivienda ___ subiendo cada año.",
        options: [
          "va",
          "suele",
          "debe de",
          "hay que"
        ],
        answer: 0,
        why: "Giderek artan süreç: ir + gerundio (va subiendo)."
      }
    ]
  }
]
