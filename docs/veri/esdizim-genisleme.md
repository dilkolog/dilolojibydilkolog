# Eşdizim Genişletme Raporu (12.5)

**Tarih:** 2026-10-11  
**Yazar:** Antigravity  
**Kapsam:** Fransızca (`fr-2.json`), İspanyolca (`es-2.json`), İngilizce (`en-2.json`) dillerinde 40'ar yeni eşdizim (collocation).

---

## 1. Genel Envanter ve İstatistikler

| Dil | Mevcut Kalıp | Yeni Eklenen | Toplam Kalıp | Dosyalar |
| :--- | :---: | :---: | :---: | :--- |
| **Fransızca (`fr`)** | 22 | 40 | 62 | `src/data/collocations/fr.json`, `fr-2.json` |
| **İspanyolca (`es`)** | 23 | 40 | 63 | `src/data/collocations/es.json`, `es-2.json` |
| **İngilizce (`en`)** | 23 | 40 | 63 | `src/data/collocations/en.json`, `en-2.json` |
| **Toplam** | 68 | 120 | 188 | |

Tüm kalıplar `src/engine/collocations.ts` şemasına (`Collocation`: `{ id, language, lemmas, pattern, example, tr, source }`) tam uygundur.

---

## 2. Metodoloji ve Kaynaklar

Her kalıp ve örnek cümle aşağıdaki ana dil sözlükleri ve otoriter dilbilgisi kılavuzları üzerinden doğrulanmıştır:
- **Fransızca:** *Le Robert Dictionnaire*, *Larousse Français*, *Bescherelle: L'art de conjuguer et grammaire*, *Trésor de la Langue Française informatisé (TLFi)*.
- **İspanyolca:** *Real Academia Española (RAE) - Diccionario de la lengua española (DLE)*, *Diccionario panhispánico de dudas (DPD)*, *FundéuRAE*.
- **İngilizce:** *Oxford Collocations Dictionary for Students of English*, *Cambridge Collocations in Use (B1–C1)*, *Collins English Dictionary*.

---

## 3. Eklenen Eşdizimler

### 3.1 Fransızca (`src/data/collocations/fr-2.json` - 40 Kalıp)

#### A. Fiil + Edat (22 Kalıp)
1. `s'occuper de` (*Seyahat rezervasyonlarıyla ben ilgileniyorum.*)
2. `avoir envie de` (*Canım vanilyalı bir dondurma istiyor.*)
3. `avoir peur de` (*Küçük kardeşim köpeklerden korkuyor.*)
4. `avoir l'intention de` (*Yakında taşınmaya niyetimiz var.*)
5. `être en train de + infinitif` (*Akşam yemeğini hazırlamaktayım.*)
6. `être d'accord avec` (*Seninle tamamen aynı fikirdeyim.*)
7. `continuer à + infinitif` (*Akşamları geç saatlere kadar çalışmaya devam ediyor.*)
8. `refuser de + infinitif` (*Bu adaletsiz sözleşmeyi imzalamayı reddediyor.*)
9. `accepter de + infinitif` (*Projede bize yardım etmeyi kabul etti.*)
10. `risquer de + infinitif` (*Son treni kaçırma riskin var.*)
11. `cesser de + infinitif` (*Yağmur bu sabah nihayet durdu.*)
12. `choisir de + infinitif` (*Ailesiyle birlikte kırsalda yaşamayı seçti.*)
13. `apprendre à + infinitif` (*Bu yıl araba kullanmayı öğreniyorum.*)
14. `commencer à + infinitif` (*Bebek kendi başına yürümeye başlıyor.*)
15. `aider qqn à + infinitif` (*Mutfağı toplamama yardım edebilir misin?*)
16. `inviter qqn à + infinitif` (*Cumartesi günü bizi evinde akşam yemeğine davet etti.*)
17. `encourager qqn à + infinitif` (*Babam beni düzenli spor yapmaya teşvik ediyor.*)
18. `féliciter qqn pour` (*Büyük başarın için seni tebrik ederim.*)
19. `remercier qqn pour` (*Değerli yardımın için teşekkür ederim.*)
20. `participer à` (*Yarın sabahki konferansa katılıyoruz.*)
21. `faire confiance à` (*Doktoruma tamamen güveniyorum.*)
22. `se rendre compte de` (*Hatasının biraz geç farkına vardı.*)

