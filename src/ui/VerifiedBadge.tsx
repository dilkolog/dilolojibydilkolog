import { VerifiedMark } from './VerifiedMark'

/**
 * Alias kept for callers importing `VerifiedBadge`: renders Diloloji's organic emerald
 * eight-lobed blossom seal (`VerifiedMark`) with optical cap-height alignment.
 */
export function VerifiedBadge({ size = 20, label = 'Onaylı hesap' }: { size?: number; label?: string }) {
  return <VerifiedMark size={size} label={label} />
}
