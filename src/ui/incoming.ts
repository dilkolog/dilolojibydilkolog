import { TARGET_LANGUAGES, type TargetLanguage } from '../engine/types'

/** A word sent from the bookmarklet: ?add=word&context=sentence&lang=en&src=url */
export interface IncomingWord {
  word: string
  context: string
  lang?: TargetLanguage
  src?: string
}

export function readIncoming(): IncomingWord | null {
  const p = new URLSearchParams(location.search)
  const shared = readShared(p)
  if (shared) return shared
  const word = p.get('add')?.trim()
  if (!word) return null
  // A whole selection sent from an iPhone shortcut: a sentence to pick the word from.
  if (word.split(/\s+/).length > 4 && !p.get('context')) return { word: '', context: word.slice(0, 400), lang: undefined, src: p.get('src') ?? undefined }
  const lang = p.get('lang') as TargetLanguage | null
  return {
    word,
    context: p.get('context')?.trim() ?? '',
    lang: lang && TARGET_LANGUAGES.includes(lang) ? lang : undefined,
    src: p.get('src') ?? undefined,
  }
}

/**
 * Android "Share → Kelime Koçu" (manifest share_target): a short selection is the word itself;
 * a longer one is the sentence it came from, and the learner picks the word in the form.
 */
export function readShared(p: URLSearchParams): IncomingWord | null {
  const text = (p.get('share_text') ?? p.get('share_title') ?? '').trim()
  // Some apps put the link in the text field.
  const link = p.get('share_url') ?? text.match(/https?:\/\/\S+/)?.[0]
  const clean = text.replace(/https?:\/\/\S+/g, '').replace(/^["“«]|["”»]$/g, '').trim()
  if (!clean) return null
  const short = clean.split(/\s+/).length <= 4
  return { word: short ? clean : '', context: short ? '' : clean.slice(0, 400), src: link || undefined }
}

/**
 * Bookmarklet source: takes the selected text and the sentence around it from the current page
 * and opens the app with them. Runs on other sites, so it is self-contained and defensive.
 */
export function bookmarkletCode(origin: string): string {
  const js = `(()=>{const s=getSelection();const w=s.toString().trim();if(!w){alert('Kelime Koçu: önce sayfada bir kelime seç.');return}let c='';try{const el=s.anchorNode.nodeType===3?s.anchorNode.parentElement:s.anchorNode;const t=(el.closest('p,li,blockquote,td,h1,h2,h3,figcaption')||el).innerText.replace(/\\s+/g,' ');const i=t.indexOf(w);if(i>=0){const b=Math.max(t.lastIndexOf('. ',i),t.lastIndexOf('! ',i),t.lastIndexOf('? ',i));const r=t.slice(i+w.length).search(/[.!?](\\s|$)/);c=t.slice(b<0?0:b+2,r<0?t.length:i+w.length+r+1).trim()}}catch(e){}const l=(document.documentElement.lang||'').slice(0,2).toLowerCase();window.open('${origin}/?add='+encodeURIComponent(w)+'&context='+encodeURIComponent(c.slice(0,400))+'&lang='+l+'&src='+encodeURIComponent(location.href),'_blank')})()`
  return `javascript:${encodeURIComponent(js)}`
}
