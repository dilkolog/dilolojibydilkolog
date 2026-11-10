/**
 * Unit tests never reach the network: on a machine with internet they would call live services (Tatoeba, the site's
 * own /api, DeepL…). Every request that a test did not stub fails at once, as it would offline. A test that wants an
 * answer stubs fetch itself (vi.stubGlobal / vi.spyOn), which replaces this.
 */
const offline: typeof fetch = async (input) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  throw new TypeError(`fetch failed: the network is off in unit tests (${url.slice(0, 120)})`)
}
globalThis.fetch = offline
