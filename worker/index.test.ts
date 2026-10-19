import type { ExecutionContext, ScheduledController } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as cron from '../api/cron-reminder.js'
import * as log from '../api/log.js'
import worker from './index'

describe('Worker fetch handler and router (16.3 F5)', () => {
  const assetsFetch = vi.fn(async (_req: Request) => new Response('assets-content', { status: 200 }))
  const env = {
    BLOBS: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as never,
    ASSETS: {
      fetch: assetsFetch,
    } as never,
    CRON_SECRET: 'test-cron-secret-xyz',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 for unknown /api/* endpoints', async () => {
    const res = await worker.fetch(new Request('https://diloloji.com/api/nonexistent-endpoint'), env)
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('not found')
  })

  it('falls back to ASSETS fetch for non-api requests', async () => {
    const req = new Request('https://diloloji.com/hakkinda')
    const res = await worker.fetch(req, env)
    expect(assetsFetch).toHaveBeenCalledWith(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('assets-content')
  })

  it('returns 405 Method Not Allowed with Allow header for unsupported HTTP methods on registered routes', async () => {
    // /api/log only supports POST
    const res = await worker.fetch(new Request('https://diloloji.com/api/log', { method: 'DELETE' }), env)
    expect(res.status).toBe(405)
    expect(await res.text()).toBe('method not allowed')
    expect(res.headers.get('allow')).toContain('POST')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('catches handler exceptions and returns 500 server error with [worker-error] logging', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const postSpy = vi.spyOn(log, 'POST').mockImplementationOnce(() => {
      throw new Error('Simulated database explosion')
    })

    const res = await worker.fetch(
      new Request('https://diloloji.com/api/log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'test' }),
      }),
      env,
    )

    expect(res.status).toBe(500)
    expect(await res.text()).toBe('server error')
    expect(errorSpy).toHaveBeenCalledWith(
      '[worker-error]',
      '/api/log',
      expect.objectContaining({ message: 'Simulated database explosion' }),
    )

    errorSpy.mockRestore()
    postSpy.mockRestore()
  })
})

describe('Worker scheduled cron job (16.3 F5)', () => {
  const env = {
    BLOBS: {} as never,
    ASSETS: { fetch: vi.fn() } as never,
    CRON_SECRET: 'super-secret-cron-token',
  }

  it('calculates scheduled UTC hour correctly and forwards CRON_SECRET authorization header', async () => {
    let capturedRequest: Request | undefined
    const cronGetSpy = vi.spyOn(cron, 'GET').mockImplementation(async (req: Request) => {
      capturedRequest = req
      return new Response('ok', { status: 200 })
    })

    const scheduledTime = Date.UTC(2026, 9, 19, 15, 30, 0) // 15:30 UTC -> hour 15
    const controller: ScheduledController = {
      scheduledTime,
      cron: '0 * * * *',
      noRetry: vi.fn(),
    }

    const waitUntilPromises: Promise<unknown>[] = []
    const ctx = {
      waitUntil: vi.fn((p: Promise<unknown>) => waitUntilPromises.push(p)),
      passThroughOnException: vi.fn(),
      props: {},
    } as unknown as ExecutionContext

    await worker.scheduled(controller, env, ctx)

    expect(ctx.waitUntil).toHaveBeenCalledTimes(1)
    expect(cronGetSpy).toHaveBeenCalled()
    expect(capturedRequest).toBeDefined()

    const url = new URL(capturedRequest!.url)
    expect(url.pathname).toBe('/api/cron-reminder')
    expect(url.searchParams.get('h')).toBe('15')
    expect(capturedRequest!.headers.get('authorization')).toBe('Bearer super-secret-cron-token')

    // Wait for the background task to complete successfully
    await Promise.all(waitUntilPromises)
    cronGetSpy.mockRestore()
  })

  it('documents cron behavior on non-ok (401 / 500) responses: scheduled itself completes, but waitUntil promise rejects', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const cronGetSpy = vi.spyOn(cron, 'GET').mockImplementation(async () => {
      return new Response('unauthorized', { status: 401 })
    })

    const controller: ScheduledController = {
      scheduledTime: Date.UTC(2026, 9, 19, 8, 0, 0),
      cron: '0 * * * *',
      noRetry: vi.fn(),
    }

    let innerPromise: Promise<unknown> | undefined
    const ctx = {
      waitUntil: vi.fn((p: Promise<unknown>) => {
        innerPromise = p
      }),
      passThroughOnException: vi.fn(),
      props: {},
    } as unknown as ExecutionContext

    // scheduled() invocation itself does not throw synchronously because work is scheduled via ctx.waitUntil
    await expect(worker.scheduled(controller, env, ctx)).resolves.toBeUndefined()

    // However, the internal promise passed to ctx.waitUntil throws when res.ok is false
    expect(innerPromise).toBeDefined()
    await expect(innerPromise).rejects.toThrow('cron-reminder 401')
    expect(errorSpy).toHaveBeenCalledWith('[cron-reminder-failed]', 401, 'unauthorized')

    errorSpy.mockRestore()
    cronGetSpy.mockRestore()
  })

  it('documents cron behavior when CRON_SECRET is missing: falls back to empty Bearer', async () => {
    let capturedReq: Request | undefined
    const cronGetSpy = vi.spyOn(cron, 'GET').mockImplementation(async (req) => {
      capturedReq = req
      return new Response('ok', { status: 200 })
    })

    const envWithoutSecret = { ...env, CRON_SECRET: undefined }
    const controller: ScheduledController = {
      scheduledTime: Date.UTC(2026, 9, 19, 12, 0, 0),
      cron: '0 * * * *',
      noRetry: vi.fn(),
    }
    const ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      props: {},
    } as unknown as ExecutionContext

    await worker.scheduled(controller, envWithoutSecret, ctx)
    expect(capturedReq?.headers.get('authorization')).toMatch(/^Bearer\s*$/)
    cronGetSpy.mockRestore()
  })
})
