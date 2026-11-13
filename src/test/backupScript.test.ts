// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
// @ts-expect-error: a plain JavaScript script without type declarations
import { DATA_TABLES, dumpArgs, mirrorMedia, prune, stampOf } from '../../scripts/backup-supabase.mjs'

let dir: string
beforeEach(() => void (dir = mkdtempSync(join(tmpdir(), 'backup-'))))
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('scripts/backup-supabase.mjs', () => {
  it('dumps the public schema, and the rows of public, the sign-ins and the media records', () => {
    const { schema, data } = dumpArgs('postgres://u:p@h/db', '/b/x')
    expect(schema).toEqual(expect.arrayContaining(['--schema-only', '-n', 'public', '/b/x/schema.sql']))
    expect(data).toEqual(expect.arrayContaining(['--data-only', '-Fc', '/b/x/data.dump']))
    for (const t of DATA_TABLES) expect(data[data.indexOf(t) - 1]).toBe('-t')
    expect(DATA_TABLES).toEqual(expect.arrayContaining(['public.*', 'auth.users', 'auth.identities']))
    // The connection string is the last argument, never mixed into a file name.
    expect(data.at(-1)).toBe('postgres://u:p@h/db')
  })

  it('keeps the newest dated folders and leaves the media mirror alone', () => {
    for (const d of [new Date('2026-11-01T03:00Z'), new Date('2026-11-08T03:00Z'), new Date('2026-11-15T03:00Z')]) mkdirSync(join(dir, stampOf(d)))
    mkdirSync(join(dir, 'media'))
    expect(prune(dir, 2)).toEqual(['2026-11-01T03-00'])
    expect(existsSync(join(dir, 'media'))).toBe(true)
    expect(existsSync(join(dir, '2026-11-15T03-00'))).toBe(true)
  })

  it('mirrors the media bucket, walking into folders and downloading only new or changed files', async () => {
    const files: Record<string, string> = { 'u1/a.json': '{"a":1}', 'u1/b.json': '{"b":22}', 'u2/c.json': '{}' }
    const asked: string[] = []
    const fetcher = async (url: string, init: RequestInit = {}) => {
      asked.push(url)
      if (url.endsWith('/object/list/media')) {
        const { prefix } = JSON.parse(String(init.body)) as { prefix: string }
        if (!prefix) return Response.json([{ name: 'u1', id: null }, { name: 'u2', id: null }])
        return Response.json(Object.entries(files).filter(([p]) => p.startsWith(prefix)).map(([p, body]) => ({ name: p.slice(prefix.length), id: p, metadata: { size: body.length } })))
      }
      const path = decodeURIComponent(url.split('/object/media/')[1])
      return new Response(files[path])
    }
    const media = join(dir, 'media')
    mkdirSync(join(media, 'u1'), { recursive: true })
    writeFileSync(join(media, 'u1/a.json'), files['u1/a.json'])
    expect(await mirrorMedia('https://p.supabase.co', 'sb_secret_x', media, fetcher)).toBe(2)
    expect(readFileSync(join(media, 'u2/c.json'), 'utf8')).toBe('{}')
    expect(asked.some((u) => u.endsWith('/object/media/u1/a.json'))).toBe(false)
  })
})
