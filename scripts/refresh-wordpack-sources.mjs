#!/usr/bin/env node
/** Download official source snapshots with hashes; failed downloads never replace a cached file. */
import { mkdirSync, createWriteStream, renameSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createHash } from 'node:crypto'
const dir = process.argv[2] ?? '.wordpack-cache'
const requested = process.argv.slice(3)
const sources = {
  tr: 'https://kaikki.org/trwiktionary/raw-wiktextract-data.jsonl',
  en: 'https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl',
  fr: 'https://kaikki.org/dictionary/French/kaikki.org-dictionary-French.jsonl',
  es: 'https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl',
}
mkdirSync(dir, { recursive: true })
const manifestPath = join(dir, 'manifest.json')
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}
for (const language of requested.length ? requested : Object.keys(sources)) {
  if (!sources[language]) throw new Error(`Unknown source: ${language}`)
  const filename = language === 'tr' ? 'trwiktionary.jsonl' : `${language}.jsonl`
  const path = join(dir, filename)
  const response = await fetch(sources[language], { headers: manifest[language]?.etag && existsSync(path) ? { 'if-none-match': manifest[language].etag } : {}, signal: AbortSignal.timeout(20 * 60 * 1000) })
  if (response.status === 304) { console.log(`${language}: unchanged`); continue }
  if (!response.ok || !response.body) throw new Error(`${language}: source download HTTP ${response.status}; existing cache preserved`)
  const hash = createHash('sha256')
  let bytes = 0
  async function* checksum(stream) {
    for await (const chunk of stream) { bytes += chunk.length; if (bytes > 6_000_000_000) throw new Error('Source too large'); hash.update(chunk); yield chunk }
  }
  try {
    await pipeline(checksum(Readable.fromWeb(response.body)), createWriteStream(`${path}.part`))
    if (!bytes) throw new Error('Empty source')
    renameSync(`${path}.part`, path)
  } catch (error) { rmSync(`${path}.part`, { force: true }); throw error }
  manifest[language] = { url: sources[language], filename, fetchedAt: new Date().toISOString(), lastModified: response.headers.get('last-modified'), etag: response.headers.get('etag'), sha256: hash.digest('hex'), bytes, license: 'CC BY-SA 4.0 / Wiktionary' }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`${language}: ${bytes} bytes downloaded and hashed`)
}
