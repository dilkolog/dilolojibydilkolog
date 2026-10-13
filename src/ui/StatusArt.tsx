import offline from '../assets/art/status-offline.webp'
import full from '../assets/art/status-full.webp'
import nomic from '../assets/art/status-nomic.webp'
import update from '../assets/art/status-update.webp'
import conflict from '../assets/art/status-conflict.webp'
import maint from '../assets/art/status-maint.webp'

const STATUS = { offline, full, nomic, update, conflict, maint }
/** offline = connection lost, full = storage nearly full, nomic = microphone unavailable, update = a new version, conflict = devices disagree, maint = something broke, being fixed. */
export type StatusKind = keyof typeof STATUS

/** Monki in a state of the app (decorative: the words beside it say what happened). */
export function StatusPicture({ kind, small = false }: { kind: StatusKind; small?: boolean }) {
  return <img className={small ? 'status-picture status-picture-sm' : 'status-picture'} src={STATUS[kind]} alt="" draggable={false} />
}
