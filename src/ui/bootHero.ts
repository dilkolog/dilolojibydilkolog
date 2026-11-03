/**
 * index.html shows a visitor who is not signed in the landing page's first lines at once (#boot-hero), before any code
 * has downloaded. Whatever the app then shows takes its place: the landing page when it mounts, any other screen as
 * soon as the app knows it is not the landing page (and, should something go wrong, an error screen or a timer).
 */
export function dropBootHero() {
  document.getElementById('boot-hero')?.remove()
}
