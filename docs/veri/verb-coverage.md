# Fiil Çekim Tablosu Kapsamı (A1–B2 CEFR)

**Tarih:** 2026-10-09  
**Kapsam:** `src/data/cefr/{fr,es}.txt` (CEFR A1–B2 kelimeleri), `src/data/wordpack/{fr,es}.json` (fiil olanlar: `p: "v"`), `src/data/tenses/{fr,es}.json` (mevcut çekim tabloları).

---

## 1. Genel Özet ve Kapsam Oranları

| Dil | Toplam A1–B2 Fiil | Tablosu Olan Fiil | Tablosu Olmayan (Eksik) | Genel Kapsam Oranı |
|---|---|---|---|---|
| **Fransızca (FR)** | 834 | 827 | **7** | **%99,16** |
| **İspanyolca (ES)** | 815 | 716 | **99** | **%87,85** |

### Seviyelere Göre Dağılım

| Seviye | FR Toplam | FR Eksik | FR Kapsam | ES Toplam | ES Eksik | ES Kapsam |
|---|---|---|---|---|---|---|
| **A1** | 354 | 4 | %98,87 | 247 | 5 | %97,98 |
| **A2** | 192 | 3 | %98,44 | 219 | 31 | %85,84 |
| **B1** | 207 | 0 | **%100,00** | 236 | 34 | %85,59 |
| **B2** | 81 | 0 | **%100,00** | 113 | 29 | %74,34 |
| **Toplam** | **834** | **7** | **%99,16** | **815** | **99** | **%87,85** |

---

## 2. Fransızca Eksik Fiiller (7 Adet)

Fransızca'da tablosu bulunmayan 7 fiilin büyük bir kısmı geleneksel 6 şahıslı çekim tablosuna girmeyen şahıssız (*impersonnel* / *défectif*) fiiller veya fiilimsi/edat kökenli kelimelerdir:

### A1 Seviyesi (4 Fiil)
1. **`pleuvoir`** *(yağmur yağmak)* — Yalnızca 3. tekil şahıs (*il pleut*) çekimi kullanılır; 6 şahıslı standart laboratuvar tablosuna dahil edilmemiştir.
2. **`soit`** *(olsun / gerek ... gerek)* — *être* fiilinin subjonctif tekil formu; sözlükte bağlaç/fiil olarak etiketlenmiştir.
3. **`voici`** *(işte burada)* — Eski Fransızca *vois ici* (buraya bak) kökenli sunum edatı.
4. **`voilà`** *(işte orada)* — Eski Fransızca *vois là* (oraya bak) kökenli sunum edatı.

### A2 Seviyesi (3 Fiil)
1. **`falloir`** *(gerekmek / lazım olmak)* — Yalnızca 3. tekil şahıs (*il faut, il fallait, il faudra*) çeker; şahıssızdır.
2. **`neiger`** *(kar yağmak)* — Yalnızca 3. tekil şahıs (*il neige*) çeker.
3. **`paître`** *(otlamak)* — Bazı zamanları (passé simple, imparfait du subjonctif) eksik olan kusurlu (*défectif*) bir fiildir.

### B1 ve B2 Seviyeleri
- **0 eksik!** B1 ve B2'deki tüm 288 fiilin çekim tablosu eksiksiz olarak mevcuttur.

---

## 3. İspanyolca Eksik Fiiller (99 Adet)

İspanyolca Fiil Laboratuvarı'nda A1–B2 seviyesinde tablosu bulunmayan 99 fiil aşağıda seviye seviye listelenmiştir:

### A1 Seviyesi (5 Fiil)
- `apasionar`
- `apurar`
- `atrever`
- `relajar`
- `rodear`

### A2 Seviyesi (31 Fiil)
- `adelgazar`
- `agotar`
- `apetecer`
- `basar`
- `bastar`
- `complicar`
- `desconocer`
- `emocionar`
- `encargar`
- `enterrar`
- `equivaler`
- `estrellar`
- `estropear`
- `excitar`
- `fomentar`
- `fundar`
- `habitar`
- `infectar`
- `inscribir`
- `placer`
- `precisar`
- `prendar`
- `provenir`
- `pulsar`
- `referir`
- `relacionar`
- `resumir`
- `seleccionar`
- `suicidar`
- `tejer`
- `transcurrir`

### B1 Seviyesi (34 Fiil)
- `actualizar`
- `arrasar`
- `atascar`
- `atracar`
- `concretar`
- `desenterrar`
- `desmayar`
- `diferenciar`
- `elaborar`
- `embarazar`
- `emprender`
- `enganchar`
- `estimular`
- `evolucionar`
- `favorecer`
- `fusilar`
- `gestionar`
- `gozar`
- `implicar`
- `impulsar`
- `irritar`
- `lindar`
- `machacar`
- `marear`
- `moler`
- `murmurar`
- `paralizar`
- `percibir`
- `planificar`
- `plantear`
- `reproducir`
- `reposar`
- `rizar`
- `silbar`

### B2 Seviyesi (29 Fiil)
- `acertar`
- `acoger`
- `albergar`
- `alertar`
- `apoderar`
- `colar`
- `conformar`
- `conllevar`
- `costear`
- `demandar`
- `desnudar`
- `empeñar`
- `estafar`
- `fallecer`
- `gravar` / `agravar`
- `manchar`
- `mentar`
- `morar`
- `obsesionar`
- `originar`
- `otorgar`
- `perjudicar`
- `proclamar`
- `promocionar`
- `resaltar`
- `rondar`
- `sobrepasar`
- `someter`
- `timar`

---

## 4. Öneriler ve Sonraki Adımlar

1. **İspanyolca Düzenli Fiiller:** Eksik 99 fiilin ~%85'i düzenli `-ar`, `-er`, `-ir` fiilleridir (`elaborar`, `relacionar`, `actualizar` vb.). Mevcut `scripts/build-tenses.ts` betiği üzerinden düzenli kural şablonlarıyla topluca üretilebilir.
2. **Fransızca Şahıssız Fiiller:** `pleuvoir`, `neiger` ve `falloir` gibi fiiller için Fiil Laboratuvarı'na tek şahıslı (yalnızca *il*) soru modu eklenebilir veya laboratuvar dışı özel bir kart olarak sunulabilir.
