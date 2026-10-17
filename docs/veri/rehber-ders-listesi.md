# Rehber ders listesi (15. tur için)

Her ders için: `topic` (soru dosyalarında kullanılacak anahtar), seviye, başlık, bugünkü soru havuzu (kendi 3 sorusu + `checks/*.json`) ve dersin bağlı olduğu dilbilgisi soru bankasında kaç soru olduğu. **Hedef: havuz ≥ 10.** Bu dosya `src/data/guide/` içindeki derslerden üretilir.

Yeniden üretme: `WRITE_GUIDE_MANIFEST=1 npx vitest run src/data/guide/guideManifest.test.ts`.

## Fransızca (fr) — 65 ders

| topic | seviye | başlık | havuz | soru bankası |
|---|---|---|---|---|
| `basics_fr_articles` | A1 | Artikeller ve cinsiyet | 10 | 0 |
| `basics_fr_etre_avoir` | A1 | Être ve avoir | 3 | 0 |
| `basics_fr_present` | A1 | Şimdiki zaman (présent) | 3 | 0 |
| `basics_fr_negation` | A1 | Olumsuz ve soru cümlesi | 3 | 0 |
| `basics_fr_adjectifs` | A2 | Sıfatlar: uyum ve yer | 3 | 0 |
| `basics_fr_passe_compose` | A2 | Passé composé (bitmiş geçmiş) | 3 | 0 |
| `articles_quantite` | A2 | Partitif ve miktar ifadeleri | 3 | 15 |
| `passe_imparfait` | A2 | Passé composé ve imparfait | 3 | 15 |
| `negation_fr` | A2 | Olumsuzluk (ne … plus / jamais / rien) | 3 | 15 |
| `futur_fr` | B1 | Gelecek zamanlar (futur, futur proche, futur antérieur) | 3 | 17 |
| `pronoms_y_en` | B1 | Zamirler: le / lui / y / en | 3 | 15 |
| `prep_fr` | B1 | Fiil ve edat (de / à) | 3 | 24 |
| `colloc_fr` | B1 | Eşdizimler (hangi fiil?) | 3 | 19 |
| `conn_fr` | B1 | Bağlaçlar (fikrin yönü) | 3 | 11 |
| `subjonctif` | B2 | Subjonctif | 4 | 23 |
| `conditionnel_passe` | B2 | Conditionnel passé ve şart | 3 | 22 |
| `participe_passe` | B2 | Participe passé uyumu | 4 | 22 |
| `discours_indirect_fr` | B2 | Dolaylı anlatım ve zaman uyumu | 3 | 17 |
| `pronoms_relatifs` | B2 | Birleşik ilgi zamirleri | 3 | 21 |
| `basics_fr_pronoms` | A1 | Kişi zamirleri ve vurgulu zamirler | 3 | 0 |
| `basics_fr_possessifs` | A1 | İyelik ve işaret sıfatları | 3 | 0 |
| `basics_fr_nombres` | A1 | Sayılar, saat ve tarih | 3 | 0 |
| `basics_fr_questions` | A1 | Soru sözcükleri ve soru kurma | 3 | 0 |
| `basics_fr_lieux` | A2 | Yer edatları; ülke ve şehirle à / en / au / aux, chez | 3 | 0 |
| `basics_fr_pronominaux` | A2 | Dönüşlü fiiller (se lever) | 3 | 0 |
| `basics_fr_comparaison` | A2 | Karşılaştırma ve en üstünlük | 3 | 0 |
| `basics_fr_imperatif` | A2 | Emir kipi | 3 | 0 |
| `basics_fr_depuis` | A2 | Zaman ifadeleri: depuis, il y a, pendant, dans | 3 | 0 |
| `basics_fr_plus_que_parfait` | B1 | Plus-que-parfait (geçmişin geçmişi) | 3 | 0 |
| `basics_fr_gerondif` | B1 | Gérondif ve participe présent | 3 | 0 |
| `basics_fr_ordre_pronoms` | B1 | İki zamir bir arada (me le, le lui) | 3 | 0 |
| `basics_fr_adverbes` | B1 | -ment zarfları: kuruluş ve yer | 3 | 0 |
| `basics_fr_subjonctif_passe` | B2 | Subjonctif passé ve subjonctiften kaçınma | 3 | 0 |
| `basics_fr_passif` | B2 | Edilgen çatı (être + ortaç, on, se faire) | 3 | 0 |
| `basics_fr_passe_simple` | C1 | Passé simple (okurken tanımak) | 3 | 0 |
| `basics_fr_concession` | C1 | Taviz ve nüans: quoique, encore que, si … que | 3 | 0 |
| `basics_fr_mise_en_relief` | B2 | Vurgu yapıları: c'est … qui / que, ce qui … c'est | 3 | 0 |
| `basics_fr_cause_consequence` | B2 | Neden ve sonuç: étant donné que, faute de, si bien que | 3 | 0 |
| `basics_fr_demonstratifs` | B2 | İşaret zamirleri: celui, celle-ci, ceci, cela | 3 | 0 |
| `basics_fr_faire_causatif` | B2 | Yaptırmak: faire + mastar, laisser + mastar | 3 | 0 |
| `basics_fr_registres` | B2 | Resmî ve gündelik dil (registres) | 3 | 0 |
| `basics_fr_ne_expletif` | C1 | Ne explétif (olumsuz anlam taşımayan ne) | 3 | 0 |
| `basics_fr_nominalisation` | C1 | Adlaştırma (nominalisation) | 3 | 0 |
| `basics_fr_hypothese` | C1 | Si'siz varsayım: au cas où, à supposer que, quand bien même | 3 | 0 |
| `basics_fr_subjonctif_imparfait` | C1 | Subjonctif imparfait ve plus-que-parfait (okurken tanımak) | 3 | 0 |
| `basics_fr_c_est_vs_il_est` | A1 | C'est mi, il est mi? (C'est un professeur vs Il est professeur) | 3 | 0 |
| `basics_fr_prepositions_geographie` | A2 | Ülkeler, şehirler ve adalarla edatlar (en France, au Japon, à Paris) | 3 | 24 |
| `basics_fr_si_concordance` | A2 | Si ile şart cümlelerinde zaman uyumu (si présent, si imparfait) | 3 | 22 |
| `basics_fr_verbes_prepositions_a_de` | B1 | Anlamı edata göre değişen fiiller: penser à vs penser de | 3 | 24 |
| `basics_fr_participe_gerondif` | B1 | Participe présent ve gérondif ayrımı (chantant vs en chantant) | 3 | 0 |
| `basics_fr_double_pronoms_imperatif` | B1 | Emir kipinde çift zamirler: Donne-le-moi vs Ne me le donne pas | 3 | 15 |
| `basics_fr_tout_tous_usages` | B1 | 'Tout' sözcüğünün bütün halleri: sıfat, zamir ve zarf | 3 | 0 |
| `basics_fr_accords_pronominaux_cod` | B2 | Dönüşlü fiillerde ortaç uyumu tuzağı: Elle s'est lavée vs s'est lavé les mains | 3 | 22 |
| `basics_fr_subjonctif_conjonctions` | B2 | Subjonctif zorunlu kılan kilit bağlaçlar: bien que, pour que, avant que | 3 | 23 |
| `basics_fr_pronoms_relatifs_composes` | B2 | Bileşik ilgi zamirleri: lequel, auquel, duquel | 3 | 21 |
| `basics_fr_savoir_connaitre` | A2 | Savoir mı, connaître mi? (Bilmek ve tanımak ayrımı) | 3 | 0 |
| `basics_fr_amener_apporter` | A2 | Getirmek ve götürmek: amener, apporter, emmener, emporter | 3 | 0 |
| `basics_fr_temps_mots` | A2 | Zaman kelimeleri: temps / heure / fois ve an / année, jour / journée | 3 | 0 |
| `basics_fr_indefinis` | B1 | Belgisiz sıfat ve zamirler: chaque, chacun, quelque, plusieurs, certain(e)s | 3 | 0 |
| `basics_fr_questions_inversion` | B1 | Resmî devrik soru ve kaynaştırma -t- harfi (Inversion) | 3 | 0 |
| `basics_fr_discours_temps` | B1 | Dolaylı anlatımda zaman ve yer ifadelerinin dönüşümü | 3 | 17 |
| `basics_fr_verbes_pronominaux_sens` | B2 | Dönüşlü olunca anlamı tamamen değişen fiiller (se douter, s’attendre...) | 3 | 24 |
| `basics_fr_accord_adjectifs_particuliers` | B2 | Renk sıfatları ve bileşik sıfatlarda uyum istisnaları | 3 | 0 |
| `basics_fr_infinitif_passe` | B2 | Geçmiş mastar (Infinitif passé): après avoir fait, après être parti | 3 | 0 |
| `basics_fr_connecteurs_argumentation` | C1 | DELF B2 / DALF C1 tartışma ve kompozisyon bağlaçları | 3 | 11 |

