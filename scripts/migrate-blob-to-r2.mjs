// Copies every file from the Vercel Blob store to the R2 bucket the Worker uses (wrangler.jsonc `r2_buckets`).
// Run once on the owner's machine, after `npx wrangler login`:
//
//   BLOB_READ_WRITE_TOKEN=... node scripts/migrate-blob-to-r2.mjs [--dry]
//
// Reading from Vercel Blob counts against its monthly limits: while the team is paused for them the reads are
// refused, so run it when the limits allow (a month on Pro, or after the reset). Nothing here is required for the
// app to work: devices keep their data and send it again on the next sync, accounts claim their ids again, and
// reminder records are saved again whenever the app opens. What would be lost without it: list/share links made
// on the old store, friend inboxes and approvals given through Blob marker files.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { get, list } from '@vercel/blob'

const BUCKET = process.env.R2_BUCKET ?? 'diloloji-blobs'
const dry = process.argv.includes('--dry')
const dir = mkdtempSync(join(tmpdir(), 'blob-'))
let copied = 0
let skipped = 0

try {
  let cursor
  do {
    const page = await list({ cursor, limit: 1000 })
    for (const b of page.blobs) {
      if (dry) {
        console.log(b.pathname, b.size)
        continue
      }
      const res = await get(b.pathname, { access: 'private', useCache: false }).catch(() => null)
      if (!res || res.statusCode !== 200 || !res.stream) {
        skipped++
        console.warn('skipped', b.pathname)
        continue
      }
      const file = join(dir, 'object')
      writeFileSync(file, Buffer.from(await new Response(res.stream).arrayBuffer()))
      execFileSync('npx', ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${b.pathname}`, '--file', file, '--remote'], { stdio: 'ignore' })
      copied++
      if (copied % 25 === 0) console.log(`${copied} copied`)
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  console.log(dry ? 'dry run done' : `done: ${copied} copied, ${skipped} skipped`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
