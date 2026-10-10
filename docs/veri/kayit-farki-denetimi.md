# Kayıt Farkı (Register) Veri Seti Denetim Raporu

**Tarih:** 2026-10-10  
**İncelenen Dosyalar:** `src/data/register/{fr,es,en}.json` (her dilde 14'er adet informal / standard / formal üçlüsü, toplam 42 kayıt)  
**Amaç:** Her üçlünün kayıt etiketlerini (informal/slang, standard/neutral, formal/soutenu/culto), anlamsal örtüşmesini (semantik denklik) ve bölgesel varyasyonlarını (İspanya vs. Latin Amerika, Birleşik Krallık vs. ABD) Wiktionary, DRAE (RAE), CNRTL ve Oxford/Cambridge sözlük etiketleriyle denetlemek; sorunlu kayıtları ve önerilen düzeltmeleri belgelemek.

> **Önemli Not:** 10.4 görev kuralı gereğince `src/data/register/*.json` dosyalarında kod/veri değişikliği yapılmamış, bulgular ve öneriler bu raporda toplanmıştır.

---

## 1. Yönetici Özeti

- **Genel Başarı:** Fransızca ve İngilizce listeleri genel olarak son derece tutarlı, pedagojik açıdan öğretici ve kayıt seviyelerini (günlük/sokak, standart, resmî/edebî) çok iyi yansıtmaktadır.
- **Kritik İspanyolca Bulgusu (Bölgesel Odak ve Sahte Dost):** `es.json` dosyasındaki 14 kaydın en az 7'si (%50) doğrudan **İspanya Yarımada İspanyolcasına (Español Peninsular)** aittir. Özellikle `curro` (iş), `tío` (dostum/nasılsın), `pasta` (para), `guay` (harika), `pirarse` (kaçmak) ve `vale` (tamam) ifadeleri Latin Amerika'da ya kullanılmaz ya da farklı/olumsuz anlamlara gelir (`curro` Arjantin'de "dolandırıcılık/sahtekarlık" demektir).
- **Semantik Daralmalar:** İngilizce `scoff` ("yemek yemek" değil, "oburca tıkınmak") ve `gig` ("iş" değil, "kısa süreli serbest iş/konser") kayıtlarında nötr kavrama göre anlam kayması bulunmaktadır.

---

## 2. Fransızca (`fr.json`) Denetim Sonuçları

Fransızca veri seti, Fransız dilbilimindeki *registres de langue* (familier / courant / soutenu) ayrımına mükemmel uyum sağlamaktadır.

| ID | Anlam (TR) | Informal (Familier/Populaire) | Standard (Courant) | Formal (Soutenu/Littéraire) | Değerlendirme & Sözlük Doğrulaması |
|:---|:---|:---|:---|:---|:---|
| `fr-eat` | yemek yemek | `bouffer` | `manger` | `se restaurer` | **Kusursuz.** Wiktionary: *bouffer* (pop.), *se restaurer* (soutenu). |
| `fr-car` | araba | `la bagnole` | `la voiture` | `le véhicule` | **Çok iyi.** *Bagnole* argo/günlük, *véhicule* resmi/idari terimdir. |
| `fr-money` | para | `le fric` | `l'argent` | `les fonds` | **İyi.** *Fric* argot/familier. *Les fonds* mali/idari kayıt. |
| `fr-tired` | yorgun | `crevé` | `fatigué` | `exténué` | **Kusursuz.** CNRTL: *crevé* (fam.), *exténué* (littéraire). |
| `fr-great` | harika | `super` | `très bien` | `remarquable` | **İyi.** "C'est super/très bien/remarquable" kalıbında örtüşür. |
| `fr-job` | iş | `le boulot` | `le travail` | `l'emploi` | **Çok iyi.** *Boulot* (fam.), *l'emploi* kurumsal/idari kayıt. |
| `fr-leave` | gitmek/ayrılmak | `se tirer` | `partir` | `se retirer` | **Kusursuz.** *Se tirer* (pop./arg.), *se retirer* (soutenu). |
| `fr-howareyou` | nasılsın? | `Ça roule ?` | `Comment ça va ?` | `Comment allez-vous ?` | **Kusursuz.** Günlük hitaptan resmî sizli nezaket kipine. |
| `fr-goodbye` | hoşça kal | `À plus !` | `Au revoir` | `Je vous souhaite une bonne journée` | **Başarılı.** Günlük kısaltmadan resmî iyi dilek protokolüne. |
| `fr-misunderstood` | anlamadım | `J'ai rien capté` | `Je n'ai pas compris` | `Pourriez-vous reformuler ? Je n'ai pas saisi` | **Küçük pürüz:** Formal tarafta iki cümle var; simetri için yalnızca `Je n'ai pas saisi` daha sade olur. |
| `fr-alot` | çok (sayıda) | `plein de` | `beaucoup de` | `de nombreux` | **Kusursuz.** Gramatikal ve stilistik seviye farkı tam. |
| `fr-dontknow` | bilmiyorum | `J'en sais rien` | `Je ne sais pas` | `Je l'ignore` | **Kusursuz.** *Je l'ignore* zarif bir soutenu örneğidir. |
| `fr-okay` | tamam | `Ok` | `D'accord` | `Entendu` | **Kusursuz.** *Entendu* resmi/iş onaylamasıdır. |
| `fr-house` | ev | `la baraque` | `la maison` | `la demeure` | **Kusursuz.** CNRTL: *baraque* (pop.), *demeure* (littéraire/soutenu). |

---

## 3. İspanyolca (`es.json`) Denetim Sonuçları ve Bölgesel Analiz

İspanyolca listesi İspanya (Madrid) sokak ve günlük dili açısından son derece otantik olmakla birlikte, Latin Amerika'da anlaşılmama veya yanlış anlaşılma riski taşır:

| ID | Anlam (TR) | Informal | Standard | Formal | Bölgesel Durum & Riskler |
|:---|:---|:---|:---|:---|:---|
| `es-eat` | yemek yemek | `papear` | `comer` | `alimentarse` | `papear` İspanya'da yaygın argodur (DRAE: *coloq.*). Latin Amerika'da *tragar* veya *bajonear* denir. |
| `es-car` | araba | `el cacharro` | `el coche` | `el vehículo` | `el cacharro` aslında "külüstür/hurda araba" demektir. Ayrıca `coche` Latin Amerika'da bebek arabasıdır; standart Latin Amerika: `el auto` / `el carro`. |
| `es-money` | para | `la pasta` | `el dinero` | `los fondos` | **Bölgesel (İspanya).** Latin Amerika: *la plata* (Kolombiya/Arjantin), *la lana* (Meksika). |
| `es-tired` | yorgun | `hecho polvo` | `cansado` | `exhausto` | **Kusursuz.** Tüm dünyada anlaşılır, seviye farkı net. |
| `es-great` | harika | `guay` | `muy bien` | `excelente` | **Bölgesel (İspanya).** `guay` yalnızca İspanya'dadır. Meksika: *chido*, Kolombiya: *chévere*, Arjantin: *copado*. |
| `es-job` | iş | `el curro` | `el trabajo` | `el empleo` | ⚠️ **KRİTİK SAHTE DOST:** `curro` İspanya'da "iş" demektir; ancak Arjantin/Uruguay'da "dolandırıcılık / yasa dışı kazanç" demektir! Meksika: *la chamba*, Arjantin: *el laburo*. |
| `es-leave` | gitmek/ayrılmak | `pirarse` | `irse` | `retirarse` | **Bölgesel (İspanya).** `pirarse` İspanya argosudur. Latin Amerika: *abrirse*, *tomárselas*. |
| `es-howareyou` | nasılsın? | `¿Qué pasa, tío?` | `¿Cómo estás?` | `¿Cómo se encuentra usted?` | **Bölgesel (İspanya).** `tío` hitabı İspanya'nın alametifarikasıdır. Meksika: *¿Qué onda, güey?*, Arjantin: *¿Qué hacés, che?*. |
| `es-goodbye` | hoşça kal | `¡Chao!` | `Adiós` | `Que tenga un buen día` | **Kusursuz.** Evrensel ve dengeli. |
| `es-misunderstood` | anlamadım | `Me he perdido, tío` | `No he entendido` | `Disculpe, no he comprendido` | `tío` (İspanya) ve `he entendido` (İspanya geçmiş zaman tercihi). Latin Amerika: *Me perdí / No entendí*. |
| `es-alot` | çok (sayıda) | `un montón de` | `mucho` | `numerosos` | **Çok iyi.** Tüm dünyada kabul görür. |
| `es-dontknow` | bilmiyorum | `Ni idea` | `No lo sé` | `Lo desconozco` | **Kusursuz.** *Lo desconozco* harika bir resmî kayıt örneğidir. |
| `es-okay` | tamam | `Vale` | `De acuerdo` | `Conforme` | **Bölgesel (İspanya).** `Vale` İspanya'da her cümlede kullanılırken Latin Amerika'da *Listo*, *Dale* veya *Sale/Órale* tercih edilir. |
| `es-kid` | çocuk | `el crío` | `el niño` | `el menor` | `el crío` İspanya'da yaygındır; Latin Amerika: *el pibe*, *el chavo*, *el chamaco*. |

---

## 4. İngilizce (`en.json`) Denetim Sonuçları

İngilizce veri seti genelde çok başarılıdır; iki kayıtta anlam daralması ve bölgesel Birleşik Krallık argosu görülür:

| ID | Anlam (TR) | Informal | Standard | Formal | Değerlendirme & Sözlük Doğrulaması |
|:---|:---|:---|:---|:---|:---|
| `en-eat` | yemek yemek | `scoff` | `eat` | `dine` | ⚠️ **Anlam Daralması:** Oxford/Cambridge: *scoff* (UK informal) "to eat a lot of something quickly" (tıkınmak, oburca yemek). Nötr yemek için informal alternatif: `grab a bite` veya ABD `chow down`. |
| `en-car` | araba | `wheels` | `car` | `vehicle` | **Başarılı.** *Wheels* metonimik sokak argosudur. |
| `en-money` | para | `dough` | `money` | `funds` | **Başarılı.** *Dough* evrensel argodur (alternatif: *bucks*, *cash*). |
| `en-tired` | yorgun | `knackered` | `tired` | `fatigued` | **Bölgesel (UK/Commonwealth):** *Knackered* Britanya argosudur, Amerikalılar kullanmaz. Evrensel informal alternatif: `beat`, `exhausted`, `pooped`. |
| `en-great` | harika | `awesome` | `very good` | `excellent` | **Kusursuz.** |
| `en-job` | iş | `gig` | `job` | `position` | ⚠️ **Nüans Farkı:** *Gig* daha çok serbest/geçici iş veya müzisyen performansı demektir. Sabit tam zamanlı iş için informal olarak *day job* veya genel *gig* kabul edilebilir. |
| `en-leave` | gitmek/ayrılmak | `head out` | `leave` | `depart` | **Kusursuz.** Modern günlük konuşma ile resmî dil dengesi çok iyi. |
| `en-howareyou` | nasılsın? | `What's up?` | `How are you?` | `How do you do?` | **Kusursuz.** |
| `en-goodbye` | hoşça kal | `See ya!` | `Goodbye` | `I wish you a good day` | **İyi.** Resmî tarafta daha doğal olanı: *"Have a pleasant day"*. |
| `en-misunderstood` | anlamadım | `Huh? I'm lost` | `I didn't understand` | `I'm afraid I did not follow` | **Kusursuz.** Resmî İngiliz kibarlık kalıbını çok iyi yansıtır. |
| `en-alot` | çok (sayıda) | `loads of` | `a lot of` | `numerous` | **Kusursuz.** |
| `en-dontknow` | bilmiyorum | `No idea` | `I don't know` | `I am not aware of that` | **Kusursuz.** |
| `en-okay` | tamam | `Cool` | `Okay` | `Very well` | **Kusursuz.** *Very well* resmî kabullenişi çok iyi verir. |
| `en-kid` | çocuk | `kid` | `child` | `minor` | **Kusursuz.** *Minor* hukuki/resmî kaydı tam karşılar. |

---

## 5. Sorunlu Kayıtlar İçin Önerilen Düzeltmeler Tablosu

Aşağıdaki tablo, ilerleyen aşamada Claude Code veya veri güncellemesi sırasında doğrudan uygulanabilecek somut düzeltmeleri listeler:

| Dil | ID | Mevcut Değer | Önerilen Düzeltme | Düzeltme Gerekçesi |
|:---|:---|:---|:---|:---|
| **FR** | `fr-misunderstood` | `formal`: "Pourriez-vous reformuler ? Je n'ai pas saisi" | `formal`: **"Je n'ai pas saisi"** veya **"Je n'ai point saisi"** | Diğer iki seçenek tek cümleyken formal seçenekte çift cümle ve rica kalıbı simetriyi bozuyor. |
| **ES** | `es-car` | `informal`: "el cacharro" | `informal`: **"la nave"** veya **"el bólido"** (veya not düşülmeli) | *Cacharro* genel araba değil, "hurda/külüstür" demektir. |
| **ES** | `es-job` | `informal`: "el curro" | Not: **(İspanya)** etiketi eklenmeli veya **"el curro / el laburo"** | Arjantin'de *curro* "dolandırıcılık" anlamına geldiği için yanıltıcı olabilir. |
| **ES** | Tüm İspanyolca informal kayıtlar | `guay`, `la pasta`, `tío`, `vale` | Arayüzde veya şemada **`region: "es-ES"`** (İspanya) rozeti | Öğrenicinin bu ifadelerin Latin Amerika'da garipseneceğini bilmesi şarttır. |
| **EN** | `en-eat` | `informal`: "scoff" | `informal`: **"grab a bite"** veya **"chow down"** | *Scoff* nötr yemek yemek değil, "oburca tıkınmak" demektir. |
| **EN** | `en-tired` | `informal`: "knackered" | Not: **(UK)** etiketi veya **"beat" / "bushed"** | *Knackered* tamamen Britanya argosudur, evrensel Amerikan İngilizcesinde duyulmaz. |
| **EN** | `en-goodbye` | `formal`: "I wish you a good day" | `formal`: **"Have a pleasant day"** | İngilizce'de daha doğal ve yerleşik resmî vedalaşma kalıbı. |

---

## 6. Mimari ve Pedagojik Öneri

1. **Bölgesel Etiketleme Desteği:** `RegisterTriple` tipine isteğe bağlı bir `region?: 'es-ES' | 'es-LA' | 'en-GB' | 'en-US' | 'fr-FR'` alanı eklenmesi önerilir. Örneğin `guay` gösterilirken yanında ufak bir `[İspanya]` rozeti çıkması pedagojik doğruluğu artırır.
2. **Kayıt Egzersizi:** Mevcut `Games` altında "Kayıt Seçici" (ör. "Bir iş mülakatındasın, hangisini söylersin?" -> `l'emploi` vs `le boulot`) mini testi için bu veri seti mükemmel bir temel oluşturmaktadır.
