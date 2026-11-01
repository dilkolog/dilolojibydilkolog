import { stripDiacritics } from './answerCheck'
import type { TargetLanguage } from './types'

export interface AttachedForm { stem: string; pronouns: string[] }

/** Candidates only: a dictionary/verb-table match must validate the stem before showing a split. */
export function attachedPronouns(word: string, language: TargetLanguage): AttachedForm[] {
  const typed = word.trim().toLowerCase().replace(/[’ʼ]/g, "'")
  if (language === 'fr') {
    const match = /^([\p{L}]+)-((?:m'|t')?en|(?:m'|t')?y|(?:le|la|les|lui|leur|moi|toi|nous|vous)(?:-(?:moi|toi|lui|leur|nous|vous|en|y))?)$/u.exec(typed)
    if (!match) return []
    const pronouns = match[2].replace(/^m'/, 'me-').replace(/^t'/, 'te-').split('-')
    const stems = [match[1]]
    if (['y', 'en'].includes(pronouns[0]) && /[aes]s$/.test(match[1])) stems.push(match[1].slice(0, -1))
    return stems.map(stem => ({ stem, pronouns }))
  }
  if (language !== 'es' || /\s/.test(typed)) return []
  const out: AttachedForm[] = []
  for (const ending of ['melos', 'melas', 'telas', 'telos', 'selos', 'selas', 'melo', 'mela', 'telo', 'tela', 'selo', 'sela', 'noslo', 'nosla', 'oslo', 'osla', 'nos', 'los', 'las', 'les', 'me', 'te', 'se', 'os', 'lo', 'la', 'le']) {
    if (!typed.endsWith(ending) || typed.length - ending.length < 2) continue
    const stem = stripDiacritics(typed.slice(0, -ending.length))
    const pair = /^(me|te|se|nos|os)(lo|la|los|las)$/.exec(ending)
    out.push({ stem, pronouns: pair ? [pair[1], pair[2]] : [ending] })
    // Reflexive nosotros/vosotros imperatives drop s/d before nos/os.
    if (ending === 'nos' && stem.endsWith('mo')) out.push({ stem: `${stem}s`, pronouns: [ending] })
    if (ending === 'os' && /[ai]$/.test(stem)) out.push({ stem: `${stem}d`, pronouns: [ending] })
  }
  return out
}
