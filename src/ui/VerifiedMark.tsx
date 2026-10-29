/**
 * The approved-account tick beside a name: a six-petal rosette (the app's plant, in bloom) in the
 * language colour with a check on it. Read out as "Onaylı hesap"; no text inside, so the name's text stays the name.
 */
export function VerifiedMark({ label = 'Onaylı hesap' }: { label?: string }) {
  return (
    <svg className="verified-mark" viewBox="0 0 24 24" role="img" aria-label={label} focusable="false">
      <title>{label}</title>
      <g className="verified-mark-petals">
        <circle cx="12" cy="6.6" r="4.6" />
        <circle cx="16.68" cy="9.3" r="4.6" />
        <circle cx="16.68" cy="14.7" r="4.6" />
        <circle cx="12" cy="17.4" r="4.6" />
        <circle cx="7.32" cy="14.7" r="4.6" />
        <circle cx="7.32" cy="9.3" r="4.6" />
        <circle cx="12" cy="12" r="6.5" />
      </g>
      <path className="verified-mark-check" d="M7.9 12.3l2.8 2.8 5.4-5.8" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
