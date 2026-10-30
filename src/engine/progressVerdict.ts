import type { Skill } from './types'

/** Where the verdict's suggestion goes: a game, the writing screen, or the day's session. */
export type VerdictGo = { game: 'truefalse' | 'test' | 'ladder' | 'collocations' | 'article' } | { screen: 'produce' } | { day: true }

export interface ProgressVerdict {
  /** One or two sentences: what the data says, then what to do this week. */
  text: string
  /** The button that does it. */
  action?: { label: string; go: VerdictGo }
}

export interface VerdictInput {
  /** Recall chance per skill, 0–100; null where the learner has not practised it. */
  profile: Record<Skill, number | null>
  /** Days with answers in the last 14. */
  daysPractised: number
  /** All answers so far in this language. */
  answers: number
}

/** The skill as the sentence names it ("Kelimeleri tanıman güçlü"). */
const SKILL_PHRASE: Record<Skill, string> = {
  recognition: 'kelimeleri tanıman',
  recall: 'anlamdan kelimeyi hatırlaman',
  production: 'kelimeyi cümlede kullanman',
  listening: 'duyduğun kelimeyi tanıman',
  collocation: 'kalıpları kullanman',
  gender: 'artikellerin',
}

/** What closes the gap in a weak skill, said as this week's plan, and where it is done. */
const SKILL_PLAN: Record<Skill, { text: string; label: string; go: VerdictGo }> = {
  recognition: { text: 'Bu hafta iki kısa "Doğru mu, yanlış mı?" turu öneriyorum.', label: 'Doğru mu, yanlış mı?', go: { game: 'truefalse' } },
  recall: { text: 'Bu hafta iki kısa deneme sınavı öneriyorum; yazma soruları özellikle bunu çalıştırır.', label: 'Deneme sınavı', go: { game: 'test' } },
  production: { text: 'Bu hafta iki kısa yazma çalışması öneriyorum.', label: 'Yaz & konuş', go: { screen: 'produce' } },
  listening: { text: 'Bu hafta iki kısa Hız merdiveni turu öneriyorum: aynı cümleyi üç hızda dinlersin.', label: 'Hız merdiveni', go: { game: 'ladder' } },
  collocation: { text: 'Bu hafta iki kısa "Edat ve kalıplar" turu öneriyorum.', label: 'Edat ve kalıplar', go: { game: 'collocations' } },
  gender: { text: 'Bu hafta iki kısa artikel turu öneriyorum.', label: 'Artikel antrenmanı', go: { game: 'article' } },
}

/** Below this many answers the figures say too little for a verdict. */
export const VERDICT_MIN_ANSWERS = 40
/** A gap between the strongest and the weakest skill worth naming (percentage points). */
export const SKILL_GAP = 15

const upper = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1)

/**
 * The page's main message: one finding from the learner's own figures, tied to one thing to do this week. Habit
 * first (without regular days the rest does not hold), then the widest gap between skills, then the overall level.
 * Says nothing it cannot back with enough answers.
 */
export function progressVerdict(input: VerdictInput): ProgressVerdict {
  if (input.answers < VERDICT_MIN_ANSWERS) {
    return { text: 'Birkaç gün çalıştıkça burada sana özel bir yorum çıkar: neyin iyi gittiği ve bu hafta neye ağırlık vermen gerektiği.' }
  }
  if (input.daysPractised < 4) {
    return {
      text: `Son iki haftada ${input.daysPractised} gün çalıştın. Kalıcı kazanç düzenden gelir: bu hafta her gün 5 dakikalık bir tur öneriyorum.`,
      action: { label: 'Bugünkü turu başlat', go: { day: true } },
    }
  }
  const known = (Object.entries(input.profile) as [Skill, number | null][]).filter((e): e is [Skill, number] => e[1] !== null).sort((a, b) => b[1] - a[1])
  if (known.length >= 2) {
    const [strong, strongPct] = known[0]
    const [weak, weakPct] = known[known.length - 1]
    if (strongPct - weakPct >= SKILL_GAP) {
      const plan = SKILL_PLAN[weak]
      return {
        text: `${upper(SKILL_PHRASE[strong])} güçlü (%${strongPct}); ${SKILL_PHRASE[weak]} geride (%${weakPct}). ${plan.text}`,
        action: { label: plan.label, go: plan.go },
      }
    }
    const low = known[known.length - 1][1]
    const high = known[0][1]
    if (high < 60) {
      return {
        text: `Becerilerin birbirine yakın ama hepsi %${low}–%${high} arasında: kelimeleri unutmadan yakalamak için bu hafta tekrarları aksatmamak en iyi adım.`,
        action: { label: 'Bugünkü turu başlat', go: { day: true } },
      }
    }
    return {
      text: `Becerilerin dengeli ilerliyor (%${low}–%${high}). Düzenin de yerinde: yeni kelimeler eklemenin tam zamanı.`,
      action: { label: 'Bugünkü turu başlat', go: { day: true } },
    }
  }
  return {
    text: `Son iki haftanın ${input.daysPractised} gününde çalıştın; düzenin iyi. Farklı soru türleri çözdükçe hangi becerinin geride kaldığını da söyleyebilirim.`,
    action: { label: 'Bugünkü turu başlat', go: { day: true } },
  }
}
