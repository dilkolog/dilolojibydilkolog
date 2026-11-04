import { useState } from 'react'
import type { SentenceClip } from '../engine/sentences'
import { PlayIcon } from './icons'
import { clipEmbed } from './youtubePlayer'

/**
 * The moment of a video a sentence card was saved from, played again: the sentence in the speaker's own voice.
 * Shown on a tap (or at once with `autoplay`); each "again" reloads the embed, which plays the moment once.
 * `blur` hides the picture (a dictation: the video's own subtitles would give the answer away).
 */
export function VideoClip({ clip, autoplay = false, blur = false, label = 'Videodan dinle' }: { clip: SentenceClip; autoplay?: boolean; blur?: boolean; label?: string }) {
  const [round, setRound] = useState(autoplay ? 1 : 0)
  const [hidden, setHidden] = useState(blur)
  if (!round)
    return (
      <button type="button" className="btn btn-quiet btn-sm video-clip-open" onClick={() => setRound(1)}>
        <PlayIcon size={16} /> {label}
      </button>
    )
  return (
    <div className={`video-clip${hidden ? ' video-clip-blur' : ''}`}>
      <div className="video-frame">
        <iframe key={round} src={clipEmbed(clip.video, clip.start, clip.end)} title="Cümlenin geçtiği video anı" allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" />
      </div>
      <div className="row">
        <button type="button" className="link small" onClick={() => setRound((r) => r + 1)}>
          Tekrar dinle
        </button>
        {blur && (
          <button type="button" className="link small" onClick={() => setHidden((h) => !h)}>
            {hidden ? 'Görüntüyü göster' : 'Görüntüyü gizle'}
          </button>
        )}
      </div>
    </div>
  )
}
