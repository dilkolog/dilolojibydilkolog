# Diloloji'nin dayandığı kuramlar

Bu belge, uygulamadaki özelliklerin hangi dil edinimi, dilbilim ve öğrenme bilimi kuramlarına dayandığını listeler.
Son güncelleme: 2026-10-20.

İki bölüm var; ayrım önemli:

- **A. Kodda atıf yapılanlar:** kaynak dosyadaki yorumda ya da ekrandaki metinde yazar ve yıl geçiyor (`src` içinde `grep` ile doğrulandı).
- **B. Özelliğin doğal olarak dayandığı kuramlar:** kodda yazar adı geçmiyor; özelliğin tasarımından çıkarılan eşleme. Yeni bir özellik eklerken ya da bir kuramı gerekçe gösterirken A'daki gibi dosyaya atıf yorumu yaz.

## A. Kodda atıf yapılanlar

### Hafıza ve aralıklı tekrar
| Kuram | Atıf | Nerede |
|---|---|---|
| Kademeli aralıklı geri çağırma | Pimsleur 1967; Landauer & Bjork 1978 | `engine/session.ts` (yeni kelime birkaç soru sonra, sonra daha geç geri gelir) |
| Dağıtık çalışma (spacing) | Cepeda et al. 2006 | `engine/session.ts` (çok yanlıştan sonra mola önerisi) |
| %85 kuralı | Wilson et al. 2019 | `engine/session.ts` (doğru oranı >%90 ise soru zorlaşır) |
| Üretim etkisi (generation effect) | Slamecka & Graf 1978 | `engine/session.ts` (seçmeli sorular arasına "kelimeyi yaz") |
| Üretken geri çağırma | Karpicke & Roediger 2008 | `engine/session.ts` (kararlı kelimelerde boşluk ilk harfle yazılır) |
| Test etkisi, ipucusuz hatırlama | Roediger & Karpicke 2006 | `engine/freeRecall.ts` (oturum sonu serbest hatırlama) |
| Ön test etkisi (pretesting) | Kornell, Hays & Bjork 2009 | `ui/session/Intro.tsx` (anlamı önce tahmin et) |
| Karışık çalışma (interleaving) | Kornell & Bjork 2008 | `ui/useSessionStarters.ts` (diller arası karışık oturum), `engine/dailyPlan.ts` |
| Uyku ve pekiştirme | Diekelmann & Born 2010 | `engine/dailyPlan.ts` (dünkü kelimeler önce), `ui/Habits.tsx` |
| Kendine gönderme etkisi | Rogers et al. 1977 | `engine/exercises.ts` (cümle nereden geldiği söylenir) |
| Günün saati etkisi | May & Hasher 1998 | `engine/hours.ts` (en iyi hatırlama saatini bulur) |
| Alışkanlık ipucu; uygulama niyeti | Lally et al. 2010; Gollwitzer & Sheeran 2006 | `engine/hours.ts`, `ui/Habits.tsx` (hatırlatma saati, "eğer–o zaman" planı) |
| FSRS (unutma eğrisi, kararlılık) | ts-fsrs | `engine/scheduler.ts`, `engine/memoryCurve.ts`, `engine/optimizer.ts` |

### Okuma, kelime bilgisi, girdi
| Kuram | Atıf | Nerede |
|---|---|---|
| Sözcük kapsamı eşikleri (%98 rahat, ~%95 öğrenmeye ideal) | Hu & Nation 2000; Schmitt et al. 2011 | `engine/reading.ts` (`easy` ≥0,98; `ideal` ≥0,95) |
| Sıklığın getirisi | Nation 2006 | `data/wordInput.ts`, `engine/reading.ts` (eksik sık kelimeler), `ui/FrequencyCoverage.tsx` |
| Bağlamda yeterli karşılaşma (~10) | Webb 2007; Uchihara et al. 2019 | `engine/reading.ts` (`ENCOUNTER_TARGET`) |
| Dar okuma (narrow reading) | Krashen 2004; Kang 2015 | `engine/reading.ts`, `ui/News.tsx` ("Sana göre haberler") |
| Okumadan önce soru | Carpenter & Toftness 2017 | `ui/Prequestions.tsx`, `ai/claude.ts` |
| Kelime dağarcığı boyutu testi | Meara 1992; Lemhöfer & Broersma 2012 (LexTALE) | `engine/vocabTest.ts` (evet/hayır biçimi, uydurma kelimeler) |
| Frekansa göre kaba seviye | Milton & Alexiou 2009 | `engine/wordLevel.ts` |
| Altyazı ve tekrar dinleme | Winke, Gass & Sydorenko 2010; Montero Perez et al. 2014 | `ui/Listening.tsx` |
| i+1 uygunluğu (kaç bilinmeyen sözcük) | Krashen'in i+1'i (yorumda adı geçer) | `engine/sentenceFit.ts` |

