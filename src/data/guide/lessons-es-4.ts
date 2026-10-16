import type { TopicLesson } from './lessonTypes'

export const ES_LESSONS_4: TopicLesson[] = [
  // A1
  {
    topic: 'basics_es_a_personal',
    language: 'es',
    title: "Kişisel 'A' edatı: Busco a mi hermano vs Busco mi libro",
    level: 'A1',
    summary: "İspanyolcada bir cümlenin doğrudan nesnesi (belirtili nesne) belirli bir insan ya da sevilen bir evcil hayvan olduğunda nesnenin önüne mutlaka 'a' edatı getirilir. Cansız nesnelerde ise 'a' kullanılmaz.",
    rules: [
      'Belirli bir insan nesne olduğunda zorunlu "a":',
      '• Veo a María todos los días (María\'yı her gün görüyorum).',
      '• ¿Conoces a mi padre? (Babamı tanıyor musun?)',
      '• Llama a la policía (Polisi ara).',
      'Cansız nesnelerde "a" ASLA kullanılmaz:',
      '• Veo la televisión (Televizyonu izliyorum -> Veo a la televisión denmez!).',
      '• Compro un libro (Bir kitap satın alıyorum).',
      'Sevilen evcil hayvanlar (kişileştirilmiş canlılar) da "a" alır: Saco a pasear a mi perro (Köpeğimi gezdirmeye çıkarıyorum).',
      'Belgisiz zamirler (alguien, nadie, todos, quién) nesne olduğunda daima "a" alır: No veo a nadie (Kimseyi görmüyorum), Busco a alguien.',
      'İstisna fiil: "Tener" fiili sahiplik bildirdiğinde genelde "a" almaz: Tengo dos hermanos (Tengo a dos hermanos denmez; ancak özel bir koruma/sorumluluk kastı varsa istisnaen gelebilir).'
    ],
    examples: [
      { text: "Ayer vi a Carlos en el supermercado.", tr: "Dün süpermarkette Carlos'u gördüm." },
      { text: "Ayer compré el pan en el supermercado.", tr: "Dün süpermarkette ekmeği aldım (cansız: 'a' yok)." },
      { text: "¿A quién estás esperando? — Espero a mi hermana.", tr: "Kimi bekliyorsun? — Kız kardeşimi bekliyorum." },
      { text: "No conozco a nadie en esta fiesta.", tr: "Bu partide kimseyi tanımıyorum." },
      { text: "Llevo a mi gato al veterinario todos los meses.", tr: "Kedimi her ay veterinere götürüyorum." },
      { text: "Tengo tres primos que viven en Sevilla.", tr: "Sevilla'da yaşayan üç kuzenim var (tener ile 'a' kullanılmaz)." }
    ],
    watch: [
      "Cansız nesnelerin önüne 'a' koymak: 'Escucho a la música' kesinlikle yanlıştır; doğrusu 'Escucho la música'dır.",
      "İnsan nesnelerde 'a'yı unutmak: 'Veo mi madre' değil 'Veo a mi madre'.",
      "Tener ile otomatik 'a' kullanmak: 'Tengo a un hermano' değil 'Tengo un hermano'."
    ],
    tip: "Cümlenin nesnesi insan mı veya can dostun evcil hayvanın mı? Başına 'a' koy: Veo a Juan. Cansız nesne mi? 'A'yı kaldır: Veo el tren.",
    check: [
      {
        prompt: "Ayer llamé ___ mis padres por teléfono.",
        options: ["a", "en", "para"],
        answer: 0,
        why: "Ebeveynler (insan) doğrudan nesne olduğu için kişisel 'a' zorunludur: llamé a mis padres."
      },
      {
        prompt: "¿Has visto ___ mis llaves?",
        options: ["a", "Ø (hiçbir şey)", "al"],
        answer: 1,
        why: "Anahtarlar (llaves) cansız bir nesne olduğu için kişisel 'a' almaz."
      },
      {
        prompt: "No encuentro ___ nadie que me pueda ayudar.",
        options: ["a", "de", "con"],
        answer: 0,
        why: "'Nadie' belgisiz kişi zamiri nesne olduğunda mutlaka 'a' alır: a nadie."
      }
    ]
  },
  // A2
  {
    topic: 'basics_es_gustar_familia',
    language: 'es',
    title: 'Gustar ailesi fiilleri: encantar, doler, importar, parecer',
    level: 'A2',
    summary: "İspanyolcada 'gustar' gibi çalışan birçok önemli fiil vardır. Bu fiillerde özne cümlenin sonundaki şeydir; kişiyi temsil eden sözcük ise dolaylı tümleç zamiridir (me, te, le, nos, os, les).",
    rules: [
      'Temel Mantık: Türkçede "Ben kahveyi severim" deriz; İspanyolcada ise "Kahve bana hoş gelir" (Me gusta el café) denir.',
      'Fiil sadece iki biçimde çekimlenir: Tekil nesne/eylem için tekil (-a/-e), çoğul nesneler için çoğul (-an/-en):',
      '• Me encanta leer (Okumaya bayılırım) / Me encantan las flores (Çiçeklere bayılırım).',
      'Bu ailedeki en önemli fiiller:',
      '• encantar: bayılmak, çok sevmek (Me encanta la paella).',
      '• doler (o->ue): ağrımak, acımak: Me duele la cabeza (Başım ağrıyor) / Me duelen los pies (Ayaklarım ağrıyor).',
      '• importar: önem taşımak, umurunda olmak: No me importa (Umurumda değil) / ¿Te importa si abro la ventana?',
      '• parecer: ... gibi görünmek, fikrinde olmak: Me parece una buena idea (Bana iyi bir fikir gibi geliyor).',
      '• quedar: (üstüne) oturmak, yakışmak veya kalmak: Esta camisa te queda muy bien / Nos quedan diez euros.',
      '• costar: zor gelmek, güçlük çekmek: Me cuesta levantarme temprano (Erken kalkmak bana zor geliyor).',
      'Vurgu için başa \'A mí, A ti, A él...\' getirilebilir: A mí me gusta, pero a ella no.'
    ],
    examples: [
      { text: "¿Te duelen los ojos de mirar la pantalla?", tr: "Ekrana bakmaktan gözlerin mi ağrıyor?" },
      { text: "A mis padres les encanta viajar por el sur de España.", tr: "Annemle babam İspanya'nın güneyinde seyahat etmeye bayılır." },
      { text: "¿Qué te parece si cenamos fuera esta noche?", tr: "Bu akşam dışarıda yemek yesek sence nasıl olur (ne dersin)?" },
      { text: "No nos queda café; tengo que ir al mercado.", tr: "Hiç kahvemiz kalmadı; markete gitmem lazım." },
      { text: "A ella le cuesta mucho hablar en público.", tr: "Topluluk önünde konuşmak ona çok zor geliyor." },
      { text: "Ese vestido te queda genial.", tr: "O elbise sana harika yakışmış (üstüne oturmuş)." }
    ],
    watch: [
      "Yo gusta veya Tú gustas demek: Özne kişi değildir; 'Yo gusto el café' kesinlikle yanlıştır! 'Me gusta el café' denir.",
      "Çoğul nesnede tekil fiil bırakmak: 'Me duele los pies' yanlış; ayaklar çoğul olduğu için 'Me duelen los pies' olmalıdır.",
      "Başa 'A'sız kişi koymak: 'Yo me gusta' yanlış; 'A mí me gusta' denmelidir."
    ],
    tip: "Ağrıyan, hoş gelen veya kalan şey tekilse fiil tekil (-a/-e); çoğulsa fiil çoğul (-an/-en). Başında mutlaka me/te/le/nos/os/les!",
    check: [
      {
        prompt: "Ayer caminé mucho y hoy me ___ las piernas.",
        options: ["duele", "duelen", "duelo"],
        answer: 1,
        why: "'Las piernas' (bacaklar) çoğul olduğu için fiil de çoğul çekimlenir: duelen."
      },
      {
        prompt: "A nosotros nos ___ mucho los museos de historia.",
        options: ["interesa", "interesan", "interesamos"],
        answer: 1,
        why: "Müzeler (los museos) çoğul nesne olduğu için fiil çoğul olur: interesan."
      },
      {
        prompt: "___ mí me parece una magnífica oportunidad.",
        options: ["Para", "A", "De"],
        answer: 1,
        why: "Gustar ailesi fiillerinde kişi zamiri vurgulanırken 'A mí' kalıbı kullanılır."
      }
    ]
  },
  {
    topic: 'basics_es_pronombres_dobles_se_lo',
    language: 'es',
    title: "Çift zamirler ve 'se lo' kuralı: le lo değil se lo",
    level: 'A2',
    summary: "İspanyolcada dolaylı tümleç zamiri (kime?) ile doğrudan nesne zamiri (neyi?) peş peşe geldiğinde dolaylı zamir daima önce gelir. Ancak iki 'L' harfi yan yana gelemeyeceği için 'le/les' zamiri 'se'ye dönüşür.",
    rules: [
      'Standart Zamir Sıralaması: [Kime / Dolaylı] + [Neyi / Doğrudan]:',
      '• Me lo da (Onu bana veriyor), Te la presto (Onu sana ödünç veriyorum).',
      'Meşhur "SE LO" Kuralı (Telaffuz çatışmasını önleme):',
      '• Üçüncü şahıslarda dolaylı zamir le/les + doğrudan zamir lo/la/los/las yan yana geldiğinde "le lo" veya "les lo" denmez!',
      '• le/les otomatik olarak "SE"ye dönüşür:',
      '  ¿Le das el libro a Carlos? — Sí, se lo doy (le lo doy denmez!).',
      '  ¿Les explicaste la regla a los alumnos? — Sí, se la expliqué (les la expliqué denmez!).',
      'Zamirlerin Cümledeki Yeri:',
      '• Çekimli fiilin ÖNÜNDE ayrı yazılır: Se lo digo mañana.',
      '• Mastar (infinitivo), ulaç (gerundio) veya olumlu emirde (imperativo) fiilin ARKASINA BİTİŞİK yazılır ve vurgu işareti (tilde) alır:',
      '  Voy a decírselo / Estoy diciéndoselo / ¡Díselo!'
    ],
    examples: [
      { text: "¿Has enviado la carta al director? — Sí, ya se la he enviado.", tr: "Müdüre mektubu gönderdin mi? — Evet, onu ona çoktan gönderdim." },
      { text: "Si necesitas mi coche, te lo puedo prestar este fin de semana.", tr: "Arabam lazımsa bu hafta sonu onu sana ödünç verebilirim." },
      { text: "No le digas la verdad todavía; voy a decírsela yo mismo.", tr: "Ona gerçeği henüz söyleme; onu ona bizzat kendim söyleyeceğim." },
      { text: "El camarero nos lo trajo en seguida.", tr: "Garson onu bize derhal getirdi." },
      { text: "¿Me pasas la sal? — Sí, claro, te la paso.", tr: "Tuzu bana uzatır mısın? — Evet tabii, onu sana uzatıyorum." },
      { text: "Ese secreto no debes contárselo a nadie.", tr: "O sırrı kimseye anlatmamalısın (ona anlatmamalısın)." }
    ],
    watch: [
      "Le lo ya da les lo demek: İspanyolcada 'le lo' sesi kakofoni (çirkin ses) sayılır; kesinlikle 'se lo'ya dönüştürülmelidir.",
      "Zamir sırasını ters yapmak: 'Lo me da' değil; kişi zamiri daima nesneden öncedir: 'Me lo da'.",
      "Fiilin arkasına bitiştiğinde tilde'yi (vurgu işaretini) unutmak: 'decirselo' değil 'decírselo'."
    ],
    tip: "Kural: Önce insan sonra eşya (Kime + Neyi). İki tane 'L' yan yana gelirse ilki 'SE' olur: Le lo -> Se lo!",
    check: [
      {
        prompt: "¿Le diste las llaves a Marta? — Sí, ___ di esta mañana.",
        options: ["se las", "le las", "la le"],
        answer: 0,
        why: "'Le las' yan yana gelemeyeceği için le -> se olur ve 'se las' halini alır."
      },
      {
        prompt: "\"Onu bana açıkla!\" emrinin doğru İspanyolcası hangisidir?",
        options: ["¡Explícalo a mí!", "¡Explícamelo!", "¡Me lo explica!"],
        answer: 1,
        why: "Olumlu emirde zamirler fiilin arkasına bitişir (vurgu alır): ¡Explícamelo!"
      },
      {
        prompt: "Tengo un regalo para ti. ___ daré mañana.",
        options: ["Te lo", "Lo te", "Se lo"],
        answer: 0,
        why: "Sana (te) onu (lo) vereceğim: Te lo daré."
      }
    ]
  },
  // B1
  {
    topic: 'basics_es_subjuntivo_deseo_sentimiento',
    language: 'es',
    title: 'İstek, duygu ve şüphede subjuntivo: quiero que, me alegra que',
    level: 'B1',
    summary: "İspanyolcada ana cümle istek (querer, desear), duygu (alegrarse, sentir), şüphe (dudar) veya tavsiye (aconsejar) bildiriyorsa ve iki cümlenin öznesi farklıysa, 'que'den sonraki fiil MUTLAKA subjuntivo olur.",
    rules: [
      'Subjuntivo Formülü: Özne 1 + Tetikleyici Fiil + QUE + Özne 2 + SUBJUNTIVO.',
      'İki Özne Farklıysa Subjuntivo Zorunludur:',
      '• Quiero que vengas a mi fiesta (Ben istiyorum, sen gelesin -> özneler farklı -> vengas).',
      '• Mis padres prefieren que estudie medicina (Ailem tıp okumamı tercih ediyor).',
      'Özneler Aynıysa "QUE" Kullanılmaz, MASTAR (infinitivo) Gelir:',
      '• Quiero ir a la fiesta (Ben gitmek istiyorum -> aynı özne -> mastar: ir).',
      'Tetikleyici Duygu ve Kanaat Fiilleri:',
      '• Me alegra que estés aquí (Burada olmana seviniyorum).',
      '• Siento mucho que no puedas venir (Gelemediğine çok üzülüyorum).',
      '• Dudo que ellos sepan la respuesta (Cevabı bildiklerinden şüpheliyim).',
      'Düşünce Fiillerinde Olumlu vs Olumsuz Kuralı:',
      '• Olumlu (inanç/kesinlik): Creo que viene mañana (İndicativo).',
      '• Olumsuz (şüphe/inkar): No creo que venga mañana (Subjuntivo!).'
    ],
    examples: [
      { text: "Espero que tengas un excelente viaje.", tr: "Umarım mükemmel bir seyahat geçirirsin." },
      { text: "El médico me aconseja que haga más deporte.", tr: "Doktor daha çok spor yapmamı tavsiye ediyor." },
      { text: "Me da miedo que nos perdamos en la montaña.", tr: "Dağda kaybolmamızdan korkuyorum." },
      { text: "No creo que esa noticia sea verdad.", tr: "O haberin doğru olduğuna inanmıyorum (şüphe -> sea)." },
      { text: "Creo que esa noticia es verdad.", tr: "O haberin doğru olduğuna inanıyorum (kesinlik -> es)." },
      { text: "Ojalá mañana no llueva y podamos salir.", tr: "Keşke / İnşallah yarın yağmur yağmasa da çıkabilsek." }
    ],
    watch: [
      "Aynı özne varken que + subjuntivo kullanmak: 'Quiero que yo vaya' denmez; aynı öznede mastar kullanılır: 'Quiero ir'.",
      "No creo que sonrasında indicativo kullanmak: 'No creo que tiene razón' yanlıştır; inkar/şüphe daima subjuntivo ister: 'No creo que tenga razón'.",
      "Subjuntivo çekiminde sesli harf çaprazını unutmak: -ar fiilleri -e, -er/-ir fiilleri -a alır (hablar -> hable, comer -> coma)."
    ],
    tip: "Farklı iki özne var ve işin içine istek/duygu/şüphe girmişse: que + Subjuntivo! Özne tekse: doğrudan mastar!",
    check: [
      {
        prompt: "Quiero ___ a Madrid el próximo verano.",
        options: ["que viaje", "viajar", "viaje"],
        answer: 1,
        why: "İsteyen de seyahat edecek olan da benim (aynı özne); bu yüzden doğrudan mastar (viajar) gelir."
      },
      {
        prompt: "Quiero que tú ___ conmigo a Madrid.",
        options: ["vienes", "vengas", "venir"],
        answer: 1,
        why: "Özneler farklıdır (ben istiyorum, sen gelesin); bu yüzden que + subjuntivo (vengas) gerekir."
      },
      {
        prompt: "No creo que Juan ___ la verdad.",
        options: ["dice", "diga", "decir"],
        answer: 1,
        why: "'No creo que' şüphe ve inkar bildirdiği için peşinden subjuntivo (diga) alır."
      }
    ]
  },
  {
    topic: 'basics_es_para_que_subjuntivo',
    language: 'es',
    title: 'Amaç cümlelerinde para vs para que: mastar mı subjuntivo mu?',
    level: 'B1',
    summary: "İspanyolcada bir eylemin amacını bildirirken (-sın diye, amacıyla) iki farklı yapı kullanılır: Özneler aynıysa 'para + mastar', özneler farklıysa 'para que + subjuntivo'.",
    rules: [
      '1. Özneler AYNI ise -> PARA + MASTAR (infinitivo):',
      '• Estudio todos los días para aprobar el examen (Sınavı geçmek için her gün ders çalışıyorum -> çalışan da geçecek olan da benim).',
      '• Trabajo duro para ganar dinero.',
      '2. Özneler FARKLI ise -> PARA QUE + SUBJUNTIVO:',
      '• Te lo explico despacio para que me entiendas (Beni anlayasın diye sana yavaşça açıklıyorum -> açıklayan ben, anlayacak olan sen!).',
      '• Hablo alto para que todos puedan oír (Herkes duyabilsin diye yüksek sesle konuşuyorum).',
      '3. Geçmiş Zaman Uyumu (İmparfe Subjuntivo):',
      '• Ana cümle geçmişteyse para que ardından imperfecto de subjuntivo (-ra/-se) gelir:',
      '  Te llamé para que supieras la noticia (Haberi bilesin diye seni aradım).'
    ],
    examples: [
      { text: "He venido para hablar contigo.", tr: "Seninle konuşmak için geldim (aynı özne -> mastar)." },
      { text: "He traído este libro para que lo leas.", tr: "Bu kitabı okuyasın diye getirdim (farklı özne -> subjuntivo)." },
      { text: "Cierra la ventana para que no entre frío.", tr: "İçeri soğuk girmesin diye pencereyi kapat." },
      { text: "Ahorro dinero para comprarme una casa.", tr: "Kendime bir ev satın almak için para biriktiriyorum." },
      { text: "Les di un mapa para que no se perdieran.", tr: "Kaybolmasınlar diye onlara bir harita verdim (geçmiş zaman uyumu)." },
      { text: "Ponte el abrigo para no resfriarte.", tr: "Üşütmemek için kabanını giy." }
    ],
    watch: [
      "Özne aynıyken para que + subjuntivo kullanmak: 'Estudio para que yo apruebe' gereksiz ve yapaydır; doğrusu 'Estudio para aprobar'dır.",
      "Para que sonrasında indicativo kullanmak: 'para que me entiendes' yanlıştır; amaç henüz gerçekleşmemiş bir niyet olduğundan mutlaka subjuntivo (entiendas) ister.",
      "Geçmiş zamanda présente de subjuntivo kullanmak: 'Te llamé para que sepas' yerine zaman uyumuyla 'Te llamé para que supieras' tercih edilir."
    ],
    tip: "Amacı yapacak olan kişi kendin misin? -> Para + Mastar. Amacın başkasının bir şey yapması mı? -> Para que + Subjuntivo.",
    check: [
      {
        prompt: "Te doy la llave para que ___ entrar cuando quieras.",
        options: ["puedes", "puedas", "poder"],
        answer: 1,
        why: "'Para que' bağlacından sonra daima subjuntivo (puedas) kullanılır."
      },
      {
        prompt: "Salgo temprano de casa para ___ el autobús de las ocho.",
        options: ["coger", "coja", "que coja"],
        answer: 0,
        why: "Özne aynı olduğu için (çıkan da ben, binecek olan da ben) 'para + mastar' (coger) gelir."
      },
      {
        prompt: "Mi madre me preparó la comida para que no ___ que cocinar.",
        options: ["tenga", "tuviera", "tengo"],
        answer: 1,
        why: "Ana cümle geçmiş zamanda (preparó) olduğu için zaman uyumuyla imperfecto de subjuntivo (tuviera) kullanılır."
      }
    ]
  },
  {
    topic: 'basics_es_perifrasis_inicio_fin',
    language: 'es',
    title: 'Eylemin aşamaları: ponerse a, dejar de, acabar de, seguir',
    level: 'B1',
    summary: "İspanyolcada bir eylemin başlamasını, bitmesini, alışkanlığını veya sürmesini tek bir fiil yerine özel 'perífrasis verbales' (fiil çevrelemeleri) ile anlatmak dile müthiş bir akıcılık ve doğallık katar.",
    rules: [
      'Eyleme Başlama Perífrasis\'leri:',
      '• ponerse a + mastar: birdenbire, kendi iradesiyle veya aniden bir işe koyulmak: Se puso a llorar (Ağlamaya başladı), Me puse a estudiar.',
      '• echarse a + mastar: ani ve istemsiz fiziksel tepkiler (gülme, koşma, ağlama): Se echó a reír (Kahkahayı bastı / Gülmeye başladı).',
      '• empezar / comenzar a + mastar: genel başlangıç: Empezó a llover.',
      'Eylemi Bitirme ve Durdurma:',
      '• dejar de + mastar: bir alışkanlığı bırakmak ya da eylemi durdurmak: Dejé de fumar (Sigarayı bıraktım), Deja de quejarte (Şikayet etmeyi bırak).',
      '• acabar de + mastar: az önce yapmış olmak (yakın geçmiş): Acabo de llegar a casa (Eve az önce vardım).',
      '• terminar de + mastar: işi sonuna kadar tamamlayıp bitirmek: Terminé de leer el libro.',
      'Eylemin Sürmesi:',
      '• seguir / continuar + gerundio: hâlâ yapmaya devam etmek: Sigo viviendo en Ankara (Hâlâ Ankara\'da yaşıyorum).',
      'Tekrarlama:',
      '• volver a + mastar: bir şeyi yeniden/tekrar yapmak: Volví a llamarlo (Onu tekrar aradım).'
    ],
    examples: [
      { text: "Cuando escuchó la broma, se echó a reír a carcajadas.", tr: "Şakayı duyunca kahkahalarla gülmeye başladı." },
      { text: "En cuanto llegué a la oficina, me puse a trabajar.", tr: "Ofise varır varmaz çalışmaya koyuldum." },
      { text: "El médico me dijo que tengo que dejar de comer dulces.", tr: "Doktor tatlı yemeyi bırakmam gerektiğini söyledi." },
      { text: "¿Quieres un café? — No, gracias, acabo de tomar uno.", tr: "Bir kahve ister misin? — Hayır teşekkürler, az önce bir tane içtim." },
      { text: "A pesar de la lluvia, ellos siguen jugando al fútbol.", tr: "Yağmura rağmen futbol oynamaya devam ediyorlar." },
      { text: "Si no entiendes la lección, vuelve a leerla con calma.", tr: "Dersi anlamazsan onu sakince tekrar oku." }
    ],
    watch: [
      "Acabar de sonrasında geçmiş zaman eki aramak: 'Acabo de llegar' şimdiki zaman çekimiyle 'az önce geldim' demektir; fiil mastar kalır.",
      "Seguir sonrasında mastar kullanmak: 'Sigo vivir' kesinlikle yanlıştır; seguir daima gerundio (-ando / -iendo) ister: 'Sigo viviendo'.",
      "Dejar de ile dejar'ı karıştırmak: Dejar bırakmak/izin vermektir; eylemi sonlandırmak için mutlaka 'de' gerekir: 'Deja de hablar'."
    ],
    tip: "Az önce mi? -> Acabo de + mastar. Başladı mı? -> Se puso a + mastar. Bıraktı mı? -> Dejó de + mastar. Hâlâ devam mı? -> Sigue + gerundio.",
    check: [
      {
        prompt: "Por favor, ¡deja de ___ tanto ruido!",
        options: ["hacer", "haciendo", "haces"],
        answer: 0,
        why: "'Dejar de' peşinden doğrudan mastar fiil (hacer) alır."
      },
      {
        prompt: "¿Sabes dónde está Laura? — Sí, ___ de verla en la biblioteca.",
        options: ["acabo", "pongo", "sigo"],
        answer: 0,
        why: "Az önce görmek anlamında 'acabo de verla' kullanılır."
      },
      {
        prompt: "¿Todavía vives en Madrid? — Sí, ___ viviendo allí.",
        options: ["vuelvo", "sigo", "dejo"],
        answer: 1,
        why: "Eylemin sürmesi 'seguir + gerundio' (sigo viviendo) ile ifade edilir."
      }
    ]
  },
  // B2
  {
    topic: 'basics_es_aunque_indicativo_subjuntivo',
    language: 'es',
    title: 'Aunque ile indicativo vs subjuntivo nüansı: Biliyorum vs Bilmiyorum',
    level: 'B2',
    summary: "İspanyolcada 'aunque' (-e rağmen / -se bile) bağlacı hem indicativo hem subjuntivo ile kullanılabilir. Seçilen kip cümlenin anlamını kökten değiştirir: Gerçekten bilinen bir olgu mu, yoksa bir varsayım/kayıtsızlık mı?",
    rules: [
      '1. Aunque + INDICATIVO -> Bilinen, kesin bir gerçek (-e rağmen):',
      '• Konuşan kişi durumun gerçek olduğunu biliyordur ve bunu kabul ediyordur:',
      '• Aunque llueve, voy a salir a caminar (Yağmur yağıyor, bunu biliyorum/görüyorum, yine de yürüyüşe çıkacağım).',
      '• Aunque no tiene mucho dinero, es muy generoso (Çok parası yok, bu bilinen bir gerçek, ama cömerttir).',
      '2. Aunque + SUBJUNTIVO -> Varsayım, henüz bilinmeyen veya önem taşımayan durum (-se bile / olsa da):',
      '• Ya durum henüz gerçekleşmemiştir (varsayım) ya da konuşan için sonucu değiştirmeyecek kadar önemsizdir:',
      '• Aunque llueva mañana, iremos de excursión (Yarın yağmur yağsa bile geziye gideceğiz - yağacak mı bilmiyoruz veya fark etmez).',
      '• Aunque me lo jures, no te creo (Yemin etsen bile sana inanmam).',
      '3. Geçmiş Zaman Nüansı:',
      '• Aunque era difícil, lo aprobó (Zordu, ama geçti - indicativo).',
      '• Aunque fuera difícil, lo intentaría (Zor olsa bile denerdim - subjuntivo).'
    ],
    examples: [
      { text: "Aunque está cansado, sigue trabajando.", tr: "Yorgun olmasına rağmen çalışmaya devam ediyor (yorgun olduğunu biliyoruz: indicativo)." },
      { text: "Aunque esté cansado esta noche, iré a verte.", tr: "Bu akşam yorgun olsam bile seni görmeye geleceğim (henüz akşam olmadı/varsayım: subjuntivo)." },
      { text: "Aunque no me guste el pescado, hoy voy a probarlo.", tr: "Balığı sevmesem de (bana hitap etmese bile) bugün deneyeceğim." },
      { text: "Aunque vive muy cerca, siempre llega tarde.", tr: "Çok yakında yaşamasına rağmen her zaman geç kalır." },
      { text: "No cambiaré de opinión, aunque me ofrezcan el doble.", tr: "Bana iki katını teklif etseler bile fikrimi değiştirmeyeceğim." },
      { text: "Aunque no teníamos reserva, nos dieron una mesa estupenda.", tr: "Rezervasyonumuz olmamasına rağmen bize harika bir masa verdiler." }
    ],
    watch: [
      "Aunque'yi sadece subjuntivo alan bir bağlaç sanmak: Gerçek bir bilgi aktarıyorsanız indicativo kullanılır (Fransızcadaki bien que gibi körü körüne subjonctif almaz!).",
      "Geleceğe dair varsayımda indicativo kullanmak: Yarın henüz olmadıysa 'Aunque lloverá' değil 'Aunque llueva' denmelidir.",
      "A pesar de que ile karıştırmak: 'A pesar de que' de aynı kuralı izler."
    ],
    tip: "Olay gerçek ve cepte mi? -> İndicativo (Aunque llueve). Olsa da olmasa da fark etmez mi veya gelecekteki bir ihtimal mi? -> Subjuntivo (Aunque llueva).",
    check: [
      {
        prompt: "Mira por la ventana: aunque ___, los niños están jugando.",
        options: ["llueve", "llueva", "lloverá"],
        answer: 0,
        why: "Pencereden bakınca yağmurun şu an fiilen yağdığı görüldüğü için gerçek olguda indicativo (llueve) kullanılır."
      },
      {
        prompt: "Mañana saldremos a correr, aunque ___ frío.",
        options: ["hace", "haga", "hará"],
        answer: 1,
        why: "Yarınki havanın soğuk olup olmayacağı kesinleşmemiş bir varsayım olduğu için subjuntivo (haga) kullanılır."
      },
      {
        prompt: "Aunque me lo ___ mil veces, jamás olvidaré lo que pasó.",
        options: ["pides", "pidas", "pedir"],
        answer: 1,
        why: "'Benden bin kez istesen bile' anlamındaki koşullu kayıtsızlıkta subjuntivo (pidas) gerekir."
      }
    ]
  },
  {
    topic: 'basics_es_si_condicionales_subjuntivo',
    language: 'es',
    title: 'Si ile şart cümleleri ve imparfe subjuntivo formülü',
    level: 'B2',
    summary: "İspanyolcada 'si' (eğer) bağlacından sonra ASLA presente de subjuntivo veya condicional gelmez! Şimdiki zamanda hayali bir şart kurulurken 'si + imperfecto de subjuntivo -> condicional simple' formülü uygulanır.",
    rules: [
      '1. Tip (Olası Şart): Si + PRESENTE DE INDICATIVO -> FUTURO / PRESENTE / IMPERATIVO:',
      '• Si tengo tiempo, te llamo / te llamaré (Vaktim olursa seni ararım / arayacağım).',
      '2. Tip (Şimdiki zamanda hayali / gerçekleşmesi güç şart): Si + IMPERFECTO DE SUBJUNTIVO -> CONDICIONAL SIMPLE:',
      '• Formül: Si + [-ra / -se eki] -> [-ría eki]:',
      '• Si tuviera dinero, viajaría por todo el mundo (Param olsaydı dünyayı gezerdim - şu an param yok).',
      '• Si fueras más paciente, no te enfadarías tanto.',
      '3. Tip (Geçmişte kaçırılmış şart / pişmanlık): Si + PLUSCUAMPERFECTO DE SUBJUNTIVO -> CONDICIONAL COMPUESTO:',
      '• Si hubiera sabido la verdad, habría actuado de otra manera (Gerçeği bilmiş olsaydım başka türlü davranırdım).',
      'Kritik Yasak: "Si tenga tiempo" veya "Si viajaría" kesinlikle yanlıştır! Si\'nin hemen ardından asla presente de subjuntivo veya condicional gelmez.'
    ],
    examples: [
      { text: "Si tuviera más tiempo libre, aprendería a tocar el piano.", tr: "Daha çok boş vaktim olsaydı piyano çalmayı öğrenirdim." },
      { text: "Si fueras a España, ¿qué ciudad visitarías primero?", tr: "İspanya'ya gidecek olsaydın ilk hangi şehri ziyaret ederdin?" },
      { text: "Si hubiéramos salido antes, no habríamos perdido el vuelo.", tr: "Daha önce çıkmış olsaydık uçağı kaçırmamış olurduk." },
      { text: "Si me necesitas, llámame a cualquier hora.", tr: "Bana ihtiyacın olursa beni istediğin saatte ara." },
      { text: "Si hiciera buen tiempo, iríamos a dar un paseo por la sierra.", tr: "Hava güzel olsaydı dağda yürüyüşe giderdik." },
      { text: "Yo en tu lugar no lo compraría, si fuera tú.", tr: "Senin yerinde olsaydım (sen olsaydım) onu satın almazdım." }
    ],
    watch: [
      "Si'den sonra presente de subjuntivo getirmek: 'Si tenga dinero' en ağır gramer hatalarından biridir; doğrusu ya 'Si tengo' (olası) ya da 'Si tuviera'dır (hayali).",
      "Si'den sonra condicional koymak: 'Si tendría dinero' yanlıştır; condicional şartın içinde değil, ana cümlenin sonucunda yer alır: 'Si tuviera dinero, viajaría'.",
      "İmparfe subjuntivo eklerini (-ra / -se) birbirine karıştırmak (ikisi de aynı anlama gelir: tuviera = tuviese)."
    ],
    tip: "Si'den sonra asla '-ría' (condicional) gelmez! Hayal kuruyorsan: Si tuviera (-ra) ..., viajaría (-ría).",
    check: [
      {
        prompt: "Si ___ rico, me compraría una casa en la playa.",
        options: ["soy", "fuera", "sería"],
        answer: 1,
        why: "Şimdiki zamanda hayali şart 'si + imperfecto de subjuntivo' (fuera) ile kurulur."
      },
      {
        prompt: "Si mañana hace buen tiempo, ___ a la montaña.",
        options: ["iríamos", "iremos", "fuéramos"],
        answer: 1,
        why: "'Si + presente de indicativo' (hace) yapısının devamı gelecek zaman (iremos) olur."
      },
      {
        prompt: "Si me lo ___ dicho antes, te habría ayudado encantado.",
        options: ["hubieras", "habías", "habrías"],
        answer: 0,
        why: "Geçmiş şart yapısında 'si + pluscuamperfecto de subjuntivo' (hubieras dicho) kullanılır."
      }
    ]
  },
  {
    topic: 'basics_es_que_quien_el_que',
    language: 'es',
    title: 'İlgi zamirleri incelikleri: que, quien, el que, lo que, cuyo',
    level: 'B2',
    summary: "İspanyolcada cümleleri birbirine bağlayan ilgi zamirleri (pronombres relativos) Türkçe karşılıkları benzer olsa da edatlarla, insan/cansız ayrımıyla ve aitlik bildirme durumlarına göre farklılaşır.",
    rules: [
      'Que: En temel ve en sık kullanılan ilgi zamiridir (ki o / -an, -en); insanlar ve nesneler için doğrudan kullanılır: El libro que leí / La chica que vino.',
      'Quien / Quienes: SADECE insanlar için kullanılır; iki temel yerde zorunludur:',
      '• Edattan sonra insan geliyorsa: El profesor con quien hablé (Konuştuğum öğretmen).',
      '• Virgülle ayrılan açıklayıcı yan cümlelerde: Mi tío, quien vive en Valencia, viene hoy.',
      'El que / La que / Los que / Las que (veya el cual / la cual):',
      '• Uzun veya karmaşık edatlardan sonra (cerca de, a través de, gracias a): La empresa para la que trabajo.',
      '• Önceden bahsedilen bir ismi tekrar etmemek için (O ... olan kişi): El que termine primero puede salir.',
      'Lo que: Soyut bir fikri, tüm bir cümleyi veya belirsiz bir şeyi kasteder (şey / olan şey): No entiendo lo que dices / Lo que me molesta es el ruido.',
      'Cuyo / Cuya / Cuyos / Cuyas: Aitlik bildirir (Türkçedeki -ki / -in ...-i). KURAL: Cuyo arkasından gelen ismin cinsiyetine ve çoğuluna uyar (sahibine değil!):',
      '• El autor cuyo libro leí (Kitabını okuduğum yazar).',
      '• Una mujer cuyos hijos estudian en Salamanca.'
    ],
    examples: [
      { text: "El coche que compré el mes pasado consume muy poco.", tr: "Geçen ay satın aldığım araba çok az yakıyor." },
      { text: "Los amigos con quienes viajé a México son muy divertidos.", tr: "Birlikte Meksika'ya seyahat ettiğim arkadaşlar çok eğlencelidir." },
      { text: "La casa en la que vivimos de pequeños ya no existe.", tr: "Küçükken içinde yaşadığımız ev artık yok." },
      { text: "Lo que más me gusta de España es su gastronomía.", tr: "İspanya hakkında en çok hoşuma giden şey mutfağıdır." },
      { text: "Un árbol cuyas hojas cambian de color en otoño.", tr: "Sonbaharda yaprakları renk değiştiren bir ağaç (cuyas -> hojas'a uyar)." },
      { text: "Llegó tarde, lo que enfadó mucho a todos.", tr: "Geç geldi; bu da (bu durum) herkesi çok kızdırdı." }
    ],
    watch: [
      "Nesneler için quien kullanmak: 'El libro de quien hablamos' yanlış; nesneler için 'del que' veya 'del cual' denir.",
      "Cuyo'yu sahibin cinsiyetine göre uyarlamak: 'El hombre cuya casa...' (casa dişil olduğu için cuya olur, adam eril diye cuyo olmaz!).",
      "Tüm cümleyi özetlerken que kullanmak: 'Llegó tarde, que enfadó...' değil, soyut durum için 'lo que' denir."
    ],
    tip: "İnsan + edat -> con quien / de quien. Cansız + edat -> en el que / con el que. Soyut bütün cümle / şey -> lo que. Aitlik (-in ...-i) -> cuyo (arkasındaki isme uyar).",
    check: [
      {
        prompt: "La persona con ___ hablé ayer era muy amable.",
        options: ["que", "quien", "cuyo"],
        answer: 1,
        why: "Edattan (con) sonra insan geldiğinde 'quien' (veya la que) kullanılır."
      },
      {
        prompt: "No comprendo ___ quieres decir con eso.",
        options: ["el que", "lo que", "que"],
        answer: 1,
        why: "Soyut bir kavramı veya sözü kasteden 'şey / söylediğin şey' ifadesi 'lo que'dir."
      },
      {
        prompt: "Es un escritor ___ novelas han sido traducidas a treinta idiomas.",
        options: ["cuyo", "cuyas", "de quien"],
        answer: 1,
        why: "'Novelas' dişil çoğul olduğu için aitlik sıfatı 'cuyas' biçimini alır."
      }
    ]
  },
  // C1
  {
    topic: 'basics_es_futuro_probabilidad',
    language: 'es',
    title: 'Gelecek ve şart kipiyle olasılık tahmini (futuro de probabilidad)',
    level: 'C1',
    summary: "İspanyolcada gelecek zaman (futuro simple) yalnızca geleceği değil, şimdiki zamana dair güçlü tahminleri bildirir. Şart kipi (condicional) ise geçmişe dair tahminleri anlatır. Anadili İspanyolca olanların günlük hayatta en çok başvurduğu kalıptır.",
    rules: [
      '1. Futuro Simple ile ŞİMDİKİ ZAMAN Tahmini (Probabilidad en el presente):',
      '• Şimdiki an için "galiba / herhalde / olmalı / -dir" anlamı katar:',
      '  ¿Qué hora es? — Serán las cinco (Saat beştir / herhalde beştir - saatime bakmadım ama tahminim).',
      '  ¿Dónde está Pablo? — Estará en su despacho (Herhalde ofisindedir).',
      '  Tendrá unos cuarenta años (Kırk yaşlarında olmalı).',
      '2. Futuro Compuesto (habrá hecho) ile YAKIN GEÇMİŞ Tahmini:',
      '• Az önce veya yakın zamanda bitmiş olabilecek bir işe dair tahmin:',
      '  ¿Por qué no ha venido Ana? — Habrá perdido el autobús (Herhalde otobüsü kaçırmıştır).',
      '3. Condicional Simple ile GEÇMİŞ ZAMAN Tahmini (Probabilidad en el pasado):',
      '• Geçmişteki bir ana dair "o zamanlar herhalde ...-di / -miştir" tahmini:',
      '  Cuando lo conocí, tendría unos veinte años (Onunla tanıştığımda herhalde yirmi yaşlarındaydı).',
      '  Ayer no vino a trabajar; estaría enfermo (Dün işe gelmedi; herhalde hastaydı).',
      '4. Condicional Compuesto (habría hecho) ile DAHA ESKİ GEÇMİŞ Tahmini:',
      '• Habrían sido las diez cuando ocurrió el accidente (Kaza olduğunda saat herhalde on civarıydı).'
    ],
    examples: [
      { text: "¿Quién llama a la puerta a estas horas? — Será el cartero.", tr: "Bu saatte kapıyı kim çalıyor? — Postacıdır herhalde." },
      { text: "No encuentro mis gafas; las habré dejado en el coche.", tr: "Gözlüğümü bulamıyorum; arabada unutmuş olmalıyım (yakın geçmiş tahmini)." },
      { text: "Eran las tres de la madrugada y aún no había llegado. ¿Dónde estaría?", tr: "Gece saat üçtü ve henüz gelmemişti. Neredeydi acaba? (geçmiş tahmin)." },
      { text: "Ese reloj parece carísimo; costará una fortuna.", tr: "O saat çok pahalı görünüyor; bir servete patlıyordur herhalde." },
      { text: "Cuando se casaron, tendrían apenas dieciocho años.", tr: "Evlendiklerinde henüz ancak on sekiz yaşlarında falandılar." },
      { text: "¿Por qué tiene mala cara? — Estará cansado por el viaje.", tr: "Yüzü neden asık/solgun? — Yolculuktan yorgun düşmüştür herhalde." }
    ],
    watch: [
      "Gelecek zamanı görünce sadece geleceği düşünmek: 'Estará en casa' cümlesi 'Evde olacak' demek olabileceği gibi bağlama göre 'Şu an evdedir herhalde' demektir.",
      "Geçmiş tahmininde presente veya futuro kullanmak: Geçmişe dair tahminde condicional (tendría, estaría) devreye girer.",
      "Her tahminde 'probablemente' sözcüğüne sığınmak: İspanyolcanın doğal zenginliği, doğrudan fiil çekimiyle olasılık bildirmektir."
    ],
    tip: "Şu an nerededir / saat kaçtır? -> Futuro (Estará en casa / Serán las dos). O zaman neredeydi / kaç yaşındaydı? -> Condicional (Estaría en casa / Tendría 20 años).",
    check: [
      {
        prompt: "\"Kapı çalıyor. Babamdır herhalde.\" cümlesinin en doğal İspanyolcası hangisidir?",
        options: ["Es mi padre probablemente.", "Será mi padre.", "Fue mi padre."],
        answer: 1,
        why: "Şimdiki zamana dair güçlü tahmin futuro de probabilidad ile kurulur: Será mi padre."
      },
      {
        prompt: "Ayer María no vino a clase. ___ enferma.",
        options: ["Estará", "Estaría", "Estuvo"],
        answer: 1,
        why: "Geçmişteki bir duruma (dün) dair tahmin condicional simple (estaría) ile söylenir."
      },
      {
        prompt: "¿Cuánto costará ese coche deportivo?",
        options: [
          "Gelecekte araba ne kadara mal olacak?",
          "O spor araba herhalde ne kadara patlıyordur (tahmin)?",
          "O spor arabanın fiyatı dün ne kadardı?"
        ],
        answer: 1,
        why: "Futuro de probabilidad şimdiki zamandaki duruma dair tahmin sorusudur."
      }
    ]
  }
]
