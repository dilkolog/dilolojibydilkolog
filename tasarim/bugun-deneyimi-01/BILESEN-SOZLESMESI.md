# Bugün · Bileşen sözleşmesi

## Karar sırası

1. Kullanılabilir yarım tur varsa ana eylem devamdır; günlük görev bitmiş olsa da.
2. Yeni hesapta başlangıç eylemi.
3. Liste kapsamında görev yoksa tüm listelere geçiş önerisi.
4. Kalan günlük soru varsa başla/devam.
5. Gün tamam veya bugün tekrar yoksa farklı açıklamalar ve isteğe bağlı keşif/ekleme.

Bu sıra görsel öncelik önerisidir; gerçek oturum açma/iptal/plan üretim kuralları değiştirilmez. Prototipte10 örnek durum var; yükleniyor/hata gibi gerçek veri durumları bununla sınırlanamaz.

## Tek ana eylem

Hero'da bir adet data-primary düğmesi. Aynı yarım tur için ikinci bir üst banner ve aynı ağırlıkta ikinci Başla düğmesi yok. Mevcut SessionResumeCard verisinin hero ile paylaşılması bir entegrasyon kararı gerektirir; veri okuma davranışı silinmemeli.

Vaktim az → en çok 15 eski/tekrar sorusu. Yeni kelimeler kısa tura alınmaz. Prototipte tekrar sayısı sıfırsa bu seçenek sunulmaz. Süre seçenekleri yalnız örnek plan 7dakikadan uzunsa gösterilir. Gerçek uygulamada mevcut onShortRound/onMinutes ve gerçek uygunluk koşulları kullanılır.

## Birimler

- Kalan soru: günlük planın soruları.
- Yarım tur kelimesi: taslakta kalan benzersiz entryId sayısı.
- Bitki: o günün soru ilerlemesi.
- Haftalık süre: okuma + dinleme + konuşma; soru veya ustalık seviyesi değil.

Bu ölçüler birbirinden çıkarılmaz veya birbirine dönüştürülmez. Yarım turu kapatma örneği günlük soru sayılarını kendi başına azaltmaz. Gerçek tur öğrenme adımları tamamlandığında gerçek motor hangi alanı güncelliyorsa o kullanılır.

## Filiz eşleştirmesi

Kaynak dayStage: done→5; progress<=0→-1; diğerinde min(4,floor(progress*5)). Bu paketteki 7 SVG dizisinde model -1→stage-0.svg,0…5→stage-1…6.svg. Tamamlanma gerçek olarak verified answeredToday>0 ve görev durumu üzerinden gelir; boş listede 0/0 yüzde100 yapılmaz.

Aynı 6/18 ilerlemesini iki ayrı çubukta tekrarlamak yerine bitki halkası ve kısa sayaç bir arada. Kalan soru ayrıca ana metindir. Prototipin progress=answered/(answered+remaining) hesabı örnek veriler içindir; gerçek motorun progress değerinin yerine konmaz.

## Kapsam

Liste seçimi tüm günün çalışma kapsamını etkiler. Seçili liste adı ve tüm listelere dönüş aynı bölgede görünür. Örnek listede görev yoksa “bu listede görev yok” denir; bütün gün tamam kabul edilmez. Prototip seçim değişiminde başka bir örnek DTO'ya geçer; gerçek kullanıcı ilerlemesini sıfırlama davranışı değildir.

Taslak başka liste kapsamından geliyorsa onun adını/doğru bağlamını göster; seçili listenin turuymuş gibi etiketleme. Mevcut taslağı sessizce silme.

## İkincil alanlar

Bir öneri ve kapalı ek çalışma bölümü. Okuma, dinleme ve konuşma kartları yerleşim/rota önizlemesidir. Gerçek TodayTime verisi ve hedef; mevcut haftalık görev/seri/kazanım önerisi sistemi korunmalı. Bu paketteki 18/30dk veya hafta tikleri gerçek kayıttan üretilmedi.

## Simülasyonlar

Bir soruluk örnek ilerlet, kısa tur ve süre pencereleri yalnız sayısal yerleşim geçişini gösterir; gerçek soru/puanlama yok. Süre penceresinde dakika×3 basitleştirmesi yalnız prototiptir; roundForMinutes'ın zaman bütçesi algoritmasının yerine konmaz. Soruların dağılımı toplamının kalan sayıya eşitliği bu örnek DTO'nun tutarlılık kontrolüdür; gerçek motorun farklı aşama/count sözleşmesi bu varsayıma zorlanmamalı.

EN/FR/ES düğmeleri dil etiketini ve örnek kelimeyi değiştirir. Rakamlar aynı örnek senaryodan gelir; diller için bağımsız gerçek veri/ilerleme sistemi uygulanmadı.
