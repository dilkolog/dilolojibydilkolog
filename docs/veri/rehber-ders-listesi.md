# Rehber ders listesi (15. tur için)

Her ders için: `topic` (soru dosyalarında kullanılacak anahtar), seviye, başlık, bugünkü soru havuzu (kendi 3 sorusu + `checks/*.json`) ve dersin bağlı olduğu dilbilgisi soru bankasında kaç soru olduğu. **Hedef: havuz ≥ 10.** Bu dosya `src/data/guide/` içindeki derslerden üretilir.

Yeniden üretme: `WRITE_GUIDE_MANIFEST=1 npx vitest run src/data/guide/guideManifest.test.ts`.

## Fransızca (fr) — 72 ders

| topic | seviye | başlık | havuz | soru bankası |
|---|---|---|---|---|
| `basics_fr_articles` | A1 | Artikeller ve cinsiyet | 15 | 8 |
| `basics_fr_etre_avoir` | A1 | Être ve avoir | 15 | 8 |
| `basics_fr_present` | A1 | Şimdiki zaman (présent) | 15 | 8 |
| `basics_fr_negation` | A1 | Olumsuz ve soru cümlesi | 15 | 8 |
| `basics_fr_adjectifs` | A2 | Sıfatlar: uyum ve yer | 15 | 8 |
| `basics_fr_passe_compose` | A2 | Passé composé (bitmiş geçmiş) | 15 | 8 |
| `articles_quantite` | A2 | Partitif ve miktar ifadeleri | 15 | 15 |
| `passe_imparfait` | A2 | Passé composé ve imparfait | 15 | 15 |
| `negation_fr` | A2 | Olumsuzluk (ne … plus / jamais / rien) | 15 | 15 |
| `futur_fr` | B1 | Gelecek zamanlar (futur, futur proche, futur antérieur) | 15 | 17 |
| `pronoms_y_en` | B1 | Zamirler: le / lui / y / en | 15 | 15 |
| `prep_fr` | B1 | Fiil ve edat (de / à) | 15 | 24 |
| `colloc_fr` | B1 | Eşdizimler (hangi fiil?) | 15 | 19 |
| `conn_fr` | B1 | Bağlaçlar (fikrin yönü) | 15 | 11 |
| `subjonctif` | B2 | Subjonctif | 15 | 23 |
| `conditionnel_passe` | B2 | Conditionnel passé ve şart | 15 | 22 |
| `participe_passe` | B2 | Participe passé uyumu | 15 | 22 |
| `discours_indirect_fr` | B2 | Dolaylı anlatım ve zaman uyumu | 15 | 17 |
| `pronoms_relatifs` | B2 | Birleşik ilgi zamirleri | 15 | 21 |
| `basics_fr_pronoms` | A1 | Kişi zamirleri ve vurgulu zamirler | 15 | 0 |
| `basics_fr_possessifs` | A1 | İyelik ve işaret sıfatları | 15 | 8 |
| `basics_fr_nombres` | A1 | Sayılar, saat ve tarih | 15 | 0 |
| `basics_fr_questions` | A1 | Soru sözcükleri ve soru kurma | 15 | 8 |
| `basics_fr_lieux` | A2 | Yer edatları (dans, sur, chez, à côté de…) | 15 | 8 |
| `basics_fr_pronominaux` | A2 | Dönüşlü fiiller (se lever) | 15 | 0 |
| `basics_fr_comparaison` | A2 | Karşılaştırma ve en üstünlük | 15 | 0 |
| `basics_fr_imperatif` | A2 | Emir kipi | 15 | 0 |
| `basics_fr_depuis` | A2 | Zaman ifadeleri: depuis, il y a, pendant, dans | 15 | 8 |
| `basics_fr_plus_que_parfait` | B1 | Plus-que-parfait (geçmişin geçmişi) | 15 | 0 |
| `basics_fr_gerondif` | B1 | Gérondif ve participe présent | 15 | 0 |
| `basics_fr_ordre_pronoms` | B1 | İki zamir bir arada (me le, le lui) | 15 | 0 |
| `basics_fr_adverbes` | B1 | -ment zarfları: kuruluş ve yer | 15 | 0 |
| `basics_fr_subjonctif_passe` | B2 | Subjonctif passé ve subjonctiften kaçınma | 15 | 0 |
| `basics_fr_passif` | B2 | Edilgen çatı (être + ortaç, on, se faire) | 15 | 0 |
| `basics_fr_passe_simple` | C1 | Passé simple (okurken tanımak) | 15 | 0 |
| `basics_fr_concession` | C1 | Taviz ve nüans: quoique, encore que, si … que | 15 | 0 |
| `basics_fr_mise_en_relief` | B2 | Vurgu yapıları: c'est … qui / que, ce qui … c'est | 15 | 0 |
| `basics_fr_cause_consequence` | B2 | Neden ve sonuç: étant donné que, faute de, si bien que | 15 | 0 |
| `basics_fr_demonstratifs` | B2 | İşaret zamirleri: celui, celle-ci, ceci, cela | 15 | 0 |
| `basics_fr_faire_causatif` | B2 | Yaptırmak: faire + mastar, laisser + mastar | 15 | 0 |
| `basics_fr_registres` | B2 | Resmî ve gündelik dil (registres) | 15 | 0 |
| `basics_fr_ne_expletif` | C1 | Ne explétif (olumsuz anlam taşımayan ne) | 15 | 0 |
| `basics_fr_nominalisation` | C1 | Adlaştırma (nominalisation) | 15 | 0 |
| `basics_fr_hypothese` | C1 | Si'siz varsayım: au cas où, à supposer que, quand bien même | 15 | 0 |
| `basics_fr_subjonctif_imparfait` | C1 | Subjonctif imparfait ve plus-que-parfait (okurken tanımak) | 15 | 0 |
| `basics_fr_c_est_vs_il_est` | A1 | C'est mi, il est mi? (C'est un professeur vs Il est professeur) | 15 | 0 |
| `basics_fr_prepositions_geographie` | A2 | Ülkeler, şehirler ve adalarla edatlar (en France, au Japon, à Paris) | 15 | 24 |
| `basics_fr_si_concordance` | A2 | Si ile şart cümlelerinde zaman uyumu (si présent, si imparfait) | 15 | 22 |
| `basics_fr_verbes_prepositions_a_de` | B1 | Anlamı edata göre değişen fiiller: penser à vs penser de | 15 | 24 |
| `basics_fr_participe_gerondif` | B1 | Participe présent ve gérondif ayrımı (chantant vs en chantant) | 15 | 0 |
| `basics_fr_double_pronoms_imperatif` | B1 | Emir kipinde çift zamirler: Donne-le-moi vs Ne me le donne pas | 15 | 15 |
| `basics_fr_tout_tous_usages` | B1 | 'Tout' sözcüğünün bütün halleri: sıfat, zamir ve zarf | 15 | 0 |
| `basics_fr_accords_pronominaux_cod` | B2 | Dönüşlü fiillerde ortaç uyumu tuzağı: Elle s'est lavée vs s'est lavé les mains | 15 | 22 |
| `basics_fr_subjonctif_conjonctions` | B2 | Subjonctif zorunlu kılan kilit bağlaçlar: bien que, pour que, avant que | 15 | 23 |
| `basics_fr_pronoms_relatifs_composes` | B2 | Bileşik ilgi zamirleri: lequel, auquel, duquel | 15 | 21 |
| `basics_fr_savoir_connaitre` | A2 | Savoir mı, connaître mi? (Bilmek ve tanımak ayrımı) | 15 | 0 |
| `basics_fr_amener_apporter` | A2 | Getirmek ve götürmek: amener, apporter, emmener, emporter | 15 | 0 |
| `basics_fr_temps_mots` | A2 | Zaman kelimeleri: temps / heure / fois ve an / année, jour / journée | 15 | 0 |
| `basics_fr_indefinis` | B1 | Belgisiz sıfat ve zamirler: chaque, chacun, quelque, plusieurs, certain(e)s | 15 | 0 |
| `basics_fr_questions_inversion` | B1 | Resmî devrik soru ve kaynaştırma -t- harfi (Inversion) | 15 | 0 |
| `basics_fr_discours_temps` | B1 | Dolaylı anlatımda zaman ve yer ifadelerinin dönüşümü | 15 | 17 |
| `basics_fr_verbes_pronominaux_sens` | B2 | Dönüşlü olunca anlamı tamamen değişen fiiller (se douter, s’attendre...) | 15 | 24 |
| `basics_fr_accord_adjectifs_particuliers` | B2 | Renk sıfatları ve bileşik sıfatlarda uyum istisnaları | 15 | 0 |
| `basics_fr_infinitif_passe` | B2 | Geçmiş mastar (Infinitif passé): après avoir fait, après être parti | 15 | 0 |
| `basics_fr_connecteurs_argumentation` | C1 | DELF B2 / DALF C1 tartışma ve kompozisyon bağlaçları | 15 | 11 |
| `basics_fr_pluriel` | A1 | İsimlerin çoğulu (-s, -x, -aux) | 15 | 0 |
| `basics_fr_conditionnel_present` | A2 | Conditionnel présent: kibar istek, öneri, hayal | 15 | 0 |
| `basics_fr_obligation` | A2 | Zorunluluk ve gereklilik: devoir, il faut, avoir besoin de | 15 | 0 |
| `basics_fr_pronoms_possessifs` | A2 | İyelik zamirleri: le mien, la tienne, les nôtres | 15 | 0 |
| `basics_fr_pron_nasales` | A1 | Burun ünlüleri: an, on, in (vin, vent, vont) | 15 | 0 |
| `basics_fr_pron_u_ou_r` | A1 | u / ou / eu ve Fransızca r | 15 | 0 |
| `basics_fr_pron_liaison` | A2 | Okunmayan harfler ve liaison (les amis, ils ont) | 15 | 0 |

