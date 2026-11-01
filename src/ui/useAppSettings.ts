import { useEffect, useMemo, useState } from 'react'
import { db } from '../data/instance'
import type { Settings } from '../data/db'
import { aiConfig, monthKey } from '../ai/usage'
import { AiError } from '../ai/types'
import { applySettings } from './prefs'
import { natural } from './naturalVoice'
import { azure } from './pronunciation'
import { useAccessStatus } from './useAccessStatus'
import { AI_ACCOUNT, aiAvailable } from '../data/aiAccess'

/**
 * The saved settings and the keys kept next to them (AI, natural voice, Azure speech): read once on start,
 * applied to the page, and the AI usage hooks that enforce the monthly limit. `settings` is undefined while
 * loading and null on the first run.
 */
export function useAppSettings() {
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined)
  // The AI features, like sync and the quota features, open once the owner has approved the account, and when the server has the owner's key.
  const access = useAccessStatus()
  const [aiReady, setAiReady] = useState(false)
  const apiKey = access.approved && aiReady ? AI_ACCOUNT : null

  useEffect(() => {
    db.getSettings().then((s) => setSettings(s ?? null))
    // An own key typed in before the site provided one is not used any more: forget it.
    void db.getAiKey().then((k) => {
      if (k) void db.saveAiKey(null)
    })
    db.getTtsKey().then((k) => (natural.key = k))
    db.getSpeechKey().then((c) => {
      azure.key = c?.key ?? null
      azure.region = c?.region ?? null
    })
  }, [])

  useEffect(() => {
    if (!access.approved) return setAiReady(false)
    let live = true
    aiAvailable().then((ok) => live && setAiReady(ok))
    return () => {
      live = false
    }
  }, [access.approved])

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
    }),
    [apiKey, access.approved],
  )

  const updateSettings = async (s: Settings) => {
    await db.saveSettings(s)
    setSettings(s)
  }

  return { settings, setSettings, updateSettings, access, apiKey, ai }
}
