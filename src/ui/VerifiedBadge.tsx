/**
 * The owner-approved account mark, in the style of a verified tick: a scalloped seal with a white check.
 * Drawn inline so it takes the --verified token; the accessible name is the whole message.
 */
const POINTS = 16
const SEAL = Array.from({ length: POINTS * 2 }, (_, i) => {
  const r = i % 2 === 0 ? 11 : 9.4
  const a = (Math.PI * i) / POINTS - Math.PI / 2
  return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`
}).join(' ')

export function VerifiedBadge({ size = 22 }: { size?: number }) {
  return (
    <span className="verified-badge" role="img" aria-label="Onaylı hesap" title="Onaylı hesap">
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <polygon points={SEAL} fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M7.6 12.4l3 3 5.9-6.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
