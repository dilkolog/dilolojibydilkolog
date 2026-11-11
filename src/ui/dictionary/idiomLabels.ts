import type { Register } from '../../engine/types'

/** How an idiom is said, as its dictionary card names it. */
export const REGISTER_NAME: Record<Register, string> = {
  neutral: 'her ortamda',
  informal: 'günlük konuşma',
  slang: 'argo',
  formal: 'resmî',
  academic: 'akademik',
  literary: 'edebî',
}
