// A page for each language, for sharing: /fransizca, /ispanyolca, /ingilizce. They are the app's own index.html with
// that language's title, description and picture (public/og/), so a link shared on WhatsApp shows the language's
// colour and Monki; the landing page opens on that language (src/ui/startLanguage.ts languageOfPath).
// Run after the build (npm run build:cf): writes dist/<slug>.html, which Cloudflare serves at /<slug>.
import { readFileSync, writeFileSync } from 'node:fs'

const SITE = 'https://diloloji.com'
export const LANG_PAGES = [
  { slug: 'fransizca', lang: 'fr', name: 'Fransızca' },
  { slug: 'ispanyolca', lang: 'es', name: 'İspanyolca' },
  { slug: 'ingilizce', lang: 'en', name: 'İngilizce' },
]

const escape = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** The index.html of one language's page: its own address, title, description and picture. */
export function languagePage(html, page) {
  const url = `${SITE}/${page.slug}`
  const title = `${page.name} öğren · Diloloji`
  const description = `${page.name}: Türkçe anlatımla, A1’den C1’e. Kelime, dilbilgisi, okuma, dinleme ve konuşma tek bir yolda. Reklamsız.`
  const image = `${SITE}/og/og-${page.lang}.jpg`
  const meta = (attr, key, value) => {
    const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`)
    if (!re.test(html)) throw new Error(`index.html has no <meta ${attr}="${key}">`)
    html = html.replace(re, `$1${escape(value)}$2`)
  }
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
  meta('name', 'description', description)
  meta('property', 'og:url', url)
  meta('property', 'og:title', title)
  meta('property', 'og:description', description)
  meta('property', 'og:image', image)
  meta('name', 'twitter:title', title)
  meta('name', 'twitter:description', description)
  meta('name', 'twitter:image', image)
  return html
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8')
  for (const page of LANG_PAGES) {
    writeFileSync(new URL(`../dist/${page.slug}.html`, import.meta.url), languagePage(html, page))
    console.log(`dist/${page.slug}.html written`)
  }
}
