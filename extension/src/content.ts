import { STOP, cleanToken } from '../../src/engine/extract'
import { readingKey } from '../../src/engine/reading'
import { TARGET_LANGUAGES, type TargetLanguage } from '../../src/engine/types'
import type { ExtLanguageData, ExtListWord } from '../../src/ui/extensionProtocol'
import { addUrl, DEFAULTS, getStored, sentenceUrl, type ExtSettings, type Stored } from './shared'

/**
 * On any page in English, French or Spanish: colours words by what you know (LingQ / Language
 * Reactor style), a click explains or adds a word, and selecting text offers "add to Kelime
 * Koçu". On Turkish pages it can swap in a few of your words (Toucan style). Everything runs
 * in the page; nothing is sent anywhere.
 */

const WORD = /[\p{L}][\p{L}'’-]*/gu
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'KBD', 'SVG', 'MATH', 'IFRAME', 'CANVAS'])
/** Enough for a long article; beyond this a page is left as it is, to stay fast. */
const MAX_WORDS = 40_000
const MAX_TURKISH_SWAPS = 15

let settings: ExtSettings = DEFAULTS
let stored: Stored = {}
let pageLang: TargetLanguage | 'tr' | null = null
let lookup: { list: Map<string, ExtListWord>; known: Set<string>; ignored: Set<string> } | null = null
let processed = 0

// ---------------------------------------------------------------------------
// Page language
// ---------------------------------------------------------------------------

function detectLanguage(): TargetLanguage | 'tr' | null {
  const declared = (document.documentElement.lang || '').slice(0, 2).toLowerCase()
  if (declared === 'tr' || (TARGET_LANGUAGES as readonly string[]).includes(declared)) return declared as TargetLanguage | 'tr'
  // Undeclared: count function words in a sample of the text.
  const sample = (document.body?.innerText ?? '').slice(0, 6000).toLowerCase().match(/[\p{L}']+/gu) ?? []
  const scores = TARGET_LANGUAGES.map((l) => ({ l, n: sample.filter((w) => STOP[l].has(w)).length })).sort((a, b) => b.n - a.n)
  return scores[0].n >= 25 && scores[0].n > scores[1].n * 1.5 ? scores[0].l : null
}

function buildLookup(data: ExtLanguageData) {
  return { list: new Map(data.list.map((w) => [w.k, w])), known: new Set(data.known), ignored: new Set(data.ignored) }
}

type Mark = { cls: string; word?: ExtListWord } | null

function classify(token: string, first: boolean): Mark {
  if (!lookup || !pageLang || pageLang === 'tr') return null
  const lang = pageLang
  const clean = cleanToken(token, lang)
  const lower = clean.toLocaleLowerCase(lang)
  if (lower.length < 2) return null
  const key = readingKey(token, lang)
  const listed = lookup.list.get(key)
  if (listed) return { cls: listed.s < 0 || listed.s <= 1 ? 'kk-l0' : listed.s <= 3 ? 'kk-l1' : 'kk-l2', word: listed }
  if (settings.mode !== 'all') return null
  if (lookup.ignored.has(key) || lookup.known.has(key) || STOP[lang].has(lower)) return null
  // Capitalised mid-sentence: probably a name.
  if (!first && /^\p{Lu}/u.test(clean)) return null
  return { cls: 'kk-new' }
}

// ---------------------------------------------------------------------------
// Marking text
// ---------------------------------------------------------------------------

function skippable(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP.has(e.tagName) || e.id === 'kk-host' || (e as HTMLElement).isContentEditable) return true
    if (e.classList?.contains('kk-w')) return true
  }
  return false
}

function textNodes(root: Node): Text[] {
  const out: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue && /\p{L}{2}/u.test(n.nodeValue) && !skippable(n.parentElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  })
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text)
  return out
}

function markNode(node: Text) {
  const text = node.nodeValue ?? ''
  const frag = document.createDocumentFragment()
  let last = 0
  let marked = false
  let first = true
  for (const m of text.matchAll(WORD)) {
    processed++
    const mark = classify(m[0], first || /[.!?]\s*$/.test(text.slice(0, m.index)))
    first = false
    if (!mark) continue
    marked = true
    frag.append(text.slice(last, m.index))
    const span = document.createElement('span')
    span.className = `kk-w ${mark.cls}`
    span.textContent = m[0]
    frag.append(span)
    last = m.index! + m[0].length
  }
  if (!marked) return
  frag.append(text.slice(last))
  node.replaceWith(frag)
}

