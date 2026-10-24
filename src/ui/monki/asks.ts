import type { VocabularyEntry } from '../../engine/types'
import { displayForm } from '../../engine/exercises'
import type { ExamTask } from '../../engine/examTasks'
import type { MonkiAsk } from './monkiBus'

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** On a word's page: what it means, how it is used, what it is mixed up with. */
export function wordAsk(entry: VocabularyEntry): MonkiAsk {
  const sense = entry.senses[0]
  const example = sense.examples.find((e) => e.text)?.text
  return {
    text: clip(
      `“${displayForm(entry)}” (${sense.gloss}) kelimesini anlatır mısın? Nasıl ve ne zaman kullanılır, hangi kelimelerle karışır, aynı aileden birkaç kelime var mı?${example ? ` Örnek: ${example}` : ''}`,
      600,
    ),
    send: true,
  }
}

/** After a miss: why it might have gone wrong and how to keep the right one. `forgot` = the learner asked to see the answer. */
export function missAsk(entry: VocabularyEntry, given: string | undefined, expected: string, forgot?: boolean, history?: { wrong: number; reviews: number }): MonkiAsk {
  const word = `“${displayForm(entry)}” (${entry.senses[0].gloss})`
  return {
    text: clip(
      (forgot
        ? `${word} kelimesini hatırlayamadım, doğrusu “${expected}”. Aklımda tutmam için bir ipucu ve kısa bir örnek verir misin?`
        : `${word} sorusunda yanlış yaptım${given ? `: “${given}” yazdım` : ''}, doğrusu “${expected}”. Neden karıştırmış olabilirim, nasıl hatırlarım?`) + repeatNote(history),
      700,
    ),
    send: true,
  }
}

/** A word that has gone wrong before: said in the question, so the answer can name the pattern instead of starting over. */
export function repeatNote(history?: { wrong: number; reviews: number }): string {
  if (!history || history.wrong < 3) return ''
  return ` Bu kelimeyi ${history.reviews} denemenin ${history.wrong} tanesinde yanlış yaptım; hep aynı yerde mi takılıyorum, bunu bir kalıba bağlar mısın?`
}

/** On a guide lesson: the lesson told another way, with the learner's own wrong answer when there is one. */
export function lessonAsk(title: string, summary: string, rules: readonly string[], question?: { prompt: string; chosen: string; right: string }): MonkiAsk {
  const gist = clip(`${summary} ${rules.slice(0, 2).join(' ')}`.trim(), 360)
  return {
    text: clip(
      question
        ? `“${title}” dersinin mini sınavında şu soruyu yanlış yaptım: “${question.prompt}” — “${question.chosen}” seçtim, doğrusu “${question.right}”. Kuralı bana başka bir yoldan anlatır mısın, benzer yeni bir örnek verir misin? (Ders özeti: ${gist})`
        : `“${title}” dersini bana başka bir yoldan, kendi örneklerinle anlatır mısın? Hangi yerde en çok hata yapılır, nasıl ayırt ederim? (Ders özeti: ${gist})`,
      800,
    ),
    send: true,
  }
}

/** In the writing notebook: a kind of mistake that keeps coming back, with what was written and what it should have been. */
export function habitAsk(label: string, count: number, samples: readonly { wrong: string; fix: string }[]): MonkiAsk {
  const seen = samples.slice(0, 2).map((s) => `“${s.wrong}” → “${s.fix}”`).join('; ')
  return {
    text: clip(`Yazılarımda “${label}” türünde ${count} hata yaptım${seen ? ` (ör. ${seen})` : ''}. Neden sürekli aynı hatayı yapıyor olabilirim? Kuralı kısaca anlat ve bana yazarak çözebileceğim küçük bir alıştırma ver.`, 700),
    send: true,
  }
}

/** In the reader: the sentence and the word that was tapped. */
export function sentenceAsk(sentence: string, word: string): MonkiAsk {
  return {
    text: clip(`Bu cümleyi açıklar mısın: “${sentence}” Özellikle “${word}” burada ne anlama geliyor ve cümlenin dil bilgisi nasıl işliyor?`, 700),
    send: true,
  }
}

const taskLine = (task: ExamTask) => `Görev (${task.exam} ${task.level}, ${task.kind}, ${task.min}–${task.max} kelime): ${clip(task.instruction, 420)}`

/** While writing in the journal: where the text stands and what the task asks, for ideas on how to go on (the text is not corrected). */
export function stuckAsk(text: string, task?: ExamTask): MonkiAsk {
  const so_far = text.trim()
  return {
    mode: 'write',
    text: clip(
      `Yazarken takıldım, devam etmem için yol göster. ${task ? `${taskLine(task)} ` : ''}${so_far ? `Şimdiye kadar yazdığım: “${clip(so_far, 1500)}”` : 'Henüz hiçbir şey yazmadım.'}`,
      2200,
    ),
    send: true,
  }
}

/** A text written for an exam-style task, sent to be rated on the exam's four criteria. */
export function examAsk(task: ExamTask, text: string): MonkiAsk {
  return {
    mode: 'exam',
    text: clip(`Bu yazıyı sınav ölçütlerine göre değerlendirir misin? ${taskLine(task)} Yazım: “${clip(text.trim(), 1700)}”`, 2400),
    send: true,
  }
}
