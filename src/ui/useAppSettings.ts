import { useEffect, useMemo, useState } from 'react'
import { db } from '../data/instance'
import type { Settings } from '../data/db'
import { aiConfig, monthKey } from '../ai/usage'
import { AiError } from '../ai/types'
import { applySettings } from './prefs'
import { natural } from './naturalVoice'
import { azure } from './pronunciation'
import { useAccessStatus } from './useAccessStatus'
import { useServerHelpers } from './useServerHelpers'
import { SERVER_KEY, serverHelpersOn } from '../data/aiServer'
import { AI_MODELS, type AiModel } from '../ai/usage'

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
  // With Supabase the helpers run on the owner's keys for the people the owner allowed (api/ai.ts); nobody types a
  // key. Without it (local development, the E2E build) a key kept on the device still works.
  const server = serverHelpersOn()
  const helpers = useServerHelpers()
  const apiKey = server ? (helpers?.ai ? SERVER_KEY : null) : access.approved ? storedKey : null

  useEffect(() => {
    db.getSettings().then((s) => setSettings(s ?? null))
    if (server) return
    db.getAiKey().then(setApiKeyState)
    db.getTtsKey().then((k) => (natural.key = k))
    db.getSpeechKey().then((c) => {
      azure.key = c?.key ?? null
      azure.region = c?.region ?? null
    })
  }, [server])

  useEffect(() => {
    if (!server || helpers === undefined) return
    natural.key = helpers?.voice ? SERVER_KEY : null
    azure.key = helpers?.speech ? SERVER_KEY : null
    azure.region = helpers?.speech ? SERVER_KEY : null
  }, [server, helpers])

  useEffect(() => {
    if (settings) applySettings(settings)
    // The server decides the model; the usage screen counts with its prices.
    const serverModel = helpers?.model as AiModel | undefined
    if (server && serverModel && AI_MODELS.some((m) => m.id === serverModel)) aiConfig.model = serverModel
    // AI usage is recorded per month, and the monthly limit is checked before each request.
    const limit = settings?.aiMonthlyLimit ?? 0
    aiConfig.onUsage = (r) => void db.addAiUsage(r)
    aiConfig.beforeRequest = async () => {
      if (!limit) return
      const spent = (await db.getAiUsage())[monthKey(new Date())]?.cost ?? 0
      if (spent >= limit) throw new AiError('budget', 'Bu ayki YZ bütçen doldu. Ayarlar → YZ yardımcısı bölümünden sınırı değiştirebilirsin.')
    }
  }, [settings, server, helpers])

  const ai = useMemo(
    () => ({
      apiKey,
      needsApproval: server ? !helpers?.ai : !access.approved,
      server,
      speech: !!helpers?.speech,
      voice: !!helpers?.voice,
      setApiKey: async (key: string | null) => {
        await db.saveAiKey(key)
        setApiKeyState(key)
      },
    }),
    [apiKey, access.approved, server, helpers?.ai, helpers?.speech, helpers?.voice],
  )

  const updateSettings = async (s: Settings) => {
    await db.saveSettings(s)
    setSettings(s)
  }

  return { settings, setSettings, updateSettings, access, apiKey, ai }
}
