/**
 * Model choice, prices and usage tracking for the AI layer. Kept outside the lazily loaded SDK
 * module so settings and the usage screen work without loading it.
 */

export type AiModel = 'claude-opus-5-5' | 'claude-sonnet-5-5' | 'claude-haiku-4-5'

export interface ModelInfo {
  id: AiModel
  label: string
  /** USD per million tokens. */
  input: number
  output: number
  note: string
}

export const AI_MODELS: ModelInfo[] = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', input: 4, output: 20, note: 'En iyi kalite (varsayılan).' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', input: 2, output: 10, note: 'Yarı fiyatına, çoğu iş için yeterli.' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', input: 1, output: 5, note: 'En ucuz; Türkçe geri bildirim kalitesi düşebilir.' },
]

export const modelInfo = (id: AiModel) => AI_MODELS.find((m) => m.id === id) ?? AI_MODELS[0]

export type AiFeature = 'test' | 'word_fill' | 'suggest' | 'sentence' | 'translation' | 'retell' | 'story' | 'mnemonic' | 'journal' | 'chat' | 'report' | 'prequestions' | 'family'

export const FEATURE_NAME: Record<AiFeature, string> = {
  test: 'Anahtar testi',
  word_fill: 'Kelime doldurma',
  suggest: 'Alan önerileri',
  sentence: 'Cümle değerlendirme',
  translation: 'Ters çeviri',
  retell: 'Hikaye anlatma',
  story: 'Hikaye bölümü',
  mnemonic: 'Hafıza ipucu',
  family: 'Kelime ailesi',
  journal: 'Günlük',
  chat: 'Sohbet',
  report: 'Hata raporu',
  prequestions: 'Okuma öncesi sorular',
}

export interface UsageRecord {
  feature: AiFeature
  model: AiModel
  inputTokens: number
  outputTokens: number
  cost: number
  at: Date
}

/** Cost in USD. Cache reads/writes are priced at 0.1× / 1.25× input. */
export function costOf(model: AiModel, input: number, output: number, cacheRead = 0, cacheWrite = 0): number {
  const m = modelInfo(model)
  return (input * m.input + output * m.output + cacheRead * m.input * 0.1 + cacheWrite * m.input * 1.25) / 1_000_000
}

export interface MonthUsage {
  requests: number
  inputTokens: number
  outputTokens: number
  cost: number
  features: Partial<Record<AiFeature, { requests: number; cost: number }>>
}

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export function addToMonth(month: MonthUsage | undefined, r: UsageRecord): MonthUsage {
  const m: MonthUsage = month ? { ...month, features: { ...month.features } } : { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0, features: {} }
  m.requests++
  m.inputTokens += r.inputTokens
  m.outputTokens += r.outputTokens
  m.cost += r.cost
  const f = m.features[r.feature] ?? { requests: 0, cost: 0 }
  m.features[r.feature] = { requests: f.requests + 1, cost: f.cost + r.cost }
  return m
}

/** Hooks the app installs at start: the model in use, a budget check, and where usage goes. */
export const aiConfig: {
  model: AiModel
  beforeRequest: () => Promise<void>
  onUsage: (r: UsageRecord) => void
} = {
  model: 'claude-opus-5-5',
  beforeRequest: async () => {},
  onUsage: () => {},
}
