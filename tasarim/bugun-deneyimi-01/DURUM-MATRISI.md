# Bugün · Durum matrisi

Tüm sayılar örnek. Soru ve kelime birimleri ayrı.

| Durum | Bugün cevaplanan soru | Kalan soru | Yarım tur kelimesi | Kapsam | Ana eylem |
|---|---:|---:|---:|---|---|
| Yeni hesap | 0 | 0 | 0 | Tüm listeler | Örnek kelimelerle başla |
| Bugün başlanmadı | 0 | 18 | 0 | Tüm listeler | Bugünün görevine başla |
| Kısmen tamamlandı | 6 | 12 | 0 | Tüm listeler | Çalışmaya devam et |
| Yarım kalan tur | 6 | 12 | 5 | Tüm listeler | Yarım turuma dön |
| Tekrar birikmesi | 0 | 96 | 0 | Tüm listeler | Bugünün görevine başla |
| Odak liste seçili | 0 | 8 | 0 | travel | Bugünün görevine başla |
| Seçili listede görev yok | 0 | 0 | 0 | finished | Tüm listelerdeki görevi aç |
| Gün tamamlandı | 18 | 0 | 0 | Tüm listeler | Kelime ekle |
| Bugün tekrar yok | 0 | 0 | 0 | Tüm listeler | Kelime ekle |
| Gün tamam, yarım tur var | 18 | 0 | 3 | Tüm listeler | Yarım turuma dön |

Ek çalışma akışında seçili listedeki sorular biterse başlık “Bu listedeki görev tamam” olur; ana eylem tüm listelere dönüş olarak kalır. Bu, tüm günün tamamlandığı anlamına gelmez.

Yarım tur sayısı benzersiz kelimedir; günlük soru sayısından çıkarılmaz. Gün tamam ve taslak var birlikte mümkündür. Boş hesap/listede görev yok/bugün tekrar yok için 0/0 ilerleme yüzdesi üretilmez.