## İspanyolca (es) — 67 ders

| topic | seviye | başlık | havuz | soru bankası |
|---|---|---|---|---|
| `basics_es_articulos` | A1 | Artikeller ve cinsiyet (el / la / un / una) | 3 | 0 |
| `basics_es_presente` | A1 | Şimdiki zaman (presente) | 3 | 0 |
| `basics_es_gustar` | A1 | Gustar ve benzeri fiiller | 3 | 0 |
| `basics_es_negacion` | A1 | Olumsuzluk ve soru cümleleri | 3 | 0 |
| `basics_es_adjetivos` | A2 | Sıfatlar: uyum ve yer | 3 | 0 |
| `basics_es_preterito` | A2 | Geçmiş zaman: he comido mu, comí mi? | 3 | 0 |
| `ser_estar` | A2 | Ser ve estar | 3 | 18 |
| `preterito_imperfecto` | A2 | Pretérito ve imperfecto | 3 | 15 |
| `comparativos_es` | A2 | Karşılaştırma ve üstünlük | 3 | 15 |
| `imperativo_es` | A2 | Emir kipi ve zamirler | 3 | 15 |
| `subjuntivo` | B1 | Subjuntivo | 4 | 20 |
| `por_para` | B1 | Por ve para | 4 | 19 |
| `condicionales` | B1 | Şart cümleleri (si) | 3 | 20 |
| `perifrasis` | B1 | Perífrasis verbales | 3 | 18 |
| `pronombres_atonos` | B1 | Zamirler: lo / la / le / se lo | 3 | 15 |
| `relativos_es` | B1 | İlgi zamirleri (que / quien / cuyo / donde) | 3 | 15 |
| `conn_es` | B1 | Bağlaçlar (fikrin yönü) | 3 | 11 |
| `prep_es` | B1 | Fiil ve edat (de / en / a / con) | 3 | 24 |
| `colloc_es` | B1 | Eşdizimler (hangi fiil?) | 3 | 19 |
| `se_pasivo` | B2 | Se pasivo ve impersonal | 3 | 18 |
| `estilo_indirecto` | B2 | Dolaylı anlatım (estilo indirecto) | 3 | 15 |
| `basics_es_pronombres` | A1 | Kişi zamirleri (yo, mí, conmigo) | 3 | 0 |
| `basics_es_posesivos` | A1 | İyelik ve işaret sözcükleri (mi, este, ese, aquel) | 3 | 0 |
| `basics_es_numeros_hora` | A1 | Sayılar, saat ve tarih | 3 | 0 |
| `basics_es_preguntas` | A1 | Soru sözcükleri (qué, cuál, quién, dónde…) | 3 | 0 |
| `basics_es_hay_estar` | A1 | Hay mı, está mı? | 3 | 0 |
| `basics_es_reflexivos` | A2 | Dönüşlü fiiller (levantarse) | 3 | 0 |
| `basics_es_perfecto_indefinido` | A2 | He hecho mu, hice mi? Zaman işaretleri | 3 | 0 |
| `basics_es_futuro` | A2 | Gelecek: ir a, futuro simple ve tahmin | 3 | 0 |
| `basics_es_hace_desde` | A2 | Süre: hace, desde, desde hace, llevar | 3 | 0 |
| `basics_es_pluscuamperfecto` | B1 | Miş'li geçmiş: había hecho (pluscuamperfecto) | 3 | 0 |
| `basics_es_gerundio` | B1 | Gerundio ve İngilizce -ing tuzakları | 3 | 0 |
| `basics_es_orden_pronombres` | B1 | Zamir sırası, kazara se ve leísmo | 3 | 0 |
| `basics_es_adverbios_mente` | B1 | -mente ile zarflar | 3 | 0 |
| `basics_es_imperfecto_subjuntivo` | B2 | İmperfecto de subjuntivo (-ra / -se) | 3 | 0 |
| `basics_es_finales_concesivas` | B2 | Amaç ve taviz: para que, aunque | 3 | 0 |
| `basics_es_subjuntivo_compuesto` | C1 | Bileşik subjuntivo: haya hecho, hubiera hecho | 3 | 0 |
| `basics_es_marcadores` | C1 | Yazıda söylem belirleyicileri (no obstante, por consiguiente) | 3 | 0 |
| `basics_es_subjuntivo_relativo` | B2 | İlgi cümlesinde kip: busco a alguien que sepa | 3 | 0 |
| `basics_es_verbos_cambio` | B2 | Değişim fiilleri: ponerse, volverse, hacerse, quedarse | 3 | 0 |
| `basics_es_temporales` | B2 | Zaman cümleleri: cuando llegues, en cuanto, hasta que | 3 | 0 |
| `basics_es_lo_neutro` | B2 | lo + sıfat ve lo que: lo bueno es que… | 3 | 0 |
| `basics_es_pasiva_ser_estar` | B2 | Edilgen: ser + ortaç ve estar + ortaç | 3 | 0 |
| `basics_es_probabilidad` | C1 | Tahmin: serán las ocho, estaría cansado | 3 | 0 |
| `basics_es_registro_formal` | C1 | Resmî yazışma: usted ve nezaket kalıpları | 3 | 0 |
| `basics_es_condicion_alternativa` | C1 | Şartın diğer yolları: en caso de que, a no ser que, como, de + mastar | 3 | 0 |
| `basics_es_oraciones_hendidas` | C1 | Vurgulu cümleler: fue Ana quien…, lo que necesito es… | 3 | 0 |
| `basics_es_a_personal` | A1 | Kişisel 'A' edatı: Busco a mi hermano vs Busco mi libro | 3 | 24 |
| `basics_es_gustar_familia` | A2 | Gustar ailesi fiilleri: encantar, doler, importar, parecer | 3 | 15 |
| `basics_es_pronombres_dobles_se_lo` | A2 | Çift zamirler ve 'se lo' kuralı: le lo değil se lo | 3 | 15 |
| `basics_es_subjuntivo_deseo_sentimiento` | B1 | İstek, duygu ve şüphede subjuntivo: quiero que, me alegra que | 3 | 20 |
| `basics_es_para_que_subjuntivo` | B1 | Amaç cümlelerinde para vs para que: mastar mı subjuntivo mu? | 3 | 20 |
| `basics_es_perifrasis_inicio_fin` | B1 | Eylemin aşamaları: ponerse a, dejar de, acabar de, seguir | 3 | 18 |
| `basics_es_aunque_indicativo_subjuntivo` | B2 | Aunque ile indicativo vs subjuntivo nüansı: Biliyorum vs Bilmiyorum | 3 | 20 |
| `basics_es_si_condicionales_subjuntivo` | B2 | Si ile şart cümleleri ve imparfe subjuntivo formülü | 3 | 20 |
| `basics_es_que_quien_el_que` | B2 | İlgi zamirleri incelikleri: que, quien, el que, lo que, cuyo | 3 | 15 |
| `basics_es_futuro_probabilidad` | C1 | Gelecek ve şart kipiyle olasılık tahmini (futuro de probabilidad) | 3 | 0 |
| `basics_es_saber_conocer` | A2 | Saber mi, conocer mi? (Bilgi, beceri ve tanışıklık ayrımı) | 3 | 0 |
| `basics_es_pedir_preguntar` | A2 | Pedir mi, preguntar mı? (İstemek ve sormak ayrımı) | 3 | 0 |
| `basics_es_llevar_traer_ir_venir` | A2 | Hareket ve taşıma yönü: ir / venir ve llevar / traer | 3 | 0 |
| `basics_es_indefinidos_algun_ningun` | A2 | Belgisiz sözcükler ve kısalma (apócope): algún, ningún, cualquier | 3 | 0 |
| `basics_es_preposiciones_tiempo_lugar` | B1 | Zaman ve yer edatları: en, a, de, desde, hasta, hacia, entre | 3 | 24 |
| `basics_es_adjetivos_cambio_sentido` | B1 | İsmin önünde ve arkasında anlamı değişen sıfatlar (gran vs grande) | 3 | 0 |
| `basics_es_se_accidental` | B2 | Kazara ve istemsiz eylem yapısı: Se me cayó, Se me olvidó (se accidental) | 3 | 18 |
| `basics_es_como_si_ojala` | B2 | Ojalá ve como si yapıları: gerçek ve gerçek dışı dilekler | 3 | 20 |
| `basics_es_participio_gerundio_compuesto` | C1 | Bileşik mastar/ulaç ve mutlak yapılar (al haber dicho, dicho esto) | 3 | 0 |
| `basics_es_conectores_dele` | C1 | DELE B2/C1 makale ve tartışma bağlaçları (asimismo, de ahí que...) | 3 | 11 |

