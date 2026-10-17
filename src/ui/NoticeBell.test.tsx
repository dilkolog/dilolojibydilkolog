// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { NoticeBell } from './NoticeBell'
import { notify } from './noticeCenter'
import { accountNotice, badgeNotice, certNotice, friendNotice, levelNotice, syncNotice } from './noticeTexts'

let root: ReturnType<typeof createRoot> | undefined
afterEach(async () => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  await db.meta.clear()
})

async function mount(onOpen = vi.fn()) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<NoticeBell onOpen={onOpen} />))
  await act(() => new Promise((r) => setTimeout(r, 20)))
  return { host, onOpen }
}

describe('NoticeBell', () => {
  it('shows the unread count, lists the notices newest first, marks them seen on opening and leads to the place', async () => {
    const { host, onOpen } = await mount()
    expect(host.querySelector('.notice-count')).toBeNull()
    await act(async () => {
      await notify({ ...badgeNotice('streak-7', 'Bir hafta'), at: '2026-10-17T09:00:00.000Z' })
      await notify({ ...syncNotice('Diğer cihazlarından: 3 yeni kelime.', 1), at: '2026-10-17T10:00:00.000Z' })
      await notify({ ...badgeNotice('streak-7', 'Bir hafta'), at: '2026-10-17T11:00:00.000Z' })
    })
    expect(host.querySelector('.notice-count')?.textContent).toBe('2')
    expect(host.querySelector('button.notice-bell')?.getAttribute('aria-label')).toBe('Bildirimler, 2 yeni')
    await act(async () => host.querySelector<HTMLButtonElement>('button.notice-bell')!.click())
    await act(() => new Promise((r) => setTimeout(r, 20)))
    const rows = [...host.querySelectorAll('.notice')]
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining('3 yeni kelime'), expect.stringContaining('Yeni rozet: Bir hafta')])
    expect(rows.every((r) => r.classList.contains('notice-new'))).toBe(true)
    expect(host.querySelector('.notice-count')).toBeNull()
    await act(async () => rows[1].querySelector('button')!.click())
    expect(onOpen).toHaveBeenCalledWith('profile')
    expect((await db.getNotices()).every((n) => n.read)).toBe(true)
  })

  it('says so when there is nothing yet', async () => {
    const { host } = await mount()
    await act(async () => host.querySelector<HTMLButtonElement>('button.notice-bell')!.click())
    expect(host.querySelector('.notice-empty')?.textContent).toContain('Henüz bildirim yok')
  })
})

describe('notice texts', () => {
  it('words each source in plain Turkish with a stable id', () => {
    expect(friendNotice({ id: 'abc123', kind: 'cheer', from: { code: 'ABCDEFGH', name: 'Ayşe' }, at: '2026-10-17T10:00:00.000Z' }, 'Ayşe')).toMatchObject({ id: 'friend|abc123', kind: 'friend', text: 'Ayşe seni tebrik etti', target: 'home' })
    expect(friendNotice({ id: 'g1', kind: 'gift', from: { code: 'ABCDEFGH', name: 'Ayşe' }, at: '2026-10-17T10:00:00.000Z', gift: { language: 'fr', lemma: 'maison', meaning: 'ev' } as never }, 'Ayşe').text).toBe('Ayşe sana bir kelime gönderdi: maison = ev')
    expect(levelNotice(5, 'Kaşif')).toMatchObject({ id: 'level|5', text: "Seviye 5'e ulaştın: Kaşif" })
    expect(certNotice('fr', 'A2', 'Fransızca')).toMatchObject({ id: 'cert|fr|A2', target: 'guide' })
    expect(accountNotice('approved').id).toBe('account|approved')
    expect(accountNotice('rejected').text).toContain('onaylanmadı')
  })
})
