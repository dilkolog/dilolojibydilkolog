import { useEffect, useState } from 'react'
import { db } from '../data/instance'
import { displayForm } from '../engine/exercises'
import { PRON_GOOD, weakPronWords, type WeakWord } from '../engine/pronWeak'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { PageHeader } from './PageHeader'
import { PronunciationCheck } from './PronunciationCheck'
import { azureEnabled } from './pronunciation'
import { playWord } from './speech'

/**
 * The words whose pronunciation scored low, one at a time: hear the model, say the word, get the
 * score. A word that scores well drops off the list.
 */
export function PronPractice({ language, vocabulary, onExit }: { language: TargetLanguage; vocabulary: VocabularyEntry[]; onExit: () => void }) {
  const [weak, setWeak] = useState<WeakWord[] | null>(null)
  const [at, setAt] = useState(0)
  const [last, setLast] = useState<number | null>(null)
  // The list is read once per visit: a word that scores well stays on screen until Next.
  useEffect(() => {
    let live = true
    void db.getAllPronScores().then((scores) => live && setWeak(weakPronWords(scores, vocabulary, language)))
    return () => {
      live = false
    }
  }, [language, vocabulary])

  const header = <PageHeader art="speak" title="Telaffuz çalışması" sub="Puanı düşük kalan kelimeleri tek tek söyle; iyileşenler listeden çıkar." />
  if (!azureEnabled())
    return (
      <div className="stack">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {header}
        <p className="note">Telaffuz puanı için Ayarlar → Ses bölümüne Azure anahtarını gir; sonra bir kelimede "Söyle ve puanla"yı kullandıkça düşük kalanlar burada toplanır.</p>
      </div>
    )
  if (!weak) return null
  const word = weak[at]

  return (
    <div className="stack">
      <button className="link" onClick={onExit}>
        ← Oyunlar
      </button>
      {header}
      {!word ? (
        <p className="note">{weak.length ? 'Listeyi bitirdin.' : 'Zayıf telaffuzlu kelime yok. Kelime sayfasında "Söyle ve puanla" ile puan aldıkça düşük kalanlar burada toplanır.'}</p>
      ) : (
        <section className="card stack">
          <p className="small muted">
            {at + 1} / {weak.length} · son puanın {word.latest}, ortalaman {Math.round(word.recent)}
          </p>
          <p className="pron-target" lang={language}>
            {displayForm(word.entry)}
          </p>
          <p className="muted">{word.entry.senses[0].gloss}</p>
          <PronunciationCheck
            text={displayForm(word.entry)}
            language={language}
            onModel={() => playWord(word.entry)}
            onScore={(score) => {
              setLast(score)
              void db.addPronScore(word.entry.id, score)
            }}
          />
          {last !== null && last >= PRON_GOOD && <p className="notice">Bu sefer yeterince yakın; birkaç iyi denemeden sonra listeden çıkar.</p>}
          <div className="row">
            <button
              className="btn btn-quiet"
              onClick={() => {
                setAt((i) => i + 1)
                setLast(null)
              }}
            >
              {at + 1 < weak.length ? 'Sonraki kelime' : 'Bitir'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