/** Turkish page: a few words of your list shown in the target language, the Turkish on hover. */
function swapTurkish(root: Node) {
  const data = stored.data?.[settings.turkishLang]
  if (!data) return
  const byGloss = new Map<string, ExtListWord>()
  for (const w of data.list) {
    const g = w.g.trim().toLocaleLowerCase('tr')
    if (w.s >= 0 && g && !/\s/.test(g) && g.length > 2 && !byGloss.has(g)) byGloss.set(g, w)
  }
  let swaps = document.querySelectorAll('.kk-tr').length
  const used = new Set([...document.querySelectorAll('.kk-tr')].map((e) => e.getAttribute('data-g')))
  for (const node of textNodes(root)) {
    if (swaps >= MAX_TURKISH_SWAPS) return
    const text = node.nodeValue ?? ''
    for (const m of text.matchAll(WORD)) {
      const g = m[0].toLocaleLowerCase('tr')
      const w = byGloss.get(g)
      if (!w || used.has(g)) continue
      used.add(g)
      swaps++
      const span = document.createElement('span')
      span.className = 'kk-w kk-tr'
      span.dataset.g = g
      span.dataset.tr = m[0]
      span.title = `${m[0]} · Kelime Koçu`
      span.lang = settings.turkishLang
      span.textContent = w.w
      const after = node.splitText(m.index!)
      after.nodeValue = (after.nodeValue ?? '').slice(m[0].length)
      after.before(span)
      break // one per text node keeps the page readable
    }
  }
}

function processRoot(root: Node) {
  if (!pageLang || !document.body) return
  if (pageLang === 'tr') {
    if (settings.turkish) swapTurkish(root)
    return
  }
  if (settings.mode === 'off' || !lookup) return
  for (const n of textNodes(root)) {
    if (processed > MAX_WORDS) return
    markNode(n)
  }
}

function unmarkAll() {
  for (const el of document.querySelectorAll('.kk-w')) {
    const text = el.classList.contains('kk-tr') ? (el as HTMLElement).dataset.tr ?? el.textContent : el.textContent
    el.replaceWith(document.createTextNode(text ?? ''))
  }
  document.body?.normalize()
  processed = 0
}

// ---------------------------------------------------------------------------
// Bubble (in a shadow root, so page styles can't touch it)
// ---------------------------------------------------------------------------

let host: HTMLElement | null = null
let shadow: ShadowRoot | null = null

const BUBBLE_CSS = `
:host { all: initial; }
.b { position: fixed; z-index: 2147483647; max-width: 20rem; font: 14px/1.45 system-ui, -apple-system, sans-serif; color: #0f172a;
  background: #fff; border-radius: 14px; box-shadow: 0 12px 32px rgb(15 23 42 / .25), 0 0 0 1px rgb(15 23 42 / .08); padding: 12px 14px; }
.w { font: 600 18px/1.3 Georgia, serif; }
.g { margin: 2px 0 0; font-weight: 600; color: #1d4ed8; }
.m { margin: 4px 0 0; color: #64748b; font-size: 12px; }
.s { margin: 6px 0 0; font-style: italic; color: #334155; font-size: 13px; }
.r { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
button, a { all: unset; cursor: pointer; font: 600 13px system-ui, sans-serif; padding: 6px 10px; border-radius: 9px; background: #f1f5f9; color: #0f172a; }
.p { background: #2563eb; color: #fff; }
button:hover, a:hover { filter: brightness(.95); }
@media (prefers-color-scheme: dark) {
  .b { background: #1e293b; color: #e2e8f0; box-shadow: 0 12px 32px rgb(0 0 0 / .5), 0 0 0 1px rgb(255 255 255 / .08); }
  .g { color: #93c5fd; } .s { color: #cbd5e1; } button, a { background: #334155; color: #e2e8f0; } .p { background: #3b82f6; color: #fff; }
}`

function bubble(): ShadowRoot {
  if (!shadow) {
    host = document.createElement('div')
    host.id = 'kk-host'
    document.documentElement.append(host)
    shadow = host.attachShadow({ mode: 'open' })
  }
  return shadow
}

function closeBubble() {
  if (shadow) shadow.innerHTML = ''
}

function showBubble(anchor: DOMRect, build: (box: HTMLElement) => void) {
  const root = bubble()
  root.innerHTML = `<style>${BUBBLE_CSS}</style>`
  const box = document.createElement('div')
  box.className = 'b'
  build(box)
  root.append(box)
  const top = anchor.bottom + 8 + 180 > innerHeight ? Math.max(8, anchor.top - 8 - box.offsetHeight) : anchor.bottom + 8
  box.style.top = `${top}px`
  box.style.left = `${Math.min(Math.max(8, anchor.left), innerWidth - 330)}px`
  // Measure again now that the content is in place.
  if (anchor.bottom + 8 + box.offsetHeight > innerHeight) box.style.top = `${Math.max(8, anchor.top - 8 - box.offsetHeight)}px`
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  e.textContent = text
  return e
}