#### B. Sıfat + Edat (8 Kalıp)
23. `être capable de + infinitif` (*Bu sınavı başarmaya tamamen muktedir.*)
24. `être responsable de` (*Tüm teknik ekipten o sorumlu.*)
25. `être content de` (*Özenli çalışmandan çok memnunuz.*)
26. `être déçu de` (*Okul sonuçlarından ötürü çok hayal kırıklığına uğradı.*)
27. `être prêt à + infinitif` (*Herkes seyahate çıkmaya hazır.*)
28. `être plein de` (*Bu büyük park asırlık ağaçlarla dolu.*)
29. `être difficile de + infinitif` (*Bu şehirde iyi bir ev bulmak zor.*)
30. `être facile de + infinitif` (*Bu yeni yöntemle öğrenmek kolay.*)

#### C. Fiil + İsim (10 Kalıp)
31. `faire la connaissance de` (*Dün akşam kız kardeşiyle tanıştım.*)
32. `passer du temps` (*Hafta sonu ailemle vakit geçirmeyi çok severim.*)
33. `perdre du temps` (*Gereksiz ayrıntılarla vakit kaybetme.*)
34. `gagner du temps` (*Metroya binmek değerli bir vakit kazandırır.*)
35. `avoir raison` (*Bu konuda tamamen haklısın.*)
36. `avoir tort` (*Haksız olduğunu çabucak kabul etti.*)
37. `prendre contact avec` (*Yarın müdürle iletişime geçeceğim.*)
38. `rendre visite à` (*Pazar günleri büyükanne ve büyükbabamızı ziyaret ederiz.*)
39. `jeter un coup d'œil` (*Raporuma hızlıca bir göz atabilir misin?*)
40. `tirer profit de` (*Bu güzel fırsattan yararlanmak gerek.*)

---

### 3.2 İspanyolca (`src/data/collocations/es-2.json` - 40 Kalıp)

#### A. Fiil + Edat (22 Kalıp)
1. `tener ganas de + infinitivo` (*Canım ev yapımı pizza yemek istiyor.*)
2. `tener miedo de` (*Küçük kardeşim karanlıktan korkuyor.*)
3. `tener que + infinitivo` (*Yarın sabah erken kalkmam gerek.*)
4. `alegrarse de` (*Seni burada bu kadar mutlu gördüğüme çok sevindim.*)
5. `quejarse de` (*Müşteri kötü hizmetten acı bir şekilde şikayet etti.*)
6. `enamorarse de` (*İlk buluşmadan itibaren ona aşık oldu.*)
7. `confiar en` (*Onun mesleki görüşüne tamamen güvenebilirsin.*)
8. `fijarse en` (*Evden çıkarken tam saate dikkat etmedim.*)
9. `creer en` (*Kendi yeteneklerine sıkı sıkıya inanıyor.*)
10. `consistir en` (*Sınav üç yazılı bölümden oluşuyor.*)
11. `tardar en + infinitivo` (*Otobüsün gelmesi neredeyse bir saat sürdü.*)
12. `dudar en + infinitivo` (*Bir sorun çıkarsa beni aramaktan çekinme.*)
13. `acostumbrarse a` (*Yakında güneyin sıcak iklimine alışacaksın.*)
14. `atreverse a + infinitivo` (*Grubun önünde bütün gerçeği söylemeye cesaret edemedi.*)
15. `animar a + infinitivo` (*Öğretmenim beni edebiyat okumaya teşvik etti.*)
16. `felicitar por` (*Yeni iş pozisyonun için seni yürekten tebrik ederim.*)
17. `preocuparse por` (*Ek masraflar için endişelenme.*)
18. `interesarse por` (*Sanat tarihiyle yakından ilgileniyor.*)
19. `optar por` (*Pratik ve ekonomik bir çözümü tercih etmeye karar verdiler.*)
20. `oler a` (*Bütün mutfak taze yapılmış kahve gibi kokuyor.*)
21. `saber a` (*Bu el yapımı dondurma tropik meyve tadında.*)
22. `echar de menos` (*Eski sınıf arkadaşlarımı çok özlüyorum.*)

