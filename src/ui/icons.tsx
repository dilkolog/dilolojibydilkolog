/**
 * Diloloji's own icon set: a 24px grid, 1.8px rounded strokes over a soft fill of the same
 * colour (the ".icon-duo" layer), so every icon has one shape and one depth. Drawn for this app,
 * in one hand, instead of mixing a stock set with emoji.
 *
 * Rule: icons for interface (navigation, actions, labels, notes, results). Emoji only where the
 * learner chooses them (the avatar) or for characters (game bosses).
 */
import type { ReactNode } from 'react'

type P = { size?: number; className?: string; /** Fill the soft layer fully (a full heart, a set star). */ solid?: boolean }

function Icon({ size = 20, children, className, solid }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={['icon', solid ? 'icon-solid' : '', className].filter(Boolean).join(' ')}
    >
      {children}
    </svg>
  )
}

/** The soft fill under an icon's lines. */
const D = ({ d }: { d: string }) => <path d={d} className="icon-duo" fill="currentColor" stroke="none" opacity={0.18} />
/** A shape drawn as fill and outline at once. */
const S = ({ d }: { d: string }) => (
  <>
    <D d={d} />
    <path d={d} />
  </>
)

// ── Navigation ─────────────────────────────────────────────────────────────────────────────
const HOUSE = 'M3.5 10.4 12 3.6l8.5 6.8V19a1.5 1.5 0 0 1-1.5 1.5h-4.2V15h-5.6v5.5H5A1.5 1.5 0 0 1 3.5 19z'
export const HomeIcon = (p: P) => (
  <Icon {...p}>
    <S d={HOUSE} />
  </Icon>
)
export const BookIcon = (p: P) => (
  <Icon {...p}>
    <S d="M6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z" />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19M9.5 3v5.5l2-1.3 2 1.3V3" />
  </Icon>
)
/** A graduation cap: the guide, the app's school. */
export const SchoolIcon = (p: P) => (
  <Icon {...p}>
    <S d="M2.5 9 12 4.5 21.5 9 12 13.5z" />
    <path d="M6.5 11v4.5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3V11M21.5 9v5" />
  </Icon>
)
export const ReadIcon = (p: P) => (
  <Icon {...p}>
    <S d="M6.5 3h8l4 4v12.5A1.5 1.5 0 0 1 17 21H6.5A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z" />
    <path d="M14.5 3v4h4M8.5 11.5h7M8.5 15h7M8.5 18.5h4" />
  </Icon>
)
export const PenIcon = (p: P) => (
  <Icon {...p}>
    <S d="M4 20l.8-4.1L15.6 5.1a2.2 2.2 0 0 1 3.1 0l.2.2a2.2 2.2 0 0 1 0 3.1L8.1 19.2z" />
    <path d="M13.8 6.9l3.3 3.3M4 20h16" />
  </Icon>
)
export const StoryIcon = (p: P) => (
  <Icon {...p}>
    <D d="M3 5h5.5A3.5 3.5 0 0 1 12 8.5V20a2.5 2.5 0 0 0-2.5-2.5H3zM21 5h-5.5A3.5 3.5 0 0 0 12 8.5V20a2.5 2.5 0 0 1 2.5-2.5H21z" />
    <path d="M3 5h5.5A3.5 3.5 0 0 1 12 8.5V20a2.5 2.5 0 0 0-2.5-2.5H3zM21 5h-5.5A3.5 3.5 0 0 0 12 8.5V20a2.5 2.5 0 0 1 2.5-2.5H21z" />
  </Icon>
)
export const GameIcon = (p: P) => (
  <Icon {...p}>
    <S d="M7.5 6.5h9a5 5 0 0 1 5 5v1a5 5 0 0 1-8.6 3.5h-1.8A5 5 0 0 1 2.5 12.5v-1a5 5 0 0 1 5-5z" />
    <path d="M7 10.5v3M5.5 12h3M15.5 11h.01M17.5 13h.01" />
  </Icon>
)
export const AlertIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 2.8a9.2 9.2 0 1 1 0 18.4 9.2 9.2 0 0 1 0-18.4z" />
    <path d="M12 7.6v5.2M12 16.2h.01" />
  </Icon>
)
export const ChartIcon = (p: P) => (
  <Icon {...p}>
    <S d="M4 12.5a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1V20H4zM10.25 5a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v15h-3.5zM16.5 15a1 1 0 0 1 1-1H19a1 1 0 0 1 1 1v5h-3.5z" />
    <path d="M2.5 20.5h19" />
  </Icon>
)
export const UserIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 3.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
    <S d="M4.5 20.5a7.5 7.5 0 0 1 15 0z" />
  </Icon>
)
export const GearIcon = (p: P) => (
  <Icon {...p}>
    <S d="M10.3 3.2h3.4l.5 2.3 1.6.9 2.2-.8 1.7 2.9-1.7 1.6v1.8l1.7 1.6-1.7 2.9-2.2-.8-1.6.9-.5 2.3h-3.4l-.5-2.3-1.6-.9-2.2.8-1.7-2.9 1.7-1.6v-1.8L4.3 8.5 6 5.6l2.2.8 1.6-.9z" />
    <circle cx="12" cy="12" r="2.6" />
  </Icon>
)
export const MoreIcon = (p: P) => (
  <Icon {...p}>
    <S d="M4.5 3.5h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM15.5 3.5h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM4.5 14.5h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z" />
    <circle cx="17.5" cy="17.5" r="3" />
  </Icon>
)
export const SearchIcon = (p: P) => (
  <Icon {...p}>
    <S d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z" />
    <path d="m20.5 20.5-4.5-4.5" />
  </Icon>
)
export const ChevronRightIcon = (p: P) => (
  <Icon {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
)
export const ChevronDownIcon = (p: P) => (
  <Icon {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Icon>
)
export const ChevronLeftIcon = (p: P) => (
  <Icon {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Icon>
)

// ── Actions ────────────────────────────────────────────────────────────────────────────────
export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
)
export const CheckCircleIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 2.8a9.2 9.2 0 1 1 0 18.4 9.2 9.2 0 0 1 0-18.4z" />
    <path d="m8 12.3 2.8 2.8L16.2 9.6" />
  </Icon>
)
/** Almost: a tilde, for a near-miss answer. */
export const NearIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 13c1.6-2.2 3.6-2.6 6-1s4.4 1.2 6-1" />
  </Icon>
)
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Icon>
)
/** Send: a paper plane. */
export const SendIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20 4 10.5 13.5M20 4l-6 16-3.5-6.5L4 10l16-6z" />
  </Icon>
)
export const DownloadIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 4v10m0 0-4-4m4 4 4-4M5 19h14" />
  </Icon>
)
export const PlusIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)
export const PlayIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7.5 5.2v13.6a1 1 0 0 0 1.5.9l10.7-6.8a1 1 0 0 0 0-1.8L9 4.3a1 1 0 0 0-1.5.9z" fill="currentColor" />
  </Icon>
)
export const PauseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7 5h2.5v14H7zM14.5 5H17v14h-2.5z" fill="currentColor" />
  </Icon>
)
export const StopIcon = (p: P) => (
  <Icon {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
  </Icon>
)
export const ShuffleIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 6.5h3.2c4 0 5.8 11 9.8 11H21M3 17.5h3.2c1.5 0 2.7-1.6 3.7-3.7M13.6 10.2c1-2.1 2.2-3.7 3.7-3.7H21M18 3.5l3 3-3 3M18 14.5l3 3-3 3" />
  </Icon>
)
export const SwapIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 8h14M14.5 4.5 18 8l-3.5 3.5M20 16H6M9.5 12.5 6 16l3.5 3.5" />
  </Icon>
)
export const CopyIcon = (p: P) => (
  <Icon {...p}>
    <S d="M9 9h10a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 21H9a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 9 9z" />
    <path d="M15.5 9V5.5A1.5 1.5 0 0 0 14 4H5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 5 16h2.5" />
  </Icon>
)
export const ClipboardIcon = (p: P) => (
  <Icon {...p}>
    <S d="M7 5.5h10a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V7A1.5 1.5 0 0 1 7 5.5z" />
    <path d="M9.5 5.5V4.2a.7.7 0 0 1 .7-.7h3.6a.7.7 0 0 1 .7.7v1.3M9 11h6M9 15h4" />
  </Icon>
)
/** Offline: a cloud struck through. */
export const CloudOffIcon = (p: P) => (
  <Icon {...p}>
    <S d="M7.5 18.5h9.8a3.8 3.8 0 0 0 1-7.4A5.8 5.8 0 0 0 6.9 9.8 4.4 4.4 0 0 0 7.5 18.5z" />
    <path d="M4 4l16 16" />
  </Icon>
)
/** A verb's forms: the table of persons and endings. */
export const ConjugationsIcon = (p: P) => (
  <Icon {...p}>
    <S d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5z" />
    <path d="M3.5 9.5h17M3.5 14.5h17M10 9.5v10" />
  </Icon>
)
/** Dictation: sound on the left, the pen that writes it on the right. */
export const DictationIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3.5 10v4M6.5 7.5v9M9.5 9.5v5" />
    <S d="M13.5 19.5l.9-3.6 5.6-5.6a1.7 1.7 0 0 1 2.4 2.4l-5.6 5.6z" />
  </Icon>
)
/** Shadowing: a voice and its echo a beat behind. */
export const ShadowingIcon = (p: P) => (
  <Icon {...p}>
    <path d="M2.5 9.5h2l1.7-4 2.6 8 2-5 1.4 1H17" />
    <path d="M7.5 18.5h2l1.5-3.5 2.2 6.5 1.8-4.5 1.2.9h3.3" opacity="0.55" />
  </Icon>
)
/** Back-translation: Turkish to the language and round again. */
export const BackTranslateIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4.5 11.5a7.5 7.5 0 0 1 13-4.7M19.5 3.5v4h-4M19.5 12.5a7.5 7.5 0 0 1-13 4.7M4.5 20.5v-4h4" />
  </Icon>
)
/** What the ear missed: an ear in a dashed ring. */
export const EarMissIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" strokeDasharray="2.4 3" opacity="0.7" />
    <g transform="translate(5.4 5.4) scale(0.55)">
      <D d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 3.2-2.6 4.3-3.1 7-.4 2.2-1.8 3.8-3.9 3.8a3 3 0 0 1-3-3z" />
      <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 3.2-2.6 4.3-3.1 7-.4 2.2-1.8 3.8-3.9 3.8a3 3 0 0 1-3-3M9.5 10a2.5 2.5 0 0 1 5 0c0 1.4-1.2 2-1.7 3" strokeWidth="3.2" />
    </g>
  </Icon>
)
/** Verb review: the review loop with a V in it. */
export const VerbReviewIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4.5 11.5a7.5 7.5 0 0 1 13-4.7M19.5 3.5v4h-4M19.5 12.5a7.5 7.5 0 0 1-13 4.7M4.5 20.5v-4h4" />
    <path d="M9.3 9.5 12 14.5l2.7-5" />
  </Icon>
)
/** Against the clock: a stopwatch. */
export const TimerIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 6.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z" />
    <path d="M12 14V10M9.5 3h5M12 3v3.5M18.2 7.8l1.3-1.3" />
  </Icon>
)
/** Dawn and dusk: the sun on the horizon. */
export const SunriseIcon = (p: P) => (
  <Icon {...p}>
    <S d="M6.5 16a5.5 5.5 0 0 1 11 0z" />
    <path d="M3 19h18M12 6v2.2M4.6 9.6l1.6 1.4M19.4 9.6l-1.6 1.4" />
  </Icon>
)
export const TrashIcon = (p: P) => (
  <Icon {...p}>
    <S d="M6 7h12l-.9 12.1a2 2 0 0 1-2 1.9H8.9a2 2 0 0 1-2-1.9z" />
    <path d="M4 7h16M9.5 7V4.5h5V7M10 11v6M14 11v6" />
  </Icon>
)
export const UndoIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Icon>
)
export const LinkIcon = (p: P) => (
  <Icon {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Icon>
)
export const KeyboardIcon = (p: P) => (
  <Icon {...p}>
    <S d="M4 5.5h16A1.5 1.5 0 0 1 21.5 7v10a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 17V7A1.5 1.5 0 0 1 4 5.5z" />
    <path d="M6.5 9.5h.01M10 9.5h.01M14 9.5h.01M17.5 9.5h.01M6.5 13h.01M17.5 13h.01M8.5 15.5h7" />
  </Icon>
)
export const LockIcon = (p: P) => (
  <Icon {...p}>
    <S d="M6.5 10.5h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5z" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" />
  </Icon>
)

// ── Sound and speech ───────────────────────────────────────────────────────────────────────
export const SpeakerIcon = (p: P) => (
  <Icon {...p}>
    <S d="M4 9h3l4.6-3.8a.6.6 0 0 1 1 .5v12.6a.6.6 0 0 1-1 .5L7 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z" />
    <path d="M16 9.2a4 4 0 0 1 0 5.6M18.8 6.6a7.8 7.8 0 0 1 0 10.8" />
  </Icon>
)
export const MicIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 2.8a3 3 0 0 1 3 3v5.7a3 3 0 0 1-6 0V5.8a3 3 0 0 1 3-3z" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3.5M9 21h6" />
  </Icon>
)
export const HeadphonesIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    <S d="M4 14h2.5a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM20 14h-2.5a1 1 0 0 0-1 1v4.5a1 1 0 0 0 1 1H19a1 1 0 0 0 1-1z" />
  </Icon>
)
export const RadioIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4.5 10.5h15a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19v-7a1.5 1.5 0 0 1 1.5-1.5z" />
    <path d="M4.5 4.5l12 6M8.5 15.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15.5 13.5h2M15.5 16.5h2" />
  </Icon>
)
export const EarIcon = (p: P) => (
  <Icon {...p}>
    <D d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 3.2-2.6 4.3-3.1 7-.4 2.2-1.8 3.8-3.9 3.8a3 3 0 0 1-3-3z" />
    <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 3.2-2.6 4.3-3.1 7-.4 2.2-1.8 3.8-3.9 3.8a3 3 0 0 1-3-3M9.5 10a2.5 2.5 0 0 1 5 0c0 1.4-1.2 2-1.7 3" />
  </Icon>
)
export const MessageIcon = (p: P) => (
  <Icon {...p}>
    <S d="M5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10.5L6 19.8V16h-.5A1.5 1.5 0 0 1 4 14.5v-9A1.5 1.5 0 0 1 5.5 4z" />
    <path d="M8 8.5h8M8 12h5" />
  </Icon>
)