/** The sentence around a word, from its paragraph. */
function sentenceOf(node: Node, word: string): string {
  const block = (node.parentElement?.closest('p,li,blockquote,td,h1,h2,h3,h4,figcaption,.ytp-caption-window-container,div') as HTMLElement | null) ?? node.parentElement
  const t = (block?.innerText ?? '').replace(/\s+/g, ' ')
  const i = t.indexOf(word)
  if (i < 0) return ''
  const start = Math.max(t.lastIndexOf('. ', i), t.lastIndexOf('! ', i), t.lastIndexOf('? ', i))
  const rest = t.slice(i + word.length).search(/[.!?](\s|$)/)
  return t.slice(start < 0 ? 0 : start + 2, rest < 0 ? t.length : i + word.length + rest + 1).trim()
}

function speakWord(text: string, lang: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = { en: 'en-US', fr: 'fr-FR', es: 'es-ES' }[lang] ?? lang
  speechSynthesis.speak(u)
}

async function queueMark(kind: 'pendingKnown' | 'pendingIgnored', lang: TargetLanguage, key: string) {
  const s = await getStored()
  const q = { ...(s[kind] ?? {}) }
  q[lang] = [...new Set([...(q[lang] ?? []), key])]
  await chrome.storage.local.set({ [kind]: q })
  if (kind === 'pendingKnown') lookup?.known.add(key)
  else lookup?.ignored.add(key)
  // Unmark every occurrence on this page.
  for (const e of document.querySelectorAll('.kk-new')) if (pageLang !== 'tr' && pageLang && readingKey(e.textContent ?? '', pageLang) === key) e.replaceWith(document.createTextNode(e.textContent ?? ''))
}

function openWord(span: HTMLElement) {
  if (!pageLang) return
  const rect = span.getBoundingClientRect()
  const inCaption = !!span.closest('.ytp-caption-segment')
  if (inCaption) document.querySelector('video')?.pause()

  if (span.classList.contains('kk-tr')) {
    const lang = settings.turkishLang
    const w = stored.data?.[lang]?.list.find((x) => x.w === span.textContent)
    showBubble(rect, (box) => {
      box.append(el('div', 'w', span.textContent ?? ''), el('p', 'g', span.dataset.tr ?? ''), el('p', 'm', 'Listendeki bir kelime, bu sayfada senin için yerleştirildi.'))
      const row = el('div', 'r', '')
      const say = el('button', '', '🔊 Dinle')
      say.onclick = () => speakWord(span.textContent ?? '', lang)
      row.append(say)
      if (w) {
        const back = el('button', '', 'Türkçesini göster')
        back.onclick = () => {
          span.replaceWith(document.createTextNode(span.dataset.tr ?? ''))
          closeBubble()
        }
        row.append(back)
      }
      box.append(row)
    })
    return
  }

  const lang = pageLang as TargetLanguage
  const word = span.textContent ?? ''
  const key = readingKey(word, lang)
  const listed = lookup?.list.get(key)
  const sentence = sentenceOf(span.firstChild ?? span, word)
  showBubble(rect, (box) => {
    box.append(el('div', 'w', listed ? listed.w : cleanToken(word, lang)))
    if (listed) {
      box.append(el('p', 'g', listed.g), el('p', 'm', listed.s < 0 ? 'Listende, henüz çalışmadın.' : `Listende · aşama ${listed.s + 1}/6`))
    } else box.append(el('p', 'm', 'Listende yok.'))
    if (sentence) box.append(el('p', 's', sentence))
    const row = el('div', 'r', '')
    const say = el('button', '', '🔊')
    say.title = 'Dinle'
    say.onclick = () => speakWord(word, lang)
    row.append(say)
    if (!listed) {
      const add = el('a', 'p', '+ Ekle')
      add.setAttribute('href', addUrl(cleanToken(word, lang).toLocaleLowerCase(lang), sentence, lang, location.href))
      add.setAttribute('target', '_blank')
      add.onclick = () => closeBubble()
      const knew = el('button', '', 'Biliyorum')
      knew.onclick = () => (void queueMark('pendingKnown', lang, key), closeBubble())
      const ignore = el('button', '', 'Yok say')
      ignore.onclick = () => (void queueMark('pendingIgnored', lang, key), closeBubble())
      row.append(add, knew, ignore)
    }
    if (sentence) {
      const keep = el('a', '', '💬 Cümle')
      keep.title = 'Cümleyi Kelime Koçu\'na kaydet'
      keep.setAttribute('href', sentenceUrl(sentence, cleanToken(word, lang), lang, location.href))
      keep.setAttribute('target', '_blank')
      keep.onclick = () => closeBubble()
      row.append(keep)
    }
    const dict = el('a', '', 'Çeviri')
    dict.setAttribute('href', `https://translate.google.com/?sl=${lang}&tl=tr&text=${encodeURIComponent(sentence || word)}`)
    dict.setAttribute('target', '_blank')
    row.append(dict)
    box.append(row)
  })
}

