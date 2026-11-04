import type { TransformKind } from '../../engine/transformPairs'
import type { LabLanguage } from './labShared'

/** What the learner picks: one kind of move, or all of them with the plain sentences. */
export type TransformChoice = 'mixed' | TransformKind

export const TRANSFORM_CHOICES: { id: TransformChoice; label: string }[] = [
  { id: 'mixed', label: 'Karışık' },
  { id: 'temel', label: 'Temel' },
  { id: 'aktarim', label: 'Dolaylı anlatım' },
  { id: 'kosul', label: 'si cümleleri' },
  { id: 'uyum', label: 'Zaman uyumu' },
  { id: 'bitmislik', label: 'Bitmişlik' },
]

export const KIND_NAME: Record<TransformKind, string> = {
  temel: 'Temel',
  aktarim: 'Dolaylı anlatım',
  kosul: 'si cümlesi',
  uyum: 'Zaman uyumu',
  bitmislik: 'Bitmişlik',
}

/** The rule shown after an answer: one line per kind and language (in line with tenseLessonDeep.ts). */
export const KIND_RULE: Record<LabLanguage, Record<TransformKind, string>> = {
  fr: {
    temel: 'Zaman değişince zaman sözcüğü de değişir: hier → passé composé, demain → futur, d’habitude / autrefois → imparfait.',
    aktarim: 'Ana fiil geçmişe geçince (il a dit, il pensait) présent imparfait, passé composé plus-que-parfait, futur conditionnel olur.',
    kosul: 'si + présent → futur; si + imparfait → conditionnel; si + plus-que-parfait → conditionnel passé. si’den sonra futur ya da conditionnel gelmez.',
    uyum: 'Ana fiil geçmişe geçse de subjonctif présent kalır (je voulais qu’il vienne). Değişen bitmişliktir: bitmiş eylem için subjonctif passé (que tu sois venu).',
    bitmislik: 'Başka bir geçmiş andan önce biten eylem plus-que-parfait (il avait fini); gelecekte bir andan önce bitecek eylem futur antérieur (j’aurai fini).',
  },
  es: {
    temel: 'Zaman değişince zaman sözcüğü de değişir: ayer → pretérito, hoy / esta mañana → perfecto, mañana → futuro, de niño / siempre → imperfecto.',
    aktarim: 'Ana fiil geçmişe geçince (dijo, creía) presente imperfecto, pretérito ve perfecto pluscuamperfecto, futuro condicional, subjuntivo subjuntivo imperfecto olur.',
    kosul: 'si + presente → futuro; si + subjuntivo imperfecto → condicional; si + subjuntivo pluscuamperfecto → condicional perfecto. si’den sonra futuro ya da condicional gelmez.',
    uyum: 'Ana fiil geçmişe ya da condicional’e geçince yan cümle subjuntivo imperfecto olur: quiero que vengas → quería que vinieras.',
    bitmislik: 'Başka bir geçmiş andan önce biten eylem pluscuamperfecto (había salido); gelecekte bir andan önce bitecek eylem futuro perfecto (habré terminado).',
  },
}

export const KIND_KEY = 'diloloji:transform-kind'

export function readChoice(): TransformChoice {
  try {
    const v = localStorage.getItem(KIND_KEY)
    return TRANSFORM_CHOICES.some((c) => c.id === v) ? (v as TransformChoice) : 'mixed'
  } catch {
    return 'mixed'
  }
}

export function saveChoice(choice: TransformChoice) {
  try {
    localStorage.setItem(KIND_KEY, choice)
  } catch {
    // Only a convenience.
  }
}
