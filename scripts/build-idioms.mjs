// Build the idiom pack. URL overlap is only a preflight check, not evidence that a source was read.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const RAW = new URL('../content/raw/idioms/', import.meta.url)
const OUT = new URL('../src/data/idioms/', import.meta.url)
const FIELDS = ['w', 'pat', 't', 'lit', 'eq', 's', 'form', 'tr', 'reg', 'area', 'level', 'theme']
const key = (w) => w.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
const tokens = (s) => fold(s).match(/\p{L}+/gu) ?? []
const STOP = {
  es: new Set('a al de del el la las los un una unos unas en por para con sin y o que se me te le les lo nos os su sus mi tu alguien algo no ni'.split(' ')),
  fr: new Set('a au aux de du des le la les un une en par pour avec sans et ou que qui se me te lui leur nous vous on il elle ils elles son sa ses mon ma mes ton ta tes quelqu un quelque chose je j tu ne n pas l d s'.split(' ')),
  en: new Set('a an the to of in on at for from with without and or it its someone somebody something one s my your his her our their no not'.split(' ')),
}

export function sourceMatches(language, idiom, address) {
  if (typeof address !== 'string') return false
  try {
    const url = new URL(address)
    if (!['http:', 'https:'].includes(url.protocol)) return false
    // Ignore the hostname and fragment. Decode percent escapes and query '+' separators.
    const path = decodeURIComponent(url.pathname)
    const query = [...url.searchParams].flat().join(' ')
    const content = (value) => tokens(value).filter((w) => !STOP[language].has(w))
    // French dictionary URLs use singular headwords even when an idiom fixes a plural.
    // Keep whole-token comparisons: this is an address preflight, never source verification.
    const forms = (word) => language === 'fr' && word.length > 3 && word.endsWith('s')
      ? [word, word.slice(0, -1)] : [word]
    const available = new Set(content(`${path} ${query}`).flatMap(forms))
    return content(idiom).flatMap(forms).some((w) => available.has(w))
  } catch { return false }
}

// Official ninth-edition entries have opaque IDs instead of headwords in their URLs.
// Require an explicit, dated editorial locator; this does not replace reading the source.
export function hasReviewedFrenchLocator(row, address) {
  if (typeof row?.w !== 'string' || !row.w.trim()) return false
  try {
    const url = new URL(address)
    if (url.protocol !== 'https:' || !['dictionnaire-academie.fr', 'www.dictionnaire-academie.fr'].includes(url.host)
      || !/^\/article\/A9[A-Z]\d{4}$/.test(url.pathname)) return false
    return Array.isArray(row.sourceChecks) && row.sourceChecks.some((check) => check.url === address
      && ['dictionary_entry_opened', 'dictionary_search_excerpt'].includes(check.verification)
      && /^\d{4}-\d{2}-\d{2}$/.test(check.checkedOn ?? '')
      && typeof check.locator === 'string' && fold(key(check.locator)).includes(fold(key(row.w ?? ''))))
  } catch { return false }
}

export function buildIdioms({ raw = RAW, out = OUT, log = console.log, error = console.error, warn = console.warn } = {}) {
  let failed = false
  const packs = []
  const uses = new Map()
  for (const language of ['en', 'fr', 'es']) {
    const files = readdirSync(raw).filter((f) => new RegExp(`^${language}-\\d{4}\\.json$`).test(f)).sort()
    const seen = new Map()
    const items = []
    for (const file of files) {
      for (const row of JSON.parse(readFileSync(new URL(file, raw), 'utf8'))) {
        const k = key(row.w ?? '')
        if (seen.has(k)) {
          error(`${file}: "${row.w}" ${seen.get(k)} içinde zaten var`)
          failed = true
          continue
        }
        // Preserve the source-free seed batch; later batches need two relevant addresses.
        if (file !== `${language}-0000.json`) {
          if (!(Array.isArray(row.src) && row.src.filter(Boolean).length >= 2)) {
            error(`${file}: "${row.w}" iki kaynak (src) göstermiyor`)
            failed = true
          }
        }
        for (const address of Array.isArray(row.src) ? row.src : []) {
          if (!sourceMatches(language, row.w ?? '', address) && !(language === 'fr' && hasReviewedFrenchLocator(row, address))) {
            error(`${file}: "${row.w}" kaynak yolu/sorgusunda içerik kelimesi yok veya adres geçersiz: ${address}`)
            failed = true
          }
        }
        for (const address of new Set(Array.isArray(row.src) ? row.src : [])) {
          const ids = uses.get(address) ?? new Set()
          ids.add(`${language}:${k}`)
          uses.set(address, ids)
        }
        seen.set(k, file)
        const item = {}
        for (const f of FIELDS) if (typeof row[f] === 'string' && row[f].trim()) item[f] = row[f].trim()
        items.push(item)
      }
    }
    packs.push({ language, files, items })
  }
  for (const [address, ids] of uses) if (ids.size > 3) warn(`Uyarı: aynı kaynak ${ids.size} deyimde kullanılıyor: ${address}`)
  // A rejected batch must not overwrite any previously built pack.
  if (failed) return false
  mkdirSync(out, { recursive: true })
  for (const { language, files, items } of packs) {
    writeFileSync(new URL(`${language}.json`, out), JSON.stringify({ language, source: 'Diloloji (özgün)', items }, null, 1) + '\n')
    const by = (f) => Object.entries(Object.groupBy(items, (i) => i[f])).map(([k, v]) => `${k} ${v.length}`).join(', ')
    log(`${language}: ${items.length} deyim (${files.length} parti) · ${by('level')}\n   ${by('theme')}`)
  }
  return true
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && !buildIdioms()) process.exitCode = 1
