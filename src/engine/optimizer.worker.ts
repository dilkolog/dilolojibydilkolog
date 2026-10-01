import { fitWeights, type History } from './optimizer'

/** Runs the FSRS fit off the main thread; it replays the whole history many times. */
self.onmessage = (e: MessageEvent<History[]>) => {
  const result = fitWeights(e.data, { onProgress: (done) => self.postMessage({ type: 'progress', done }) })
  self.postMessage({ type: 'done', result })
}
