// Builds the browser extension into extension/dist (load it in Chrome: chrome://extensions →
// Developer mode → Load unpacked → this folder). Shares the app's word-matching code.
import { build } from 'rolldown'
import { copyFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'dist')
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
for (const name of ['content', 'bridge', 'popup', 'background']) {
  await build({ input: join(here, 'src', `${name}.ts`), platform: 'browser', output: { file: join(out, `${name}.js`), format: 'iife', minify: true } })
}
copyFileSync(join(here, 'manifest.json'), join(out, 'manifest.json'))
copyFileSync(join(here, 'src', 'popup.html'), join(out, 'popup.html'))
copyFileSync(join(here, '..', 'public', 'pwa-192.png'), join(out, 'icon.png'))
console.log('extension built →', out)
