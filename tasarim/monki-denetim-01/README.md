# Monki görsel denetimi ve yenileme

**Paket kimliği:** `diloloji-monki-denetim-01`  
**Durum:** Tasarım tamamlandı; uygulama entegrasyonu bekliyor.  
**Devir güncellemesi:** 10 Kasım 2026.

## Ne yapıldı?

Main bcf19328 içindeki 366 dosya tarandı; 17 yeni illüstrasyon ve 1 statik animasyon ana karesi üretildi.

## Claude nereden başlamalı?

1. Proje kökündeki `AGENTS.md` ve `DESIGN.md` dosyalarını oku.
2. Bu paketteki [CLAUDE-DEVIR.md](CLAUDE-DEVIR.md) dosyasını oku.
3. [index.html](index.html) önizlemesini aç; kaynak/öneri eşleştirmelerini kontrol et.
4. Güncel main ile karşılaştırıp ilgili uygulama dosyasına yalnızca seçilen değişiklikleri taşı.

## Bekleyen işlem

Eski/yeni eşleştirmelerinden seç; PNG temizliği, alfa ve hedef boyut kontrolü yap. Statik ana kareyi hareketli WebP’nin üzerine yazma.

## Dosya adları

Dosyalar işlevlerine göre kendi paket klasörlerinde adlandırıldı. Paket kimliği ve göreli yol birlikte tekil kimliktir; örneğin `assets/body.png` bu paketin kendi katmanıdır. Manifest/rig dosyaları ve ayrıntılı devir notu dosyanın ne işe yaradığını açıklar. Mevcut dosya adlarını değiştirirsen HTML, JS ve manifest bağlantılarını birlikte güncelle.

Makine tarafından okunabilir özet: [PAKET.json](PAKET.json). Bu paket üretim uygulamasına otomatik bağlanmadı; gerçek API/hesap veya öğrenme verisi değiştirilmedi.
