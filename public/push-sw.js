// Server push reminders (imported into the generated service worker).
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Kelime Koçu', {
      body: data.body || 'Bugünkü kelime çalışman seni bekliyor.',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: 'daily-reminder',
      data: { url: data.url || '/' },
    }),
  )
})

// A tap opens the app on the reminder's page (a short review), in an open window if there is one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c && 'navigate' in c)
      return open ? open.navigate(url).then((c) => (c || open).focus()) : self.clients.openWindow(url)
    }),
  )
})
