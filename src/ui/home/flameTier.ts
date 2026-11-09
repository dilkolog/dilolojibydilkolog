/** Streak milestones: the flame grows and changes colour as the run gets longer. */
export function flameTier(streak: number): 0 | 1 | 2 | 3 | 4 {
  return streak >= 100 ? 4 : streak >= 30 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0
}
