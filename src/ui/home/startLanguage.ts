import { TARGET_LANGUAGES, type TargetLanguage } from '../../engine/types'

/**
 * The language a visitor picked on the landing page, carried to the first-run screen so the same language is
 * already chosen there. Only on this device and only until the first run is done (a mail link opened in another
 * browser simply starts with the usual default).
 */
const KEY = 'diloloji:start-lang'

export function rememberStartLanguage(language: TargetLanguage) {
  try {
    localStorage.setItem(KEY, language)
  } catch {
    // Not remembered: the first-run screen asks anyway.
  }
}

export function startLanguage(): TargetLanguage | null {
  try {
    const v = localStorage.getItem(KEY)
    return v && (TARGET_LANGUAGES as readonly string[]).includes(v) ? (v as TargetLanguage) : null
  } catch {
    return null
  }
}

export function forgetStartLanguage() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to forget.
  }
}

/** The language pages for sharing (scripts/lang-pages.mjs): /fransizca, /ispanyolca, /ingilizce. */
export const LANGUAGE_PATHS: Record<TargetLanguage, string> = { fr: 'fransizca', es: 'ispanyolca', en: 'ingilizce' }

/** The language a shared language page stands for, if the page is one. */
export function languageOfPath(pathname: string): TargetLanguage | null {
  const slug = pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '').toLowerCase()
  return (Object.keys(LANGUAGE_PATHS) as TargetLanguage[]).find((l) => LANGUAGE_PATHS[l] === slug) ?? null
}
