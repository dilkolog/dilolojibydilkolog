import { useState } from 'react'
import { AiError, enrichWords } from '../ai'
import { translate } from '../data/translate'
import { normalize } from '../engine/answerCheck'
import type { TargetLanguage } from '../engine/types'
import { useAi } from './aiContext'

/**
 * Asking DeepL (through the app's server and the translation memory) or the AI for a word's Turkish
 * meaning, for the dictionary: a word the pack lacks, or a pack word without a Turkish meaning.
 * Each answer is a guess the learner checks before saving it.
 */
export function useMeaningLookup(language: TargetLanguage, word: string) {
  const { apiKey } = useAi()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  /** DeepL's Turkish for the word; null (and the reason in `error`) when it has none. */
  const askDeepl = async (): Promise<string | null> => {
    setBusy(true)
    setError('')
    try {
      const out = (await translate(word, language, 'tr')).trim()
      if (out && normalize(out) !== normalize(word)) return out
      setError('DeepL bu kelime için bir karşılık bulamadı.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Çeviri şu an alınamadı.')
    } finally {
      setBusy(false)
    }
    return null
  }

  /** The AI's dictionary form and meanings of the word; null (and the reason in `error`) when it has none. */
  const askAi = async (): Promise<{ lemma: string; meanings: string[] } | null> => {
    if (!apiKey) return null
    setBusy(true)
    setError('')
    try {
      const found = await enrichWords(apiKey, language, [{ word }])
      const info = found.get(word.toLocaleLowerCase()) ?? [...found.values()][0]
      if (info?.meanings.length) return { lemma: info.lemma, meanings: info.meanings }
      setError('YZ bu kelimeyi tanımadı.')
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'YZ şu an cevap vermedi.')
    } finally {
      setBusy(false)
    }
    return null
  }

  return { apiKey, busy, error, askDeepl, askAi }
}
