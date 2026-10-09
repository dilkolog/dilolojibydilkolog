/** The day's plant: a seed before the first answer, then a stage for each fifth of the task, in bloom when it is done. */
export function dayStage(progress: number, done: boolean): number {
  if (done) return 5
  if (progress <= 0) return -1
  return Math.min(4, Math.floor(progress * 5))
}
