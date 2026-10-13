import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { db, setLoad } from '../data/instance'
import { fillCorpus, fillParallel, scoreCorpus } from '../data/corpus'
import { fillWordInfo } from '../data/wordInfo'
import { fillFromLexicon } from '../data/lexicon'
import { fillFromPack } from '../data/wordpack'
import { fillFrequencyRanks } from '../data/frequency'
import { reportError } from '../data/errorReport'
import type { TargetLanguage } from '../engine/types'
import { RECENT_DAYS, type LanguageData } from '../appNav'
import { loadGame, type GameState } from './game'
import { pushToExtension } from './extensionBridge'
import { showToast } from './toastFeed'

let corpusRun: Promise<number> | null = null
let wiktRun: Promise<number> | null = null

/**
 * The words, states and recent answers of the language being learned, plus the game state, and the
 * `reload` that reads them again. Background fillers (frequency, lexicon, pack, corpus, Wiktionary)
 * run after each load; results of a load that outlasted a language switch are dropped.
 */
export function useLanguageData(language: TargetLanguage | undefined) {
  const [data, setData] = useState<LanguageData | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const languageRef = useRef(language)
  useLayoutEffect(() => {
    languageRef.current = language
  }, [language])

  const reload = useCallback(async () => {
    if (!language) return
    // The background steps below can outlast a switch to another language: their results are
    // dropped then, or the old language's data would come back and the new one never show.
    const current = () => languageRef.current === language
    const apply = (next: LanguageData) => current() && setData(next)
    const since = new Date(Date.now() - RECENT_DAYS * 86_400_000)
    const [loaded, recentEvents, g] = await Promise.all([db.loadLanguage(language), db.eventsSince(since), loadGame(db)])
    apply({ language, ...loaded, recentEvents })
    // After a background step the words and states are read again, and the recent answers with them: a session
    // finished while the step ran must not be rolled back to the answers this run started with.
    const refresh = async () => apply({ language, ...(await db.loadLanguage(language)), recentEvents: await db.eventsSince(since) })
    if (!current()) return
    setLoad(loaded.states)
    pushToExtension(db)
    setGame(g)
    // New words without a frequency band get one from the bundled list, in the background.
    if (loaded.vocabulary.some((v) => v.source !== 'sample' && !v.frequencyRank)) {
      const filled = await fillFrequencyRanks(db, language)
      if (filled) await refresh()
    }
    // French words saved without a part of speech or a noun gender get them from Lexique (offline).
    if (language === 'fr' && loaded.vocabulary.some((v) => v.source !== 'sample' && (v.partOfSpeech === 'other' || (v.partOfSpeech === 'noun' && !v.gender)))) {
      if (await fillFromLexicon(db, language)) await refresh()
    }
    // The word pack (other languages, origins, synonyms, recordings), offline, for languages that ship one.
    if (await fillFromPack(db, language)) await refresh()
    // Sentences get rated (offline), and re-rated once the word list has grown: the ones with at most one unknown word come first.
    if (await scoreCorpus(db, language)) await refresh()
    // Real sentences for words that don't have them yet (a few per run, one run at a time).
    if (!corpusRun && loaded.vocabulary.some((v) => v.source !== 'sample' && v.corpus === undefined)) {
      corpusRun = fillCorpus(db, language).finally(() => (corpusRun = null))
      if (await corpusRun) await refresh()
    }
    // Sentences saved before they came with their French/Spanish/English versions get them, a few per run.
    if (!corpusRun && loaded.vocabulary.some((v) => v.corpus?.some((x) => x.source?.kind === 'tatoeba' && x.parallel === undefined))) {
      corpusRun = fillParallel(db, language).finally(() => (corpusRun = null))
      if (await corpusRun) await refresh()
    }
    // Pronunciation, definition and word family from Wiktionary, also in the background.
    if (!wiktRun && loaded.vocabulary.some((v) => v.source !== 'sample' && (!v.wiktAt || (v.partOfSpeech === 'noun' && v.language !== 'en' && !v.gender && v.wiktAt < '2026-10-03T12')))) {
      wiktRun = fillWordInfo(db, language).finally(() => (wiktRun = null))
      if (await wiktRun) await refresh()
    }
  }, [language])

  useEffect(() => {
    // A failed load (a closed or damaged database) is said, with a way to try again, not left as a blank wait.
    const load = () =>
      reload().catch((e) => {
        reportError(e, 'reload')
        showToast('Veriler yüklenemedi. Verilerin silinmedi; yeniden denemek genelde yeter.', { label: 'Yeniden dene', run: load }, 10_000, 'info')
      })
    void load()
  }, [reload])

  return { data, game, reload }
}