#### B. Sıfat + Edat (8 Kalıp)
23. `ser capaz de + infinitivo` (*Her zorlu engeli aşmaya muktedirsin.*)
24. `estar seguro de` (*Seçimimden tamamen eminim.*)
25. `estar orgulloso de` (*Ailem emeğimden ötürü çok gururlu.*)
26. `estar cansado de` (*Aynı şikayetleri dinlemekten artık yoruldum.*)
27. `estar harto de` (*Tutulmayan vaatlerden bıktı usandı.*)
28. `estar lleno de` (*Tiyatro tamamen seyircilerle doluydu.*)
29. `ser fácil de + infinitivo` (*Bu geleneksel tarifi hazırlamak çok kolay.*)
30. `ser difícil de + infinitivo` (*Örneksiz açıklaması oldukça zor bir kavram.*)

#### C. Fiil + İsim (10 Kalıp)
31. `pasar tiempo` (*Açık havada birlikte vakit geçirmeyi çok seviyoruz.*)
32. `perder el tiempo` (*İnternette amaçsızca gezinerek vakit kaybetme.*)
33. `ahorrar tiempo` (*İnternetten alışveriş yapmak çok vakit kazandırır.*)
34. `prestar atención` (*Önemli ayrıntılara dikkat etmelisin.*)
35. `dar un paseo` (*Öğle yemeğinden sonra her zaman yürüyüşe çıkarız.*)
36. `hacer una reserva` (*Birkaç gün önceden rezervasyon yaptırmakta fayda var.*)
37. `hacer cola` (*Kırk dakika sırada beklemek zorunda kaldık.*)
38. `guardar un secreto` (*O sadık bir arkadaştır ve sır tutmayı bilir.*)
39. `correr un riesgo` (*Sağlık sigortası olmadan seyahat etmek gereksiz bir risk almaktır.*)
40. `tener éxito` (*Yeni romanı kitapçılarda büyük bir başarı elde etti.*)

---

### 3.3 İngilizce (`src/data/collocations/en-2.json` - 40 Kalıp)

#### A. Fiil + Edat (22 Kalıp)
1. `focus on` (*En önemli önceliklerimize odaklanmamız gerekiyor.*)
2. `rely on` (*Destek için ekip arkadaşlarına her zaman güvenebilirsin.*)
3. `concentrate on` (*Gürültülü bir odada okumaya konsantre olmak zor.*)
4. `base on` (*Heyecan verici film gerçek bir tarihi olaya dayanıyor.*)
5. `complain about` (*Birkaç müşteri geciken teslimattan şikayet etti.*)
6. `worry about` (*Kontrolünün dışındaki şeyler için endişelenme.*)
7. `care about` (*Yaban hayatı korumayı içtenlikle önemsiyor.*)
8. `remind of` (*Bu melodi bana neşeli çocukluk günlerimi hatırlatıyor.*)
9. `approve of` (*Ailem yurtdışında okuma kararımı tamamen onayladı.*)
10. `deal with` (*Müşteri hizmetleri ekibimiz her gün zorlu konularla ilgileniyor.*)
11. `cope with` (*Ağır stresle başa çıkmak için etkili teknikler öğrendi.*)
12. `specialize in` (*Özel klinik modern spor hekimliği alanında uzmanlaşmıştır.*)
13. `participate in` (*Yüzlerce öğrenci bilim sergisine katıldı.*)
14. `invest in` (*Yenilenebilir enerji teknolojilerine yatırım yapmak akıllıcadır.*)
15. `belong to` (*Bu antika cep saati senin ailene mi ait?*)
16. `respond to` (*Uzman, acil talebimize derhal yanıt verdi.*)
17. `adapt to` (*Canlı organizmalar sert iklim değişikliklerine olağanüstü biçimde uyum sağlar.*)
18. `contribute to` (*Düzenli fiziksel aktivite kalp sağlığına büyük katkıda bulunur.*)
19. `blame for` (*Talihsiz kaza için hiç kimse sürücüyü suçlamadı.*)
20. `thank for` (*Cömert katkılarından dolayı herkese teşekkür etmek istiyorum.*)
21. `suffer from` (*İlkbaharda pek çok mahalleli mevsimsel alerjilerden muzdariptir.*)
22. `protect from` (*Sıcak yün eldivenler ellerinizi keskin soğuktan korur.*)

