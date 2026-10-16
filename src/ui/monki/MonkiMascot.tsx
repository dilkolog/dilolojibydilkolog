import { useEffect, useState } from 'react'
import type { TargetLanguage } from '../../engine/types'
import faceHappy from '../../assets/art/face-happy.webp'
import faceProud from '../../assets/art/face-proud.webp'
import faceSleepy from '../../assets/art/face-sleepy.webp'
import faceSurprised from '../../assets/art/face-surprised.webp'
import faceThink from '../../assets/art/face-think.webp'
import faceWink from '../../assets/art/face-wink.webp'
import poseCheer from '../../assets/art/monki-cheer.webp'
import poseHang from '../../assets/art/monki-hang.webp'
import poseSad from '../../assets/art/monki-sad.webp'
import poseSleep from '../../assets/art/monki-sleep.webp'
import poseThink from '../../assets/art/monki-think.webp'
import poseWave from '../../assets/art/monki-wave.webp'

/** Monki's drawings: six faces (head and shoulders, for round frames) and six poses (the whole monkey). */
const FACES = { happy: faceHappy, proud: faceProud, sleepy: faceSleepy, surprised: faceSurprised, think: faceThink, wink: faceWink }
const POSES = { cheer: poseCheer, hang: poseHang, sad: poseSad, sleep: poseSleep, think: poseThink, wave: poseWave }
export type MonkiFaceName = keyof typeof FACES
export type MonkiPoseName = keyof typeof POSES

const ACTIVE_SEQUENCE: readonly MonkiPoseName[] = ['wave', 'cheer', 'hang', 'wave', 'think', 'cheer']

const GREET_BUBBLES: Record<TargetLanguage, readonly string[]> = {
  es: ['¡Hola!', '¡Vamos!', '¿Listo?', '¡Qué bien!', '¡Hablemos!', '¡Genial!'],
  fr: ['Salut !', 'On y va !', 'Prêt ?', 'Super !', 'Parlons !', 'Génial !'],
  en: ['Hey there!', "Let's go!", 'Ready?', 'Awesome!', "Let's chat!", 'Woohoo!'],
}

/** Head and shoulders, cropped by its round frame; the picture is a little taller than wide. */
export function MonkiFace({ face = 'happy', size = 44 }: { face?: MonkiFaceName; size?: number }) {
  return <img className="monki-face" src={FACES[face]} width={size} height={Math.round(size * 1.04)} alt="" draggable={false} />
}

/** The whole monkey; the poses are not the same size, so the box takes the height and keeps the shape. */
export function MonkiPose({ pose = 'wave', height = 120, still = false }: { pose?: MonkiPoseName; height?: number; still?: boolean }) {
  return <img className={`monki-pose${still ? ' is-still' : ''}`} src={POSES[pose]} height={height} style={{ height }} alt="" draggable={false} />
}

/**
 * Lively animated Monki stage for the opening/welcome screens: bounces continuously, cycles through
 * energetic poses (waving, cheering, swinging, thinking) with a floating greeting badge, and hops higher on tap.
 */
export function MonkiStage({ language = 'es', height = 132 }: { language?: TargetLanguage; height?: number }) {
  const [step, setStep] = useState(0)
  const [jumping, setJumping] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % ACTIVE_SEQUENCE.length)
    }, 2200)
    return () => window.clearInterval(id)
  }, [])

  const pose = ACTIVE_SEQUENCE[step % ACTIVE_SEQUENCE.length]
  const bubbles = GREET_BUBBLES[language] ?? GREET_BUBBLES.en
  const bubble = bubbles[step % bubbles.length]

  const hop = () => {
    setStep((s) => (s + 1) % ACTIVE_SEQUENCE.length)
    setJumping(false)
    window.requestAnimationFrame(() => setJumping(true))
  }

  return (
    <div
      className={`monki-stage${jumping ? ' is-jumping' : ''}`}
      onClick={hop}
      onAnimationEnd={(e) => {
        if (e.animationName === 'monki-hop-burst') setJumping(false)
      }}
      aria-hidden="true"
    >
      <span className="monki-bubble" data-bubble={bubble} />
      <span className="monki-spark monki-spark-left">✦</span>
      <span className="monki-spark monki-spark-right">♪</span>
      <div className="monki-actor" style={{ height }}>
        <img key={pose} className="monki-pose is-active" src={POSES[pose]} height={height} style={{ height }} alt="" draggable={false} />
      </div>
      <span className="monki-shadow" />
    </div>
  )
}

