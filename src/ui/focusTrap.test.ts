// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { installFocusTrap } from './focusTrap'

const tick = () => new Promise((r) => setTimeout(r, 0))

describe('focus trap', () => {
  it('keeps focus inside an open modal and gives it back when the modal closes', async () => {
    installFocusTrap(document)
    document.body.innerHTML = '<button id="page">Sayfa</button><button id="late">Devam</button>'
    const page = document.getElementById('page')!
    page.focus()
    const modal = document.createElement('div')
    modal.setAttribute('aria-modal', 'true')
    modal.innerHTML = '<button id="cancel">Vazgeç</button><button id="ok">Çık</button>'
    document.body.append(modal)
    await tick()
    // Something behind the modal grabs focus late (an autofocus after an animation): it comes back.
    document.getElementById('late')!.focus()
    expect(document.activeElement?.id).toBe('cancel')
    modal.remove()
    await tick()
    expect(document.activeElement?.id).toBe('page')
  })
})