// ── Learning ───────────────────────────────────────────────────────────────────────────────
export const TargetIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 2.8a9.2 9.2 0 1 1 0 18.4 9.2 9.2 0 0 1 0-18.4z" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
  </Icon>
)
export const BulbIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 2.8a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.3 1 2.1h6c0-.8.3-1.5 1-2.1a6.5 6.5 0 0 0-4-11.6z" />
    <path d="M9.5 19.5h5M10.5 22h3" />
  </Icon>
)
export const BrainIcon = (p: P) => (
  <Icon {...p}>
    <S d="M11.5 4.5A3 3 0 0 0 6.2 6.4 3 3 0 0 0 4 11.7a3.4 3.4 0 0 0 2.3 5.6 3.2 3.2 0 0 0 5.2 1.7zM12.5 4.5a3 3 0 0 1 5.3 1.9 3 3 0 0 1 2.2 5.3 3.4 3.4 0 0 1-2.3 5.6 3.2 3.2 0 0 1-5.2 1.7z" />
    <path d="M8.5 10h1.5M15.5 13H14" />
  </Icon>
)
export const SparkleIcon = (p: P) => (
  <Icon {...p}>
    <S d="M11 3.5c.6 4 2.6 6 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.5 5.9-2.5 6.5-6.5z" />
    <path d="M18.5 15v4M16.5 17h4" />
  </Icon>
)
export const BoltIcon = (p: P) => (
  <Icon {...p}>
    <S d="M13 2.8 5 13.2h6.2l-1 8 8-10.4H12z" />
  </Icon>
)
export const CalendarIcon = (p: P) => (
  <Icon {...p}>
    <S d="M5.5 5h13A2 2 0 0 1 20.5 7v11.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
    <path d="M3.5 10h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01" />
  </Icon>
)
export const PulseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 12.5h3.8l2.4-6 4.2 11.5 2.6-5.5H21" />
  </Icon>
)
export const GaugeIcon = (p: P) => (
  <Icon {...p}>
    <S d="M3.5 17a8.5 8.5 0 1 1 17 0z" />
    <path d="M12 17l4-5" />
  </Icon>
)
/** Slow: the gauge's needle low (slow playback, slow recall). */
export const SlowIcon = (p: P) => (
  <Icon {...p}>
    <S d="M3.5 17a8.5 8.5 0 1 1 17 0z" />
    <path d="M12 17 7.5 13" />
  </Icon>
)
export const TrophyIcon = (p: P) => (
  <Icon {...p}>
    <S d="M7 3.8h10v5.4a5 5 0 0 1-10 0z" />
    <path d="M7 5.8H4.5v1a3 3 0 0 0 3 3M17 5.8h2.5v1a3 3 0 0 1-3 3M12 14.2v3M8.5 20.5h7M9.5 20.5c0-1.9 1.1-3.3 2.5-3.3s2.5 1.4 2.5 3.3" />
  </Icon>
)
export const FlagIcon = (p: P) => (
  <Icon {...p}>
    <S d="M5.5 4.5h11.5l-2.2 4 2.2 4H5.5z" />
    <path d="M5.5 21V3.5" />
  </Icon>
)
export const SwordsIcon = (p: P) => (
  <Icon {...p}>
    <S d="M4 4h3.2l8.6 8.6-3.2 3.2L4 7.2z" />
    <path d="M20 4h-3.2l-5 5M14 18l4-4M16.3 16.3l3.2 3.2M4.5 19.5l3.2-3.2M6 14l4 4M12.8 11.2l2.4 2.4" />
  </Icon>
)
export const PuzzleIcon = (p: P) => (
  <Icon {...p}>
    <S d="M6 7h3.5a1.8 1.8 0 1 1 3.5 0H16.5v3.5a1.8 1.8 0 1 1 0 3.5V17.5H13a1.8 1.8 0 1 0-3.5 0H6V14a1.8 1.8 0 1 0 0-3.5z" />
  </Icon>
)
export const TagIcon = (p: P) => (
  <Icon {...p}>
    <S d="M3.5 12.1V4.5a1 1 0 0 1 1-1h7.6l8.4 8.4a1.5 1.5 0 0 1 0 2.1l-6.1 6.1a1.5 1.5 0 0 1-2.1 0z" />
    <circle cx="8" cy="8" r="1.4" />
  </Icon>
)
/** An hourglass: which of two pasts (a finished moment or ongoing time). */
export const HourglassIcon = (p: P) => (
  <Icon {...p}>
    <D d="M7.5 4.5h9c0 4-4.5 5.5-4.5 7.5S16.5 15.5 16.5 19.5h-9c0-4 4.5-5.5 4.5-7.5S7.5 8.5 7.5 4.5z" />
    <path d="M6 3.5h12M6 20.5h12M7.5 3.5c0 4.5 4.5 6 4.5 8.5s-4.5 4-4.5 8.5M16.5 3.5c0 4.5-4.5 6-4.5 8.5s4.5 4 4.5 8.5" />
    <path d="M9.5 18.5h5L12 16z" />
  </Icon>
)
/** A verb through time: a clock with an arrow turning back (tenses). */
export const TenseIcon = (p: P) => (
  <Icon {...p}>
    <D d="M12 4a8 8 0 1 1-7.6 10.5L4 12a8 8 0 0 1 8-8z" />
    <path d="M4.3 14.5A8 8 0 1 0 6.3 6.4L4 8.6" />
    <path d="M4 4.8v3.8h3.8M12 8.2v4l2.8 1.8" />
  </Icon>
)
export const ScaleIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 4v16.5M8 20.5h8M5 7.5h14M12 4.2l-7 3.3M12 4.2l7 3.3" />
    <S d="M5 8 2.5 13.5a2.5 2.5 0 0 0 5 0zM19 8l-2.5 5.5a2.5 2.5 0 0 0 5 0z" />
  </Icon>
)
export const HandIcon = (p: P) => (
  <Icon {...p}>
    <S d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10a1.5 1.5 0 0 1 3 0v1.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.7-2.3l-2.1-2.6a1.5 1.5 0 0 1 2.3-1.9L9 16z" />
  </Icon>
)
export const HeartIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 20s-7.5-4.5-7.5-10.1A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7.5 2.9C19.5 15.5 12 20 12 20z" />
  </Icon>
)
export const SmileIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
    <S d="M8.5 14c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8" />
    <S d="M9 9.8v.4M15 9.8v.4" />
  </Icon>
)
export const StarIcon = (p: P) => (
  <Icon {...p}>
    <S d="m12 3.2 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.6l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
  </Icon>
)
export const FlameIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 2.8c.9 3 4.8 5.1 4.8 9.6a4.8 4.8 0 0 1-9.6 0c0-2 .9-3.4 1.9-4.3.3 1.5 1.1 2.4 1.9 2.4 0-2.8.1-5.2 1-7.7z" />
    <path d="M12 14.4c.8.9 1.4 1.6 1.4 2.5a1.4 1.4 0 0 1-2.8 0c0-.9.6-1.6 1.4-2.5z" fill="currentColor" />
  </Icon>
)
export const SnowflakeIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8M9.6 4.2 12 6.2l2.4-2M9.6 19.8 12 17.8l2.4 2M4.4 10.6l2.9-.9-.6-3M19.6 13.4l-2.9.9.6 3M19.6 10.6l-2.9-.9.6-3M4.4 13.4l2.9.9-.6 3" />
  </Icon>
)

