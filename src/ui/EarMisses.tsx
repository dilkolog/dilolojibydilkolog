import { useEffect, useState } from 'react'
import { db } from '../data/instance'
import { topMisses, type EarMiss } from '../engine/earMisses'
import type { TargetLanguage } from '../engine/types'
import { EarIcon } from './icons'
import { PageHeader } from './PageHeader'
import { canSpeak, speak } from './speech'
import { TextDictation } from './TextDictation'

/** Sentences asked in one round of the missed words. */
const EAR_ROUND = 8

type Missed = { word: string; miss: EarMiss }[]

function useMissed(language: TargetLanguage, k: number, reloadKey: unknown = 0): Missed | null {
  const [missed, setMissed] = useState<Missed | null>(null)
  useEffect(() => {
    let live = true
    void db
      .getEarLog()
      .then((log) => live && setMissed(topMisses(log, language, k)))
      .catch(() => live && setMissed([]))
    return () => {
      live = false
    }
  }, [language, k, reloadKey])
  return missed
}

/** The words, each with how often it slipped by. */
function MissedWords({ missed, language }: { missed: Missed; language: TargetLanguage }) {
  return (
    <p className="dictation-diff" lang={language}>
      {missed.map(({ word, miss }) => (
        <span key={word}>
          <span className="dd-missed">{word}</span>
          {miss.n - miss.ok > 1 && <span className="small muted"> ×{miss.n - miss.ok}</span>}{' '}
        </span>
      ))}
    </p>
  )
}

/**
 * The words the ear missed in dictations, heard again in the sentences they were missed in and
 * written down. A word written right counts towards dropping it from the list.
 */
export function EarMissesGame({ language, onExit }: { language: TargetLanguage; onExit: () => void }) {
  const [round, setRound] = useState(0)
  const [playing, setPlaying] = useState(false)
  const missed = useMissed(language, 40, round)
  if (!missed) return null
  // One sentence per word; a sentence holding several of them comes once.
  const sentences = [...new Set(missed.map((m) => m.miss.sentence))].slice(0, EAR_ROUND)

  if (playing)
    return (
      <TextDictation
        sentences={sentences}
        language={language}
        voice="device"
        play={(i, slow) => speak(sentences[i], language, slow ? 0.7 : undefined)}
        closeLabel="Listeye dön"
        onClose={() => (setPlaying(false), setRound((r) => r + 1))}
      />
    )

  return (
    <div className="stack">
      <button className="link" onClick={onExit}>
        ← Oyunlar
      </button>
      <PageHeader title="Kaçırdıkların" sub="Dikte ederken duymadığın kelimeler, kaçırdığın cümlelerle yeniden: dinle ve yaz." />
      {missed.length ? (
        <section className="card stack">
          <MissedWords missed={missed.slice(0, 20)} language={language} />
          <p className="small muted">Doğru yazdıkça listeden düşerler. Çoğu kısa kelime ve bağlanan sestir: kulak onları cümlenin içinde atlar.</p>
          <div className="row">
            <button className="btn" onClick={() => setPlaying(true)} disabled={!canSpeak()}>
              <EarIcon size={18} /> {sentences.length} cümle dinle ve yaz
            </button>
          </div>
        </section>
      ) : (
        <p className="note">Henüz kaçırdığın kelime yok. Okuma → Dikte ya da Gerçek seslerle dikte yaptıkça yazamadığın kelimeler burada toplanır.</p>
      )}
    </div>
  )
}

/** Progress: the words the ear misses most, and the way to train them. */
export function EarMissesCard({ language, onPractice }: { language: TargetLanguage; onPractice?: () => void }) {
  const missed = useMissed(language, 12)
  if (!missed?.length) return null
  return (
    <section className="section stack">
      <p className="eyebrow eyebrow-icon">
        <EarIcon size={16} /> Dinleme
      </p>
      <h2 className="section-title">Kulağının kaçırdıkları</h2>
      <MissedWords missed={missed} language={language} />
      <p className="small muted">Dikte ederken yazamadığın kelimeler; doğru yazdıkça listeden düşer.</p>
      {onPractice && (
        <div className="row">
          <button className="btn btn-sm" onClick={onPractice}>
            Dinle ve yaz
          </button>
        </div>
      )}
    </section>
  )
}
