import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { grammarExercises } from '../grammar'
import { checkPool, lessonsOf } from './lessonOf'

/** Rewrites docs/veri/rehber-ders-listesi.md (the lesson list the content work goes by) from the lessons; only with WRITE_GUIDE_MANIFEST=1. */
it.runIf(process.env.WRITE_GUIDE_MANIFEST)('writes the lesson list', () => {
  const names = { fr: 'Fransızca', es: 'İspanyolca', en: 'İngilizce' } as const
  const out = [
    '# Rehber ders listesi (15. tur için)',
    '',
    'Her ders için: `topic` (soru dosyalarında kullanılacak anahtar), seviye, başlık, bugünkü soru havuzu (kendi 3 sorusu + `checks/*.json`) ve dersin bağlı olduğu dilbilgisi soru bankasında kaç soru olduğu. **Hedef: havuz ≥ 10.** Bu dosya `src/data/guide/` içindeki derslerden üretilir.',
    '',
    'Yeniden üretme: `WRITE_GUIDE_MANIFEST=1 npx vitest run src/data/guide/guideManifest.test.ts`.',
    '',
  ]
  for (const l of ['fr', 'es', 'en'] as const) {
    const lessons = lessonsOf(l)
    const questions = grammarExercises(l)
    out.push(`## ${names[l]} (${l}) — ${lessons.length} ders`, '', '| topic | seviye | başlık | havuz | soru bankası |', '|---|---|---|---|---|')
    for (const x of lessons) out.push(`| \`${x.topic}\` | ${x.level} | ${x.title.replace(/\|/g, '/')} | ${checkPool(x).length} | ${questions.filter((q) => q.topic === (x.practice ?? x.topic)).length} |`)
    out.push('')
  }
  writeFileSync('docs/veri/rehber-ders-listesi.md', out.join('\n'))
})
