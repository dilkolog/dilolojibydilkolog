import type { TargetLanguage } from '../engine/types'

/**
 * Google Translate's saved translations (Saved → Export to Google Sheets, then download as CSV;
 * or Google Takeout). Each row: source language, target language, source text, translation,
 * with language names in the interface language. Pairs with Turkish become words (short) or
 * sentence cards (long); the foreign side is always the one learned.
 */

/** RFC 4180-style CSV (quotes, doubled quotes, commas or semicolons, line breaks in quotes). */
export function parseCsv(raw: string): string[][] {
  const text = raw.replace(/^﻿/, '')
  const sep = (text.split('\n')[0].match(/;/g)?.length ?? 0) > (text.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === sep) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      if (row.some((x) => x.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim())) rows.push(row)
  return rows
}

type Lang = TargetLanguage | 'tr'

/** Language names as Google writes them in its interface languages (and plain codes). */
const NAMES: Record<Lang, string[]> = {
  en: ['english', 'ingilizce', 'anglais', 'inglés', 'ingles', 'englisch', 'en'],
  fr: ['french', 'fransızca', 'fransizca', 'français', 'francais', 'francés', 'frances', 'französisch', 'fr'],
  es: ['spanish', 'ispanyolca', 'i̇spanyolca', 'espagnol', 'español', 'espanol', 'spanisch', 'es'],
  tr: ['turkish', 'türkçe', 'turkce', 'turc', 'turco', 'türkisch', 'tr'],
}

export function languageOf(name: string): Lang | null {
  const n = name.trim().toLocaleLowerCase('tr').replace(/\s*\(.*\)$/, '')
  for (const [lang, names] of Object.entries(NAMES) as [Lang, string[]][]) if (names.includes(n)) return lang
  return null
}

export interface TranslateItem {
  language: TargetLanguage
  /** The foreign text. */
  text: string
  /** Its Turkish. */
  turkish: string
  kind: 'word' | 'sentence'
}

/** A phrase of up to four words without sentence punctuation is a word; anything longer, a sentence. */
const isSentence = (s: string) => s.trim().split(/\s+/).length > 4 || /[.!?¿¡]\s*$/.test(s.trim())

export interface TranslateImport {
  items: TranslateItem[]
  /** Rows without Turkish on either side, or in other languages. */
  skipped: number
}

export function readTranslateExport(raw: string): TranslateImport {
  const items: TranslateItem[] = []
  let skipped = 0
  for (const row of parseCsv(raw)) {
    if (row.length < 4) {
      skipped++
      continue
    }
    const [fromName, toName, source, target] = row
    const from = languageOf(fromName)
    const to = languageOf(toName)
    if (!from || !to || !source.trim() || !target.trim()) {
      skipped++
      continue
    }
    const pair = from === 'tr' && to !== 'tr' ? { language: to, text: target, turkish: source } : to === 'tr' && from !== 'tr' ? { language: from, text: source, turkish: target } : null
    if (!pair) {
      skipped++
      continue
    }
    items.push({ ...pair, text: pair.text.trim(), turkish: pair.turkish.trim(), kind: isSentence(pair.text) ? 'sentence' : 'word' })
  }
  return { items, skipped }
}
