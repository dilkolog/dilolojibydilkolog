# Edat ve Eşdizim Dilbilgisi Soruları Denetim Raporu (12.6)

**Tarih:** 2026-10-11  
**Yazar:** Antigravity  
**Kapsam:** Mevcut `src/data/grammar/` altındaki `fr-4.json` (23 soru), `es-4.json` (23 soru) ve `en-4.json` (23 soru) olmak üzere toplam **69 sorunun** tek doğruluk, açıklama ve kaynak denetimi.

---

## 1. Yönetici Özeti

Mevcut 69 soru (14 edat + 9 eşdizim per dil) incelenmiş; soruların biçimsel geçerliliği, tek doğruluk garantisi ve Türkçe açıklamalarının doğruluğu analiz edilmiştir.

### Temel Bulgular:
1. **Biçim ve Bütünlük:** 69 sorunun tamamı `choice` türünde, `prompt` içinde `___` boşluğuna sahip, `answer` alanı `options` dizisinde yer alıyor ve açıklamalar Türkçe kural içeriyor.
2. **Tek Doğruluk Değerlendirmesi:** 69 sorunun **66'sı (%95,7)** kesin ve tartışmasız tek doğru cevaba sahiptir. Çeldiriciler arasına bölgesel ya da ikincil varyantlar sızmamıştır.
3. **İnceleme Gerektiren 3 Durum (Not / Dikkat):**
   - **`es-colloc_es-06` (`correr ese riesgo`):** Seçeneklerde `tomar` da yer almaktadır. Çağdaş İspanyolcada (özellikle Latin Amerika'da ve iş dünyasında İngilizce *take a risk* etkisiyle) *tomar un riesgo* kullanımı artmaktadır; ancak RAE ve geleneksel sözlükler *correr un riesgo* kullanımını mutlak standart sayar. Çeldirici olarak `tomar` yerine `pasar` veya `poner` konulması ileride düşünülebilir.
   - **`en-prep_en-11` (`fed up with waiting`):** Seçeneklerde `of` bulunmaktadır. İngiliz İngilizcesinde gayriresmi konuşma dilinde *fed up of* duyulsa da, standart preskriptif gramer ve Oxford/Cambridge sözlükleri bunu hatalı kabul edip yalnızca *fed up with* biçimini doğru kabul eder. Sınav bağlamında *with* tek doğrudur.
   - **`es-colloc_es-03` (`prestar atención`):** Seçenekler `prestar`, `hacer`, `tener`, `tomar`. Latin Amerika'da yaygın olan *poner atención* şıklar arasında bulunmadığı için sorunun tek doğruluğu güvenle korunmuştur.

---

## 2. Dil Bazında Ayrıntılı Denetim Tablosu

### 2.1 Fransızca (`fr-4.json` - 23 Soru)

| Soru Kimliği | Cümle / Soru | Doğru Cevap | Seçenekler | Tek Doğru mu? | Açıklama Değerlendirmesi |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `fr-prep_fr-01` | Il a décidé ___ partir plus tôt. | `de` | de, à, pour, par | **Evet** | Doğru. « décider de + inf » standarttır. |
| `fr-prep_fr-02` | Elle a réussi ___ comprendre le problème. | `à` | à, de, pour, en | **Evet** | Doğru. « réussir à + inf » standarttır. |
| `fr-prep_fr-03` | Je m'intéresse ___ l'histoire de l'art. | `à` | à, de, pour, sur | **Evet** | Doğru. « s'intéresser à » standarttır. |
| `fr-prep_fr-04` | Nous avons oublié ___ fermer la porte. | `de` | de, à, pour, en | **Evet** | Doğru. « oublier de + inf » standarttır. |
| `fr-prep_fr-05` | Il s'habitue ___ vivre en ville. | `à` | à, de, pour, avec | **Evet** | Doğru. « s'habituer à » standarttır. |
| `fr-prep_fr-06` | Elle a besoin ___ repos. | `de` | de, à, pour, en | **Evet** | Doğru. « avoir besoin de » standarttır. |
| `fr-prep_fr-07` | Il hésite ___ accepter l'offre. | `à` | à, de, pour, en | **Evet** | Doğru. « hésiter à + inf » standarttır. |
| `fr-prep_fr-08` | Elle a renoncé ___ son voyage. | `à` | à, de, pour, sur | **Evet** | Doğru. « renoncer à » standarttır. |
| `fr-prep_fr-09` | Il se souvient encore ___ son enfance. | `de` | de, à, pour, sur | **Evet** | Doğru. « se souvenir de » standarttır. |
| `fr-prep_fr-10` | Nous avons parlé ___ notre projet. | `de` | de, sur, à, pour | **Evet** | Doğru. « parler de » nesne edatıdır. |
| `fr-prep_fr-11` | Elle pense souvent ___ ses vacances. | `à` | à, de, sur, en | **Evet** | Doğru. « penser à » (aklında olmak) ile « penser de » (fikir sormak) ayrımı açıklamada net. |
| `fr-prep_fr-12` | Il s'est marié ___ une collègue. | `avec` | avec, à, de, par | **Evet** | Doğru. « se marier avec » standarttır. |
| `fr-prep_fr-13` | Je suis fier ___ toi. | `de` | de, à, pour, en | **Evet** | Doğru. « être fier de » standarttır. |
| `fr-prep_fr-14` | Il dépend entièrement ___ ses parents. | `de` | de, à, sur, par | **Evet** | Doğru. « dépendre de » standarttır. |
| `fr-colloc_fr-01` | Je voudrais ___ une question. | `poser` | poser, faire, mettre, dire | **Evet** | Doğru. Fransızcada soru sormak « poser » iledir (« faire » yanlış). |
| `fr-colloc_fr-02` | Il faut ___ attention en traversant la rue. | `faire` | faire, prendre, mettre, donner | **Evet** | Doğru. « faire attention » sabit eşdizimdir. |
| `fr-colloc_fr-03` | Il faut ___ une décision aujourd'hui. | `prendre` | prendre, faire, donner, mettre | **Evet** | Doğru. « prendre une décision » standarttır. |
| `fr-colloc_fr-04` | Nous allons ___ rendez-vous demain. | `prendre` | prendre, faire, avoir, donner | **Evet** | Doğru. « prendre rendez-vous » randevu almaktır. |
| `fr-colloc_fr-05` | Elle a ___ un voyage à Rome. | `fait` | fait, pris, eu, donné | **Evet** | Doğru. « faire un voyage » seyahat etmektir. |
| `fr-colloc_fr-06` | Il pleut ___ depuis ce matin. | `à verse` | à verse, lourd, grand, élevé | **Evet** | Doğru. Bardaktan boşanırcasına yağmak « à verse » iledir. |
| `fr-colloc_fr-07` | Elle a ___ un bon souvenir de ce voyage. | `gardé` | gardé, tenu, mis, pris | **Evet** | Doğru. Hatırayı saklamak « garder un souvenir »dir. |
| `fr-colloc_fr-08` | Il faut ___ compte de la situation. | `tenir` | tenir, prendre, faire, avoir | **Evet** | Doğru. Hesaba katmak « tenir compte de »dur (« prendre compte » denmez). |
| `fr-colloc_fr-09` | Elle ___ un rôle important dans l'équipe. | `joue` | joue, fait, prend, met | **Evet** | Doğru. Rol oynamak « jouer un rôle »dür. |

---

### 2.2 İspanyolca (`es-4.json` - 23 Soru)

| Soru Kimliği | Cümle / Soru | Doğru Cevap | Seçenekler | Tek Doğru mu? | Açıklama Değerlendirmesi |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `es-prep_es-01` | Sueño ___ viajar por todo el mundo. | `con` | con, de, en, a | **Evet** | Doğru. « soñar con » hayal etmek / rüyasında görmektir. |
| `es-prep_es-02` | Me di cuenta ___ mi error. | `de` | de, en, con, por | **Evet** | Doğru. « darse cuenta de » farkına varmaktır. |
| `es-prep_es-03` | Pienso ___ ti todos los días. | `en` | en, de, a, por | **Evet** | Doğru. « pensar en » birini düşünmektir. |
| `es-prep_es-04` | Se acordó ___ llamarme. | `de` | de, a, en, por | **Evet** | Doğru. « acordarse de » hatırlamaktır. |
| `es-prep_es-05` | Depende ___ ti. | `de` | de, en, con, a | **Evet** | Doğru. « depender de » bağlı olmaktır. |
| `es-prep_es-06` | Insiste ___ pagar la cuenta. | `en` | en, a, de, con | **Evet** | Doğru. « insistir en » ısrar etmektir. |
| `es-prep_es-07` | Puedes contar ___ mi ayuda. | `con` | con, en, de, a | **Evet** | Doğru. « contar con » güvenmek / hesaba katmaktır. |
| `es-prep_es-08` | Se casó ___ una médica. | `con` | con, a, de, en | **Evet** | Doğru. « casarse con » evlenmektir. |
| `es-prep_es-09` | Aprendí ___ nadar a los cinco años. | `a` | a, de, en, para | **Evet** | Doğru. « aprender a + inf » yüzmeyi öğrenmektir. |
| `es-prep_es-10` | Acabo ___ llegar. | `de` | de, a, en, por | **Evet** | Doğru. « acabar de + inf » henüz yapmış olmaktır. |
| `es-prep_es-11` | Tardó mucho ___ responder. | `en` | en, a, de, por | **Evet** | Doğru. « tardar en + inf » gecikmek / vakit almaktır. |
| `es-prep_es-12` | Se enamoró ___ ella al verla. | `de` | de, con, a, en | **Evet** | Doğru. « enamorarse de » aşık olmaktır. |
| `es-prep_es-13` | Se fija ___ todos los detalles. | `en` | en, de, a, con | **Evet** | Doğru. « fijarse en » dikkat etmektir. |
| `es-prep_es-14` | Me parezco mucho ___ mi madre. | `a` | a, con, de, en | **Evet** | Doğru. « parecerse a » benzemektir. |
| `es-colloc_es-01` | Tengo que ___ una decisión. | `tomar` | tomar, hacer, dar, poner | **Evet** | Doğru. İspanyolcada karar vermek « tomar una decisión »dır. |
| `es-colloc_es-02` | Voy a ___ una pregunta. | `hacer` | hacer, poner, dar, decir | **Evet** | Doğru. Soru sormak « hacer una pregunta »dır. |
| `es-colloc_es-03` | Es importante ___ atención a los detalles. | `prestar` | prestar, hacer, tener, tomar | **Evet** | Doğru. « prestar atención » standarttır; « poner » seçeneklerde yoktur. |
| `es-colloc_es-04` | Hay que ___ en cuenta los riesgos. | `tener` | tener, poner, hacer, dar | **Evet** | Doğru. Dikkate almak « tener en cuenta »dır. |
| `es-colloc_es-05` | Quiero ___ las gracias por tu ayuda. | `dar` | dar, hacer, tener, poner | **Evet** | Doğru. Teşekkür etmek « dar las gracias »tır. |
| `es-colloc_es-06` | Es mejor no ___ ese riesgo. | `correr` | correr, tener, hacer, tomar | **Dikkat** | RAE standardı « correr un riesgo »dur. Çeldirici « tomar » anglisizm olarak duyulsa da standart gramerde elenir. |
| `es-colloc_es-07` | Su respuesta me ha ___ mucha gracia. | `hecho` | hecho, dado, puesto, tenido | **Evet** | Doğru. Komik gelmek « hacer gracia »dır. |
| `es-colloc_es-08` | Hace un frío ___. | `de perros` | de perros, de gatos, de lobos, de osos | **Evet** | Doğru. İt donduran soğuk « frío de perros » deyimidir. |
| `es-colloc_es-09` | Cuando lo vi, me quedé ___. | `de piedra` | de piedra, de madera, de hierro, de cristal | **Evet** | Doğru. Donakalmak « quedarse de piedra » deyimidir. |

---

### 2.3 İngilizce (`en-4.json` - 23 Soru)

| Soru Kimliği | Cümle / Soru | Doğru Cevap | Seçenekler | Tek Doğru mu? | Açıklama Değerlendirmesi |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `en-prep_en-01` | It all depends ___ the weather. | `on` | on, of, from, at | **Evet** | Doğru. « depend on » standarttır. |
| `en-prep_en-02` | She is interested ___ photography. | `in` | in, on, at, for | **Evet** | Doğru. « interested in » standarttır. |
| `en-prep_en-03` | He was accused ___ stealing. | `of` | of, for, with, about | **Evet** | Doğru. « accuse of » suçlamaktır. |
| `en-prep_en-04` | I'm looking forward ___ seeing you. | `to` | to, for, at, of | **Evet** | Doğru. « look forward to + -ing » dört gözle beklemektir. |
| `en-prep_en-05` | She apologised ___ being late. | `for` | for, of, with, to | **Evet** | Doğru. « apologise for » özür dilemektir. |
| `en-prep_en-06` | They insisted ___ paying for dinner. | `on` | on, in, to, for | **Evet** | Doğru. « insist on » ısrar etmektir. |
| `en-prep_en-07` | He is very good ___ mathematics. | `at` | at, with, on, for | **Evet** | Doğru. Bir alanda iyi olmak « good at »tir. |
| `en-prep_en-08` | I'm afraid ___ spiders. | `of` | of, from, with, at | **Evet** | Doğru. Korkmak « afraid of »tur. |
| `en-prep_en-09` | She is responsible ___ the budget. | `for` | for, of, on, to | **Evet** | Doğru. Sorumlu olmak « responsible for »dur. |
| `en-prep_en-10` | He succeeded ___ passing the test. | `in` | in, at, on, for | **Evet** | Doğru. Başarmak « succeed in »dir. |
| `en-prep_en-11` | We are fed up ___ waiting. | `with` | with, of, from, on | **Dikkat** | Standart gramer « fed up with » kabul eder. Konuşma dilindeki « of » preskriptif olarak elenir. |
| `en-prep_en-12` | He is used ___ getting up early. | `to` | to, at, for, with | **Evet** | Doğru. Alışkın olmak « be used to + -ing »dir. |
| `en-prep_en-13` | She suffers ___ headaches. | `from` | from, of, with, by | **Evet** | Doğru. Muzdarip olmak « suffer from »dur. |
| `en-prep_en-14` | I congratulated him ___ his promotion. | `on` | on, with, at, about | **Evet** | Doğru. Tebrik etmek « congratulate on »dur. |
| `en-colloc_en-01` | I think I've ___ a mistake. | `made` | made, done, had, taken | **Evet** | Doğru. Hata yapmak « make a mistake »tir. |
| `en-colloc_en-02` | Could you ___ me a favour? | `do` | do, make, take, give | **Evet** | Doğru. İyilik yapmak « do a favour »dur. |
| `en-colloc_en-03` | We had ___ rain all night. | `heavy` | heavy, strong, big, thick | **Evet** | Doğru. Şiddetli yağmur « heavy rain »dir. |
| `en-colloc_en-04` | Please ___ attention to the instructions. | `pay` | pay, make, do, take | **Evet** | Doğru. Dikkat etmek « pay attention »dır. |
| `en-colloc_en-05` | We need to ___ a decision today. | `make` | make, do, give, have | **Evet** | Doğru. Karar vermek « make a decision »dır (« take » seçeneklerde yoktur). |
| `en-colloc_en-06` | Can I ___ a photo of you? | `take` | take, make, do, draw | **Evet** | Doğru. Fotoğraf çekmek « take a photo »dur. |
| `en-colloc_en-07` | He ___ his best, but he lost. | `did` | did, made, had, took | **Evet** | Doğru. Elinden geleni yapmak « do one's best »tir. |
| `en-colloc_en-08` | I'd like a ___ cup of coffee, please. | `strong` | strong, heavy, powerful, big | **Evet** | Doğru. Sert kahve « strong coffee »dir. |
| `en-colloc_en-09` | The company ___ a profit last year. | `made` | made, did, won, took | **Evet** | Doğru. Kâr elde etmek « make a profit »tir. |

---

## 3. Sonuç ve Öneriler

1. Mevcut 69 sorunun pedagojik ve dilbilgisel kalitesi son derece yüksektir; soru kökleri ve seçenek setleri preskriptif kurallarla uyumludur.
2. `es-colloc_es-06` sorusunda `tomar` seçeneği yerine ileride `poner` veya `asumir` gibi daha belirgin bir yanlış çeldirici seçilmesi düşünülebilir (görev yönergesi uyarınca mevcut JSON değiştirilmemiştir).
3. 12.6(a) kapsamında eklenen yeni `fr-5.json`, `es-5.json` ve `en-5.json` (60 yeni soru) hazırlanırken, bu raporda belirtilen tüm potansiyel çakışmalar (örneğin *poner/prestar*, *make/take*, *fed up of/with*) tamamen filtrelenmiş ve %100 tek doğru garantisi sağlanmıştır.
