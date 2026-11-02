import { accessFetch } from './access'

/** Which of the two paid speech services the site provides (api/speech.ts): natural voices and pronunciation scoring. */
export interface SpeechStatus {
  assess: boolean
  tts: boolean
}

const NONE: SpeechStatus = { assess: false, tts: false }

/** Asked once the account is approved. Without the owner's keys on the server both are off, and the features simply do not show. */
export async function speechAvailable(): Promise<SpeechStatus> {
  try {
    const res = await accessFetch('/api/speech')
    if (!res.ok) return NONE
    const body = (await res.json()) as { assess?: unknown; tts?: unknown }
    return { assess: body.assess === true, tts: body.tts === true }
  } catch {
    return NONE
  }
}

/** What the server's refusal means for the person, in Turkish. */
export function speechErrorText(status: number, error: unknown): string {
  if (error === 'daily_quota') return 'Bugünkü ses hakkın doldu; yarın yenilenir.'
  if (status === 429) return 'Şu an çok istek var; biraz sonra yeniden dene.'
  if (error === 'bad audio') return 'Kayıt değerlendirilemedi; biraz daha uzun ve net söyleyip yeniden dene.'
  if (status === 403 || error === 'approval_required' || error === 'account_required') return 'Bu özellik, site sahibinin onayladığı hesaplara açık.'
  return 'Ses servisi şu an kullanılamıyor; biraz sonra yeniden dene.'
}
