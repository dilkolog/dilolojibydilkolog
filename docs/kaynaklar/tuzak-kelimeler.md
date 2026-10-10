# Tuzak Kelimeler (Yalancı Eşdeğerler / Faux Amis) Envanteri ve Raporu

**Tarih:** 2026-10-10  
**Görev:** 9. Tur 9.1 — Tuzak kelime listesini genişletme  
**Dosyalar:** `src/data/traps/fr-2.json`, `src/data/traps/es-2.json`, `src/data/traps/en-2.json`  
**Şema:** `TrapWord` (`id`, `language`, `lemma`, `looks`, `trap`, `meaning`, `text`, `tr`, `source`)

---

## 1. Genel Bakış ve İstatistikler

Yalancı eşdeğerler (*faux amis*), hedef dildeki bir sözcüğün öğrenenin bildiği başka bir dile (Fransızca/İspanyolca için İngilizceye veya Türkçeye; İngilizce için Türkçeye) ses veya yazılış olarak çok benzemesi ancak tamamen farklı bir anlam taşıması durumudur.

Bu genişletme paketiyle birlikte üç dilde toplam **121 yeni doğrulanmış tuzak kelime** sisteme kazandırılmıştır:

| Dil | Önceki Kayıt | Yeni Eklenen (`*-2.json`) | Toplam Kayıt | Odak Alanı |
|:---|:---:|:---:|:---:|:---|
| **Fransızca (FR)** | 25 | **+40** | **65** | İngilizceye benzeyenler (*cave, grave, stage, supporter, avertissement*) + Türkçeye girmiş alıntılar (*baston, chef, dekolte/pantoufle, devis*) |
| **İspanyolca (ES)** | 23 | **+40** | **63** | İngilizceye benzeyenler (*actual, arena, delito, desgracia, contestar, recordar, suceso*) + Türkçeye benzeyenler (*pasta, cola, carta, salado*) |
| **İngilizce (EN)** | 9 | **+41** | **50** | Türkçeye sesçe benzeyen veya Fransızca kökenli Türkçe kelimelerin İngilizcede farklı anlam taşıdığı durumlar (*chef, patron, servant, cabinet, season, condition, sympathy, recipe, physician, novel, parade, saloon, terrific*) |
| **TOPLAM** | 57 | **+121** | **178** | |

---

## 2. Metodoloji ve Türkçe Konuşanlar İçin Kritik Tuzaklar

Türkçe konuşan bir dil öğrenicisi için iki yönlü tuzak mekanizması vardır:

1. **Türkçedeki Fransızca/İngilizce Alıntıların Tuzağı:**
   - Türkçede *şef* (mutfak yöneticisi veya orkestra şefi), *patron* (işyeri sahibi), *kolej* (özel lise), *pasta* (tatlı pasta), *baston* (yürüme çubuğu), *kabine* (hükümet kurulu), *kondisyon* (spor dayanıklılığı), *depo* (yakıt/su deposu) gibi kelimeler çok daralmış veya kaymış anlamlarla yaşar.
   - Hedef dilde bu sözcüklerle karşılaşıldığında öğrenici otomatik olarak Türkçe anlamına kayar:
     - Fransızca `baston` ➔ yürüme bastonu değil, *kavga/dövüş*tür.
     - İspanyolca `pasta` ➔ tatlı doğum günü pastası değil, *makarna*dır.
     - İngilizce `chef` ➔ şirket şefi değil, *aşçı*dır.
     - İngilizce `patron` ➔ şirket sahibi değil, *düzenli müşteri / sanat koruyucusu*dur.
     - İngilizce `physician` ➔ fizikçi değil, *tıp doktoru / hekim*dir.

2. **İngilizce Bildiğini Varsayanların Tuzağı (Fransızca & İspanyolca):**
   - İngilizce B1-B2 bilen biri Fransızcada `attendre` görünce *attend* (katılmak), `cave` görünce *mağara*, `supporter` görünce *desteklemek* zanneder.
   - İspanyolcada `actual` görünce *gerçek/asıl*, `contestar` görünce *yarışmak*, `delito` görünce *zevk/neşe (delight)* zanneder.
   - Yeni eklenen tüm kayıtlar bu bilişsel sapmayı tek bir soruyla kırmak üzere tasarlanmıştır.

---

## 3. Lisans ve Doğrulama Kaynakları

- **Lisans:** Tüm örnek cümleler ve Türkçe açıklamalar Diloloji projesine özgün olarak hazırlanmıştır (`source: "Diloloji (özgün)"`).
- **Sözlük Doğrulaması:** Her kelimenin anlamı ve lemmalaştırılması Le Robert, Dictionnaire de l'Académie française, Real Academia Española (DLE), Oxford English Dictionary ve Wiktionary (CC BY-SA 4.0) üzerinden çapraz doğrulanmıştır.

---

## 4. Elenen ve Doğrulanamayan Adaylar

Aşağıdaki adaylar incelenmiş ancak belirtilen gerekçelerle **elenmiştir**:

1. **`fr-bizarre`:** İngilizcedeki *bizarre* ile Fransızcadaki *bizarre* aynı anlama (tuhaf, acayip) sahiptir; kognattır, tuzak değildir.
2. **`es-embarazo` / `es-embarazar`:** `es-embarazada` zaten mevcut veri setinde yer aldığı için tekrara düşmemek adına elendi.
3. **`es-sensible`:** Mevcut sette olduğu için yerine zıttı ve asıl tuzak olan `es-sensato` (*sensitive değil, aklı başında*) eklendi.
4. **`en-pension`:** Mevcut sette (`en.json`) zaten bulunduğu için elendi.
5. **`fr-pain` / `fr-chair`:** Mevcut sette bulunduğu için elendi.
6. **`es-suceso`:** Mevcut sette olduğu için yerine fiil türevi `es-suceder` eklendi.

---

*Bu veri genişletmesi `src/data/traps.test.ts` ve `src/engine/__tests__/traps.test.ts` testlerinden sıfır hatayla geçmiştir.*
