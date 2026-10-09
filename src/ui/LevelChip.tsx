import { cefrOf } from '../engine/cefrLevels'
import type { TargetLanguage } from '../engine/types'
import { levelFromRank } from '../engine/wordLevel'
import { useCefr } from './useCefr'

/**
 * A word's level as a chip: the level learner materials start using it at (FLELex, ELELex), else
 * an approximate one from how common it is (≈).
 */
export function LevelChip({ language, lemma, rank }: { language: TargetLanguage; lemma: string; rank?: number }) {
  const list = useCefr(language)
  const level = list ? cefrOf({ language, lemma }, list) : undefined
  if (level) return <li title="Ders kitaplarında ve kolay okuma metinlerinde kullanılmaya başladığı seviye (FLELex/ELELex)">{level}</li>
  const approx = levelFromRank(rank)
  if (!approx || !rank || rank < 1) return null
  return <li title={`Sıklığa göre yaklaşık seviye: en sık ${rank.toLocaleString('tr')}. kelime`}>≈ {approx}</li>
}
