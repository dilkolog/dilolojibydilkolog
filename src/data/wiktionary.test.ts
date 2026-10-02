import { afterEach, describe, expect, it, vi } from 'vitest'
import { englishGloss, etymologyRoot, findEquivalents, languageSection, translationIn, withArticle } from './wiktionary'

const EN_WINDOW = `==English==
===Etymology===
From {{inh|en|enm|wyndowe}}, from {{der|en|non|vindauga}}.
===Noun===
# An opening.
====Translations====
{{trans-top|opening}}
* Finnish: {{t+|fi|ikkuna}}
* French: {{t+|fr|fenêtre|f}}
* Spanish: {{t+|es|ventana|f}}
{{trans-bottom}}
----
==Swedish==
`
const FR_FENETRE = `==French==
===Etymology===
{{inh+|fr|fro|fenestre}}, from {{inh|fr|la|fenestra}}.
===Noun===
# [[window]]
`
const ES_VENTANA = `==Spanish==
===Etymology===
{{ety|es|:inh|osp:ventana|text=+}} from {{ety|es|:der|la:ventus<t:wind>|tree=1}}
===Noun===
# {{lb|es|architecture}} [[window]]
`

describe('Wiktionary parsing', () => {
  it('cuts out one language section', () => {
    expect(languageSection(EN_WINDOW, 'en')).toContain('wyndowe')
    expect(languageSection(EN_WINDOW, 'en')).not.toContain('Swedish')
    expect(languageSection(EN_WINDOW, 'fr')).toBeNull()
  })

  it('finds the root, preferring the classical source, in both template styles', () => {
    expect(etymologyRoot(FR_FENETRE)).toEqual({ lang: 'la', word: 'fenestra' })
    expect(etymologyRoot(ES_VENTANA)).toEqual({ lang: 'la', word: 'ventus' })
    expect(etymologyRoot(languageSection(EN_WINDOW, 'en')!)).toEqual({ lang: 'enm', word: 'wyndowe' })
    expect(etymologyRoot('{{der+|en|frm|-}}, from {{der|en|la|dēcīsiō}}'.replace(/^/, '===Etymology===\n'))).toEqual({ lang: 'la', word: 'dēcīsiō' })
  })

  it('reads the English sense of a French or Spanish entry', () => {
    expect(englishGloss(FR_FENETRE)).toBe('window')
    expect(englishGloss(ES_VENTANA)).toBe('window')
    expect(englishGloss('# to [[decide]], to [[make up one\'s mind]]')).toBe('decide')
  })

  it('takes the translation with gender, preferring a relative of the English word', () => {
    expect(translationIn(EN_WINDOW, 'fr')).toEqual({ word: 'fenêtre', gender: 'f' })
    const abandon = `{{trans-top|to give up}}\n* Spanish: {{t+|es|renunciar}}\n{{trans-bottom}}\n{{trans-top|to leave}}\n* Spanish: {{t+|es|abandonar}}\n{{trans-bottom}}`
    expect(translationIn(abandon, 'es', 'abandon')?.word).toBe('abandonar')
    expect(translationIn(abandon, 'es')?.word).toBe('renunciar')
  })

  it('writes nouns with their article', () => {
    expect(withArticle('fenêtre', 'fr', 'f')).toBe('la fenêtre')
    expect(withArticle('arbre', 'fr', 'm')).toBe("l'arbre")
    expect(withArticle('problema', 'es', 'm')).toBe('el problema')
    expect(withArticle('window', 'en', 'f')).toBe('window')
  })
})

describe('equivalents', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('goes French → English → Spanish and reports a shared root', async () => {
    const pages: Record<string, string> = { fenêtre: FR_FENETRE, window: EN_WINDOW, ventana: ES_VENTANA.replace('la:ventus<t:wind>', 'la:fenestra') }
    vi.stubGlobal('fetch', async (url: string) => {
      const titles = new URL(url).searchParams.get('titles')!.split('|')
      return new Response(JSON.stringify({ query: { pages: titles.map((t) => ({ title: t, revisions: [{ slots: { main: { content: pages[t] } } }] })) } }))
    })
    const r = await findEquivalents('fenêtre', 'fr')
    expect(r?.forms.map((f) => `${f.language}:${f.word}`)).toEqual(['en:window', 'fr:fenêtre', 'es:ventana'])
    expect(r?.shared).toEqual({ lang: 'la', word: 'fenestra' })
  })
})
