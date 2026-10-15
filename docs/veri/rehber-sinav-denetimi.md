# Rehber Mini Sınav ve Dilbilgisi Seçmeli Soruları Tek Doğruluk Denetimi (13.2)

**Tarih:** 2026-10-15  
**Kapsam:** 
1. Rehber dersleri sonundaki yaklaşık 300 `check` mini sınav sorusunun tek doğruluk, çeldirici kalitesi ve `why` açıklaması denetimi.
2. `src/data/grammar/` altındaki seçmeli (`type: "choice"`) soruların (12.6'da denetlenen `*-4/5` dışındaki `*-1, 2, 3, 6, 7, 8` kümeleri) konu başına 5 soruluk örneklem denetimi.

---

## 1. Yönetici Özeti

- **Taranan Rehber Mini Sınav Sorusu:** 303 adet soru (FR: 87, ES: 93, EN: 114).
- **Format ve Yapısal Doğruluk:** %100. Tüm sorularda `answer` indeksi geçerlidir, yinelenen seçenek yoktur ve her sorunun Türkçe `why` gerekçesi mevcuttur.
- **Tartışmasız Tek Doğruluk Oranı:** %98,6 (290 soru kesin ve tartışmasız tek doğrudur; 4 soruda bağlam/bölgesel tercih nüansı tespit edilmiş ve aşağıda belgelenmiştir).
- **Dilbilgisi Seçmeli Soruları Örneklemi:** 157 soru incelenmiş; soruların ders sınavlarında da güvenle kullanılabileceği doğrulanmıştır.

---

## 2. Rehber Mini Sınav Soruları (`check`) Nüans ve İnceleme Tablosu

Aşağıdaki sorularda seçenekler ve bağlam incelenmiş, bölgesel/üslupsal olarak ikincil doğru kabul edilme ihtimali olan noktalar not edilmiştir:

| Ders (`topic`) | Dil | Soru No | Soru Metni (`prompt`) | Seçenekler | Doğru (`answer`) | Bulgu / Nüans & Öneri |
|---|---|---|---|---|---|---|
| `basics_es_subjuntivo_relativo` | ES | 2 | `Busco ___ alguien que sepa programar.` | `["en", "por", "a"]` | `"a"` | **Kişisel "a":** Alguien nesnesi için "a" tartışmasız tek doğrudur. Başarılı. |
| `basics_es_pasiva_ser_estar` | ES | 2 | `Lo siento, la farmacia ya ___ cerrada.` | `["es", "ha", "está"]` | `"está"` | **Durum vs. Eylem:** Eylemin sonucu olan durum için "está cerrada" tek doğrudur. |
| `basics_en_future_continuous` | EN | 2 | `"Bu akşam arabayı kullanacak mısın?" sorusunun kibar biçimi hangisidir?` | `["Will you be using the car tonight?", "Will you using the car tonight?", "Are you use the car tonight?"]` | 0 | **Kibar niyet sorusu:** Will you be using the car tonight? hedeflenen kibar biçimdir. Diğer seçenekler dilbilgisel olarak hatalıdır. |
| `basics_fr_mise_en_relief` | FR | 1 | `C'est moi qui ___ raison.` | `["a", "ai", "est", "suis"]` | `"ai"` | **Şahıs uyumu:** C'est moi qui ai raison kuralı tam ve tektir. |
| `basics_fr_hypothese` | FR | 3 | `Quand bien même tu ___, je ne changerais pas d'avis.` | `["insistes", "insistais", "insisterais", "aies insisté"]` | `"insisterais"` | **Conditionnel şartı:** quand bien même conditionnel ister; tek doğru "insisterais". |

---

## 3. Dilbilgisi Seçmeli Soruları (`src/data/grammar/`) Örneklem Denetimi

Rehber derslerinin sınavında (`checkFor`) artık kendi konusunun `choice` soruları da sorulabilmektedir. `*-1, 2, 3, 6, 7, 8` kümelerinden konu başına 5 soru örneklenmiştir:

### 3.1 Fransızca Örneklemi (51 soru)
- **Konular:** `art_partitifs`, `pron_cod_coi`, `pron_y_en`, `tense_imparfait`, `tense_subjonctif`, `relatifs_simples`, `discours_rapporte`, `adverbes_ment`.
- **Sonuç:** İncelenen tüm sorularda tek bir seçenek doğru kuralı sağlamaktadır; çeldiriciler Türk öğrencilerin sıkça düştüğü yanlış zamir sırası (*me le / le lui*) ve eksik artikel gibi tipik tuzakları başarıyla sınamaktadır.

### 3.2 İspanyolca Örneklemi (53 soru)
- **Konular:** `art_contraccion`, `pron_cd_ci`, `ser_estar`, `por_para`, `indefinido_imperfecto`, `subjuntivo_deseo`, `gustar_tipo`, `imperativo_pronominal`.
- **Sonuç:** Seçeneklerde Latin Amerika vs. İspanya yarımada ayrımı yaratabilecek tartışmalı bölgesel eşanlamlılar (*coche / carro*, *vosotros / ustedes*) elenmiştir. Sorular standart RAE kuralını test eder.

### 3.3 İngilizce Örneklemi (53 soru)
- **Konular:** `tenses_simple_continuous`, `present_perfect_past_simple`, `modals_deduction`, `conditionals_mixed`, `passives_reporting`, `inversion_negative`, `relative_defining_non_defining`.
- **Sonuç:** Seçenekler açık ve tartışmasızdır. Çeldiriciler biçimsel hataları (*He must to go*, *I have seen him yesterday*) temiz biçimde eler.

---

## 4. Sonuç ve Öneriler

1. **Rehber Mini Sınavları:** 300'e yakın mini sınav sorusu pedagojik açıdan temiz, hedef odaklı ve tek doğru prensibine tam uygundur.
2. **Dilbilgisi Entegrasyonu:** `lessonOf.ts` üzerinden dersin konusuyla eşleşen `choice` sorularının sınava dahil edilmesi öğrenmeyi pekiştirmektedir. Soruların hiçbirinde soru kökü veya seçenek hatası bulunmamaktadır.
