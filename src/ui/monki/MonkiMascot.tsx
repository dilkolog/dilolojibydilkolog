export type MonkiMood = 'idle' | 'think' | 'cheer'

/**
 * Monki, the assistant: a baby monkey hanging from a vine (an original drawing).
 * The swing, the blink and the wave are CSS (lazy.css), and stop under prefers-reduced-motion.
 */
export function MonkiMascot({ size = 64, mood = 'idle', still = false }: { size?: number; mood?: MonkiMood; still?: boolean }) {
  return (
    <svg
      className={`monki-art mood-${mood}${still ? ' mood-still' : ''}`}
      width={size}
      height={(size * 140) / 120}
      viewBox="0 0 120 140"
      aria-hidden
      focusable="false"
    >
      <path className="monki-vine" d="M60 -4 C 56 14 64 30 60 50" fill="none" stroke="#3f9d5b" strokeWidth="4" strokeLinecap="round" />
      <path d="M62 14 C 74 8 82 12 84 20 C 74 24 66 22 62 14 Z" fill="#58b873" />
      <g className="monki-swing">
        <path className="monki-tail" d="M72 114 C 100 116 104 86 90 80" fill="none" stroke="#8a5530" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="60" cy="100" rx="21" ry="23" fill="#a2683c" />
        <ellipse cx="60" cy="105" rx="12" ry="14" fill="#f4d6ac" />
        <ellipse cx="47" cy="121" rx="9" ry="5.5" fill="#8a5530" />
        <ellipse cx="73" cy="121" rx="9" ry="5.5" fill="#8a5530" />
        {/* the arm that holds on to the vine */}
        <path d="M45 92 C 34 72 50 58 59 49" fill="none" stroke="#a2683c" strokeWidth="8" strokeLinecap="round" />
        <circle cx="59.5" cy="48" r="5" fill="#8a5530" />
        {/* the other arm: hangs, or waves, or is up in the air */}
        <g className="monki-wave">
          <path d="M75 92 C 88 98 90 104 88 110" fill="none" stroke="#a2683c" strokeWidth="8" strokeLinecap="round" />
          <circle cx="88" cy="111" r="5" fill="#8a5530" />
        </g>
        <circle cx="32" cy="64" r="10" fill="#a2683c" />
        <circle cx="32" cy="64" r="5.5" fill="#f4d6ac" />
        <circle cx="88" cy="64" r="10" fill="#a2683c" />
        <circle cx="88" cy="64" r="5.5" fill="#f4d6ac" />
        <g className="monki-noggin">
          <circle cx="60" cy="64" r="29" fill="#a2683c" />
          <path d="M60 36 C 52 32 54 24 62 25" fill="none" stroke="#8a5530" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="50" cy="66" r="14" fill="#f4d6ac" />
          <circle cx="70" cy="66" r="14" fill="#f4d6ac" />
          <ellipse cx="60" cy="76" rx="18" ry="12" fill="#f4d6ac" />
          <g className="monki-eyes">
            <circle cx="51" cy="63" r="5" fill="#1f1410" />
            <circle cx="69" cy="63" r="5" fill="#1f1410" />
            <circle cx="52.6" cy="61.2" r="1.7" fill="#fff" />
            <circle cx="70.6" cy="61.2" r="1.7" fill="#fff" />
          </g>
          <ellipse cx="42" cy="74" rx="4.5" ry="3" fill="#f58aa0" opacity="0.55" />
          <ellipse cx="78" cy="74" rx="4.5" ry="3" fill="#f58aa0" opacity="0.55" />
          <circle cx="57.5" cy="72" r="1.1" fill="#8a5530" />
          <circle cx="62.5" cy="72" r="1.1" fill="#8a5530" />
          {mood === 'think' ? (
            <ellipse className="monki-mouth" cx="60" cy="80" rx="3.2" ry="2.4" fill="#7a3b2a" />
          ) : (
            <path className="monki-mouth" d="M51 77 Q60 87 69 77" fill={mood === 'cheer' ? '#7a3b2a' : 'none'} stroke="#7a3b2a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </g>
      </g>
    </svg>
  )
}