// ── Nature and the garden ──────────────────────────────────────────────────────────────────
export const LeafIcon = (p: P) => (
  <Icon {...p}>
    <S d="M5 19c0-8 5-13.2 14-14 0 9-5.3 14-13 14z" />
    <path d="M5 19l7.5-7.5" />
  </Icon>
)
export const SproutIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 13C12 9.2 9.1 6.7 4.8 6.7c0 3.8 2.9 6.3 7.2 6.3zM12 11c0-3.6 2.6-6 6.5-6 0 3.6-2.6 6-6.5 6z" />
    <path d="M12 21v-9.5" />
  </Icon>
)
export const FlowerIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 3.5a2.6 2.6 0 0 1 2.6 2.6 2.6 2.6 0 0 1 3.4 3.9 2.6 2.6 0 0 1-1.3 4.8 2.6 2.6 0 0 1-4.7 2.2 2.6 2.6 0 0 1-4.7-2.2A2.6 2.6 0 0 1 6 10a2.6 2.6 0 0 1 3.4-3.9A2.6 2.6 0 0 1 12 3.5z" />
    <circle cx="12" cy="11" r="2" />
    <path d="M12 17v4" />
  </Icon>
)
export const DropIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 2.8s6.5 6.9 6.5 11.8a6.5 6.5 0 0 1-13 0C5.5 9.7 12 2.8 12 2.8z" />
  </Icon>
)
export const TrendDownIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 7l6 6 4-4 8 8M15 17h6v-6" />
  </Icon>
)
export const MoonIcon = (p: P) => (
  <Icon {...p}>
    <S d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.5 6.5 0 0 0 10.1 10.1z" />
  </Icon>
)
export const SunIcon = (p: P) => (
  <Icon {...p}>
    <D d="M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" />
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
  </Icon>
)
export const UmbrellaIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5h-17A8.5 8.5 0 0 1 12 3.5z" />
    <path d="M12 12v6.5a2 2 0 0 0 4 0" />
  </Icon>
)
export const GlobeIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z" />
    <path d="M3.3 12h17.4M12 3.2c2.3 2.3 3.5 5.3 3.5 8.8s-1.2 6.5-3.5 8.8C9.7 18.5 8.5 15.5 8.5 12S9.7 5.5 12 3.2z" />
  </Icon>
)
export const PinIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.2" />
  </Icon>
)
export const ImageIcon = (p: P) => (
  <Icon {...p}>
    <S d="M5.5 4.5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2z" />
    <circle cx="9" cy="9.5" r="1.6" />
    <path d="m3.8 17 4.7-4.2 3.8 3.3 2.9-2.4 5 4.1" />
  </Icon>
)

