import { APP_SOURCE, EXT_SOURCE, type AppMessage, type ExtMessage } from '../../src/ui/extensionProtocol'
import { getStored } from './shared'

/**
 * Runs only on the app's own pages: receives the word data and hands over words marked known or
 * ignored on other sites. Messages are accepted from this page only.
 */
const post = (m: ExtMessage) => window.postMessage(m, location.origin)

async function sendMarks() {
  const s = await getStored()
  const known = s.pendingKnown ?? {}
  const ignored = s.pendingIgnored ?? {}
  if (Object.values(known).some((x) => x?.length) || Object.values(ignored).some((x) => x?.length)) post({ source: EXT_SOURCE, type: 'marks', known, ignored })
}

window.addEventListener('message', async (e) => {
  if (e.source !== window || e.origin !== location.origin) return
  const m = e.data as AppMessage | undefined
  if (m?.source !== APP_SOURCE) return
  if (m.type === 'ping') post({ source: EXT_SOURCE, type: 'hello' })
  else if (m.type === 'data') {
    await chrome.storage.local.set({ data: m.data, syncedAt: new Date().toISOString() })
    await sendMarks()
  } else if (m.type === 'ack') await chrome.storage.local.set({ pendingKnown: {}, pendingIgnored: {} })
})

post({ source: EXT_SOURCE, type: 'hello' })