/** Selected text anywhere: one button to add it with its sentence. */
function offerSelection() {
  const sel = getSelection()
  const text = sel?.toString().trim() ?? ''
  if (!sel || !sel.rangeCount || !text || text.length > 60 || /\n/.test(text) || text.split(/\s+/).length > 5) return
  const anchor = sel.anchorNode
  if (!anchor || skippable(anchor.parentElement)) return
  const rect = sel.getRangeAt(0).getBoundingClientRect()
  const lang = pageLang && pageLang !== 'tr' ? pageLang : null
  const sentence = sentenceOf(anchor, text)
  showBubble(rect, (box) => {
    const row = el('div', 'r', '')
    row.style.marginTop = '0'
    const add = el('a', 'p', '+ Kelime Koçu')
    add.setAttribute('href', addUrl(text, sentence, lang, location.href))
    add.setAttribute('target', '_blank')
    add.onclick = () => closeBubble()
    row.append(add)
    if (lang) {
      const say = el('button', '', '🔊')
      say.onclick = () => speakWord(text, lang)
      row.append(say)
    }
    box.append(row)
  })
}

// ---------------------------------------------------------------------------
// Start-up and updates
// ---------------------------------------------------------------------------

const PAGE_CSS = `
.kk-w { cursor: pointer; border-radius: 2px; }
.kk-new { border-bottom: 2px solid rgb(37 99 235 / .45); }
.kk-l0 { background: rgb(245 158 11 / .32); }
.kk-l1 { background: rgb(245 158 11 / .16); }
.kk-l2 { border-bottom: 2px dotted rgb(245 158 11 / .85); }
.kk-tr { border-bottom: 2px dotted rgb(37 99 235 / .7); font-style: italic; }
.ytp-caption-segment .kk-w { pointer-events: auto; }
`

function render() {
  unmarkAll()
  lookup = pageLang && pageLang !== 'tr' && stored.data ? buildLookup(stored.data[pageLang]) : null
  if (document.body) processRoot(document.body)
}

let queued: Node[] = []
let timer: ReturnType<typeof setTimeout> | undefined
const observer = new MutationObserver((records) => {
  for (const r of records) for (const n of r.addedNodes) if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) queued.push(n)
  clearTimeout(timer)
  timer = setTimeout(() => {
    const nodes = queued
    queued = []
    observer.disconnect()
    for (const n of nodes) if (n.isConnected && !skippable(n.nodeType === Node.TEXT_NODE ? n.parentElement : (n as Element))) processRoot(n)
    observe()
  }, 400)
})
const observe = () => document.body && observer.observe(document.body, { childList: true, subtree: true })

async function start() {
  stored = await getStored()
  settings = { ...DEFAULTS, ...stored.settings }
  pageLang = detectLanguage()
  if (pageLang) {
    const style = document.createElement('style')
    style.textContent = PAGE_CSS
    document.head?.append(style)
    render()
    observe()
  }

  document.addEventListener(
    'click',
    (e) => {
      const t = e.target as HTMLElement | null
      const span = t?.closest?.('.kk-w') as HTMLElement | null
      // Inside a link a plain click still follows it; Alt+click explains the word.
      if (span && (!span.closest('a[href]') || e.altKey)) {
        e.preventDefault()
        e.stopPropagation()
        openWord(span)
      } else if (!(e.composedPath().includes(host as EventTarget))) closeBubble()
    },
    true,
  )
  document.addEventListener('mouseup', (e) => {
    if (e.composedPath().includes(host as EventTarget) || (e.target as HTMLElement)?.closest?.('.kk-w')) return
    setTimeout(offerSelection, 10)
  })
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeBubble())
}

chrome.storage.onChanged.addListener(async (changes) => {
  if (!changes.settings && !changes.data) return
  const before = pageLang && stored.data ? JSON.stringify(stored.data[pageLang === 'tr' ? settings.turkishLang : pageLang]) : ''
  stored = await getStored()
  settings = { ...DEFAULTS, ...stored.settings }
  if (!pageLang) return
  // The app sends data after every change; repaint only when this page's language changed.
  const after = stored.data ? JSON.stringify(stored.data[pageLang === 'tr' ? settings.turkishLang : pageLang]) : ''
  if (!changes.settings && before === after) return
  observer.disconnect()
  render()
  observe()
})

void start()
