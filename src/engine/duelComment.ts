import type { DuelResult } from './duel'

export type DuelFace = 'proud' | 'happy' | 'think' | 'surprised'

export interface DuelComment {
  text: string
  face: DuelFace
}

const pick = <T,>(options: readonly T[], seed: number): T => options[Math.abs(seed) % options.length]

/**
 * What Monki says about a finished duel, from the two results alone (no request: it is a few set lines, picked by the scores so a
 * rematch does not repeat the line). `win` is from the learner's side: true, false, or null for a tie. The line names the gap, and
 * on a loss or a tie the rematch.
 */
export function duelComment(mine: Pick<DuelResult, 'score' | 'ms'>, theirs: Pick<DuelResult, 'score' | 'ms'>, total: number, win: boolean | null, opponent: string): DuelComment {
  const gap = Math.abs(mine.score - theirs.score)
  const seed = mine.score + theirs.score * 2 + total
  if (win === null) {
    return {
      face: 'surprised',
      text: pick(
        [
          `Aynı sayıda doğru, aynı süre bile! Rövanşta kimin daha çabuk düşündüğü belli olur.`,
          `Başa baş bitti. ${opponent} ile bir rövanş bu işi çözer.`,
        ],
        seed,
      ),
    }
  }
  if (win) {
    if (mine.score === total) return { face: 'proud', text: 'Hiç yanlışın yok, tam puan! Bunu duyan arkadaş rövanşa hazırlanır.' }
    if (gap === 0) return { face: 'happy', text: `Doğru sayınız eşitti ama ${opponent}'dan daha çabuk düşündüğün için kazandın. Süre farkı küçük bir ayrıntı gibi görünse de işe yarıyor.` }
    if (gap === 1) return { face: 'happy', text: pick(['Kıl payı kazandın! Bir soru fark etti.', 'Çok yakındı ama sen önde bitirdin.'], seed) }
    return { face: 'proud', text: pick([`Net bir galibiyet: ${mine.score} - ${theirs.score}. Konuları iyi biliyorsun.`, `${opponent}’ı ${gap} soru farkla geçtin. Böyle devam!`], seed) }
  }
  if (gap === 0) return { face: 'think', text: `Doğru sayınız eşitti, ${opponent} biraz daha çabuk davrandı. Rövanşta yalnızca bir iki saniye gerek.` }
  if (gap === 1) return { face: 'think', text: pick(['Çok yakındı: tek bir soru fark etti. Rövanş iste, bu sefer senin olur.', 'Bir soru geride kaldın. Rövanşa değer.'], seed) }
  return { face: 'think', text: pick([`Bu tur ${opponent}’ındı. Yanlışlarına dilbilgisi sorularında bir göz at, sonra rövanş iste.`, `${gap} soru fark var; sorun değil, konular tekrarla oturur. Rövanş için biraz çalışmak ister misin?`], seed) }
}
