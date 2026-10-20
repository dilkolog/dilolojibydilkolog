import { grammarExercises } from '../data/grammar'
import { db } from '../data/instance'
import { trapWords } from '../data/traps'
import { blindSpots, type BlindSpot } from '../engine/blindSpots'
import { stillMissed } from '../engine/earMisses'
import type { ErrorType, TargetLanguage } from '../engine/types'
import { writingRows } from '../engine/writingErrors'

/** The findings from what the device holds (the card and the weekly care round both read them this way). */
export async function loadBlindSpots(language: TargetLanguage, errors: Partial<Record<ErrorType, number>>): Promise<BlindSpot[]> {
  const [lab, grammar, pairs, traps, reflex, register, ear, writing] = await Promise.all([
    language === 'en' ? Promise.resolve(undefined) : db.getLab(language),
    db.getGrammarLog(),
    db.getPairLog(),
    db.getTrapLog(),
    db.getReflexLog(),
    db.getRegisterLog(),
    db.getEarLog(),
    db.getWritingLog(),
  ])
  const earMissed = Object.values(ear[language] ?? {}).filter(stillMissed).length
  return blindSpots({ language, errors, lab, grammar, grammarExercises: grammarExercises(language), pairs, traps, trapWords, reflex, register, earMissed, writing: writingRows(writing, language) })
}