#### B. Sıfat + Edat (8 Kalıp)
23. `aware of` (*Yöneticiler mali durumun tamamen farkındadır.*)
24. `capable of` (*Bu zorlu görevi yönetmeye tamamen muktedirdir.*)
25. `fond of` (*Büyükbabam özellikle klasik oda müziğine çok düşkündür.*)
26. `tired of` (*Havalimanında uzun kuyruklarda beklemekten bıktık.*)
27. `keen on` (*Mobil yazılım geliştirmeye son derece heveslidir.*)
28. `famous for` (*Kıyı kasabası lezzetli deniz ürünleri yemekleriyle ünlüdür.*)
29. `responsible for` (*Akşamları ofis kapılarını kilitlemekten kim sorumlu?*)
30. `suitable for` (*Bu sessiz kütüphane odaklanmış çalışma seansları için çok uygundur.*)

#### C. Fiil + İsim (10 Kalıp)
31. `take a break` (*Sonraki seansa başlamadan önce kısa bir mola verelim.*)
32. `make an effort` (*Yeni gelenlere yardım etmek için herkes samimi bir çaba gösterdi.*)
33. `run a risk` (*Bu yoğun tipide araba sürerek büyük bir risk alıyorsunuz.*)
34. `take advantage of` (*Bu eşsiz fırsattan sonuna kadar yararlanmalıyız.*)
35. `catch a cold` (*Kalın bir atkı tak ki fena bir soğuk algınlığına yakalanmayasın.*)
36. `keep a promise` (*Verdiğin sözü her zaman tutmak erdemli bir davranıştır.*)
37. `lose patience` (*Öğretmen tekrarlanan bölünmelerin ardından neredeyse sabrını kaybediyordu.*)
38. `save time` (*Masanızı düzgünce düzenlemek bolca çalışma vakti kazandırır.*)
39. `waste time` (*Önemsiz konular üzerine tartışarak vakit kaybetmeyin.*)
40. `make progress` (*Öğrenci okuma becerilerinde gözle görülür bir ilerleme kaydetti.*)

---

## 4. Elenen Kalıplar ve Gerekçeleri

Eşdizim listesine dahil edilmeyip elenen adaylar ve elenme nedenleri aşağıda özetlenmiştir:

1. **Bölgesel/Diyalektik Kalıplar:**
   - *İspanyolca:* `hacer caso omiso` (daha çok resmi/bürokratik metinlerde geçer, günlük konuşmada `ignorar` tercih edilir).
   - *İspanyolca:* `poner atención` (Latin Amerika'da çok yaygın olmakla birlikte, İspanya'da `prestar atención` baskındır; çift doğru oluşabilecek durumlar dilbilgisi sorularında ve eşdizimlerde elenmiştir).
   - *İspanyolca:* `tomar un café` yerine `echar un café` gibi yöresel argo/kullanımlar elenmiştir.
   - *İngilizce:* `take a decision` (İngiliz İngilizcesinde yaygın olsa da Amerikan İngilizcesinde `make a decision` mutlak standarttır; kafa karışıklığını önlemek için sadece `make a decision` tutulmuştur).
   - *Fransızca:* `tomber en amour` (Québec Fransızcasına özgü; standart Fransızcada `tomber amoureux` tercih edildi).

2. **Aşırı İleri/Edebi Düzey Kalıplar (C2+):**
   - *Fransızca:* `avoir maille à partir avec` (tartışmalı/eski), `battre la breloque`.
   - *İspanyolca:* `hacer hincapié en` (B1-B2 için ağır ve resmi; yerine `fijarse en`, `prestar atención` tercih edildi).
   - *İngilizce:* `run counter to`, `cast aspersions on` (akademik ve C2 odaklı, temel öğrenici listeleri için soyut).

3. **Mevcut Verilerle Çakışma:**
   - Önceden `fr.json`, `es.json` veya `en.json` içerisinde tanımlı olan `décider de`, `soñar con`, `depend on`, `poser une question` vb. 22-23 temel kalıp tekrar eklenmemiş, ID ve içerik çakışmaları tamamen önlenmiştir.

---

## 5. Doğrulama ve Testler

- **Birim Testleri:** `npx vitest run src/data/collocations.test.ts` başarıyla geçti.
- **Tüm Veri Testleri:** `npx vitest run src/data` (50 dosya, 327 test) 0 hata ile yeşil geçti.
- **Tip Güvenliği:** `npm run typecheck` 0 hata ile doğrulandı.
- **Kod Denetimi:** `npx oxlint src api e2e` 0 uyarı ile tamamlandı.
