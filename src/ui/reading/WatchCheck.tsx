import { useState } from 'react'
import type { WatchRating } from '../../data/db'
import type { TargetLanguage } from '../../engine/types'
import { SentenceTranslation } from '../dictionary/TranslateButton'
import monkiVideoListen from '../../assets/art/monki-video-listen.webp'

const RATINGS: { value: WatchRating; label: string }[] = [
  { value: 'ok', label: 'Anladım' },
  { value: 'half', label: 'Yarısını' },
  { value: 'no', label: 'Anlamadım' },
]

/**
 * After a sentence of the video (sentence by sentence): did it make sense? "Understood" and "half" go on at once;
 * "not" plays the sentence again slowly and shows it with its Turkish, and it can be kept as a card (with the
 * video's moment) before going on.
 */
export function WatchCheck({
  sentence,
  language,
  onRate,
  onSlow,
  onKeep,
  onGoOn,
}: {
  sentence: string
  language: TargetLanguage
  onRate: (rating: WatchRating) => void
  onSlow: () => void
  onKeep: () => Promise<void> | void
  onGoOn: () => void
}) {
  const [lost, setLost] = useState(false)
  const [kept, setKept] = useState(false)
  if (!lost)
    return (
      <div className="watch-check" role="group" aria-label="Bu cümleyi anladın mı?">
        <span className="small">Bu cümleyi anladın mı?</span>
        <div className="row watch-check-choices">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`btn btn-sm${r.value === 'ok' ? '' : ' btn-quiet'}`}
              onClick={() => {
                onRate(r.value)
                if (r.value === 'no') {
                  setLost(true)
                  onSlow()
                } else onGoOn()
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    )
  return (
    <div className="watch-check stack" role="group" aria-label="Anlaşılmayan cümle">
      <div className="row items-center gap-2">
        <img src={monkiVideoListen} width={22} height={22} alt="" draggable={false} className="inline-art" />
        <span className="small muted">Tekrar dinle ve incele:</span>
      </div>
      <p className="watch-check-sentence" lang={language}>
        {sentence}
      </p>
      <SentenceTranslation sentence={sentence} from={language} />
      <div className="row watch-check-choices">
        <button type="button" className="btn btn-sm btn-quiet" onClick={onSlow}>
          Yavaş dinle
        </button>
        <button
          type="button"
          className="btn btn-sm btn-quiet"
          disabled={kept}
          onClick={async () => {
            await onKeep()
            setKept(true)
          }}
        >
          {kept ? 'Kart yapıldı' : 'Cümle kartı yap'}
        </button>
        <button type="button" className="btn btn-sm" onClick={onGoOn}>
          Devam
        </button>
      </div>
    </div>
  )
}

const RATING_NAME: Record<WatchRating, string> = { ok: 'anladın', half: 'yarısını anladın', no: 'anlamadın' }

/**
 * The understanding map: the video's sentences as a strip, each coloured by how it was understood, so the hard
 * parts show at a glance; a part plays the video from there. The ones not understood become cards in one go.
 */
export function WatchMap({
  ratings,
  total,
  onPlay,
  onKeepHard,
}: {
  ratings: Record<number, WatchRating>
  total: number
  onPlay: (sentence: number) => void
  onKeepHard: (sentences: number[]) => Promise<void> | void
}) {
  const [kept, setKept] = useState(false)
  const rated = Object.keys(ratings).length
  if (!rated || !total) return null
  const count = (r: WatchRating) => Object.values(ratings).filter((x) => x === r).length
  const hard = Object.entries(ratings)
    .filter(([, r]) => r === 'no')
    .map(([i]) => Number(i))
    .sort((a, b) => a - b)
  return (
    <section className="card stack watch-map" aria-label="Anlama haritası">
      <div className="row justify-between items-center">
        <div className="row items-center gap-2">
          <img src={monkiVideoListen} width={22} height={22} alt="" draggable={false} className="inline-art" />
          <strong>Anlama haritası</strong>
        </div>
        <span className="small muted">
          {count('ok')} anladın · {count('half')} yarısını · {count('no')} anlamadın
        </span>
      </div>
      <div className="watch-strip">
        {Array.from({ length: total }, (_, i) => {
          const r = ratings[i]
          return (
            <button
              key={i}
              type="button"
              className={`watch-part${r ? ` watch-${r}` : ''}`}
              onClick={() => onPlay(i)}
              aria-label={`${i + 1}. cümle${r ? `: ${RATING_NAME[r]}` : ''}`}
              title={`${i + 1}. cümle${r ? `: ${RATING_NAME[r]}` : ''}`}
            />
          )
        })}
      </div>
      {hard.length > 0 && (
        <div className="row">
          <button
            type="button"
            className="btn btn-sm btn-quiet"
            disabled={kept}
            onClick={async () => {
              await onKeepHard(hard)
              setKept(true)
            }}
          >
            {kept ? 'Kartlar yapıldı' : `Anlamadığın ${hard.length} cümleyi karta ekle`}
          </button>
        </div>
      )}
    </section>
  )
}
