/**
 * Inline icons (Lucide-style, 24px grid, currentColor) so the app needs no icon package.
 *
 * Rule: these line icons are for navigation and actions (menu, tiles, buttons). Emoji are for
 * content with personality: game cards, quests, badges, plants, celebrations and notes.
 */
import type { ReactNode } from 'react'

function Icon({ size = 20, children, className }: { size?: number; children: ReactNode; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  )
}

type P = { size?: number; className?: string }

export const FlameIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 2c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2-4.5.3 1.6 1.2 2.5 2 2.5 0-3 0-5.5 1-8z" fill="currentColor" stroke="none" />
  </Icon>
)
export const StarIcon = (p: P) => (
  <Icon {...p}>
    <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="currentColor" stroke="none" />
  </Icon>
)
export const BookIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zm0 0A2 2 0 0 0 6 22h13" />
  </Icon>
)
export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
)
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)
export const AlertIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </Icon>
)
export const SpeakerIcon = (p: P) => (
  <Icon {...p}>
    <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
  </Icon>
)
export const TargetIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <circle cx="12" cy="12" r="5.5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </Icon>
)
export const SparkleIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z" fill="currentColor" stroke="none" />
    <path d="M19 15c.2 1.6 1 2.4 2.5 2.5-1.5.2-2.3 1-2.5 2.5-.2-1.5-1-2.3-2.5-2.5 1.5-.1 2.3-.9 2.5-2.5z" fill="currentColor" stroke="none" />
  </Icon>
)
export const PlusIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)
export const HomeIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </Icon>
)
export const ChartIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Icon>
)
export const GearIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Icon>
)
export const KeyboardIcon = (p: P) => (
  <Icon {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M8 16h8" />
  </Icon>
)
export const UserIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
)
export const BellIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Icon>
)
export const StoryIcon = (p: P) => (
  <Icon {...p}>
    <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
  </Icon>
)
export const ReadIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 5h16M4 10h16M4 15h11M4 20h7" />
  </Icon>
)
export const PenIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
    <path d="M13.5 6.5l4 4" />
  </Icon>
)
export const GameIcon = (p: P) => (
  <Icon {...p}>
    <rect x="2" y="6" width="20" height="12" rx="4" />
    <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" />
  </Icon>
)
export const MoreIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Icon>
)
export const SearchIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
)
export const MicIcon = (p: P) => (
  <Icon {...p}>
    <rect x="9" y="2.5" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
  </Icon>
)
export const PlayIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
  </Icon>
)
export const PauseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M8 5v14M16 5v14" />
  </Icon>
)
export const BulbIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 18h6M10 21.5h4M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.4 1 2.4h6c0-1 .3-1.8 1-2.4a6.5 6.5 0 0 0-4-11.6z" />
  </Icon>
)
export const DropIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 2.5s6.5 7 6.5 12a6.5 6.5 0 0 1-13 0c0-5 6.5-12 6.5-12z" />
  </Icon>
)
export const ShuffleIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 6h3.5c4 0 6 12 10 12H21M3 18h3.5c1.6 0 2.8-1.9 3.9-4.2M13.6 10.2C14.7 7.9 15.9 6 17.5 6H21M18 3l3 3-3 3M18 15l3 3-3 3" />
  </Icon>
)
export const DataIcon = (p: P) => (
  <Icon {...p}>
    <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
    <path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
  </Icon>
)
export const ToolIcon = (p: P) => (
  <Icon {...p}>
    <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-2-2z" />
  </Icon>
)
/** The app's mark: a word (speech bubble) taking root (sprout), as on the app icon. */
export const BrandMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    <path d="M7 10.5h18a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9.2L11 29v-3.5H7a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z" fill="#f8fafc" />
    <path d="M16 21.5v-8" stroke="#15803d" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M16 15c-.6-3.6-3.5-5.8-7.2-5.5.1 3.7 3 6.1 7.2 5.5zM16 13.5c.7-4.1 4-6.6 8.1-6.2-.1 4.3-3.4 6.9-8.1 6.2z" fill="#22c55e" />
  </svg>
)
export const CalendarIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
)
export const BrainIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3.5 3.5 0 0 0 9 18.5V4.5zM15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2 3.5 3.5 0 0 1-5 5.8V4.5z" />
  </Icon>
)
export const LeafIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19l7-7" />
  </Icon>
)
export const PulseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
  </Icon>
)
export const ChevronRightIcon = (p: P) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
)
export const PaletteIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.5 0-.9-.7-1.3-.7-2.1 0-.8.6-1.4 1.5-1.4H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8z" />
    <circle cx="7.5" cy="11.5" r="1" />
    <circle cx="10" cy="7.5" r="1" />
    <circle cx="15" cy="7.5" r="1" />
  </Icon>
)
