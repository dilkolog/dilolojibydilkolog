import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const OUT_DIR = join(process.cwd(), 'android/store')
mkdirSync(OUT_DIR, { recursive: true })

// -------------------------------------------------------------
// 1. Feature Graphic (1024 x 500)
// -------------------------------------------------------------
async function buildFeatureGraphic() {
  const W = 1024
  const H = 500

  // BrandMark SVG paths
  const BUBBLE = 'M168 112H256C338 112 400 174 400 256C400 338 338 400 256 400H234C250 386 258 368 260 348C312 346 348 308 348 256C348 204 310 164 256 164H188V348H236C234 368 222 388 202 400H188L148 432C140 438 134 433 134 423V146A34 34 0 0 1 168 112Z'
  const PAGES_OUTER = 'M194 214C220 220 242 236 256 262C270 236 292 220 318 214'
  const PAGES_INNER = 'M208 202C228 210 244 224 256 244C268 224 284 210 304 202'
  const STEM_AND_LOWER_LEAVES = 'M210 402C236 392 248 364 248 324C204 312 172 278 170 224C210 232 242 252 256 284C270 252 302 232 342 224C340 278 308 312 262 324C262 364 244 394 210 402Z'
  const LEFT_LEAF_TOP = 'M170 224C210 232 242 252 256 284C254 294 251 304 248 312C232 276 204 248 170 224Z'
  const RIGHT_LEAF_TOP = 'M342 224C302 232 270 252 256 284C258 294 261 304 264 312C280 276 308 248 342 224Z'
  const SPARK = 'M256 162Q256 184 278 184Q256 184 256 206Q256 184 234 184Q256 184 256 162Z'

  const svg = `
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Deep indigo to night slate background -->
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="45%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>

      <!-- Ambient glow circles -->
      <radialGradient id="glow-indigo" cx="20%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#4f46e5" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="glow-emerald" cx="80%" cy="30%" r="45%">
        <stop offset="0%" stop-color="#059669" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#059669" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="glow-gold" cx="50%" cy="90%" r="40%">
        <stop offset="0%" stop-color="#d97706" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#d97706" stop-opacity="0"/>
      </radialGradient>

      <!-- Logo Gradients -->
      <linearGradient id="logo-bg" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6366f1"/>
        <stop offset="0.55" stop-color="#4338ca"/>
        <stop offset="1" stop-color="#272466"/>
      </linearGradient>
      <linearGradient id="leaf-base" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#059669"/>
        <stop offset="1" stop-color="#34d399"/>
      </linearGradient>
      <linearGradient id="leaf-hi" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#34d399"/>
        <stop offset="1" stop-color="#86efac"/>
      </linearGradient>
      <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fde68a"/>
        <stop offset="1" stop-color="#f59e0b"/>
      </linearGradient>

      <!-- Card shadow -->
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.4"/>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glow-indigo)"/>
    <rect width="${W}" height="${H}" fill="url(#glow-emerald)"/>
    <rect width="${W}" height="${H}" fill="url(#glow-gold)"/>

    <!-- Subtle grid lines pattern for precision tech & educational feel -->
    <g stroke="rgba(255, 255, 255, 0.03)" stroke-width="1">
      <line x1="0" y1="100" x2="${W}" y2="100" />
      <line x1="0" y1="200" x2="${W}" y2="200" />
      <line x1="0" y1="300" x2="${W}" y2="300" />
      <line x1="0" y1="400" x2="${W}" y2="400" />
      <line x1="200" y1="0" x2="200" y2="${H}" />
      <line x1="400" y1="0" x2="400" y2="${H}" />
      <line x1="600" y1="0" x2="600" y2="${H}" />
      <line x1="800" y1="0" x2="800" y2="${H}" />
    </g>

    <!-- Left: App Icon & Brand Lockup -->
    <g transform="translate(70, 75)">
      <!-- Icon Container with soft border -->
      <rect width="108" height="108" rx="26" fill="url(#logo-bg)" filter="url(#shadow)"/>
      <rect width="108" height="108" rx="26" fill="none" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1.5"/>
      <g transform="translate(54, 54) scale(0.2) translate(-262, -268)">
        <path d="${BUBBLE}" fill="#fff"/>
        <path d="${PAGES_OUTER}" stroke="#6ee7b7" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="${PAGES_INNER}" stroke="#a7f3d0" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="${STEM_AND_LOWER_LEAVES}" fill="url(#leaf-base)"/>
        <path d="${LEFT_LEAF_TOP}" fill="url(#leaf-hi)"/>
        <path d="${RIGHT_LEAF_TOP}" fill="url(#leaf-hi)"/>
        <path d="${SPARK}" fill="url(#spark)"/>
      </g>

      <!-- Title & Wordmark -->
      <text x="130" y="58" font-family="'Lexend', system-ui, sans-serif" font-weight="700" font-size="52" fill="#ffffff" letter-spacing="-1">Diloloji</text>
      <text x="132" y="92" font-family="'Lexend', system-ui, sans-serif" font-weight="600" font-size="20" fill="#fbbf24" letter-spacing="0.5">Cesaret Veren Kelime Koçu</text>

      <!-- Mission Statement -->
      <text x="0" y="160" font-family="'Lexend', system-ui, sans-serif" font-weight="400" font-size="22" fill="#e2e8f0">
        FSRS Akıllı Tekrar · Cümle İçi Okuma · Fiil Laboratuvarı
      </text>

      <!-- Language Badges -->
      <g transform="translate(0, 195)">
        <!-- English -->
        <g transform="translate(0, 0)">
          <rect width="145" height="42" rx="21" fill="rgba(56, 189, 248, 0.14)" stroke="rgba(56, 189, 248, 0.4)" stroke-width="1.2"/>
          <text x="20" y="27" font-size="18">🇬🇧</text>
          <text x="52" y="27" font-family="'Lexend', system-ui, sans-serif" font-weight="600" font-size="15" fill="#7dd3fc">İngilizce</text>
        </g>
        <!-- French -->
        <g transform="translate(160, 0)">
          <rect width="145" height="42" rx="21" fill="rgba(244, 63, 94, 0.14)" stroke="rgba(244, 63, 94, 0.4)" stroke-width="1.2"/>
          <text x="20" y="27" font-size="18">🇫🇷</text>
          <text x="52" y="27" font-family="'Lexend', system-ui, sans-serif" font-weight="600" font-size="15" fill="#fda4af">Fransızca</text>
        </g>
        <!-- Spanish -->
        <g transform="translate(320, 0)">
          <rect width="155" height="42" rx="21" fill="rgba(245, 158, 11, 0.14)" stroke="rgba(245, 158, 11, 0.4)" stroke-width="1.2"/>
          <text x="20" y="27" font-size="18">🇪🇸</text>
          <text x="52" y="27" font-family="'Lexend', system-ui, sans-serif" font-weight="600" font-size="15" fill="#fde68a">İspanyolca</text>
        </g>
      </g>

      <!-- Trust Badges (Features) -->
      <g transform="translate(0, 275)">
        <g transform="translate(0, 0)">
          <circle cx="10" cy="10" r="10" fill="#10b981" fill-opacity="0.2"/>
          <text x="10" y="14" font-size="12" text-anchor="middle" fill="#34d399">✓</text>
          <text x="30" y="15" font-family="'Lexend', system-ui, sans-serif" font-weight="500" font-size="15" fill="#cbd5e1">Reklamsız ve Sakin Tasarım</text>
        </g>
        <g transform="translate(240, 0)">
          <circle cx="10" cy="10" r="10" fill="#10b981" fill-opacity="0.2"/>
          <text x="10" y="14" font-size="12" text-anchor="middle" fill="#34d399">✓</text>
          <text x="30" y="15" font-family="'Lexend', system-ui, sans-serif" font-weight="500" font-size="15" fill="#cbd5e1">Çevrimdışı Çalışma Desteği</text>
        </g>
      </g>
      <g transform="translate(0, 312)">
        <g transform="translate(0, 0)">
          <circle cx="10" cy="10" r="10" fill="#10b981" fill-opacity="0.2"/>
          <text x="10" y="14" font-size="12" text-anchor="middle" fill="#34d399">✓</text>
          <text x="30" y="15" font-family="'Lexend', system-ui, sans-serif" font-weight="500" font-size="15" fill="#cbd5e1">57.000+ Kelime &amp; CEFR Seviyeleri</text>
        </g>
        <g transform="translate(240, 0)">
          <circle cx="10" cy="10" r="10" fill="#10b981" fill-opacity="0.2"/>
          <text x="10" y="14" font-size="12" text-anchor="middle" fill="#34d399">✓</text>
          <text x="30" y="15" font-family="'Lexend', system-ui, sans-serif" font-weight="500" font-size="15" fill="#cbd5e1">Sesli Okuma &amp; Dikte Çalışmaları</text>
        </g>
      </g>
    </g>

    <!-- Right: Mascot & Visual Element Showcase -->
    <g transform="translate(670, 70)">
      <!-- Backdrop Card for mascot -->
      <rect width="280" height="360" rx="32" fill="rgba(255, 255, 255, 0.04)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5" filter="url(#shadow)"/>
      <circle cx="140" cy="140" r="100" fill="url(#glow-gold)" opacity="0.6"/>
    </g>
  </svg>
  `

  writeFileSync(join(OUT_DIR, 'feature-graphic.svg'), svg)

  // Composite Monki illustration into the feature graphic
  const monki = await sharp('src/assets/art/react-hello.webp')
    .resize(220, 204, { fit: 'contain' })
    .toBuffer()

  const speechBubbleSvg = `
    <svg width="220" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="60" rx="18" fill="#ffffff" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.3))"/>
      <polygon points="110,60 120,74 130,60" fill="#ffffff"/>
      <text x="110" y="36" font-family="'Lexend', system-ui, sans-serif" font-weight="600" font-size="15" fill="#0f172a" text-anchor="middle">
        Hadi başlayalım! 🚀
      </text>
    </svg>
  `
  const speechBubble = Buffer.from(speechBubbleSvg)

  await sharp(Buffer.from(svg))
    .composite([
      { input: speechBubble, left: 700, top: 125 },
      { input: monki, left: 700, top: 200 }
    ])
    .flatten({ background: '#090d16' })
    .removeAlpha() // Ensure 24-bit RGB without alpha channel for Google Play Console
    .png()
    .toFile(join(OUT_DIR, 'feature-graphic.png'))

  console.log('✓ Generated feature-graphic.png (1024x500)')
}

