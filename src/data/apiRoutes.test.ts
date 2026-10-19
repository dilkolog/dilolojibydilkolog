import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('API routes consistency with Worker (16.3 F5)', () => {
  const apiDir = path.resolve(__dirname, '../../api')
  const workerFile = path.resolve(__dirname, '../../worker/index.ts')

  it('every public api/*.ts file (not starting with _) has a corresponding route in worker/index.ts', () => {
    const apiFiles = fs.readdirSync(apiDir)
    const publicEndpoints = apiFiles
      .filter((file) => file.endsWith('.ts') && !file.startsWith('_'))
      .map((file) => file.replace(/\.ts$/, ''))
      .sort()

    expect(publicEndpoints.length).toBeGreaterThan(0)

    const workerContent = fs.readFileSync(workerFile, 'utf8')
    const routesMatch = /const ROUTES:\s*Record<string,\s*Module>\s*=\s*\{([^}]+)\}/.exec(workerContent)
    expect(routesMatch, 'ROUTES object found in worker/index.ts').toBeTruthy()

    const routesRaw = routesMatch![1]!
    // Extract route keys: e.g. { access, admin, clips, 'cron-reminder': cron, ... }
    const registeredRoutes: string[] = []
    const tokens = routesRaw.split(',').map((t) => t.trim()).filter(Boolean)
    for (const token of tokens) {
      const match = /^(['"]?)([a-z-]+)\1\s*(?::.*)?$/.exec(token)
      if (match) {
        registeredRoutes.push(match[2]!)
      }
    }
    registeredRoutes.sort()

    // Verify 1-to-1 match
    expect(registeredRoutes).toEqual(publicEndpoints)
  })

  it('import.meta.glob discovers all public API endpoints', () => {
    const modules = import.meta.glob('../../api/*.ts')
    const discoveredEndpoints = Object.keys(modules)
      .map((filePath) => path.basename(filePath))
      .filter((filename) => !filename.startsWith('_'))
      .map((filename) => filename.replace(/\.ts$/, ''))
      .sort()

    const apiFiles = fs.readdirSync(apiDir)
      .filter((file) => file.endsWith('.ts') && !file.startsWith('_'))
      .map((file) => file.replace(/\.ts$/, ''))
      .sort()

    expect(discoveredEndpoints).toEqual(apiFiles)
  })
})