## İspanyolca (es) — 73 ders

| topic | seviye | başlık | havuz | soru bankası |
|---|---|---|---|---|
| `basics_es_articulos` | A1 | Artikeller ve cinsiyet (el / la / un / una) | 15 | 8 |
| `basics_es_presente` | A1 | Şimdiki zaman (presente) | 15 | 8 |
| `basics_es_gustar` | A1 | Gustar ve benzeri fiiller | 15 | 8 |
| `basics_es_negacion` | A1 | Olumsuzluk ve soru cümleleri | 15 | 8 |
| `basics_es_adjetivos` | A2 | Sıfatlar: uyum ve yer | 15 | 8 |
| `basics_es_preterito` | A2 | Geçmiş zaman: he comido mu, comí mi? | 15 | 8 |
| `ser_estar` | A2 | Ser ve estar | 15 | 18 |
| `preterito_imperfecto` | A2 | Pretérito ve imperfecto | 15 | 15 |
| `comparativos_es` | A2 | Karşılaştırma ve üstünlük | 15 | 15 |
| `imperativo_es` | A2 | Emir kipi ve zamirler | 15 | 15 |
| `subjuntivo` | B1 | Subjuntivo | 15 | 20 |
| `por_para` | B1 | Por ve para | 15 | 19 |
| `condicionales` | B1 | Şart cümleleri (si) | 15 | 20 |
| `perifrasis` | B1 | Perífrasis verbales | 15 | 18 |
| `pronombres_atonos` | B1 | Zamirler: lo / la / le / se lo | 15 | 15 |
| `relativos_es` | B1 | İlgi zamirleri (que / quien / cuyo / donde) | 15 | 15 |
| `conn_es` | B1 | Bağlaçlar (fikrin yönü) | 15 | 11 |
| `prep_es` | B1 | Fiil ve edat (de / en / a / con) | 15 | 24 |
| `colloc_es` | B1 | Eşdizimler (hangi fiil?) | 15 | 19 |
| `se_pasivo` | B2 | Se pasivo ve impersonal | 15 | 18 |
| `estilo_indirecto` | B2 | Dolaylı anlatım (estilo indirecto) | 15 | 15 |
| `basics_es_pronombres` | A1 | Kişi zamirleri (yo, mí, conmigo) | 15 | 0 |
| `basics_es_posesivos` | A1 | İyelik ve işaret sözcükleri (mi, este, ese, aquel) | 15 | 8 |
| `basics_es_numeros_hora` | A1 | Sayılar, saat ve tarih | 15 | 0 |
| `basics_es_preguntas` | A1 | Soru sözcükleri (qué, cuál, quién, dónde…) | 15 | 8 |
| `basics_es_hay_estar` | A1 | Hay mı, está mı? | 15 | 8 |
| `basics_es_reflexivos` | A1 | Dönüşlü fiiller (levantarse) | 15 | 8 |
| `basics_es_perfecto_indefinido` | A2 | He hecho mu, hice mi? Zaman işaretleri | 15 | 0 |
| `basics_es_futuro` | A2 | Gelecek: ir a, futuro simple ve tahmin | 15 | 0 |
| `basics_es_hace_desde` | A2 | Süre: hace, desde, desde hace, llevar | 15 | 0 |
| `basics_es_pluscuamperfecto` | B1 | Miş'li geçmiş: había hecho (pluscuamperfecto) | 15 | 0 |
| `basics_es_gerundio` | B1 | Gerundio ve İngilizce -ing tuzakları | 15 | 0 |
| `basics_es_orden_pronombres` | B1 | Zamir sırası, kazara se ve leísmo | 15 | 0 |
| `basics_es_adverbios_mente` | B1 | -mente ile zarflar | 15 | 0 |
| `basics_es_imperfecto_subjuntivo` | B2 | İmperfecto de subjuntivo (-ra / -se) | 15 | 0 |
| `basics_es_finales_concesivas` | B2 | Amaç ve taviz: para que, aunque | 15 | 0 |
| `basics_es_subjuntivo_compuesto` | C1 | Bileşik subjuntivo: haya hecho, hubiera hecho | 15 | 0 |
| `basics_es_marcadores` | C1 | Yazıda söylem belirleyicileri (no obstante, por consiguiente) | 15 | 0 |
| `basics_es_subjuntivo_relativo` | B2 | İlgi cümlesinde kip: busco a alguien que sepa | 15 | 0 |
| `basics_es_verbos_cambio` | B2 | Değişim fiilleri: ponerse, volverse, hacerse, quedarse | 15 | 0 |
| `basics_es_temporales` | B2 | Zaman cümleleri: cuando llegues, en cuanto, hasta que | 15 | 0 |
| `basics_es_lo_neutro` | B2 | lo + sıfat ve lo que: lo bueno es que… | 15 | 0 |
| `basics_es_pasiva_ser_estar` | B2 | Edilgen: ser + ortaç ve estar + ortaç | 15 | 0 |
| `basics_es_probabilidad` | C1 | Tahmin: serán las ocho, estaría cansado | 15 | 0 |
| `basics_es_registro_formal` | C1 | Resmî yazışma: usted ve nezaket kalıpları | 15 | 0 |
| `basics_es_condicion_alternativa` | C1 | Şartın diğer yolları: en caso de que, a no ser que, como, de + mastar | 15 | 0 |
| `basics_es_oraciones_hendidas` | C1 | Vurgulu cümleler: fue Ana quien…, lo que necesito es… | 15 | 0 |
| `basics_es_a_personal` | A1 | Kişisel 'A' edatı: Busco a mi hermano vs Busco mi libro | 15 | 24 |
| `basics_es_gustar_familia` | A2 | Gustar ailesi fiilleri: encantar, doler, importar, parecer | 15 | 15 |
| `basics_es_pronombres_dobles_se_lo` | A2 | Çift zamirler ve 'se lo' kuralı: le lo değil se lo | 15 | 15 |
| `basics_es_subjuntivo_deseo_sentimiento` | B1 | İstek, duygu ve şüphede subjuntivo: quiero que, me alegra que | 15 | 20 |
| `basics_es_para_que_subjuntivo` | B1 | Amaç cümlelerinde para vs para que: mastar mı subjuntivo mu? | 15 | 20 |
| `basics_es_perifrasis_inicio_fin` | B1 | Eylemin aşamaları: ponerse a, dejar de, acabar de, seguir | 15 | 18 |
| `basics_es_aunque_indicativo_subjuntivo` | B2 | Aunque ile indicativo vs subjuntivo nüansı: Biliyorum vs Bilmiyorum | 15 | 20 |
| `basics_es_si_condicionales_subjuntivo` | B2 | Si ile şart cümleleri ve imparfe subjuntivo formülü | 15 | 20 |
| `basics_es_que_quien_el_que` | B2 | İlgi zamirleri incelikleri: que, quien, el que, lo que, cuyo | 15 | 15 |
| `basics_es_futuro_probabilidad` | C1 | Gelecek ve şart kipiyle olasılık tahmini (futuro de probabilidad) | 15 | 0 |
| `basics_es_saber_conocer` | A2 | Saber mi, conocer mi? (Bilgi, beceri ve tanışıklık ayrımı) | 15 | 0 |
| `basics_es_pedir_preguntar` | A2 | Pedir mi, preguntar mı? (İstemek ve sormak ayrımı) | 15 | 0 |
| `basics_es_llevar_traer_ir_venir` | A2 | Hareket ve taşıma yönü: ir / venir ve llevar / traer | 15 | 0 |
| `basics_es_indefinidos_algun_ningun` | A2 | Belgisiz sözcükler ve kısalma (apócope): algún, ningún, cualquier | 15 | 0 |
| `basics_es_preposiciones_tiempo_lugar` | B1 | Zaman ve yer edatları: en, a, de, desde, hasta, hacia, entre | 15 | 24 |
| `basics_es_adjetivos_cambio_sentido` | B1 | İsmin önünde ve arkasında anlamı değişen sıfatlar (gran vs grande) | 15 | 0 |
| `basics_es_se_accidental` | B2 | Kazara ve istemsiz eylem yapısı: Se me cayó, Se me olvidó (se accidental) | 15 | 18 |
| `basics_es_como_si_ojala` | B2 | Ojalá ve como si yapıları: gerçek ve gerçek dışı dilekler | 15 | 20 |
| `basics_es_participio_gerundio_compuesto` | C1 | Bileşik mastar/ulaç ve mutlak yapılar (al haber dicho, dicho esto) | 15 | 0 |
| `basics_es_conectores_dele` | C1 | DELE B2/C1 makale ve tartışma bağlaçları (asimismo, de ahí que...) | 15 | 11 |
| `basics_es_muy_mucho` | A1 | Muy mi, mucho mu? (ve demasiado, bastante) | 15 | 0 |
| `basics_es_tratamiento` | A1 | Tú mu, usted mi? (Sen ve siz) | 15 | 0 |
| `basics_es_condicional_cortesia` | A2 | Condicional: kibar istek, öneri, hayal | 15 | 0 |
| `basics_es_pron_vocales_bv` | A1 | Ünlüler, h, b/v ve qu/gu | 15 | 0 |
| `basics_es_pron_j_c_ll_rr` | A1 | j, g, c, z, ll ve r/rr | 15 | 0 |
| `basics_es_pron_acento` | A2 | Hece vurgusu ve tilde (´) | 15 | 0 |

