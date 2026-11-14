import type { PteTask } from '../../../data/pte'
import { percent, type PteScore } from '../../../engine/pteScore'
import { wordDiff } from '../../../engine/wordDiff'
import { SpeakerIcon } from '../../shared/icons'
import type { usePteAudio } from './pteHooks'
import type { PteMode } from './pteMode'

/** The play button of an item, with what is left of the plays in exam mode. */
export function PteListen({ audio, mode }: { audio: ReturnType<typeof usePteAudio>; mode: PteMode }) {
  if (!audio.canPlay) return <p className="small muted">Bu cihazda seslendirme yok; görevi yazılı metinle dene.</p>
  return (
    <div className="row">
      <button type="button" className="btn" onClick={() => void audio.play()} disabled={audio.playing || audio.left <= 0}>
        <SpeakerIcon size={18} className="inline-icon" /> {audio.playing ? 'Çalıyor…' : audio.plays === 0 ? 'Dinle' : 'Bir daha dinle'}
      </button>
      <span className="small muted">{mode === 'exam' ? (audio.left > 0 ? 'Sınavdaki gibi: kayıt bir kez çalar.' : 'Dinleme hakkın bitti.') : 'İstediğin kadar dinleyebilirsin.'}</span>
    </div>
  )
}

/** A clock in the item's corner: "Kalan 12 sn". */
export function PteClock({ left, label = 'Kalan' }: { left: number | null; label?: string }) {
  if (left === null) return null
  return (
    <span className="pill pte-clock" role="timer" aria-label={`${label} ${left} saniye`}>
      {label} {left} sn
    </span>
  )
}

/** The sentence compared word by word with what was written or said (the dictation games' colours). */
export function PteDiff({ given, text }: { given: string; text: string }) {
  const parts = given.trim() ? wordDiff(given, text) : text.split(/\s+/).map((w) => ({ word: w, status: 'missed' as const }))
  return (
    <p className="dictation-diff" lang="en">
      {parts.map((p, i) => (
        <span key={i} className={`dd-${p.status}`}>
          {p.word}{' '}
        </span>
      ))}
    </p>
  )
}

const UNIT: Record<PteTask, string> = { wfd: 'kelime', rs: 'kelime', ra: 'kelime', fib: 'boşluk', asq: '' }

/** After an answer: how much of it was right, the right answer and its Turkish. */
export function PteFeedback({ task, score, pronunciation, children, tr }: { task: PteTask; score: PteScore; pronunciation?: boolean; children: React.ReactNode; tr: string }) {
  const p = percent(score)
  const unit = pronunciation ? '' : UNIT[task]
  return (
    <div className="stack gap-2 pte-feedback" role="status">
      <p className={`small ${p >= 90 ? 'notice' : 'cross-warn'}`}>
        <strong>Doğruluk %{p}</strong>
        {pronunciation ? ' · telaffuz denetiminin puanı' : unit ? ` · ${score.got} / ${score.of} ${unit}` : p === 100 ? ' · doğru' : ' · yanlış'}
      </p>
      {children}
      <p className="small muted" lang="tr">
        {tr}
      </p>
    </div>
  )
}
