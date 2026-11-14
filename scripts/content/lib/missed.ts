import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/** One row of content_item_stats() (supabase/migrations/0015_content_item_stats.sql). */
export interface ItemRow {
  kind: string
  item: string
  people: number
  ok: number
  wrong: number
  last_at?: string | null
}

export interface RankedItem extends ItemRow {
  answers: number
  /** Share of the answers that were wrong, 0–1. */
  miss: number
}

/** Fewer answers than this say nothing yet about an item. */
export const MIN_ANSWERS = 5
/** "Everyone gets it right": at least this many answers, from at least two people, none wrong. */
export const EASY_ANSWERS = 10

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0)

/**
 * The items to look at: the most missed (wrong share first, then how many wrong), and the ones nobody misses.
 * With few learners the numbers are noisy; they still catch an item that is plainly broken.
 */
export function rankItems(rows: readonly ItemRow[], top = 20, easyTop = 10): { missed: RankedItem[]; easy: RankedItem[] } {
  const ranked = rows.map((r) => {
    const ok = num(r.ok)
    const wrong = num(r.wrong)
    const answers = ok + wrong
    return { ...r, people: num(r.people), ok, wrong, answers, miss: answers ? wrong / answers : 0 }
  })
  const missed = ranked
    .filter((r) => r.answers >= MIN_ANSWERS && r.wrong > 0)
    .sort((a, b) => b.miss - a.miss || b.wrong - a.wrong || a.item.localeCompare(b.item))
    .slice(0, top)
  const easy = ranked
    .filter((r) => r.answers >= EASY_ANSWERS && r.wrong === 0 && r.people >= 2)
    .sort((a, b) => b.answers - a.answers || a.item.localeCompare(b.item))
    .slice(0, easyTop)
  return { missed, easy }
}

export interface ItemInfo {
  text: string
  file: string
}

const TEXT_FIELDS = ['prompt', 'sentence', 'q', 'question', 'title', 'text', 'w', 'word', 'lemma'] as const

const textOf = (o: Record<string, unknown>) => {
  for (const f of TEXT_FIELDS) if (typeof o[f] === 'string' && (o[f] as string).trim()) return (o[f] as string).replace(/\s+/g, ' ').trim()
  return ''
}

/** Every object with an `id` in the content (src/data JSON, content/raw JSONL), and an exam set's questions as "<set>|<n>". */
export function buildIndex(root = '.'): Map<string, ItemInfo> {
  const index = new Map<string, ItemInfo>()
  const visit = (value: unknown, file: string) => {
    if (Array.isArray(value)) {
      for (const v of value) visit(v, file)
      return
    }
    if (!value || typeof value !== 'object') return
    const o = value as Record<string, unknown>
    if (typeof o.id === 'string' && !index.has(o.id)) {
      index.set(o.id, { text: textOf(o), file })
      if (Array.isArray(o.questions))
        o.questions.forEach((q, i) => {
          if (q && typeof q === 'object') index.set(`${o.id}|${i + 1}`, { text: textOf(q as Record<string, unknown>), file })
        })
    }
    for (const v of Object.values(o)) if (v && typeof v === 'object') visit(v, file)
  }
  const walk = (dir: string, ext: RegExp) => {
    let names: string[] = []
    try {
      names = readdirSync(dir)
    } catch {
      return
    }
    for (const n of names) {
      const path = join(dir, n)
      if (statSync(path).isDirectory()) walk(path, ext)
      else if (ext.test(n) && !/wordpack/.test(path)) {
        const text = readFileSync(path, 'utf8')
        const file = relative(root, path)
        try {
          if (n.endsWith('.jsonl')) for (const line of text.split('\n')) line.trim() && visit(JSON.parse(line), file)
          else visit(JSON.parse(text), file)
        } catch {
          // A file that is not JSON (or not whole) has no items for the report.
        }
      }
    }
  }
  walk(join(root, 'src', 'data'), /\.json$/)
  walk(join(root, 'content', 'raw'), /\.jsonl$/)
  return index
}

/** A word of the pack ("fr:maison") as "maison: ev"; a learner's own word is not in the repository. */
export function wordInfo(id: string, root = '.'): ItemInfo | undefined {
  const [lang, lemma] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)]
  if (!lang || !lemma) return undefined
  try {
    const pack = JSON.parse(readFileSync(join(root, 'src', 'data', 'wordpack', `${lang}.json`), 'utf8')) as { w?: Record<string, { t?: string[] }> }
    const entry = pack.w?.[lemma]
    return entry ? { text: `${lemma}: ${entry.t?.slice(0, 3).join(', ') ?? ''}`, file: `src/data/wordpack/${lang}.json` } : undefined
  } catch {
    return undefined
  }
}

const KIND_TR: Record<string, string> = {
  word: 'Kelime',
  grammar: 'Dilbilgisi',
  examTasks: 'Sınav seti',
  traps: 'Tuzak kelime',
  register: 'Kayıt farkı',
  flow: 'Metin akışı',
  affixes: 'Ek',
  reflex: 'Refleks',
  pairs: 'Eşleşme',
  enVerbs: 'İngilizce fiil',
}

const cell = (s: string) => s.replace(/\|/g, '\\|').slice(0, 90)

/** The report as Markdown: the most missed items and the ones nobody misses, each with its text and file. */
export function missedMarkdown(rows: readonly ItemRow[], lookup: (row: ItemRow) => ItemInfo | undefined, since: string): string {
  const { missed, easy } = rankItems(rows)
  const table = (items: RankedItem[]) =>
    [
      '| # | Tür | Kimlik | Kişi | Cevap | Yanlış | Metin | Dosya |',
      '|---:|---|---|---:|---:|---:|---|---|',
      ...items.map((r, i) => {
        const info = lookup(r)
        return `| ${i + 1} | ${KIND_TR[r.kind] ?? r.kind} | \`${cell(r.item)}\` | ${r.people} | ${r.answers} | %${Math.round(r.miss * 100)} | ${cell(info?.text ?? (r.kind === 'word' ? '(öğrencinin kendi kelimesi)' : '(bulunamadı)'))} | ${info?.file ?? ''} |`
      }),
    ].join('\n')
  return [
    `# İçerik raporu: ${since} sonrası`,
    '',
    `${rows.length} öğe cevaplandı. En az ${MIN_ANSWERS} cevabı olan öğeler sayıldı; öğrenci azken sonuçlar gürültülüdür, bariz hataları yakalar. Bozuk bir soruyu düzeltene kadar \`npm run content -- retire <kimlik>\` ile emekliye ayır (yalnızca fabrika içeriği).`,
    '',
    `## En çok yanlış yapılanlar (${missed.length})`,
    '',
    missed.length ? table(missed) : 'Yeterli cevap yok.',
    '',
    `## Hep doğru bilinenler (${easy.length})`,
    '',
    `En az ${EASY_ANSWERS} cevap, en az iki kişi, hiç yanlış yok: çok kolay ya da gereksiz olabilir.`,
    '',
    easy.length ? table(easy) : 'Yok.',
    '',
  ].join('\n')
}
