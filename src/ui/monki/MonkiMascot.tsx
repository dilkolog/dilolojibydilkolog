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

/** Head and shoulders, cropped by its round frame; the picture is a little taller than wide. */
export function MonkiFace({ face = 'happy', size = 44 }: { face?: MonkiFaceName; size?: number }) {
  return <img className="monki-face" src={FACES[face]} width={size} height={Math.round(size * 1.04)} alt="" draggable={false} />
}

/** The whole monkey; the poses are not the same size, so the box takes the height and keeps the shape. */
export function MonkiPose({ pose = 'wave', height = 120, still = false }: { pose?: MonkiPoseName; height?: number; still?: boolean }) {
  return <img className={`monki-pose${still ? ' is-still' : ''}`} src={POSES[pose]} height={height} style={{ height }} alt="" draggable={false} />
}