// -------------------------------------------------------------
// 2. Play Store Phone Screenshots (1080 x 2280)
// -------------------------------------------------------------
async function buildPhoneScreenshot(cfg) {
  const W = 1080
  const H = 2280

  const headerSvg = `
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="screen-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${cfg.gradStart}"/>
        <stop offset="40%" stop-color="${cfg.gradEnd}"/>
        <stop offset="100%" stop-color="#0b0f19"/>
      </linearGradient>
      <filter id="phone-shadow" x="-10%" y="-5%" width="120%" height="115%">
        <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
    </defs>

    <rect width="${W}" height="${H}" fill="url(#screen-bg)"/>

    <!-- Ambient top glow -->
    <circle cx="540" cy="180" r="350" fill="${cfg.accentColor}" opacity="0.18"/>

    <!-- Header Text Block -->
    <g transform="translate(0, 160)">
      <text x="540" y="0" font-family="'Lexend', system-ui, sans-serif" font-weight="700" font-size="28" fill="${cfg.accentColor}" text-anchor="middle" letter-spacing="2">
        ${cfg.eyebrow.toUpperCase().replace(/&/g, '&amp;')}
      </text>
      <text x="540" y="65" font-family="'Lexend', system-ui, sans-serif" font-weight="700" font-size="54" fill="#ffffff" text-anchor="middle">
        ${cfg.title.replace(/&/g, '&amp;')}
      </text>
      <text x="540" y="125" font-family="'Lexend', system-ui, sans-serif" font-weight="400" font-size="28" fill="#cbd5e1" text-anchor="middle">
        ${cfg.subtitle.replace(/&/g, '&amp;')}
      </text>
    </g>

    <!-- Phone Bezel Mockup Frame -->
    <g transform="translate(110, 420)">
      <!-- Outer phone body -->
      <rect width="860" height="1860" rx="64" fill="#18181b" stroke="#3f3f46" stroke-width="8" filter="url(#phone-shadow)"/>
      <!-- Inner display screen container -->
      <rect x="18" y="18" width="824" height="1824" rx="48" fill="#020617"/>
      <!-- Dynamic island / top notch pill -->
      <rect x="330" y="32" width="200" height="34" rx="17" fill="#09090b"/>
    </g>
  </svg>
  `

  // Resize the app screen to fit perfectly inside the bezel (824 x 1780)
  const appScreen = await sharp(cfg.sourceFile)
    .resize(824, 1780, { fit: 'cover', position: 'top' })
    .toBuffer()

  await sharp(Buffer.from(headerSvg))
    .composite([
      { input: appScreen, left: 128, top: 490 }
    ])
    .png({ quality: 95 })
    .toFile(join(OUT_DIR, cfg.filename))

  console.log(`✓ Generated ${cfg.filename} (1080x2280)`)
}

