import { useEffect, useState } from 'react'
import { glossOf, type TapGloss } from '../data/tapGloss'
import { loadPack } from '../data/wordpack'
import type { Pack } from '../data/wordpackBuild'
import type { TargetLanguage } from '../engine/types'

/**
 * Tap a word of a question's sentence to see its Turkish meaning from the dictionary in one small line
 * under the sentence: the state lives in a hook, the words in <TapWords>, the line in <TapNote>.
 * The words are not tab stops and a tap does not take the focus from an answer field being typed in.
 */
export function useTapGloss(language: string | undefined) {
  const [pack, setPack] = useState<Pack | undefined>()
  const [open, setOpen] = useState<string | null>(null)
  const supported = language === 'en' || language === 'fr' || language === 'es'
  useEffect(() => {
    if (!supported) return
    let live = true
    void loadPack(language as TargetLanguage).then((p) => live && setPack(p))
    return () => {
      live = false
    }
  }, [language, supported])
  const info: TapGloss | null = open && supported ? glossOf(pack, open, language as TargetLanguage) : null
  return { supported, open, setOpen, info, ready: !!pack }
}

export type TapState = ReturnType<typeof useTapGloss>

