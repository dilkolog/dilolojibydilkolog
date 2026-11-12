# Diloloji · 40 figürlük avatar koleksiyonu

26 mevcut Monki dışı figür yeniden çizildi; 14 yeni hayvan eklendi. Toplam 40 farklı avatar. Monki bu koleksiyonda avatar olarak bulunmaz.

- `index.html`: etkileşimli avatar seçimi, arama, kategoriler, kilit koşulları, profil rengi, fotoğraf önizlemesi, açık/koyu tema.
- `galeri.html`: 40 figür ve 26 önce/sonra karşılaştırması.
- `assets/portreler/avatar-{id}.png` ve `.webp`: ayrı adlandırılmış 384×384, şeffaf köşeli teslimler. Pastel dairesel zemin çizimin parçasıdır.
- `assets/kaynak/atlas-01.png` … `atlas-05.png`: ImageGen ile üretilen orijinal çizim levhaları. Her levha 4 sütun × 2 satır, sıralama `data.json` içindedir; `cell` sıfırdan başlar.
- `assets/mevcut/`: karşılaştırma için mevcut 26 çizim.
- `onizlemeler/`: masaüstü, 375px mobil, koyu tema, tüm figürler ve karşılaştırma görüntüleri.
- `CLAUDE-DEVIR.md`: entegrasyon kararları ve korunacak mevcut davranışlar.
- `DOGRULAMA.json`: gerçekleştirilen önizleme kontrolleri.

HTML dosyalarını doğrudan açabilirsiniz. Yerel sunucu alternatifi: bu klasörde `python -m http.server 4197`.

Bu paket bir tasarım teslimidir; üretim uygulamasına bağlanmadı. Seçimler yalnızca bu prototipin localStorage alanına kaydolur. Fotoğraf sunucuya yüklenmez, yalnızca mevcut sekmede gösterilir. Sunucusuz kullanım için veriler `data.js` içine de kondu. JSON ana envanterdir.

Çizimler portre olarak yeniden üretildi; eski tam boy figürlerin farklı alanlardaki kullanımları bu paketle otomatik değiştirilmemelidir. Teknik dışa aktarımda levhalar hücrelere ayrıldı, dış alfa gürültüsü dairesel maske ile temizlendi. Kaynak levhalar değiştirilmeden saklandı.
