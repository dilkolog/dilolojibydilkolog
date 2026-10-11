# Kayıt Farkı Listesi Genişletme Raporu

**Tarih:** 2026-10-11  
**Kapsam:** `src/data/register/{fr-2,es-2,en-2}.json` ile Kayıt Farkı (Register) oyununa yeni durum üçlülerinin eklenmesi.  
**Şema:** `RegisterItem: { id, language, tr, informal, standard, formal, note?, source }`

---

## 1. Genel Bakış ve İstatistikler

Kayıt Farkı oyunu, bir durum veya düşüncenin üç farklı bağlamda (günlük/argo `informal`, standart `standard`, resmî/nezaketli `formal`) nasıl ifade edildiğini öğretmeyi amaçlar.

Bu genişletme ile Fransızca, İspanyolca ve İngilizce dillerinin her birine **21 yeni üçlü** eklenmiştir. Mevcut 14'er kayıtla birlikte her dildeki toplam üçlü sayısı **35'e** (toplam 105 kayıt) yükselmiştir.

### Sayısal Özet
- **Eklenen Dosyalar:**
  - `src/data/register/fr-2.json`: 21 kayıt
  - `src/data/register/es-2.json`: 21 kayıt
  - `src/data/register/en-2.json`: 21 kayıt
- **Konu Dağılımı:**
  1. Selamlaşma / Tanışma
  2. Rica ve izin (bir nesneyi isteme)
  3. Yardım isteme
  4. Kabul / Anlaşma
  5. Ret / İtiraz
  6. Özür dileme
  7. Fikir ayrılığı / Karşı çıkma
  8. Telefon açma
  9. Telefonu kapatma / Ayrılma
  10. İş e-postası selamlama
  11. İş e-postası dosya eki belirtme
  12. Yemek siparişi verme
  13. Restoranda hesap isteme
  14. Yol / İstasyon sorma
  15. Buluşma zamanı belirleme
  16. Geç kalma / Acelesi olma bildirimi
  17. Derin teşekkür etme
  18. Anlama ve teyit
  19. Bekleme ricası
  20. Ayrılma ve vedalaşma
  21. Fiyat ve maliyet sorma

---

## 2. Doğrulama ve Kaynaklar

Tüm kayıtlar Wiktionary dil kayıt etiketleri (`informal`, `slang`, `colloquial`, `formal`), Académie française tavsiyeleri, RAE (Real Academia Española) sözlüğü ve çağdaş konuşma korpuslarıyla çapraz doğrulanmıştır.

### 2.1 Fransızca (fr-2.json)
- **Informal örnekler:** *« Salut ! »*, *« Donne-moi un coup de main »*, *« Ça marche ! »*, *« Pas question ! »*, *« N'importe quoi ! »*, *« Je suis à la bourre »*, *« C'est pigé ! »*, *« À toute ! »*, *« Ça coûte combien ce truc ? »*.
- **Formal örnekler:** *« Auriez-vous l'obligeance de me passer cela ? »*, *« Je souscris à cette proposition »*, *« Je me vois dans l'obligation de refuser »*, *« Veuillez trouver ci-joint le document sollicité »*, *« Pourrions-nous avoir la note, s'il vous plaît ? »*, *« Au plaisir de vous revoir prochainement »*.
- **Kaynak:** Le Robert, Larousse, Wiktionary (FR).

### 2.2 İspanyolca (es-2.json) ve Bölgesel Notlar (`note`)
İspanyolca için temel olarak hem İspanya hem de Latin Amerika'da ortak anlaşılan genel ifadeler tercih edilmiştir. Belirli bir coğrafyaya özgü olan veya farklı coğrafyalarda yanlış anlaşılabilecek ifadelere kullanıcıyı bilgilendiren Türkçe `note` eklenmiştir:
- **`es-refuse-no` ("Ni de coña"):**  
  *Not:* « “Ni de coña” İspanya argosudur; Latin Amerika'da “Ni de chiste” ya da “Para nada” denir. »
- **`es-phone-answer` ("¿Sí, dime?"):**  
  *Not:* « Telefonda “Dime” İspanya’da yaygındır; Meksika’da “¿Bueno?”, Kolombiya’da “¿Aló?”, Arjantin’de “¿Hola?” ile açılır. »
- **`es-food-order` ("Ponme el pollo"):**  
  *Not:* « “Ponme...” İspanya barlarında yaygın doğrudan sipariş tarzıdır; Latin Amerika'da kaba bulunabilir, “Me regala...” ya da “Me da...” denir. »
- **`es-wait-moment` ("Aguanta un toque"):**  
  *Not:* « “Un toque” Latin Amerika’da (Kolombiya/Peru/Arjantin) çok yaygın bir zamansal argodur; İspanya’da “un segundo” daha yaygındır. »
- **Kaynak:** Diccionario de la lengua española (RAE), Diccionario de americanismos (ASALE).

### 2.3 İngilizce (en-2.json)
- **Informal örnekler:** *« Hey! »*, *« Pass me that »*, *« Give me a hand »*, *« Deal! »*, *« No way »*, *« My bad! »*, *« No chance! »*, *« Gotta run, bye »*, *« Running super late »*, *« Gotcha! »*, *« Hold on a sec »*, *« Catch you later »*.
- **Formal örnekler:** *« Would you be so kind as to hand me that? »*, *« Could you please assist me? »*, *« I must respectfully decline »*, *« Please find attached the requested document »*, *« May we request the check at your earliest convenience? »*, *« Kindly bear with me for a moment »*, *« I look forward to our next acquaintance »*.
- **Kaynak:** Oxford Learner's Dictionaries, Merriam-Webster, Cambridge Dictionary.

---

## 3. Elenen / Doğrulanamayan Adaylar

Aşağıdaki adaylar, kayıt farkları arasındaki sınırın bulanık olması veya aşırı kaba/argo bulunması nedeniyle elenmiştir:
1. **FR:** *« Ta gueule » / « Tais-toi » / « Silence, s'il vous plaît »* — *Ta gueule* aşırı kaba ve saldırgan olduğu için pedagojik dil eğitimine uygun bulunmadı.
2. **ES:** *« ¡Vete al carajo! »* — Hakaret/küfür içerdiği için elendi.
3. **EN:** *« Piss off »* — Kaba/saldırgan küfür içerdiği için listeye alınmadı.
4. **ES:** *« ¿Qué hubo, parcero? »* — Sadece Medellín/Kolombiya argo altkültürüne özgü olduğu ve formal karşılığıyla simetrisi zayıf kaldığı için genel selamlaşma yerine `¡Buenas!` tercih edildi.
5. **FR:** *« C'est chanmé »* (verlan) — Verlan ifadelerin resmi Fransızca karşılıkları yerine daha oturmuş gündelik ifadeler (*« C'est super »*, *« C'est cool »*) tercih edildi.

---

## 4. Test ve Bütünlük

- `src/data/register.test.ts` ile tüm 105 kayıt otomatik olarak test edilmiştir.
- Tüm dillerde ID'lerin `fr-`, `es-`, `en-` ile başladığı, hiçbir ID'nin mükerrer olmadığı, tüm alanların eksiksiz doldurulduğu ve üç seviyedeki ifadelerin kesinlikle birbirinden farklı olduğu doğrulanmıştır.
