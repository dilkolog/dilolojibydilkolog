// Server push reminders (imported into the generated service worker).
//
// Micro-retrieval: the reminder carries one due word as a question ("décision = ?"). Answering
// it in your head is a real retrieval; the answer is a tap away ("Cevabı göster") without
// opening the app. The word is read here from the app's own database: nothing about the
// vocabulary goes to the server. (Short, distributed exposures during the day: Dearman &
// Truong 2012; apps: WordBit, Drops.)

const DB_NAME = 'kelime-koc'

function idbAll(db, store) {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => resolve([])
    } catch {
      resolve([])
    }
  })
}

function idbGet(db, store, key) {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(store, 'readonly').objectStore(store).get(key)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(undefined)
    } catch {
      resolve(undefined)
    }
  })
}

/** A word due for review (the most overdue of a few), as { word, gloss }, or null. */
async function dueQuestion() {
  const db = await new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    // Never create the database from here.
    req.onupgradeneeded = () => {
      req.transaction.abort()
      resolve(null)
    }
  })
  if (!db) return null
  try {
    const now = Date.now()
    const states = await idbAll(db, 'wordStates')
    const settings = (await idbGet(db, 'meta', 'settings'))?.value || {}
    const autoRetire = settings.autoRetire !== false
    // Retired words (by hand, or with every card stable for half a year as in retire.ts) only cost time.
    const retired = (s) =>
      s.retired !== undefined ? s.retired : autoRetire && Object.values(s.skills || {}).every((c) => c.stability >= 180)
    const due = states
      .filter((s) => !retired(s))
      .map((s) => ({ s, due: Math.min(...Object.values(s.skills || {}).map((c) => new Date(c.due).getTime())) }))
      .filter((x) => Number.isFinite(x.due) && x.due <= now)
      .sort((a, b) => a.due - b.due)
      .slice(0, 5)
    // A random one of the most overdue, skipping any whose entry is gone or has no meaning yet.
    for (let i = due.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[due[i], due[j]] = [due[j], due[i]]
    }
    let entry = null
    for (const x of due) {
      const e = await idbGet(db, 'vocabulary', x.s.entryId)
      if (e && e.senses && e.senses[0] && e.senses[0].gloss) {
        entry = e
        break
      }
    }
    if (!entry) return null
    const word = entry.article ? (entry.article.endsWith("'") ? entry.article + entry.lemma : entry.article + ' ' + entry.lemma) : entry.lemma
    return { word, gloss: entry.senses[0].gloss }
  } finally {
    db.close()
  }
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const body = data.body || 'Bugünkü kelime çalışman seni bekliyor.'
  event.waitUntil(
    dueQuestion()
      .catch(() => null)
      .then((q) =>
        self.registration.showNotification(q ? `${q.word} = ?` : data.title || 'Kelime Koçu', {
          body: q ? `Aklından geçir, sonra bak. ${body}` : body,
          icon: '/pwa-192.png',
          badge: '/pwa-192.png',
          tag: 'daily-reminder',
          data: { url: data.url || '/', question: q },
          actions: q
            ? [
                { action: 'reveal', title: 'Cevabı göster' },
                { action: 'open', title: 'Kısa tekrar' },
              ]
            : [],
        }),
      ),
  )
})

// A tap opens the app on the reminder's page (a short review), in an open window if there is one;
// "Cevabı göster" answers the question in a new notification without opening anything.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const url = data.url || '/'
  if (event.action === 'reveal' && data.question) {
    event.waitUntil(
      self.registration.showNotification(`${data.question.word} = ${data.question.gloss}`, {
        body: 'Bildin mi? Birkaç kelime daha için dokun: 3 dakikalık hızlı tekrar.',
        icon: '/pwa-192.png',
        badge: '/pwa-192.png',
        tag: 'daily-reminder',
        data: { url },
      }),
    )
    return
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c && 'navigate' in c)
      return open ? open.navigate(url).then((c) => (c || open).focus()) : self.clients.openWindow(url)
    }),
  )
})