// -------------------------------------------------------------
// 3. Store Listing Metadata Markdown
// -------------------------------------------------------------
function buildListingMetadata() {
  const metadata = `# Diloloji — Google Play Store Mağaza Sayfası Bilgileri

Bu belge, Google Play Console'da kişisel hesapla yayınlanacak Diloloji Android uygulaması (TWA) için gereken mağaza metinlerini ve form yanıtlarını içerir.

---

## 1. Temel Bilgiler (Google Play Console)

| Alan | Değer | Karakter Sınırı / Durum |
|---|---|---|
| **Uygulama Adı** | Diloloji: Dil & Kelime Koçu | 26 / 30 karakter |
| **Kısa Açıklama** | İngilizce, Fransızca ve İspanyolca kelime koçu: akıllı tekrar ve hikayeler. | 74 / 80 karakter |
| **Varsayılan Dil** | Türkçe (tr-TR) | - |
| **Uygulama Türü** | Uygulama (Oyun değil) | - |
| **Fiyatlandırma** | Ücretsiz (Reklamsız, uygulama içi satın alma yok) | - |
| **Kategori** | Eğitim (Education) | - |
| **Etiketler (Tags)** | Dil Öğrenme, Kelime Ezberleme, İngilizce, Fransızca, İspanyolca | En çok 5 etiket |

---

## 2. Kısa Açıklama (≤80 karakter)

\`\`\`text
İngilizce, Fransızca ve İspanyolca kelime koçu: akıllı tekrar ve hikayeler.
\`\`\`

---

## 3. Tam Açıklama (Google Play ASO Uyumlu)

\`\`\`text
Diloloji: Dil Değişince Odanın Işığı Değişir. 🌿

Diloloji; İngilizce, Fransızca ve İspanyolca dillerinde kelime ezberlemenin ötesine geçerek aktif refleks, akıcı okuma ve sağlam dil bilgisi temeli kazanmanız için tasarlanmış modern bir kelime koçudur.

Neden Diloloji?

🧠 FSRS Akıllı Tekrar Algoritması
Ezberlemeye çalıştığınız her kelimeyi rastgele değil; beyninizin unutma eğrisine en uygun saniyede karşınıza çıkarır. Daha az çalışarak daha kalıcı hatırlayın.

📖 Cümle İçi Okuma ve Dinleme
Kelimeleri tek başına listeler halinde değil, gerçek edebi eserlerde, hikayelerde ve günlük diyaloglarda görün. Metinde bilmediğiniz bir kelimeye dokunun; anında Türkçe karşılığını, çekim formunu görün ve listenize ekleyin.

⚡ Fiil Laboratuvarı & Zamanlar
Fransızca ve İspanyolca dillerinin en zorlu yönü olan düzensiz fiilleri ve zaman çekimlerini eğlenceli pratiklerle otomatik reflekse dönüştürün.

🎮 Hız ve Akıcılık Oyunları
Yerçekimi, 3 saniyelik refleks turları, hata avcısı, kolokasyon matkapları ve geri çeviri modülleriyle öğrenmeyi oyunlaştırın.

🎯 CEFR A1'den C1'e Seviye Ayrımı
57.000'den fazla zengin kelime ve örnek cümle havuzuyla kendi seviyenize uygun çalışın; kör noktalarınızı cerrahi hassasiyetle onarın.

🌟 Temiz, Sakin ve Reklamsız
Dikkat dağıtan reklamlar, can sıkıcı abonelik dayatmaları ve gereksiz bildirim yağmuru yok. Tamamen çevrimdışı çalışma desteğiyle metroda, uçakta ve her yerde yanınızda.

Öne Çıkan Özellikler:
• 🇬🇧 İngilizce, 🇫🇷 Fransızca, 🇪🇸 İspanyolca tam desteği
• Modern FSRS (Free Spaced Repetition Scheduler) hafıza motoru
• Çift dilli interaktif sesli kitaplar ve kolay resimli hikayeler
• Fonetik telaffuz analizi ve dikte çalışmaları
• Kapsamlı dilbilgisi rehberi ve interaktif mini sınavlar
• Aygıtlar arası güvenli veri eşitleme
• Sosyal çalışma kartları ve başarı karneleri (PDF/Excel dışa aktarma)

Kelimeler burada büyür. Diloloji ile dil öğrenme yolculuğunuza bugün başlayın!
\`\`\`

---

## 4. Uygulama İçeriği ve Form Yanıtları (Play Console Uyumu)

- **Gizlilik Politikası:** \`https://diloloji.com/gizlilik\`
- **Hesap Silme Adresi:** \`https://diloloji.com/hesap-silme\`
- **Reklamlar:** Hayır, uygulamamda reklam yok.
- **Uygulama Erişimi:** Tüm işlevler kısıtlama olmaksızın kullanılabilir.
- **Hedef Kitle ve İçerik:** 13 yaş ve üzeri. Çocuklara yönelik değil.
- **İçerik Derecelendirmesi:** Kullanıcılar arası etkileşim: Var (arkadaş ekleme ve paylaşılan kelime listeleri). Şikâyet ve engelleme sistemi mevcuttur.
- **Veri Güvenliği (Data Safety):**
  - Toplanan veriler: İsteğe bağlı e-posta (hesap oluşturulduğunda), uygulama içi öğrenme etkinlikleri (kelime tekrarları).
  - Veri üçüncü taraflarla paylaşılmaz.
  - Veri iletimi şifrelidir (HTTPS).
  - Kullanıcı istediği an hesabını ve tüm verilerini uygulama içinden veya webden silebilir.

---

## 5. Görsel Varlıklar Envanteri

- \`android/store/feature-graphic.png\`: 1024×500 piksel Play Store Tanıtım Afişi.
- \`android/store/screenshot-1-bugun.png\`: 1080×2280 px Bugün / FSRS Ekranı.
- \`android/store/screenshot-2-kelimeler.png\`: 1080×2280 px Kelime Havuzu Ekranı.
- \`android/store/screenshot-3-okuma.png\`: 1080×2280 px Cümle İçi Okuma Ekranı.
- \`android/store/screenshot-4-oyunlar.png\`: 1080×2280 px Akıcılık Oyunları Ekranı.
`

  writeFileSync(join(OUT_DIR, 'listing.md'), metadata)
  console.log('✓ Generated android/store/listing.md')
}

