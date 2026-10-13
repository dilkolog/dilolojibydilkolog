// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { Profile } from '../data/db'
import { Avatar } from './Avatar'
import { MONKI_AVATAR } from './avatarArt'

const profile = (over: Partial<Profile>): Profile => ({ name: '', emoji: '🦊', color: '#2563eb', motto: '', ...over })

describe('Avatar', () => {
  let host: HTMLDivElement
  afterEach(() => host?.remove())

  function show(p: Profile) {
    host = document.createElement('div')
    document.body.appendChild(host)
    act(() => createRoot(host).render(<Avatar profile={p} size={48} />))
    return host.querySelector('.avatar') as HTMLElement
  }

  it('shows the emoji on the profile colour', () => {
    const el = show(profile({}))
    expect(el.textContent).toBe('🦊')
    expect(el.querySelector('img')).toBeNull()
    expect(el.style.background).not.toBe('')
  })

  it('shows the drawn Monki instead of a glyph, without the colour behind it', () => {
    const el = show(profile({ emoji: MONKI_AVATAR }))
    expect(el.querySelector('img')).not.toBeNull()
    expect(el.textContent).toBe('')
    expect(el.style.background).toBe('')
  })
})
