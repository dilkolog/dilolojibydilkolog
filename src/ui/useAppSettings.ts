import { useEffect, useMemo, useState } from 'react'
import { db } from '../data/instance'
import type { Settings } from '../data/db'
import { aiConfig, monthKey } from '../ai/usage'
import { AiError } from '../ai/types'
import { applySettings } from './prefs'
import { natural } from './naturalVoice'
import { azure } from './pronunciation'
import { useAccessStatus } from './useAccessStatus'

/**
 * The saved settings and the keys kept next to them (AI, natural voice, Azure speech): read once on start,
 * applied to the page, and the AI usage hooks that enforce the monthly limit. `settings` is undefined while
 * loading and null on the first run.
 */
export function useAppSettings() {
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined)
  const [storedKey, setApiKeyState] = useState<string | null>(null)
  // The AI screens, like sync and the quota features, open once the owner has approved the account.
  const access = useAccessStatus()
  const apiKey = access.approved ? storedKey : null

  useEffect(() => {
    db.getSettings().then((s) => setSettings(s ?? null))
    db.getAiKey().then(setApiKeyState)
    db.getTtsKey().then((k) => (natural.key = k))
    db.getSpeechKey().then((c) => {
      azure.key = c?.key ?? null
      azure.region = c?.region ?? null
    })
  }, [])

  useEffect(() => {
    if (settings) applySettings(settings)
    // AI usage is recorded per month, and the monthly limit is checked before each request.
    const limit = settings?.aiMonthlyLimit ?? 0
    aiConfig.onUsage = (r) => void db.addAiUsage(r)
    aiConfig.beforeRequest = async () => {
      if (!limit) return
      const spent = (await db.getAiUsage())[monthKey(new Date())]?.cost ?? 0
      if (spent >= limit) throw new AiError('budget', 'Bu ayki YZ bütçen doldu. Ayarlar → YZ yardımcısı bölümünden sınırı değiştirebilirsin.')
    }
  }, [settings])

  const ai = useMemo(
    () => ({
      apiKey,
      needsApproval: !access.approved,
      setApiKey: async (key: string | null) => {
        await db.saveAiKey(key)
        setApiKeyState(key)
      },
    }),
    [apiKey, access.approved],
  )

  const updateSettings = async (s: Settings) => {
    await db.saveSettings(s)
    setSettings(s)
  }

  return { settings, setSettings, updateSettings, access, apiKey, ai }
}
