/**
 * The server's one door to file storage (the "blobs": accounts, sync files, reminders, small documents).
 *
 * The calls are the ones of the `@vercel/blob` package, kept as the contract the server code and its tests
 * were written against, but nothing here runs on Vercel any more: in production wrangler.jsonc swaps the
 * package for worker/blob.ts, the same calls on a Cloudflare R2 bucket; the unit tests mock the package.
 * Server code imports from here, never from the package, so the one place that names it is this file.
 */
export { del, get, list, put } from '@vercel/blob'
