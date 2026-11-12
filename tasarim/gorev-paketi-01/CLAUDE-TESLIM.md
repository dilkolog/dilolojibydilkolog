# Görsel görevleri — teslim / 01

Tarih: 9 Kasım 2026. Kaynak görev dosyası: main içindeki `docs/chatgpt/GORSEL-GOREVLERI.md` (inceleme anı `bcf19328`). Üslup referansı: `docs/chatgpt/monki-referans.jpg`. Üretim: Image Gen.

Görev 1 ve 2 ayrı üretildi; kullanıcı ardından kalan görevlerin onay için durmadan tamamlanmasını istedi. Toplam 12 ham kaynak görsel, görevdeki adlarla `docs/gelen-gorseller/` içine kondu. Çalışan uygulamaya bağlanmadı. Bu teslim yerel çalışma alanındadır; commit/push yapılmadı.

## Claude’a kalan işlemler

- Zemin temizliği, son boyutlandırma, WebP çıktısı ve uygulamaya bağlama.
- Yatay dosyalar 1536×1024. Kare kaynaklar araçtan 1254×1254 geldi; görevdeki nihai hedef 1024×1024. Kaynaklar bilerek yeniden örneklenmeden korundu.
- Beyaz zemin istendi; ham üretimde olası çok hafif ton farklarını maskeleme sırasında temizle. Şeffaf üretim yapılmadı.
- Küçük amblemleri (5a/5b/6) beyaz kenar boşluğu temizlendikten sonra gerçek 40 px ölçekte kontrol et. Kalem, saat ve filiz ayrıntıları kayboluyorsa son ölçek ve kırpma payını ayarla; karakteri esnetme.
- Yan yana referansla renk ve kontur tutarlılığını son kez kontrol et. Üretimler mevcut aileyi hedefliyor; mevcut çizimlerin yerine otomatik toplu değişiklik yapılmamalı.
- Kaynak görsellerin bulunduğu gelen-gorseller klasörü gitignore kapsamındaysa normal git status içinde görünmez. Depoya alınmaları veya yalnızca işlenmiş çıktıların eklenmesi proje akışına göre seçilmeli. Kaynaklar bu çalışma alanında ve ZIP’te mevcut.
- Logo ve uygulama simgesi bu görev kapsamında üretilmedi.

## Dosyalar

| Görev | Dosya | Ham boyut | Nihai hedef |
|---|---|---|---|
| 1 | `scene-story.png` | 1536×1024 | 1536×1024 |
| 2 | `guide-placement.png` | 1254×1254 | 1024×1024 |
| 3a | `progress-week-empty.png` | 1536×1024 | 1536×1024 |
| 3b | `progress-note.png` | 1254×1254 | 1024×1024 |
| 4a | `role-weekend.png` | 1254×1254 | 1024×1024 |
| 4b | `role-series.png` | 1254×1254 | 1024×1024 |
| 5a | `emblem-mind-seed.png` | 1254×1254 | 1024×1024 |
| 5b | `emblem-plan.png` | 1254×1254 | 1024×1024 |
| 6 | `emblem-recall.png` | 1254×1254 | 1024×1024 |
| 7a | `page-privacy.png` | 1254×1254 | 1024×1024 |
| 7b | `page-terms.png` | 1254×1254 | 1024×1024 |
| 7c | `page-delete.png` | 1254×1254 | 1024×1024 |

Kontrol: 12 PNG dosyası açılıp doğrulandı; dosya adları görev listesiyle eşleşiyor; yatay/kare oranlar doğru. Görsel incelemede Görev 2’de altı basamak ve üçüncü basamaktaki Monki, Görev 3a’da yedi toprak dolu boş saksı mevcut.
