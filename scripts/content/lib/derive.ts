import { LESSON_TENSE } from '../../../src/data/guide/tenseTopics'
import type { ContentGrammar, ReadingItem } from '../../../src/engine/contentTypes'
import { analyzeText } from '../../../src/engine/reading'
import { TENSE_BRIEF } from '../../../src/engine/tenseBrief'
import { conjugateTense, type Tense } from '../../../src/engine/tenses'
import { textForms } from '../../../src/engine/textForms'
import type { CheckContext } from './context'

const tenseLabel = (t: Tense) => TENSE_BRIEF[t].name

/**
 * Exercises made by machine from an accepted text (docs/ICERIK-FABRIKASI.md §4.3), never written by an agent:
 * - a grammar gap: a form of the text's target tense blanked in its sentence, the answer taken from the tables;
 * - a word gap: a listed new word blanked in its sentence.
 * Ids come from the text and the sentence ("fr-r-000123-c04", "-v04"), so they stay while the text does.
 */
export interface Derived {
  grammar: ContentGrammar[]
  vocabulary: { id: string; fromText: string; prompt: string; answer: string; tr: string; level: string }[]
}

const pad = (n: number) => String(n).padStart(2, '0')

export function derive(item: ReadingItem, ctx: CheckContext): Derived {
  const text = item.paragraphs.join('\n\n')
  const analysis = analyzeText(text, ctx.language, [], [], new Set())
  const sentences = analysis.paragraphs.flat().map((s) => s.text.trim())
  const grammar: ContentGrammar[] = []
  const used = new Set<number>()
  for (const topic of item.grammar) {
    const tense = LESSON_TENSE[topic]
    if (!tense) continue
    for (const f of textForms(ctx.language, analysis)) {
      if (f.tense !== tense || used.has(f.sentence)) continue
      const sentence = sentences[f.sentence]
      if (!sentence) continue
      const at = sentence.toLocaleLowerCase(ctx.language).replace(/’/g, "'").indexOf(f.form)
      // The form must stand once in its sentence and be a table form of its verb (no guessing).
      if (at < 0 || sentence.toLocaleLowerCase(ctx.language).replace(/’/g, "'").indexOf(f.form, at + 1) >= 0) continue
      const table = conjugateTense({ language: ctx.language, lemma: f.lemma, partOfSpeech: 'verb' }, tense) ?? []
      if (!table.some((t) => t.toLocaleLowerCase(ctx.language) === f.form)) continue
      used.add(f.sentence)
      const answer = sentence.slice(at, at + f.form.length)
      grammar.push({
        id: `${item.id}-c${pad(f.sentence)}`,
        language: item.language,
        level: item.level,
        topic,
        type: 'cloze',
        prompt: `${sentence.slice(0, at)}___${sentence.slice(at + f.form.length)}`,
        answer,
        hint: `${f.lemma} → ${tenseLabel(tense)}`,
        explanation: `Metindeki bu cümlede ${f.lemma} fiili ${tenseLabel(tense)} ile çekilir: "${answer}".`,
        source: 'Diloloji (özgün)',
        difficulty: 2,
        batch: item.batch,
        fromText: item.id,
      })
    }
  }
  const vocabulary: Derived['vocabulary'] = []
  for (const v of item.vocabulary) {
    const i = sentences.findIndex((s) => new RegExp(`(?<![\\p{L}])${v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu').test(s))
    if (i < 0) continue
    const s = sentences[i]
    const m = new RegExp(`(?<![\\p{L}])${v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu').exec(s)!
    vocabulary.push({ id: `${item.id}-v${pad(i)}`, fromText: item.id, prompt: `${s.slice(0, m.index)}___${s.slice(m.index + m[0].length)}`, answer: m[0], tr: v.tr, level: item.level })
  }
  return { grammar, vocabulary }
}