## İngilizce (en) — 72 ders

| topic | seviye | başlık | havuz | soru bankası |
|---|---|---|---|---|
| `basics_en_to_be` | A1 | To be (am / is / are) | 3 | 0 |
| `basics_en_present_simple` | A1 | Geniş zaman ve şimdiki zaman | 3 | 0 |
| `basics_en_past_simple` | A1 | Geçmiş zaman (past simple) | 3 | 0 |
| `basics_en_plurals_quantifiers` | A2 | Çoğullar ve miktar sözcükleri | 3 | 0 |
| `basics_en_future` | A2 | Gelecek zaman (will / going to) | 3 | 0 |
| `basics_en_comparatives` | A2 | Karşılaştırma (-er / more, the -est / most) | 3 | 0 |
| `articles_en` | A2 | Artikeller (a / an / the) | 3 | 15 |
| `present_perfect` | A2 | Present perfect ve past simple | 3 | 15 |
| `gerund_infinitive` | B1 | Gerund ve infinitive | 3 | 18 |
| `conn_en` | B1 | Bağlaçlar (fikrin yönü) | 3 | 12 |
| `prep_en` | B1 | Fiil, sıfat ve edat | 3 | 24 |
| `colloc_en` | B1 | Eşdizimler (hangi fiil?) | 3 | 19 |
| `reported_speech` | B1 | Dolaylı anlatım (reported speech) | 3 | 15 |
| `modals_en` | B1 | Modal fiiller (must / can’t / should) | 3 | 15 |
| `passive_en` | B1 | Edilgen yapı (passive) | 3 | 15 |
| `relatives_en` | B1 | İlgi cümleleri (who / which / whose / where) | 3 | 15 |
| `mixed_conditionals` | B2 | Karma şart cümleleri | 3 | 19 |
| `participle_clauses` | B2 | Participle clauses | 3 | 19 |
| `inversion` | C1 | Devrik yapı (inversion) | 4 | 20 |
| `cleft` | C1 | Vurgulu cümle (cleft) | 4 | 20 |
| `subjunctive` | C1 | Subjunctive | 4 | 19 |
| `basics_en_pronouns` | A1 | Zamirler ve iyelik (I / me / my / mine) | 3 | 0 |
| `basics_en_there_is` | A1 | There is / there are (var, yok) | 3 | 0 |
| `basics_en_demonstratives` | A1 | This / that / these / those | 3 | 0 |
| `basics_en_questions` | A1 | Soru sözcükleri ve soru düzeni | 3 | 0 |
| `basics_en_time_prepositions` | A1 | Zaman edatları (in / on / at) | 3 | 0 |
| `basics_en_past_continuous` | A2 | Past continuous ve past simple (when / while) | 3 | 0 |
| `basics_en_ability` | A2 | Yetenek: can / could / be able to | 3 | 0 |
| `basics_en_obligation` | A2 | Zorunluluk: have to ve must | 3 | 0 |
| `basics_en_place_prepositions` | A2 | Yer ve hareket edatları (in / on / at, into, through) | 3 | 0 |
| `basics_en_conditionals` | B1 | Birinci ve ikinci koşul cümleleri (if / unless) | 3 | 0 |
| `basics_en_used_to` | B1 | Used to, would, be used to, get used to | 3 | 0 |
| `basics_en_past_perfect` | B1 | Past perfect (had done) | 3 | 0 |
| `basics_en_question_tags` | B1 | Soru ekleri (question tags) | 3 | 0 |
| `basics_en_third_conditional` | B2 | Üçüncü koşul ve wish / if only | 3 | 0 |
| `basics_en_future_perfect` | B2 | Future continuous ve future perfect | 3 | 0 |
| `basics_en_causative` | B2 | Ettirgen yapı: have / get something done | 3 | 0 |
| `basics_en_hedging` | C1 | Yazıda bağlama ve temkinli dil (whereas, nonetheless, albeit) | 3 | 0 |
| `basics_en_present_continuous` | A1 | Şimdiki zaman (present continuous) | 3 | 0 |
| `basics_en_present_perfect_continuous` | B1 | Present perfect continuous (have been doing) | 3 | 15 |
| `basics_en_future_continuous` | B1 | Future continuous (will be doing) | 3 | 0 |
| `basics_en_past_perfect_continuous` | B2 | Past perfect continuous (had been doing) | 3 | 0 |
| `basics_en_preferences` | B2 | Tercih ve uyarı: would rather / prefer / had better | 3 | 0 |
| `basics_en_emphasis` | B2 | Vurgu: do / does / did, so / such | 3 | 0 |
| `basics_en_ellipsis` | B2 | Kısa cevaplar: so do I, neither, I think so | 3 | 0 |
| `basics_en_phrasal_verbs` | B2 | Phrasal verb'ler: ayrılabilen ve ayrılmayan | 3 | 0 |
| `basics_en_future_in_past` | B2 | Geçmişteki gelecek (was going to, would, was about to) | 3 | 0 |
| `basics_en_future_perfect_continuous` | C1 | Future perfect continuous (will have been doing) | 3 | 0 |
| `basics_en_unreal_past` | C1 | Gerçek dışı geçmiş: it's time, as if, suppose | 3 | 0 |
| `basics_en_noun_phrases` | C1 | Yoğun yazı dili: isimleştirme ve kısaltılmış ilgi cümleleri | 3 | 0 |
| `basics_en_register` | C1 | Resmî ve gündelik dil (register) | 3 | 0 |
| `basics_en_discourse_markers` | C1 | Konuşmada söylem belirleyicileri (actually, anyway, mind you) | 3 | 0 |
| `basics_en_stative_dynamic` | A2 | Durum ve eylem fiilleri (stative vs dynamic) | 3 | 0 |
| `basics_en_articles_institutions` | B1 | Kurumlarda artikel: school, hospital, prison, bed | 3 | 15 |
| `basics_en_causatives_advanced` | B1 | Ettirgen çatı incelikleri: have, get, make, let | 3 | 15 |
| `basics_en_cleft_variations` | B2 | Vurgu cümleleri: it-clefts ve wh-clefts | 3 | 20 |
| `basics_en_double_comparatives` | B2 | Paralel karşılaştırma: the more ... the better | 3 | 0 |
| `basics_en_prepositional_verbs` | B2 | Üç parçalı phrasal verb'ler ve ikili edatlar | 3 | 24 |
| `basics_en_inversion_conditionals` | C1 | Şart cümlelerinde devriklik: had I known, were I, should you | 3 | 20 |
| `basics_en_subjunctive_mandative` | C1 | Emir ve tavsiye dilek kipi (mandative subjunctive) | 3 | 19 |
| `basics_en_participle_advanced` | C1 | İleri ortaç cümlecikleri ve bağımsız yapılar (nominative absolute) | 3 | 19 |
| `basics_en_punctuation_flow` | C1 | Akademik bağlaçlar ve akış: however, therefore, on the contrary | 3 | 12 |
| `basics_en_make_do_have_take` | A2 | Temel fiil kalıpları: make, do, have ve take ayrımı | 3 | 19 |
| `basics_en_say_tell_speak_talk` | A2 | Konuşma ve anlatma fiilleri: say, tell, speak, talk | 3 | 15 |
| `basics_en_some_any_no_every` | A2 | Belgisiz zamirler ve ikili uyum: both, either, neither, none | 3 | 0 |
| `basics_en_so_such_too_enough` | B1 | Derece ve sonuç yapıları: so ... that, such ... that, too ... to, enough to | 3 | 0 |
| `basics_en_indirect_questions` | B1 | Dolaylı sorular ve kibar rica kalıpları (Indirect / Embedded Questions) | 3 | 15 |
| `basics_en_adjective_order_ed_ing` | B1 | Sıfat dizilimi (OSASCOMP) ve -ed / -ing sıfatları (bored vs boring) | 3 | 0 |
| `basics_en_reporting_verbs` | B2 | İleri dolaylı anlatım fiilleri (suggest, insist, accuse, deny, warn...) | 3 | 15 |
| `basics_en_modals_past_deduction` | B2 | Geçmişe yönelik çıkarım ve pişmanlık modalları (modal + have + V3) | 3 | 15 |
| `basics_en_correlative_conjunctions` | C1 | Çiftli bağlaçlar ve zaman devrikliği (No sooner ... than, Hardly ... when) | 3 | 20 |
| `basics_en_subjunctive_formulaic_clauses` | C1 | İleri düzey şart ve taviz kalıpları (Be that as it may, Try as he might...) | 3 | 19 |
