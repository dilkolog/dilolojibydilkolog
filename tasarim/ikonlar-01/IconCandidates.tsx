/** Design candidates only. Not connected to the application. */
import type { SVGProps } from 'react'
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

export function ReadingNavIcon({ size = 20, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M12 6C9.5 4.2 6.1 3.9 3.5 5v14c2.6-1.1 6-0.8 8.5 1 2.5-1.8 5.9-2.1 8.5-1V5c-2.6-1.1-6-.8-8.5 1Z" fill="currentColor" stroke="none" opacity=".18"/><path d="M12 6C9.5 4.2 6.1 3.9 3.5 5v14c2.6-1.1 6-0.8 8.5 1 2.5-1.8 5.9-2.1 8.5-1V5c-2.6-1.1-6-.8-8.5 1Z"/><path d="M12 6v14M6.5 9h2.5M6.5 12h2.5M15 9h2.5M15 12h2.5"/></svg>
}

export function PracticeNavIcon({ size = 20, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M4 16H3.5A2 2 0 0 1 1.5 14V4A2 2 0 0 1 3.5 2h10A2 2 0 0 1 15.5 4v1"/><path d="M8.5 7.5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" fill="currentColor" stroke="none" opacity=".18"/><path d="M8.5 7.5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z"/><path d="m10 14.5 2.5 2.5 4.5-5"/></svg>
}

export function ProgressNavIcon({ size = 20, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M4 15h3v5H4ZM10.5 10h3v10h-3ZM17 4h3v16h-3Z" fill="currentColor" stroke="none" opacity=".18"/><path d="M4 20v-5h3v5M10.5 20V10h3v10M17 20V4h3v16M2.5 20.5h19"/></svg>
}

export function MoreOptionsIcon({ size = 20, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>
}

export function ShadowingIcon({ size = 20, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M10 5a2 2 0 0 1 2-2h6a3 3 0 0 1 3 3v6a3 3 0 0 1-2 2.8H17V7h-7Z" fill="currentColor" stroke="none" opacity=".18"/><path d="M10 5a2 2 0 0 1 2-2h6a3 3 0 0 1 3 3v6a3 3 0 0 1-2 2.8"/><path d="M5.5 7h9a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8l-4.5 3v-3.8A3 3 0 0 1 2.5 15v-5a3 3 0 0 1 3-3Z" fill="currentColor" stroke="none" opacity=".18"/><path d="M5.5 7h9a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8l-4.5 3v-3.8A3 3 0 0 1 2.5 15v-5a3 3 0 0 1 3-3Z"/><path d="M7 11.5v2M10 10.5v4M13 11.5v2"/></svg>
}

export function ListeningRetryIcon({ size = 20, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M4 8a5.5 5.5 0 0 1 11 0c0 3-2.2 4-3.1 5.5-.8 1.2-.6 3.2-2.8 4.3A3 3 0 0 1 4.5 15Z" fill="currentColor" stroke="none" opacity=".18"/><path d="M4 8a5.5 5.5 0 0 1 11 0c0 3-2.2 4-3.1 5.5-.8 1.2-.6 3.2-2.8 4.3A3 3 0 0 1 4.5 15M7 8a2.5 2.5 0 0 1 5 0c0 1.4-1.4 1.9-1.8 3"/><path d="M21 14.5a4 4 0 1 0 .3 5M21 11.5v3h-3"/></svg>
}
