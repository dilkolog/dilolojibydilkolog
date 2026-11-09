export type SkeletonKind = 'home' | 'list' | 'detail' | 'settings' | 'session' | 'grid'

/** Which skeleton each screen gets: the shape of what is about to appear, so nothing jumps. */
export function skeletonFor(screen: string): SkeletonKind {
  if (screen === 'home') return 'home'
  if (screen === 'words' || screen === 'mistakes' || screen === 'dictionary') return 'list'
  if (screen === 'word') return 'detail'
  if (screen === 'settings') return 'settings'
  if (screen === 'session' || screen === 'summary') return 'session'
  return 'grid'
}
