import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { shardOf, type ContentGrammar, type ReadingItem } from '../../src/engine/contentTypes'
import { checkBatch } from './lib/batch'
import { loadContext, type CheckContext } from './lib/context'
import { derive } from './lib/derive'
import { acceptedItems, emptiest, grammarCells, nextJobs, openJobs, readingCells } from './lib/plan'
import { checkGrammarItem, checkReading, levelFit, rankFit, speakers, topicUses, wordLevel, wordRank } from './lib/rules'
import { sampleMarkdown } from './lib/sample'
import { buildContent, idRanges } from './lib/shards'
import { jaccard, shingles, SimilarityIndex } from './lib/similarity'
import { solverStats } from './lib/solver'
import type { ContentJob } from './lib/types'

const fixture = <T>(name: string) => JSON.parse(readFileSync(`scripts/content/fixtures/${name}.json`, 'utf8')) as T
const frText = fixture<ReadingItem>('reading-fr')
const esText = fixture<ReadingItem>('reading-es')
const frGrammar = fixture<ContentGrammar[]>('grammar-fr')
const frStarter = fixture<ReadingItem>('reading-fr-starter')

let fr: CheckContext
let es: CheckContext
beforeAll(() => {
  fr = loadContext('fr')
  es = loadContext('es')
})

const readingJob = (over: Partial<ContentJob> = {}): ContentJob => ({
  id: 'fr-reading-0001',
  language: 'fr',
  kind: 'reading',
  level: 'A1',
  theme: 'alisveris',
  genre: 'story',
  grammar: ['basics_fr_present'],
  count: 5,
  ids: { from: 1, to: 5 },
  createdAt: '2026-11-04T00:00:00.000Z',
  ...over,
})

describe('similarity', () => {
  it('finds a near copy and ignores a different text', () => {
    const a = 'Le samedi, Léa va au marché avec sa mère et elle achète des pommes.'
    expect(jaccard(shingles(a), shingles(a))).toBe(1)
    const index = new SimilarityIndex(5, 32)
    index.add('one', a)
    index.add('two', 'Mon frère joue au football dans le parc après l’école tous les jours.')
    expect(index.closest('new', 'Le samedi, Léa va au marché avec sa mère et elle achète des poires.', 0.4)?.id).toBe('one')
    expect(index.closest('new', 'Nous partons en vacances à la montagne au mois de juillet.', 0.4)).toBeUndefined()
  })
})

