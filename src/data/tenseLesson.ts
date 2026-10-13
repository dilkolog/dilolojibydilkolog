import type { Tense } from '../engine/tenses'

/**
 * A short lesson for each tense of the verb lab (the one-line guide of engine/tenseGuide.ts stays for the table's caption): what it is for, how it is made, an example or two,
 * where learners slip, and a way to remember it. Written in Turkish for Turkish learners, with the
 * Turkish tense it resembles. Only the tenses the lab shows have one.
 */
export interface TenseLesson {
  /** One line: what the tense is. */
  summary: string
  /** When it is used. */
  uses: string[]
  /** How it is made: the endings, the stem, the helper verb. */
  formation: string[]
  /** Sentences with their Turkish. */
  examples: { text: string; tr: string }[]
  /** Common slips and exceptions. */
  watch: string[]
  /** A way to remember it. */
  tip: string
  /** The Turkish tense it is closest to, and where it differs. */
  turkish?: string
}

const g = (guide: TenseLesson) => guide
const ex = (text: string, tr: string) => ({ text, tr })

export const TENSE_LESSON: Partial<Record<Tense, TenseLesson>> = {
  // ---------- Français ----------
  present: g({
    summary: 'Şu an olanlar, alışkanlıklar ve genel doğrular. Fransızcada “şimdiki zaman” ile “geniş zaman” tek bir biçimdir.',
    uses: ['Şu anda olan iş: Je lis un livre (kitap okuyorum).', 'Alışkanlık ve genel doğru: Elle travaille le lundi; L’eau bout à 100 degrés.', 'Yakın gelecek ve plan: Je pars demain.', '“depuis” ile süren durum: J’habite ici depuis 2020 (2020’den beri burada oturuyorum).', 'Geçmiş bir olayı canlı anlatmak için.'],
    formation: ['-er fiilleri (parler): -e, -es, -e, -ons, -ez, -ent.', '-ir fiilleri (finir): -is, -is, -it, -issons, -issez, -issent.', '-re fiilleri (vendre): -s, -s, (ek yok), -ons, -ez, -ent.', 'Çok kullanılanlar düzensizdir: être, avoir, aller, faire, pouvoir, vouloir, savoir, venir, prendre, dire.', 'vous için istisnalar: vous êtes, vous faites, vous dites.'],
    examples: [ex('Je parle français.', 'Fransızca konuşuyorum.'), ex('Nous finissons à six heures.', 'Altıda bitiriyoruz.'), ex('Ils vont au marché le samedi.', 'Cumartesi günleri pazara giderler.')],
    watch: ['je / tu / il / ils -er fiillerinde aynı okunur; fark yazıda (parle, parles, parle, parlent).', 'Yazım değişir: nous mangeons, nous commençons; j’achète (è), j’appelle (ll).', 'Sondaki -ent okunmaz: ils parlent “parl” gibi.'],
    tip: '-er fiilleri için “e es e ons ez ent”: sesli okunan ekler yalnızca nous ve vous’da.',
    turkish: 'Türkçe -iyor ile geniş zaman (-ir/-er) ikisini de karşılar.',
  }),
  imparfait: g({
    summary: 'Geçmişte süregelen, tekrarlanan ya da “fon” oluşturan durumlar. Olayın başı sonu önemli değildir, “nasıldı” sorusunu yanıtlar.',
    uses: ['Geçmişte alışkanlık: Quand j’étais petit, je jouais dehors (küçükken dışarıda oynardım).', 'Betimleme ve fon: Il pleuvait, il faisait froid.', 'Devam ederken araya giren olay: Je dormais quand tu as appelé.', 'Yaş, saat, duygu durumu geçmişte: Il avait dix ans; Il était trois heures.', 'Kibar istek: Je voulais vous demander… ; “si + imparfait” koşulu: Si j’avais le temps, je viendrais.'],
    formation: ['nous biçiminden -ons atılır, ekler eklenir: -ais, -ais, -ait, -ions, -iez, -aient (nous parlons → parl- → je parlais).', 'Tek istisna être: ét- (j’étais, tu étais…).', '-ger ve -cer fiillerinde yazım korunur: je mangeais, je commençais.'],
    examples: [ex('Il pleuvait quand je suis sorti.', 'Çıktığımda yağmur yağıyordu.'), ex('Nous allions chez ma grand-mère chaque été.', 'Her yaz büyükannemin evine giderdik.')],
    watch: ['-ier fiillerinde nous/vous’da iki i: nous étudiions, vous riiez.', 'Passé composé ile karıştırma: imparfait “nasıldı / ne yapardı”, passé composé “ne oldu”.'],
    tip: '“nous”dan -ons’u at, -ais ekle. Fon için imparfait, olay için passé composé.',
    turkish: '-iyordu ve -(ı)rdı (alışkanlık) birlikte.',
  }),
  'passe-compose': g({
    summary: 'Bitmiş, tek seferlik geçmiş olaylar. Konuşma dilinde geçmişin ana zamanıdır; yardımcı fiilin şimdiki zamanı + ortaç (participe passé).',
    uses: ['Bitmiş tek olay: Hier, j’ai mangé une pizza.', 'Olay zinciri: Je me suis levé, j’ai pris un café, je suis parti.', 'Sonucu şimdiyi etkileyen geçmiş: J’ai perdu mes clés (anahtarlarım yok).', 'Belirli zaman ifadeleriyle: hier, la semaine dernière, en 2019.'],
    formation: ['avoir (çoğu fiil) ya da être + participe passé.', 'Ortaçlar: -er → -é (parlé), -ir → -i (fini), -re → -u (vendu).', 'Düzensiz ortaçlar: eu, été, fait, pris, vu, dit, écrit, mis, ouvert, venu, né, mort.', 'être alanlar: hareket/durum değiştirenler (DR & MRS VANDERTRAMP: devenir, revenir, monter, rester, sortir, venir, aller, naître, descendre, entrer, retourner, tomber, rentrer, arriver, mourir, partir, passer) ve bütün dönüşlü fiiller.', 'être ile ortak özneyle uyum: elle est partie, ils sont partis, elles se sont lavées.'],
    examples: [ex('Elle est arrivée à midi.', 'Öğlen geldi.'), ex('Nous avons fini le travail.', 'İşi bitirdik.'), ex('Ils se sont levés tôt.', 'Erken kalktılar.')],
    watch: ['Yardımcı fiil seçimi: sortir, monter, descendre, rentrer, retourner, passer nesne alırsa avoir ile: J’ai sorti la voiture.', 'avoir ile nesne öndeyse ortaç uyar: les lettres que j’ai écrites.', 'Olumsuzda ne…pas yardımcıyı sarar: Je n’ai pas mangé.'],
    tip: 'DR & MRS VANDERTRAMP gezen fiilleri hatırlatır; geri kalanı avoir.',
    turkish: '-dı / -mış: “yedim, gelmiş”. Fransızcada ikisi de aynı zamandır.',
  }),
  'passe-simple': g({
    summary: 'Yazı dilinin (roman, tarih, masal) bitmiş geçmişi. Konuşmada kullanılmaz; okurken tanımak yeterlidir.',
    uses: ['Anlatılarda bitmiş olaylar: Il ouvrit la porte et entra.', 'Çoğunlukla il/elle ve ils/elles ile karşılaşılır.', 'Konuşmada ve mektupta passé composé tercih edilir.'],
    formation: ['-er: -ai, -as, -a, -âmes, -âtes, -èrent (il parla, ils parlèrent).', '-ir/-re: -is, -is, -it, -îmes, -îtes, -irent (il finit, ils finirent).', 'Düzensizler: être (il fut), avoir (il eut), faire (il fit), venir (il vint, ils vinrent), voir (il vit), pouvoir (il put).'],
    examples: [ex('Il se leva, ouvrit la fenêtre et sourit.', 'Kalktı, pencereyi açtı ve gülümsedi.'), ex('Ils arrivèrent à la nuit.', 'Gece vakti vardılar.')],
    watch: ['3. çoğul -èrent: ils parlèrent (parlent ile karıştırma).', 'vint / tint gibi biçimler venir ve tenir’in geçmişidir.'],
    tip: 'Kitapta “-a, -it, -irent, -èrent” sonlarını görünce: hikâyenin geçmiş zamanı.',
    turkish: 'Edebî anlatıdaki -dı: “açtı, girdi”.',
  }),
  'plus-que-parfait': g({
    summary: 'Geçmişteki başka bir olaydan önce olmuş iş: “geçmişin geçmişi”.',
    uses: ['İki geçmiş olaydan önce olanı: Quand je suis arrivé, il était déjà parti.', 'Sebep ve açıklama: Il était fatigué parce qu’il avait mal dormi.', '“si + plus-que-parfait” gerçekleşmemiş geçmiş koşul: Si j’avais su, je serais venu.'],
    formation: ['avoir/être imparfait + participe passé: j’avais mangé, elle était partie, nous nous étions levés.', 'Yardımcı seçimi ve ortaç uyumu passé composé ile aynıdır.'],
    examples: [ex('Elle avait déjà mangé quand nous sommes arrivés.', 'Biz geldiğimizde o zaten yemek yemişti.'), ex('J’étais parti avant la pluie.', 'Yağmurdan önce çıkmıştım.')],
    watch: ['Hangi olay önce? Önce olan plus-que-parfait, sonra olan passé composé / imparfait.'],
    tip: 'Yardımcı fiil bir adım geriye gider: ai → avais, suis → étais.',
    turkish: '-mıştı: “yemişti, gitmişti”.',
  }),
  futur: g({
    summary: 'Gelecekteki olaylar, planlar, tahminler ve sözler.',
    uses: ['Gelecek plan/tahmin: Il pleuvra demain.', 'Söz ve nazik emir: Tu feras tes devoirs.', 'quand / dès que / aussitôt que sonrasında da futur: Quand tu arriveras, appelle-moi (Türkçede burada geniş zaman kullanırız).', '“si + présent” sonucu: Si tu viens, je serai content.', 'Konuşmada yakın gelecek için aller + mastar: Je vais partir.'],
    formation: ['Mastar + -ai, -as, -a, -ons, -ez, -ont (parler → je parlerai; -re fiillerinde e düşer: vendre → je vendrai).', 'Düzensiz kökler: être → ser-, avoir → aur-, aller → ir-, faire → fer-, pouvoir → pourr-, vouloir → voudr-, savoir → saur-, venir → viendr-, voir → verr-, devoir → devr-, envoyer → enverr-.', 'Ekler avoir’ın şimdiki zamanından gelir (ai, as, a, (av)ons, (av)ez, ont).'],
    examples: [ex('Demain, nous irons à la mer.', 'Yarın denize gideceğiz.'), ex('Elle viendra quand elle pourra.', 'Gelebildiğinde gelecek.')],
    watch: ['Yazım değişikliği: j’achèterai, j’appellerai, je paierai.', 'Kök düzensiz fiillerde ekler düzenlidir: yalnızca kök öğrenilir.', '“quand” ve “dès que” sonrası futur gerekir.'],
    tip: 'Mastarı olduğu gibi al, sonuna avoir’ı yapıştır: parler + ai.',
    turkish: '-ecek / -acak.',
  }),
  'futur-anterieur': g({
    summary: 'Gelecekte başka bir olaydan önce bitmiş olacak iş; ayrıca “muhtemelen olmuştur” tahmini.',
    uses: ['Gelecekte tamamlanmış olacak: Quand tu arriveras, j’aurai fini.', 'quand / dès que / après que sonrası biten iş: Dès qu’il aura mangé, il partira.', 'Tahmin: Il aura oublié (unutmuş olmalı).'],
    formation: ['avoir/être futur + participe passé: j’aurai mangé, elle sera partie, nous nous serons levés.'],
    examples: [ex('Demain à midi, j’aurai terminé.', 'Yarın öğlene kadar bitirmiş olacağım.'), ex('Elle sera déjà partie.', 'Çoktan gitmiş olacak.')],
    watch: ['Türkçede çoğu zaman düz geniş zamanla söylenir (“geldiğinde bitirmiş olacağım”); Fransızcada futur antérieur şarttır.'],
    tip: 'Futur + parfait: iki zamanı üst üste koy.',
    turkish: '-miş olacak / -mış olacak.',
  }),
  conditionnel: g({
    summary: 'Kibar istek, varsayım, tavsiye ve haberin doğrulanmadığını göstermek için.',
    uses: ['Kibar istek: Je voudrais un café; Pourriez-vous m’aider ?', 'Varsayım: Si j’avais de l’argent, j’achèterais une maison.', 'Tavsiye: Tu devrais dormir.', 'Doğrulanmamış haber: Selon la presse, il serait malade.', 'Geçmişten bakınca gelecek: Il a dit qu’il viendrait.'],
    formation: ['Futur kökü + imparfait ekleri: -ais, -ais, -ait, -ions, -iez, -aient (je parlerais, je serais, j’irais).', 'Kökler futur ile aynı: ser-, aur-, ir-, fer-, pourr-, voudr-, viendr-…'],
    examples: [ex('Je voudrais réserver une table.', 'Bir masa ayırtmak istiyorum.'), ex('Si j’avais le temps, je voyagerais plus.', 'Zamanım olsa daha çok seyahat ederdim.')],
    watch: ['“si” cümlesinde conditionnel kullanılmaz: si + imparfait → conditionnel.', 'Kibarlık için voudrais, pourriez, aimerais en çok kullanılanlardır.'],
    tip: 'Kök futur’dan, ekler imparfait’tan: futur’un “r”si + imparfait’ın sonu.',
    turkish: '-erdi, -sa … -erdi; -ir miydi.',
  }),
  'conditionnel-passe': g({
    summary: 'Gerçekleşmemiş geçmiş varsayım, pişmanlık ve geçmişte yapılmalıydı eleştirisi.',
    uses: ['Gerçekleşmemiş koşul sonucu: Si j’avais su, je serais venu.', 'Pişmanlık/eleştiri: J’aurais dû t’écouter (seni dinlemeliydim).', 'Geçmiş için doğrulanmamış haber: Il y aurait eu un accident.'],
    formation: ['avoir/être conditionnel + participe passé: j’aurais mangé, il serait parti, nous nous serions levés.'],
    examples: [ex('J’aurais voulu venir.', 'Gelmek isterdim (ama gelemedim).'), ex('Elle serait partie sans toi.', 'Sensiz giderdi / gitmiş olurdu.')],
    watch: ['si + plus-que-parfait → conditionnel passé (si j’avais su, j’aurais…).'],
    tip: 'Koşulun iki yarısı da geçmişe çekilir: plus-que-parfait + conditionnel passé.',
    turkish: '-seydi, -erdi: “bilseydim gelirdim”.',
  }),
  subjonctif: g({
    summary: 'İstek, duygu, şüphe, zorunluluk gibi öznel anlamlarda “que” ile gelen kip.',
    uses: ['Zorunluluk: Il faut que tu viennes.', 'İstek ve emir: Je veux que tu partes; Je souhaite qu’il réussisse.', 'Duygu: Je suis content que tu sois là.', 'Şüphe ve olumsuz düşünce: Je ne pense pas qu’il vienne; Il se peut que…', 'Bağlaçlar: pour que, bien que, avant que, afin que, à moins que, jusqu’à ce que.'],
    formation: ['ils/elles présent kökü + -e, -es, -e, -ions, -iez, -ent (ils parlent → que je parle).', 'nous ve vous biçimleri imparfait gibidir: que nous parlions.', 'Düzensizler: être (sois), avoir (aie), aller (aille), faire (fasse), pouvoir (puisse), savoir (sache), vouloir (veuille).'],
    examples: [ex('Il faut que je parte.', 'Gitmem gerekiyor.'), ex('Bien qu’il soit fatigué, il travaille.', 'Yorgun olmasına rağmen çalışıyor.')],
    watch: ['Aynı özne varsa mastar kullanılır: Je veux partir (Je veux que je parte yanlış).', 'espérer que subjonctif istemez: J’espère qu’il viendra.', 'penser/croire olumlu cümlede indicatif alır, olumsuzda subjonctif.'],
    tip: '“que” görünce dilek, duygu ya da şüphe var mı diye bak; varsa subjonctif.',
    turkish: 'Türkçe -sin / -mAsI gerek / -DIğI için gibi dilek yapıları.',
  }),
  'subjonctif-passe': g({
    summary: 'Tetikleyiciden önce bitmiş eylem için subjonctif.',
    uses: ['Bitmiş eylem hakkında duygu/şüphe: Je suis content que tu aies réussi.', 'bien que / avant que sonrasında tamamlanmış: Je partirai avant que tu sois arrivé.', 'Olumsuz düşünce: Je ne crois pas qu’il ait compris.'],
    formation: ['avoir/être subjonctif présent + participe passé: que j’aie mangé, qu’il soit parti, que nous nous soyons levés.'],
    examples: [ex('Je doute qu’il ait fini.', 'Bitirdiğinden şüpheliyim.'), ex('Bien qu’elle soit partie, je l’attends.', 'Gitmiş olmasına rağmen onu bekliyorum.')],
    watch: ['aie/ait (avoir) ile sois/soit (être) yardımcılarını karıştırma.'],
    tip: 'Subjonctif présent + ortaç: sadece yardımcı fiil subjonctife geçer.',
    turkish: '-miş olması / -diğine pişman gibi bitmiş durum yapıları.',
  }),
  imperatif: g({
    summary: 'Emir, rica, öneri ve yasak. Özne söylenmez.',
    uses: ['Emir/rica: Parle plus lentement !', 'Davet ve öneri: Allons-y !', 'Yasak: Ne mange pas !', 'Tarif ve talimat: Mélangez bien.'],
    formation: ['Üç kişi vardır: tu, nous, vous (présent biçimleri, özne yok): parle, parlons, parlez.', '-er fiillerinde tu için -s düşer: tu parles → parle (ama vas-y, manges-en).', 'Düzensizler: être (sois, soyons, soyez), avoir (aie, ayons, ayez), savoir (sache, sachons, sachez), vouloir (veuille, veuillez).'],
    examples: [ex('Donne-moi le livre.', 'Bana kitabı ver.'), ex('Ne partez pas !', 'Gitmeyin!')],
    watch: ['Olumlu emirde zamir fiilden sonra tire ile gelir (Donne-le-moi), olumsuzda önce (Ne me le donne pas).', 'me → moi (Regarde-moi), te → toi (Lève-toi).'],
    tip: 'Özneyi at, présent’i oku: Tu parles → Parle !',
    turkish: 'Emir kipi: “konuş!”, “konuşun!”, “konuşalım!”.',
  }),

  // ---------- Español ----------
  presente: g({
    summary: 'Şu an olanlar, alışkanlıklar ve genel doğrular; yakın gelecek ve plan için de kullanılır.',
    uses: ['Şu an: Estudio español.', 'Alışkanlık ve genel doğru: Trabajo por las mañanas.', 'Yakın gelecek/plan: Mañana voy a Madrid.', '“desde hace” ile süren durum: Vivo aquí desde hace tres años.'],
    formation: ['-ar: -o, -as, -a, -amos, -áis, -an.', '-er: -o, -es, -e, -emos, -éis, -en.', '-ir: -o, -es, -e, -imos, -ís, -en.', 'Kök değişimi (“bot kuralı”): e → ie (pensar → pienso), o → ue (poder → puedo), e → i (pedir → pido); nosotros ve vosotros’ta değişmez.', 'yo biçimi düzensiz olanlar: tener → tengo, hacer → hago, salir → salgo, poner → pongo, conocer → conozco, saber → sé, dar → doy, ver → veo. ser, estar, ir tamamen düzensizdir.'],
    examples: [ex('Hablo con mi hermana.', 'Kız kardeşimle konuşuyorum.'), ex('Ellos piensan en el viaje.', 'Yolculuğu düşünüyorlar.'), ex('Salgo a las ocho.', 'Sekizde çıkarım.')],
    watch: ['Özne zamiri çoğunlukla söylenmez: “Hablo” zaten “ben”dir.', 'ser ve estar ikisi de “olmak”tır: kalıcı özellik ser, durum ve yer estar.'],
    tip: 'Kök değişen fiillerde biz ve siz “çizmenin dışında” kalır: nosotros pensamos, vosotros pensáis.',
    turkish: '-iyor ve geniş zaman (-ir/-er) birlikte.',
  }),
  imperfecto: g({
    summary: 'Geçmişte süregelen, tekrarlanan ya da fon oluşturan durumlar. Olayın başı sonu önemli değildir.',
    uses: ['Geçmişte alışkanlık: De niño jugaba al fútbol.', 'Betimleme ve fon: Hacía frío y llovía.', 'Devam eden eylem: Leía cuando llegaste.', 'Geçmişte yaş ve saat: Tenía diez años; Eran las tres.', 'Kibar istek: Quería pedirle un favor.'],
    formation: ['-ar: -aba, -abas, -aba, -ábamos, -abais, -aban.', '-er/-ir: -ía, -ías, -ía, -íamos, -íais, -ían.', 'Yalnızca üç düzensiz vardır: ser (era), ir (iba), ver (veía).'],
    examples: [ex('Vivíamos cerca del mar.', 'Denize yakın yaşardık.'), ex('Mientras cocinaba, escuchaba música.', 'Yemek yaparken müzik dinliyordum.')],
    watch: ['nosotros -ar biçiminde vurgu işareti: hablábamos.', 'Pretérito ile farkı: imperfecto “nasıldı / ne yapardı”, pretérito “ne oldu”.', '1. ve 3. tekil aynıdır: hablaba (ben de o da).'],
    tip: 'Düzensiz yalnızca üç: ser, ir, ver. Gerisi kuralla.',
    turkish: '-iyordu ve -(ı)rdı birlikte.',
  }),
  preterito: g({
    summary: 'Bitmiş, tek seferlik geçmiş olaylar (pretérito indefinido). Başı ve sonu belli olan eylem.',
    uses: ['Bitmiş olay: Ayer comí paella.', 'Olay zinciri: Me levanté, desayuné y salí.', 'Belirli zaman ifadeleri: ayer, anoche, el año pasado, en 2020, hace dos días.', 'Yeni bir durumun başlaması: Entonces supe la verdad.'],
    formation: ['-ar: -é, -aste, -ó, -amos, -asteis, -aron.', '-er/-ir: -í, -iste, -ió, -imos, -isteis, -ieron.', 'ser ve ir aynı biçimi paylaşır: fui, fuiste, fue, fuimos, fuisteis, fueron.', 'Düzensiz kökler: tener → tuv-, estar → estuv-, poder → pud-, poner → pus-, saber → sup-, venir → vin-, hacer → hic- (él hizo), decir → dij- (ellos dijeron), traer → traj-, querer → quis-. Bunlarda ekler: -e, -iste, -o, -imos, -isteis, -ieron (vurgu işareti yok).', '3. kişide kök değişimi: pedir → pidió, dormir → durmió; leer → leyó, leyeron.', 'yo biçiminde yazım: buscar → busqué, llegar → llegué, empezar → empecé.'],
    examples: [ex('Ayer fui al cine.', 'Dün sinemaya gittim.'), ex('Ellos tuvieron un problema.', 'Bir sorunları oldu.'), ex('Ella pidió un café.', 'O bir kahve istedi.')],
    watch: ['dar ve ver vurgu işareti almaz: di, vi, dio, vio.', '“fue” hem ser hem ir’dir: anlam bağlamdan çıkar.', 'Hayatta bir kez olan, biten olay → pretérito; süregelen → imperfecto.'],
    tip: 'Düzensiz köklerde ekler hep -e -iste -o -imos -isteis -ieron: vurgu işareti yok.',
    turkish: '-dı: “gittim, yedi, oldu”.',
  }),
  perfecto: g({
    summary: 'Şimdiye bağlı geçmiş (pretérito perfecto compuesto): haber + ortaç.',
    uses: ['Henüz bitmemiş zaman diliminde olanlar: Hoy he comido temprano; Esta semana he trabajado mucho.', 'Hayat deneyimi: ¿Has estado en España?', 'ya, todavía no, nunca, alguna vez ile: Todavía no he terminado.', 'İspanya’da yakın geçmiş için çok kullanılır; Latin Amerika’da çoğu zaman pretérito tercih edilir.'],
    formation: ['haber (he, has, ha, hemos, habéis, han) + participio.', 'Ortaç: -ar → -ado (hablado), -er/-ir → -ido (comido, vivido).', 'Düzensiz ortaçlar: hecho, dicho, visto, puesto, escrito, abierto, vuelto, roto, muerto, cubierto.', 'Ortaç değişmez (cinsiyet ve sayı uyumu yok), yardımcı ile arasına başka sözcük girmez: No lo he visto.'],
    examples: [ex('Hoy he leído dos capítulos.', 'Bugün iki bölüm okudum.'), ex('¿Ya has comido?', 'Yemek yedin mi?')],
    watch: ['haber ile tener karıştırılmaz: tengo + ortaç farklı bir yapıdır (Tengo escrita la carta).', 'Zaman ifadesine bak: ayer → pretérito, hoy/esta semana → perfecto.'],
    tip: 'he has ha hemos habéis han: “haber”in şimdiki zamanını ezberle.',
    turkish: '-mış/-miş ve -dı arasında: “yemişim, okudum” (bugünden bahsederken).',
  }),
  pluscuamperfecto: g({
    summary: 'Geçmişteki başka bir olaydan önce bitmiş iş: “geçmişin geçmişi”.',
    uses: ['İki geçmiş olaydan önce olan: Cuando llegué, ya se había ido.', 'Sebep/açıklama: Estaba cansado porque no había dormido.', '“si + pluscuamperfecto de subjuntivo” ile karıştırma: şimdi habíamos = gösterme kipi.'],
    formation: ['haber imperfecto (había, habías, había, habíamos, habíais, habían) + participio.'],
    examples: [ex('Ya había comido cuando llamaste.', 'Sen aradığında yemek yemiştim.'), ex('No habíamos visto esa película.', 'O filmi görmemiştik.')],
    watch: ['había hem “ben” hem “o” içindir; anlam özneden çıkar.'],
    tip: 'Yardımcı fiil bir adım geriye gider: he → había.',
    turkish: '-mıştı: “yemişti, gitmişti”.',
  }),
  futuro: g({
    summary: 'Gelecekteki olaylar, planlar ve tahminler; ayrıca şu an hakkında tahmin.',
    uses: ['Gelecek plan/tahmin: Mañana lloverá.', 'Şu an hakkında tahmin: ¿Dónde estará Juan? (Acaba nerede?)', 'Söz ve emir: Harás lo que te digo.', 'Konuşmada yakın gelecek için ir a + infinitivo yaygındır: Voy a llamar.'],
    formation: ['Mastar + -é, -ás, -á, -emos, -éis, -án (hablaré, comeré, viviré).', 'Düzensiz kökler: tener → tendr-, poner → pondr-, salir → saldr-, venir → vendr-, poder → podr-, saber → sabr-, querer → querr-, haber → habr-, hacer → har-, decir → dir-.', 'Ekler düzenlidir; yalnızca kök düzensizdir.'],
    examples: [ex('El año que viene viajaré a Italia.', 'Gelecek yıl İtalya’ya seyahat edeceğim.'), ex('Tendrán hambre.', 'Acıkmış olmalılar.')],
    watch: ['“si” cümlesinde futuro kullanılmaz: si + presente → futuro (Si llueve, me quedaré).', 'Vurgu işaretleri: hablaré, hablarás, hablará; hablaremos işaretsizdir.'],
    tip: 'Mastar + haber’in ekleri: hablar + é ás á emos éis án.',
    turkish: '-ecek / -acak.',
  }),
  'futuro-perfecto': g({
    summary: 'Gelecekte bir noktada bitmiş olacak iş; ayrıca geçmiş hakkında tahmin.',
    uses: ['Gelecekte tamamlanmış olacak: Para mañana habré terminado.', 'Geçmiş hakkında tahmin: Habrá llegado ya (gelmiş olmalı).', 'Cuando + subjuntivo ile bitmiş iş: Cuando hayas terminado, habremos acabado.'],
    formation: ['haber futuro (habré, habrás, habrá, habremos, habréis, habrán) + participio.'],
    examples: [ex('Para el viernes ya habré acabado.', 'Cumaya kadar bitirmiş olacağım.'), ex('Se habrá dormido.', 'Uyumuş olmalı.')],
    watch: ['Türkçede çoğu zaman düz zamanla söylenir; İspanyolcada tamamlanma vurgusu için bu zaman seçilir.'],
    tip: 'Futuro + participio: haber’i futura çek, ortacı ekle.',
    turkish: '-miş olacak.',
  }),
  condicional: g({
    summary: 'Kibar istek, varsayım, tavsiye ve geçmişten bakınca gelecek.',
    uses: ['Kibar istek: Me gustaría un café; ¿Podría ayudarme?', 'Varsayım: Si tuviera dinero, compraría una casa.', 'Tavsiye: Deberías descansar.', 'Geçmişten gelecek: Dijo que vendría.', 'Geçmişte tahmin: Serían las tres (saat üç gibiydi).'],
    formation: ['Mastar + -ía, -ías, -ía, -íamos, -íais, -ían (hablaría, comería, viviría).', 'Düzensiz kökler futuro ile aynıdır: tendr-, pondr-, saldr-, vendr-, podr-, sabr-, querr-, habr-, har-, dir-.'],
    examples: [ex('Yo viajaría más.', 'Daha çok seyahat ederdim.'), ex('¿Podrías abrir la ventana?', 'Pencereyi açabilir misin?')],
    watch: ['si + imperfecto de subjuntivo → condicional (si tuviera, compraría); “si tendría” yanlıştır.'],
    tip: 'Futuro kökü + imperfecto’nun -ía ekleri.',
    turkish: '-erdi / -ir miydi: “gelirdi, yapar mısınız”.',
  }),
  'condicional-perfecto': g({
    summary: 'Gerçekleşmemiş geçmiş varsayım, pişmanlık ve geçmişte tahmin.',
    uses: ['Gerçekleşmemiş koşul sonucu: Si hubiera estudiado, habría aprobado.', 'Pişmanlık: Habría ido, pero estaba enfermo.', 'Geçmişte tahmin: Habrían llegado tarde.'],
    formation: ['haber condicional (habría, habrías, habría, habríamos, habríais, habrían) + participio.'],
    examples: [ex('Habría comprado ese coche.', 'O arabayı alırdım (alabilirdim).'), ex('Nos habríamos quedado.', 'Kalırdık.')],
    watch: ['si + hubiera + participio → habría + participio (Si hubiera sabido, habría venido).'],
    tip: 'Koşulun her iki yarısı da geçmişe çekilir: hubiera… habría…',
    turkish: '-seydi … -erdi: “bilseydim gelirdim”.',
  }),
  subjuntivo: g({
    summary: 'İstek, duygu, şüphe ve zorunluluk gibi öznel anlamlarda “que” ile gelen kip.',
    uses: ['İstek/emir: Quiero que vengas; Te pido que me ayudes.', 'Duygu: Me alegro de que estés aquí.', 'Şüphe ve olumsuz düşünce: No creo que sea verdad; Dudo que venga.', 'Ojalá (que): Ojalá llueva.', 'Bağlaçlar: para que, antes de que, a menos que, sin que, con tal de que; belirsiz gelecekte cuando/aunque: Cuando llegues, llámame.'],
    formation: ['yo biçimi (-o atılır) + zıt ünlü: -ar fiilleri e, -er/-ir fiilleri a alır: hable, hables, hable, hablemos, habléis, hablen; coma, comas, coma, comamos, comáis, coman.', 'yo biçimi düzensizse subjuntivo da ondan gelir: tengo → tenga, hago → haga, salgo → salga, pongo → ponga.', 'Tam düzensizler: ser (sea), estar (esté), ir (vaya), saber (sepa), haber (haya), dar (dé), ver (vea).', 'Kök değişimi nosotros/vosotros’ta ünlü zayıflamasıyla: dormir → durmamos, pedir → pidamos.'],
    examples: [ex('Espero que tengas suerte.', 'Umarım şansın yaver gider.'), ex('Es importante que estudies.', 'Çalışman önemli.'), ex('Cuando llegues, llámame.', 'Vardığında ara beni.')],
    watch: ['Aynı özne varsa mastar: Quiero salir (Quiero que yo salga değil).', 'creer que → gösterme kipi, no creer que → subjuntivo.', 'cuando geçmişte/alışkanlıkta gösterme kipi alır: Cuando llegó, comimos.'],
    tip: 'Zıt ünlü kuralı: -ar fiilleri e’ye, -er/-ir fiilleri a’ya döner.',
    turkish: 'Türkçe -sin / -(y)A / -mAsI gerek gibi dilek yapıları.',
  }),
  'subjuntivo-imperfecto': g({
    summary: '“si” varsayımının ve geçmişteki dilek/istek cümlelerinin subjuntivo’su.',
    uses: ['si + imperfecto de subjuntivo → condicional: Si tuviera tiempo, viajaría.', 'Geçmişte tetikleyiciden sonra: Quería que vinieras.', 'Kibar istek: Quisiera un café.', 'como si ile: Habla como si supiera todo.', 'Ojalá ile gerçek dışı dilek: Ojalá tuviera más tiempo.'],
    formation: ['ellos pretérito biçiminden -ron atılır, -ra ekleri gelir: hablaron → hablara, hablaras, hablara, habláramos, hablarais, hablaran.', 'Eş anlamlı -se biçimi vardır (hablase), daha çok yazıda.', 'Düzensizlik pretérito’dan gelir: tuvieron → tuviera, fueron → fuera, dijeron → dijera, pidieron → pidiera, durmieron → durmiera.', 'nosotros’ta vurgu işareti: habláramos, tuviéramos.'],
    examples: [ex('Si fuera rico, viajaría por el mundo.', 'Zengin olsam dünyayı gezerdim.'), ex('Me pidió que le ayudara.', 'Ondan yardım etmemi istedi.')],
    watch: ['-ra ve -se aynı anlamdadır; ders kitaplarında -ra daha yaygındır.', 'si cümlesinde gösterme/koşul zamanı değil bu kip gelir.'],
    tip: '“Ellos pretérito → -ron at → -ra ekle” üç adımı yeter.',
    turkish: '-sA (dilek-şart): “olsa, yapsam”.',
  }),
  'subjuntivo-perfecto': g({
    summary: 'Bitmiş eylem için subjuntivo: tetikleyici şimdi, eylem ondan önce.',
    uses: ['Bitmiş eylem hakkında duygu/şüphe: Espero que hayas llegado bien.', 'Olumsuz düşünce: No creo que lo haya hecho.', 'Cuando + gelecekte bitmiş: Cuando hayas terminado, avísame.', 'Me alegro de que hayas venido.'],
    formation: ['haber subjuntivo (haya, hayas, haya, hayamos, hayáis, hayan) + participio.'],
    examples: [ex('Dudo que hayan terminado.', 'Bitirdiklerinden şüpheliyim.'), ex('Ojalá haya aprobado.', 'Umarım geçmiştir.')],
    watch: ['haya (haber) ile vaya (ir) ve haya (haber) karıştırılmasın: haya + ortaç yapıdır.'],
    tip: 'Subjuntivo presente + participio: yardımcı fiil haya olur.',
    turkish: '-miş olsun / -miş olması: bitmiş durum için dilek.',
  }),
  'subjuntivo-pluscuamperfecto': g({
    summary: 'Gerçekleşmemiş geçmiş koşul ve pişmanlık dileği.',
    uses: ['Gerçekleşmemiş geçmiş koşul: Si hubiera sabido, habría venido.', 'Pişmanlık: Ojalá hubiera estudiado más.', 'Geçmişte tetikleyiciden önce bitmiş: Me dijo que si hubiera llegado antes, lo habría visto.'],
    formation: ['haber imperfecto de subjuntivo (hubiera, hubieras, hubiera, hubiéramos, hubierais, hubieran) + participio.', 'Eş anlamlı -se biçimi: hubiese estudiado.'],
    examples: [ex('Si hubiera llamado, te habría ayudado.', 'Arasaydı sana yardım ederdim.'), ex('Ojalá hubiéramos ido.', 'Keşke gitseydik.')],
    watch: ['si + hubiera + participio → habría + participio; “si habría” yanlıştır.'],
    tip: 'İki “h”: hubiera… habría… Koşul hubiera ile, sonuç habría ile.',
    turkish: '-seydi: “bilseydim, gitseydik”.',
  }),
  imperativo: g({
    summary: 'Emir, rica, tavsiye ve yasak. Olumlu ve olumsuz emir farklı kurulur.',
    uses: ['Emir/rica: Habla más despacio.', 'Davet ve öneri: Vamos.', 'Yasak: No hables tan alto.', 'Tarif ve talimat: Mezcle bien.'],
    formation: ['tú olumlu: 3. tekil geniş zaman biçimi (habla, come, escribe).', 'vosotros olumlu: mastarın r’si d olur (hablad, comed, escribid).', 'usted, ustedes, nosotros: subjuntivo biçimi (hable, hablen, hablemos).', 'Olumsuz emir tüm kişilerde subjuntivo: no hables, no habléis, no hablemos.', 'tú olumlu düzensizler: ven, ten, pon, sal, haz, di, ve, sé.'],
    examples: [ex('Come más verdura.', 'Daha çok sebze ye.'), ex('No me lo digas.', 'Bana bunu söyleme.')],
    watch: ['Zamirler olumlu emirde fiile yapışır (dímelo, siéntate), olumsuzda önüne gelir (no me lo digas).', 'Dönüşlü vosotros’ta d düşer: sentaos (sentados değil); nosotros: vámonos.'],
    tip: 'Olumlu emir kendi biçimiyle, olumsuz emir hep subjuntivo ile: habla / no hables.',
    turkish: 'Emir kipi: “konuş!”, “konuşun!”.',
  }),
}