async function main() {
  console.log('🚀 Building Android Store Design Assets...')

  // 1. Feature Graphic
  await buildFeatureGraphic()

  // 2. Screenshots
  const screenshots = [
    {
      filename: 'screenshot-1-bugun.png',
      sourceFile: 'src/assets/landing/today-en.webp',
      eyebrow: 'FSRS Aralıklı Tekrar',
      title: 'Akıllı Kelime Koçu',
      subtitle: 'Unutma eğrisini yenen hafıza algoritması',
      gradStart: '#1e1b4b',
      gradEnd: '#0f172a',
      accentColor: '#818cf8',
    },
    {
      filename: 'screenshot-2-okuma.png',
      sourceFile: 'src/assets/landing/reading-fr.webp',
      eyebrow: 'Bağlam İçinde Öğrenme',
      title: 'Cümle Odaklı Okuma',
      subtitle: 'Metne dokun, anlamını gör, listene ekle',
      gradStart: '#3b0764',
      gradEnd: '#1e1b4b',
      accentColor: '#c084fc',
    },
    {
      filename: 'screenshot-3-fiiller.png',
      sourceFile: 'src/assets/landing/verbs-es.webp',
      eyebrow: 'Fiil & Zaman Ustalığı',
      title: 'Fiil Laboratuvarı',
      subtitle: 'Çekim tabloları ve refleks pratikleri',
      gradStart: '#451a03',
      gradEnd: '#1e1b4b',
      accentColor: '#fbbf24',
    },
    {
      filename: 'screenshot-4-oyunlar.png',
      sourceFile: '/Users/aliaydin/.gemini/antigravity/brain/fce6ca5b-c6fa-4633-b412-c35355222172/09_games_mobile_app.png',
      eyebrow: 'Eğlenceli Akıcılık',
      title: 'Hız ve Refleks Oyunları',
      subtitle: 'Yerçekimi, hata avcısı ve mini testler',
      gradStart: '#064e3b',
      gradEnd: '#0f172a',
      accentColor: '#34d399',
    },
  ]

  for (const s of screenshots) {
    await buildPhoneScreenshot(s)
  }

  // 3. Metadata listing
  buildListingMetadata()

  console.log('🎉 All Android Store Design Assets Built Successfully!')
}

main().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