describe('reading checks', () => {
  it('a good text passes', () => {
    expect(checkReading(frText, fr, { job: readingJob() }).errors).toEqual([])
    expect(checkReading(esText, es, { job: readingJob({ id: 'es-reading-0001', language: 'es', theme: 'aile', genre: 'email', grammar: ['basics_es_presente'] }) }).errors).toEqual([])
  })

  it('knows words by their forms, and names are left out', () => {
    expect(wordLevel('mangent', fr)).toBe('A1')
    expect(wordLevel('pequeñas', es)).toBeTruthy()
    expect(levelFit('Léa et Karim habitent à Lille.', 'A1', fr).above).toEqual([])
  })

  it('a starter text: short, from the most frequent words, in a starter job', () => {
    const job = readingJob({ id: 'fr-reading-0003', theme: undefined, genre: undefined, count: 25, starter: true, ids: { from: 6, to: 30 } })
    expect(checkReading(frStarter, fr, { job }).errors).toEqual([])
    expect(checkReading(frStarter, fr, { job: { ...job, starter: undefined } }).errors.join()).toMatch(/not for starter texts/)
    expect(checkReading({ ...frStarter, starter: undefined }, fr, { job }).errors.join()).toMatch(/asks for starter texts/)
    expect(checkReading({ ...frStarter, level: 'A2' }, fr).errors.join()).toMatch(/a starter text is A1/)
    // The ordinary A1 band is longer: the same text is too short for it.
    expect(checkReading({ ...frStarter, starter: undefined }, fr).errors.join()).toMatch(/words, A1 asks 60/)
    const rare = { ...frStarter, paragraphs: frStarter.paragraphs.map((p, i) => (i === 1 ? `${p} Le football, la guitare et le chocolat.` : p)) }
    expect(checkReading(rare, fr).errors.join()).toMatch(/starter: only \d+ %/)
  })

  it('knows frequency ranks, the A1 allowance and dialogue speakers', () => {
    expect(wordRank('mangent', fr)).toBeLessThanOrEqual(500)
    expect(wordRank('xylophonique', fr)).toBeUndefined()
    // "pain" ranks past 1500 in a subtitle list but is an A1 word: known within the A1 allowance, not within 300 alone.
    expect(rankFit('Le pain.', 300, fr).share).toBeLessThan(1)
    expect(rankFit('Le pain.', 300, fr, 2000).share).toBe(1)
    expect([...speakers('Lucía: Hola.\nLuc, au café : Bonjour.\nUne femme : Oui.')]).toEqual(['Lucía', 'Luc'])
  })

  it('wants half the key words from the level list', () => {
    const vocabulary = [['épistémologie', 'épistémologie'], ['exhaustivité', 'exhaustivité'], ['controverse', 'controverse'], ['perspective', 'perspective'], ['néanmoins', 'néanmoins'], ['demeure', 'demeurer']].map(([word, lemma]) => ({ word, lemma, tr: 'x' }))
    const text = { ...frText, paragraphs: [...frText.paragraphs.slice(0, -1), `${frText.paragraphs.at(-1)} Néanmoins : épistémologie, exhaustivité, controverse, perspective ; elle demeure.`], vocabulary }
    expect(checkReading(text, fr).errors.join()).toMatch(/key words are on the A1 list/)
  })

  it('refuses a text above its level, too short, or without its grammar target', () => {
    const hard = { ...frText, paragraphs: frText.paragraphs.map((p) => `${p} Néanmoins, l’exhaustivité de cette perspective épistémologique demeure controversée.`) }
    expect(checkReading(hard, fr).errors.join()).toMatch(/A1 or below/)
    const short = { ...frText, paragraphs: ['Léa va au marché.'], tr: ['Léa pazara gider.'] }
    expect(checkReading(short, fr).errors.join()).toMatch(/words, A1 asks/)
    expect(checkReading({ ...frText, grammar: ['futur_fr'] }, fr).errors.join()).toMatch(/futur_fr" is used 0 times/)
    expect(topicUses(frText.paragraphs.join(' '), 'basics_fr_present', fr)).toBeGreaterThanOrEqual(3)
  })

  it('refuses broken shapes: Turkish, vocabulary, questions, job, banned words', () => {
    expect(checkReading({ ...frText, tr: frText.tr.slice(1) }, fr).errors.join()).toMatch(/Turkish/)
    expect(checkReading({ ...frText, vocabulary: [...frText.vocabulary.slice(1), { word: 'chameau', lemma: 'chameau', tr: 'deve' }] }, fr).errors.join()).toMatch(/not in the text/)
    expect(checkReading({ ...frText, questions: [{ ...frText.questions[0], answer: 7 }, ...frText.questions.slice(1)] }, fr).errors.join()).toMatch(/answer is no option/)
    expect(checkReading({ ...frText, id: 'fr-r-000009' }, fr, { job: readingJob() }).errors.join()).toMatch(/outside the job/)
    const banned = { ...frText, paragraphs: [...frText.paragraphs.slice(0, 2), `${frText.paragraphs[2]} Ils parlent de la guerre.`] }
    expect(checkReading(banned, fr).errors.join()).toMatch(/banned words: guerre/)
  })

  it('refuses the same text twice in a batch', () => {
    const twin = { ...frText, id: 'fr-r-000002', title: 'Encore le marché' }
    const r = checkBatch('reading', [frText, twin], fr, { job: readingJob() })
    expect(r.accepted).toEqual(['fr-r-000001'])
    expect(r.rejected[0].reasons.join()).toMatch(/like fr-r-000001/)
  })
})

describe('grammar checks', () => {
  const job: ContentJob = { id: 'fr-grammar-0001', language: 'fr', kind: 'grammar', level: 'A2', grammar: ['passe_imparfait'], count: 3, subskills: ['betimleme', 'alışkanlık', 'araya giren olay'], ids: { from: 1, to: 3 }, createdAt: '' }

  it('good questions pass', () => {
    for (const q of frGrammar) expect(checkGrammarItem(q, fr, { job }).errors, q.id).toEqual([])
  })

  it('refuses two right options, a missing gap, a wrong level and a weak rule', () => {
    const two = { ...frGrammar[0], options: ['allais', 'Allais', 'irai'] }
    expect(checkGrammarItem(two, fr).errors.join()).toMatch(/more than one option/)
    expect(checkGrammarItem({ ...frGrammar[1], prompt: 'Je lisais un livre.' }, fr).errors.join()).toMatch(/one "___"/)
    expect(checkGrammarItem({ ...frGrammar[0], level: 'B2' }, fr, { job }).errors.join()).toMatch(/differs from the job/)
    expect(checkGrammarItem({ ...frGrammar[0], explanation: 'İmparfait.' }, fr).errors.join()).toMatch(/20 characters/)
    expect(checkGrammarItem({ ...frGrammar[0], difficulty: 9 }, fr).errors.join()).toMatch(/difficulty/)
  })

  it('the solver pass counts a disagreement when the solver finds another answer or a second right one', () => {
    const s = solverStats(frGrammar, { job: 'fr-grammar-0001', results: [{ id: 'fr-g-000001', answer: 'allais', single: true }, { id: 'fr-g-000002', answer: 'sonnait', single: true }, { id: 'fr-g-000003', answer: 'mangeons', single: false }] })
    expect(s).toEqual({ checked: 3, disagreements: 2, rate: 2 / 3 })
  })
})

describe('build', () => {
  it('ranges never overlap across files, and an id finds its file', () => {
    const all = ['a1', 'a2', 'a3', 'a4', 'a5']
    expect(idRanges(['a1', 'a2', 'a4'], all)).toEqual([['a1', 'a2'], ['a4', 'a4']])
    const g = Array.from({ length: 650 }, (_, i) => ({ ...frGrammar[0], id: `fr-g-${String(i + 1).padStart(6, '0')}`, topic: i % 2 ? 'passe_imparfait' : 'futur_fr' }))
    const { manifest, files } = buildContent('fr', [frText], g, ['fr-g-000650'])
    expect(manifest.counts.grammar.total).toBe(649)
    expect(manifest.grammar.passe_imparfait.map((s) => s.count)).toEqual([300, 24])
    expect(manifest.retired).toEqual(['fr-g-000650'])
    const shard = shardOf(manifest.grammar.passe_imparfait, 'fr-g-000002')!
    expect((JSON.parse(files.get(shard.path)!) as { id: string }[]).some((q) => q.id === 'fr-g-000002')).toBe(true)
    expect(shardOf(manifest.grammar.futur_fr, 'fr-g-000002')).toBeUndefined()
    expect(manifest.reading.A1?.[0].path).toMatch(/^reading\/A1\/1-[0-9a-f]{8}\.json$/)
    // Published files carry no factory fields.
    expect(JSON.parse(files.get(manifest.reading.A1![0].path)!)[0].batch).toBeUndefined()
    // The same content gives the same names (a browser keeps them).
    expect(buildContent('fr', [frText], g, ['fr-g-000650']).manifest.version).toBe(manifest.version)
  })
})

describe('plan and jobs', () => {
  it('fills the emptiest cells with jobs whose id ranges never collide', () => {
    const plan = fr.plan
    const cells = readingCells(plan, [], [])
    expect(cells.length).toBe(5 * plan.themes.length * plan.genres.length)
    const jobs = nextJobs(plan, 'reading', cells, [], [], { count: 3, size: 5, level: 'A1' })
    expect(jobs.map((j) => j.id)).toEqual(['fr-reading-0001', 'fr-reading-0002', 'fr-reading-0003'])
    expect(jobs.map((j) => j.ids)).toEqual([{ from: 1, to: 3 }, { from: 4, to: 6 }, { from: 7, to: 9 }])
    expect(new Set(jobs.map((j) => j.theme)).size).toBe(3)
    // A second run counts the first as planned and continues after its ids.
    const again = nextJobs(plan, 'reading', readingCells(plan, [], jobs), jobs, [], { count: 1, size: 5, level: 'A1' })
    expect(again[0].ids.from).toBe(10)
    expect(again[0].id).toBe('fr-reading-0004')
    expect(jobs.map((j) => j.theme)).not.toContain(again[0].theme)
  })

  it('a grammar job takes the topic’s sub-skills; reports close jobs and count accepted items', () => {
    const cells = grammarCells(fr.plan, [], [])
    const [job] = nextJobs(fr.plan, 'grammar', cells, [], [], { count: 1, topic: 'passe_imparfait' })
    expect(job.subskills).toContain('alışkanlık')
    expect(job.count).toBe(50)
    const report = { job: job.id, language: 'fr' as const, kind: 'grammar' as const, total: 50, accepted: Array.from({ length: 50 }, (_, i) => `x${i}`), rejected: [], warnings: [], rate: 1 }
    expect(openJobs([job], [report])).toEqual([])
    expect(acceptedItems([{ id: 'x1' }, { id: 'y' }], [report])).toEqual([{ id: 'x1' }])
    expect(emptiest(cells)[0].have).toBe(0)
  })
})

describe('sample and derive', () => {
  it('a sample lists items with a line to judge', () => {
    const md = sampleMarkdown(readingJob(), [frText], 10, 1)
    expect(md).toContain('## fr-r-000001 · Le marché du samedi')
    expect(md).toContain('Değerlendirme:')
    const question = { ...frGrammar[0], hint: 'Utilisez le temps composé indiqué.' }
    const grammarSample = sampleMarkdown(readingJob({ kind: 'grammar' }), [question], 10, 1)
    expect(grammarSample).toContain(`**İpucu:** ${question.hint}`)
  })

  it('derives gaps of the target tense and the listed words, with ids from the text', () => {
    const d = derive(frText, fr)
    expect(d.grammar.length).toBeGreaterThan(0)
    for (const g of d.grammar) {
      expect(g.id).toMatch(/^fr-r-000001-c\d\d$/)
      expect(g.prompt).toContain('___')
      expect(checkGrammarItem({ ...g, source: 'Diloloji (özgün)' }, fr).errors).toEqual([])
    }
    expect(d.vocabulary.find((v) => v.answer === 'gare')?.prompt).toContain('___')
  })
})

describe('plans', () => {
  it('both languages share themes and genres, every name is in the app, and every level topic is a known topic', async () => {
    const { GENRE_TR, THEME_TR } = await import('../../src/data/contentNames')
    const { TOPIC_NAME } = await import('../../src/engine/grammar')
    for (const ctx of [fr, es]) {
      expect(ctx.plan.themes.length).toBeGreaterThanOrEqual(50)
      for (const t of ctx.plan.themes) expect(THEME_TR[t.id], t.id).toBe(t.tr)
      for (const g of ctx.plan.genres) expect(GENRE_TR[g.id], g.id).toBe(g.tr)
      for (const level of Object.values(ctx.plan.levels)) for (const topic of level.topics) expect(TOPIC_NAME[topic], topic).toBeTruthy()
    }
    expect(es.plan.themes.map((t) => t.id)).toEqual(fr.plan.themes.map((t) => t.id))
  })
})