// ── Settings and data ──────────────────────────────────────────────────────────────────────
export const BellIcon = (p: P) => (
  <Icon {...p}>
    <S d="M6.2 9.2a5.8 5.8 0 0 1 11.6 0c0 5.6 2.4 7.6 2.4 7.6H3.8s2.4-2 2.4-7.6z" />
    <path d="M10.2 20.2a2 2 0 0 0 3.6 0" />
  </Icon>
)
export const DataIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 2.8c4.1 0 7.5 1.3 7.5 3s-3.4 3-7.5 3-7.5-1.3-7.5-3 3.4-3 7.5-3z" />
    <path d="M4.5 5.8v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6M4.5 11.8v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
  </Icon>
)
export const ToolIcon = (p: P) => (
  <Icon {...p}>
    <S d="M14.6 6.4a4.2 4.2 0 0 0 5 5.1L12.3 18.8a2.2 2.2 0 0 1-3.1-3.1l7.3-7.3a4.2 4.2 0 0 0-1.9-2z" />
  </Icon>
)
export const PaletteIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.5 0-.9-.7-1.3-.7-2.1 0-.8.6-1.4 1.5-1.4H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8z" />
    <circle cx="7.5" cy="11.5" r="1" fill="currentColor" />
    <circle cx="10" cy="7.5" r="1" fill="currentColor" />
    <circle cx="15" cy="7.5" r="1" fill="currentColor" />
  </Icon>
)
export const WandIcon = (p: P) => (
  <Icon {...p}>
    <S d="M3.6 18.9 14.4 8.1l1.5 1.5L5.1 20.4z" />
    <path d="M15.5 3.5v2.5M20.5 8.5H18M19 5l-1.6 1.6M12.5 5.5l1 1M18.5 11.5l-1-1" />
  </Icon>
)
export const InfoIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 2.8a9.2 9.2 0 1 1 0 18.4 9.2 9.2 0 0 1 0-18.4z" />
    <path d="M12 11v5.3M12 7.9h.01" />
  </Icon>
)
export const HelpIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 2.8a9.2 9.2 0 1 1 0 18.4 9.2 9.2 0 0 1 0-18.4z" />
    <path d="M9.6 9.4a2.5 2.5 0 0 1 4.9.8c0 1.7-2.5 2.2-2.5 3.8M12 17h.01" />
  </Icon>
)