## İngilizce (en) — 76 ders

| topic | seviye | başlık | havuz | soru bankası |
|---|---|---|---|---|
| `basics_en_to_be` | A1 | To be (am / is / are) | 15 | 8 |
| `basics_en_present_simple` | A1 | Geniş zaman ve şimdiki zaman | 15 | 8 |
| `basics_en_past_simple` | A2 | Geçmiş zaman (past simple) | 15 | 8 |
| `basics_en_plurals_quantifiers` | A2 | Çoğullar ve miktar sözcükleri | 15 | 0 |
| `basics_en_future` | A2 | Gelecek zaman (will / going to) | 15 | 0 |
| `basics_en_comparatives` | A2 | Karşılaştırma (-er / more, the -est / most) | 15 | 8 |
| `articles_en` | A1 | Artikeller (a / an / the) | 15 | 23 |
| `present_perfect` | A2 | Present perfect ve past simple | 15 | 15 |
| `gerund_infinitive` | B1 | Gerund ve infinitive | 15 | 18 |
| `conn_en` | B1 | Bağlaçlar (fikrin yönü) | 15 | 12 |
| `prep_en` | B1 | Fiil, sıfat ve edat | 15 | 24 |
| `colloc_en` | B1 | Eşdizimler (hangi fiil?) | 15 | 19 |
| `reported_speech` | B1 | Dolaylı anlatım (reported speech) | 15 | 15 |
| `modals_en` | B1 | Modal fiiller (must / can’t / should) | 15 | 15 |
| `passive_en` | B1 | Edilgen yapı (passive) | 15 | 15 |
| `relatives_en` | B1 | İlgi cümleleri (who / which / whose / where) | 15 | 15 |
| `mixed_conditionals` | B2 | Karma şart cümleleri | 15 | 19 |
| `participle_clauses` | B2 | Participle clauses | 15 | 19 |
| `inversion` | C1 | Devrik yapı (inversion) | 15 | 20 |
| `basics_en_pronouns` | A1 | Zamirler ve iyelik (I / me / my / mine) | 15 | 8 |
| `basics_en_there_is` | A1 | There is / there are (var, yok) | 15 | 8 |
| `basics_en_demonstratives` | A1 | This / that / these / those | 15 | 8 |
| `basics_en_questions` | A1 | Soru sözcükleri ve soru düzeni | 15 | 8 |
| `basics_en_time_prepositions` | A1 | Zaman edatları (in / on / at) | 15 | 8 |
| `basics_en_past_continuous` | A2 | Past continuous ve past simple (when / while) | 15 | 0 |
| `basics_en_ability` | A2 | Yetenek: can / could / be able to | 15 | 0 |
| `basics_en_obligation` | A2 | Zorunluluk: have to ve must | 15 | 0 |
| `basics_en_place_prepositions` | A2 | Yer ve hareket edatları (in / on / at, into, through) | 15 | 0 |
| `basics_en_conditionals` | B1 | Birinci ve ikinci koşul cümleleri (if / unless) | 15 | 0 |
| `basics_en_used_to` | B1 | Used to, would, be used to, get used to | 15 | 0 |
| `basics_en_past_perfect` | B1 | Past perfect (had done) | 15 | 0 |
| `basics_en_question_tags` | B1 | Soru ekleri (question tags) | 15 | 0 |
| `basics_en_third_conditional` | B2 | Üçüncü koşul ve wish / if only | 15 | 0 |
| `basics_en_future_perfect` | B2 | Future continuous ve future perfect | 15 | 0 |
| `basics_en_causative` | B2 | Ettirgen yapı: have / get something done | 15 | 0 |
| `basics_en_hedging` | C1 | Yazıda bağlama ve temkinli dil (whereas, nonetheless, albeit) | 15 | 0 |
| `basics_en_present_continuous` | A1 | Şimdiki zaman (present continuous) | 15 | 0 |
| `basics_en_present_perfect_continuous` | B1 | Present perfect continuous (have been doing) | 15 | 15 |
| `basics_en_future_continuous` | B1 | Future continuous (will be doing) | 15 | 0 |
| `basics_en_past_perfect_continuous` | B2 | Past perfect continuous (had been doing) | 15 | 0 |
| `basics_en_preferences` | B2 | Tercih ve uyarı: would rather / prefer / had better | 15 | 0 |
| `basics_en_emphasis` | B2 | Vurgu: do / does / did, so / such | 15 | 0 |
| `basics_en_ellipsis` | B2 | Kısa cevaplar: so do I, neither, I think so | 15 | 0 |
| `basics_en_phrasal_verbs` | B2 | Phrasal verb'ler: ayrılabilen ve ayrılmayan | 15 | 0 |
| `basics_en_future_in_past` | B2 | Geçmişteki gelecek (was going to, would, was about to) | 15 | 0 |
| `basics_en_future_perfect_continuous` | C1 | Future perfect continuous (will have been doing) | 15 | 0 |
| `basics_en_unreal_past` | C1 | Gerçek dışı geçmiş: it's time, as if, suppose | 15 | 0 |
| `basics_en_noun_phrases` | C1 | Yoğun yazı dili: isimleştirme ve kısaltılmış ilgi cümleleri | 15 | 0 |
| `basics_en_register` | C1 | Resmî ve gündelik dil (register) | 15 | 0 |
| `basics_en_discourse_markers` | C1 | Konuşmada söylem belirleyicileri (actually, anyway, mind you) | 15 | 0 |
| `basics_en_stative_dynamic` | A2 | Durum ve eylem fiilleri (stative vs dynamic) | 15 | 0 |
| `basics_en_articles_institutions` | B1 | Kurumlarda artikel: school, hospital, prison, bed | 15 | 23 |
| `basics_en_causatives_advanced` | B1 | Ettirgen çatı incelikleri: have, get, make, let | 15 | 15 |
| `basics_en_cleft_variations` | C1 | Vurgu cümleleri: it-clefts ve wh-clefts | 15 | 20 |
| `basics_en_double_comparatives` | B2 | Paralel karşılaştırma: the more ... the better | 15 | 0 |
| `basics_en_prepositional_verbs` | B2 | Üç parçalı phrasal verb'ler ve ikili edatlar | 15 | 24 |
| `basics_en_inversion_conditionals` | C1 | Şart cümlelerinde devriklik: had I known, were I, should you | 15 | 20 |
| `basics_en_subjunctive_mandative` | C1 | Emir ve tavsiye dilek kipi (mandative subjunctive) | 15 | 19 |
| `basics_en_participle_advanced` | C1 | İleri ortaç cümlecikleri ve bağımsız yapılar (nominative absolute) | 15 | 19 |
| `basics_en_punctuation_flow` | C1 | Akademik bağlaçlar ve akış: however, therefore, on the contrary | 15 | 12 |
| `basics_en_make_do_have_take` | A2 | Temel fiil kalıpları: make, do, have ve take ayrımı | 15 | 19 |
| `basics_en_say_tell_speak_talk` | A2 | Konuşma ve anlatma fiilleri: say, tell, speak, talk | 15 | 15 |
| `basics_en_some_any_no_every` | A2 | Belgisiz zamirler ve ikili uyum: both, either, neither, none | 15 | 0 |
| `basics_en_so_such_too_enough` | B1 | Derece ve sonuç yapıları: so ... that, such ... that, too ... to, enough to | 15 | 0 |
| `basics_en_indirect_questions` | B1 | Dolaylı sorular ve kibar rica kalıpları (Indirect / Embedded Questions) | 15 | 15 |
| `basics_en_adjective_order_ed_ing` | B1 | Sıfat dizilimi (OSASCOMP) ve -ed / -ing sıfatları (bored vs boring) | 15 | 0 |
| `basics_en_reporting_verbs` | B2 | İleri dolaylı anlatım fiilleri (suggest, insist, accuse, deny, warn...) | 15 | 15 |
| `basics_en_modals_past_deduction` | B2 | Geçmişe yönelik çıkarım ve pişmanlık modalları (modal + have + V3) | 15 | 15 |
| `basics_en_correlative_conjunctions` | C1 | Çiftli bağlaçlar ve zaman devrikliği (No sooner ... than, Hardly ... when) | 15 | 20 |
| `basics_en_subjunctive_formulaic_clauses` | C1 | İleri düzey şart ve taviz kalıpları (Be that as it may, Try as he might...) | 15 | 19 |
| `basics_en_possessive_s` | A1 | İyelik eki: Tom's car, my parents' house | 15 | 0 |
| `basics_en_reflexive_pronouns` | A2 | Dönüşlü zamirler: myself, yourself, each other | 15 | 0 |
| `basics_en_adverbs` | A2 | Zarflar: quickly, well, hard ve yerleri | 15 | 0 |
| `basics_en_pron_th_w_v` | A1 | th, w ve v: Türkçede olmayan sesler | 15 | 0 |
| `basics_en_pron_vowels` | A1 | Kısa ve uzun ünlüler (ship / sheep) ve schwa | 15 | 0 |
| `basics_en_pron_ed_s_stress` | A2 | -ed ve -s sonları, kelime vurgusu | 15 | 0 |