### Konuşma, dinleme, telaffuz, akıcılık
| Kuram | Atıf | Nerede |
|---|---|---|
| 4/3/2 tekniği (akıcılık) | Nation 1989; de Jong & Perfetti 2011 | `ui/Fluency432.tsx` |
| Yüksek değişkenlikli ses eğitimi | Logan, Lively & Pisoni 1991; Thomson 2018 | `engine/listening.ts` (ses ayırt etme, anında geri bildirim) |
| Ton ve vurgu eğrisini görmek | Hardison 2004; Chun 1998 | `engine/pitch.ts`, `ui/PitchCompare.tsx` |
| Dictogloss (dikte + yeniden kurma) | Wajnryb 1990; Kowal & Swain 1994 | `ui/Dictogloss.tsx` |

### Dilbilgisi ve geri bildirim
| Kuram | Atıf | Nerede |
|---|---|---|
| Biçim–anlam eşlemesi | Ellis 2006 | `engine/tenseGuide.ts` (neden bu zaman, işaret sözcükleri) |
| Metadilsel geri bildirim | Lyster & Ranta 1997 | `engine/tenseGuide.ts` (hatayı adlandırmak) |

## B. Özelliğin dayandığı kuramlar (kodda atıf yok; eşleme)

| Alan / kuram | Özellikler |
|---|---|
| **Çıktı hipotezi** (Swain) | Yazı günlüğü, Hikâye, Geri çeviri, Dikte, Monki rol yapma, konuşarak cevap |
| **Fark etme** (Schmidt, noticing) | Kayıt farkı, "metinde göster", yanlışta açıklama, Kör nokta röntgeni, Yazı hata defteri |
| **Etkileşim** (Long) | Monki sohbeti, canlı düello |
| **Hata çözümlemesi** (Corder) | Hata türü sınıflaması (`engine/writingErrors.ts`, `engine/mistakes.ts`), Kör nokta röntgeni |
| **Karşılaştırmalı çözümleme / ana dil aktarımı** | Tuzak kelimeler (`engine/traps.ts`), Rehber'de "Türkçede", Türkçe ortak köken kartı (`engine/turkishKin.ts`) |
| **Biçimbilim** | Fiil çekimleri (`engine/conjugation.ts`, `tenses.ts`), türetim (`engine/derive.ts`, Kök ve ekler, Ek avı), bileşik zaman çözümlemesi (`engine/textForms.ts`) |
| **Eşdizim ve kalıp yaklaşımı** (Firth, Sinclair, Lewis) | Birlikte kullanılanlar (`engine/collocations.ts`), Kalıp olarak ekle (`engine/phrase.ts`), Refleks kalıpları |
| **Görünüş (aspect)** | Görünüş oyunu (imparfait / passé composé; indefinido / imperfecto) |
| **Söylem ve bağdaşıklık** (Halliday & Hasan) | Metin akışı (`engine/flow.ts`: zıtlık, neden, taviz, koşul bağlaçları) |
| **Sosyodilbilim ve edimbilim** | Kayıt farkı (`engine/register.ts`: günlük/standart/resmî), rol yapma sahneleri (istek, izin, davet) |
| **Ses bilgisi** | Minimal çiftler, Gölgeleme (`ui/TextShadow.tsx`), Azure kelime puanı (`ui/pronunciation.ts`) |
| **Bağlamdan çıkarım** | Çıkarım modu (`engine/deduction.ts`) |
| **Derlem dilbilimi** | Sıklık listeleri, Tatoeba cümleleri, Wiktionary, UniMorph, FLELex/ELELex seviyeleri (`data/cefr/`) |
| **CEFR** | Rehber dersleri ve sertifikalar, kelime seviyesi, hedef planlayıcı |
| **Dilbilimsel uyarı / köken** | Kökeni kartı, "Aile ve diğer diller" (`engine/crossLanguage.ts`) |

## Bakım notu
- Yeni bir özellik bir kurama dayanıyorsa kaynak dosyada `(Yazar Yıl)` biçiminde atıf yorumu yaz ve A tablosuna satır ekle.
- B'deki bir satıra gerçek atıf eklenirse A'ya taşı.
- Eşik ve parametreler (örn. %98/%95, `ENCOUNTER_TARGET`, %85) atfedilen çalışmalardan yuvarlanmış değerlerdir; deneysel olarak ayarlanabilir, ayarlarken buradaki atfı gözden geçir.
