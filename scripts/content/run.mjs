#!/usr/bin/env node
/**
 * Runs one content tool: bundles scripts/content/<tool>.ts (it imports the app's TypeScript) and runs it.
 * Usage: npm run content -- <jobs|check|sample|build|coverage|derive> [arguments]
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [tool, ...rest] = process.argv.slice(2)
const tools = ['jobs', 'check', 'sample', 'build', 'coverage', 'derive', 'first-steps']
if (!tools.includes(tool)) {
  console.error(`usage: npm run content -- <${tools.join('|')}> [arguments]`)
  process.exit(2)
}
mkdirSync('node_modules/.tmp', { recursive: true })
const out = `node_modules/.tmp/content-${tool}.mjs`
execFileSync('npx', ['rolldown', `scripts/content/${tool}.ts`, '-o', out, '-p', 'node'], { stdio: ['ignore', 'ignore', 'inherit'] })
if (!existsSync(out)) process.exit(1)
process.argv = [process.argv[0], out, ...rest]
await import(pathToFileURL(out).href)