// ── Scenes (speaking missions) ─────────────────────────────────────────────────────────────
export const UtensilsIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 3v7a2 2 0 0 0 2 2M10 3v7a2 2 0 0 1-2 2v9M8 3v6" />
    <S d="M17 21V3c-2 1.4-3 3.8-3 7v4h3" />
  </Icon>
)
export const FilmIcon = (p: P) => (
  <Icon {...p}>
    <S d="M5 4h14a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 5 4z" />
    <path d="M7.5 4v16M16.5 4v16M3.5 9h4M3.5 15h4M16.5 9h4M16.5 15h4" />
  </Icon>
)
export const BriefcaseIcon = (p: P) => (
  <Icon {...p}>
    <S d="M4.5 7.5h15A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V9a1.5 1.5 0 0 1 1.5-1.5z" />
    <path d="M9 7.5V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2M3 13h18" />
  </Icon>
)
export const BoxIcon = (p: P) => (
  <Icon {...p}>
    <S d="M12 2.8 20 7v10l-8 4.2L4 17V7z" />
    <path d="M4 7l8 4.2L20 7M12 11.2v10M8 4.9l8 4.2" />
  </Icon>
)
export const SuitcaseIcon = (p: P) => (
  <Icon {...p}>
    <S d="M6.5 7h11A1.5 1.5 0 0 1 19 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5v-10A1.5 1.5 0 0 1 6.5 7z" />
    <path d="M9.5 7V4.5h5V7M9 11v5M15 11v5M8 20v1.5M16 20v1.5" />
  </Icon>
)
export const StethoscopeIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 3.5H5v5a4 4 0 0 0 8 0v-5h-1M9 12.5v2a5 5 0 0 0 10 0v-2" />
    <S d="M19 8.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
  </Icon>
)
export const MountainIcon = (p: P) => (
  <Icon {...p}>
    <S d="M2.5 19.5 9 8l3.5 5.5 2.5-3.5 6.5 9.5z" />
    <path d="M7.4 10.8 9 12l1.6-1.2" />
  </Icon>
)

