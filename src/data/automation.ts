/**
 * A browser driven by automation (Playwright, WebDriver, a test bot) on the live site. Its answers are a bot's, not
 * the learner's: it must not sync them into the account it signed in with (2026-11-12: a test bot on the owner's
 * account answered at random, and its syncs were refused every second for hours). Local previews and the test
 * builds (localhost) still sync, against the fake servers the tests set up.
 */
export const LIVE_HOSTS = /(^|\.)diloloji\.com$/

export function automatedOnLive(nav: { webdriver?: boolean } | undefined = typeof navigator === 'undefined' ? undefined : navigator, host: string = typeof location === 'undefined' ? '' : location.hostname): boolean {
  return !!nav?.webdriver && LIVE_HOSTS.test(host)
}
