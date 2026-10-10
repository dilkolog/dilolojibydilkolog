import { APP_URL, DEFAULTS, getStored, type ExtSettings, type Mode } from './shared'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

async function init() {
  const stored = await getStored()
  let settings: ExtSettings = { ...DEFAULTS, ...stored.settings }
  const save = (next: ExtSettings) => {
    settings = next
    void chrome.storage.local.set({ settings })
    paint()
  }
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-mode]')]
  const paint = () => {
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.mode === settings.mode))
    $<HTMLInputElement>('turkish').checked = settings.turkish
    $<HTMLSelectElement>('turkishLang').value = settings.turkishLang
    $<HTMLSelectElement>('turkishLang').disabled = !settings.turkish
  }
  for (const b of buttons) b.onclick = () => save({ ...settings, mode: b.dataset.mode as Mode })
  $<HTMLInputElement>('turkish').onchange = (e) => save({ ...settings, turkish: (e.target as HTMLInputElement).checked })
  $<HTMLSelectElement>('turkishLang').onchange = (e) => save({ ...settings, turkishLang: (e.target as HTMLSelectElement).value as ExtSettings['turkishLang'] })
  paint()

  const d = stored.data
  $<HTMLParagraphElement>('status').textContent = d
    ? `Kelimelerin: İngilizce ${new Set(d.en.list.map((w) => w.id)).size}, Fransızca ${new Set(d.fr.list.map((w) => w.id)).size}, İspanyolca ${new Set(d.es.list.map((w) => w.id)).size}. Son güncelleme ${new Date(stored.syncedAt!).toLocaleString('tr-TR')}. Uygulamayı her açtığında güncellenir.`
    : 'Kelimelerini almak için Diloloji\'yi bir kez aç.'
  $<HTMLAnchorElement>('open').href = APP_URL
}

void init()
