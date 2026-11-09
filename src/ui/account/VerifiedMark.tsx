/**
 * The approved-account tick beside a name: a soft, organic eight-lobed blossom seal
 * in emerald (the app's growth/truth colour, matching BrandMark) with a balanced white check.
 * Read out as "Onaylı hesap"; no text inside, so the name stays the name.
 */
export function VerifiedMark({ label = 'Onaylı hesap', size = 20 }: { label?: string; size?: number }) {
  return (
    <svg
      className="verified-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={label}
      focusable="false"
    >
      <title>{label}</title>
      <defs>
        <linearGradient id="verified-mark-emerald" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <path
        className="verified-mark-seal"
        d="M 12 2.2 C 13.05 2.2, 13.98 3.95, 15.14 4.42 C 16.29 4.9, 18.19 4.33, 18.93 5.07 C 19.67 5.81, 19.1 7.71, 19.58 8.86 C 20.05 10.02, 21.8 10.95, 21.8 12 C 21.8 13.05, 20.05 13.98, 19.58 15.14 C 19.1 16.29, 19.67 18.19, 18.93 18.93 C 18.19 19.67, 16.29 19.1, 15.14 19.58 C 13.98 20.05, 13.05 21.8, 12 21.8 C 10.95 21.8, 10.02 20.05, 8.86 19.58 C 7.71 19.1, 5.81 19.67, 5.07 18.93 C 4.33 18.19, 4.9 16.29, 4.42 15.14 C 3.95 13.98, 2.2 13.05, 2.2 12 C 2.2 10.95, 3.95 10.02, 4.42 8.86 C 4.9 7.71, 4.33 5.81, 5.07 5.07 C 5.81 4.33, 7.71 4.9, 8.86 4.42 C 10.02 3.95, 10.95 2.2, 12 2.2 Z"
        fill="url(#verified-mark-emerald)"
      />
      <path
        className="verified-mark-check"
        d="m7.8 12.2 2.9 2.9 5.5-5.6"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
