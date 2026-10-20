import type { Gender, PartOfSpeech, TargetLanguage } from '../engine/types'

/**
 * Ready-made starter lists (a theme of everyday A1–A2 words with a sentence each), one file per language in
 * `starterLists/`. A word of French or Spanish carries its article ("la maison"), which gives the noun its gender;
 * `g` sets the gender where the article does not (el agua is feminine).
 */
export interface StarterWord {
  /** The word as a card has it: with its article for a French or Spanish noun. */
  w: string
  /** Turkish meaning(s), comma-separated. */
  t: string
  /** An example sentence with the word in it, and its Turkish. */
  s: string
  tr: string
  p: PartOfSpeech
  g?: Gender
}

export interface StarterList {
  id: string
  /** The list's name, in Turkish. */
  title: string
  level: 'A1' | 'A2'
  items: StarterWord[]
}

interface StarterFile {
  language: TargetLanguage
  source: string
  lists: StarterList[]
}

const FILES = import.meta.glob<StarterFile>('./starterLists/*.json', { import: 'default' })

/** The starter lists of a language (loaded when asked for: they are not part of the first screen). */
export async function loadStarterLists(language: TargetLanguage): Promise<StarterList[]> {
  const load = FILES[`./starterLists/${language}.json`]
  return load ? (await load()).lists : []
}
