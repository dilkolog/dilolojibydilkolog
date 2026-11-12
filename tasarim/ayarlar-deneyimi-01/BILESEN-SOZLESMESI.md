# Bileşen sözleşmesi

- Ayar satırı: tek görünür etiket, açıklama, etikete bağlı native kontrol; checkbox/select klavyeyle kullanılabilir. Açıklama `aria-describedby` ile bağlı. Destek yoksa nedenini metinle açıkla.
- Gruplar: masaüstünde yan liste, 375px'de 3 sütun; aktif grup `aria-current=page`. Arama temizlenince son grup geri gelir. Yardım ayrı yardımcı öğedir; yeni dokuzuncu ana ayar kategorisi sayılmaz.
- Gelişmiş: native details; gruplar arası geçişte sayfa içi açık durumu korunur. Arama, kapalı satırları da bağlamıyla gösterir; tercih değiştirmek aramayı temizlemez.
- Durumlar: 8 grup + Yardım; advanced, search, noresults, unsupported, profile, reset, confirm, error. Toplam 17 doğrudan açılabilir görünüm.
- Geri al: altı saniye, okunabilir durum mesajı ve ayrı odaklanabilir düğme. Süre sonunda düğme gizlenir. Geri alınacak örnek kapsam grup anahtarlarıyla sınırlı.
- Profil: değişiklikler taslakta; vazgeç eskisini korur, uygula sayfa içi örneği günceller. Geri dönüşte odak giriş düğmesindedir. Monki yeni figür seçeneklerinde bulunmaz.
- Tehlikeli işlem: ayrı alt kart; veri kapsamı işlemden önce görünür. Native dialog odağı hapseder; Escape/vazgeç kapatır. Deneme düğmesi yalnızca örnek hata gösterir, veri silmez.
- Hareket: animasyon kullanılmadı; sakin ve reduced-motion stilleri korunur. Açık/koyu yüzeyler ve dil vurgusu ortak tokenlardan gelir.
- Üstteki vurgu/tema/sakin kontrolleri inceleme araçlarıdır. Canlıya ek bir inceleme çubuğu olarak taşınmamalı.