/**
 * The app's mark, as on the app icon (public/favicon.svg): a D-shaped speech bubble with a
 * twin-leaf sprout, open book pages, and a golden spark. Words that grow.
 */
export const BrandMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="96 96 340 356" aria-hidden>
    <path d="M168 112H256C338 112 400 174 400 256C400 338 338 400 256 400H234C250 386 258 368 260 348C312 346 348 308 348 256C348 204 310 164 256 164H188V348H236C234 368 222 388 202 400H188L148 432C140 438 134 433 134 423V146A34 34 0 0 1 168 112Z" fill="#fff" />
    <path d="M194 214C220 220 242 236 256 262C270 236 292 220 318 214" stroke="#6ee7b7" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M208 202C228 210 244 224 256 244C268 224 284 210 304 202" stroke="#a7f3d0" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M210 402C236 392 248 364 248 324C204 312 172 278 170 224C210 232 242 252 256 284C270 252 302 232 342 224C340 278 308 312 262 324C262 364 244 394 210 402Z" fill="#10b981" />
    <path d="M170 224C210 232 242 252 256 284C254 294 251 304 248 312C232 276 204 248 170 224Z" fill="#6ee7b7" />
    <path d="M342 224C302 232 270 252 256 284C258 294 261 304 264 312C280 276 308 248 342 224Z" fill="#6ee7b7" />
    <path d="M256 162Q256 184 278 184Q256 184 256 206Q256 184 234 184Q256 184 256 162Z" fill="#fbbf24" />
  </svg>
)
export const SlidersIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Icon>
)
