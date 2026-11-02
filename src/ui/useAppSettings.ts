import { useEffect, useMemo, useState } from 'react'
import { db } from '../data/instance'
import type { Settings } from '../data/db'
import { aiConfig } from '../ai/usage'
import type { AiFeature } from '../ai/usage'
import { applySettings } from './prefs'
import { natural } from './naturalVoice'
import { azure } from './pronunciation'
import { useAccessStatus } from './useAccessStatus'
import { AI_ACCOUNT, aiAvailable, type AiStatus } from '../data/aiAccess'

/**
 * The saved settings and the keys kept next to them (AI, natural voice, Azure speech): read once on start,
 * applied to the page, and the AI usage hooks that enforce the monthly limit. `settings` is undefined while
 * loading and null on the first run.
 */
export function useAppSettings() {
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined)
  // The AI features, like sync and the quota features, open once the owner has approved the account, and when the server has the owner's key.
  const access = useAccessStatus()
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null)
  const apiKey = access.approved && aiStatus?.available ? AI_ACCOUNT : null

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
    if (!access.approved) return setAiStatus(null)
    let live = true
    aiAvailable().then((status) => live && setAiStatus(status))
    return () => {
      live = false
    }
  }, [access.approved])

  useEffect(() => {
    if (settings) applySettings(settings)
    // The usage is still noted on the device; the real limits (calls and money a day) are on the server (api/ai.ts).
    aiConfig.onUsage = (r) => void db.addAiUsage(r)
    aiConfig.beforeRequest = async () => {}
  }, [settings])

  const ai = useMemo(
    () => ({
      apiKey,
      needsApproval: !access.approved,
      level: aiStatus?.level,
      allows: (feature: AiFeature) => !!aiStatus?.features.includes(feature),
    }),
    [apiKey, access.approved, aiStatus],
  )

  const updateSettings = async (s: Settings) => {
    await db.saveSettings(s)
    setSettings(s)
  }

  return { settings, setSettings, updateSettings, access, apiKey, ai }
}
