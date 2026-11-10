# Teslim kontrolü — 10 Kasım 2026

- 10 kaynak JSON dosyası: her biri 26 kayıt, 52 örnek/çeviri ve 26 soru.
- Toplam 260 kimlik; aralık `fr-idiom-000001`–`fr-idiom-000260`. İlk 26 kayıt korundu.
- Normalleştirilmiş ifade ve Fransızca örnekler paketler arasında birebir tekrarsız.
- Her soruda dört farklı seçenek ve geçerli, sıfır tabanlı cevap indeksi. Doğru cevap A/B/C/D konumlarının her birinde 65 kez bulunuyor.
- 259 kayıtta açılmış sözlük maddesi; bir kayıtta arama sonucundan okunan tanım ve doğrudan erişim sınırı ayrı işaretli.
- Takip edilen mevcut Fransızca dosyalarda 26 satırda kalıp eşleşmesi, 11 dosyada örtüşme bulundu. Aynı tarama ölçütüyle yeni örnek cümlelerin birebir eşleşmesi bulunmadı. Farklı çekimler ve anlamca benzer cümleler bu denetimin kapsamı dışındadır.
- Yerel Markdown bağlantıları kontrol edildi.
- 10 tekli ZIP ve 1 toplu ZIP CRC/bütünlük denetiminden geçti. Tekli arşivlerde birer 26 kayıtlı veri dosyası; toplu arşivde on kaynak veri dosyası var. ZIP içi dosya adları tekrarsız ve yerel Markdown bağlantıları geçerli.
- 11 ZIP'in SHA-256 değerleri `arsivler/SHA256SUMS.txt` ile karşılaştırıldı.
- `git diff --check` geçti. Yalnız editoryal veri, belge ve teslim aracı değiştiği için uygulama derlemesi veya tarayıcı testi çalıştırılmadı.

Bunlar üretici ve yapı kontrolleridir. Bağımsız dil denetimi, soru tekilliğinin anlamsal değerlendirmesi ve CEFR dağılımı henüz tamamlanmadı. Hiçbir paket uygulamada yayımlanmadı.

Tekrar çalıştırma: `validate.py` verileri denetler; `render.py` proje checkout'u içinde çalışır ve mevcut içerik taraması için Git deposunu kullanır. Toplu ZIP tek başına açıldığında veri denetimi `python3 validate.py` ile, arşivin `deyimler-fr` klasöründen çalıştırılabilir.
