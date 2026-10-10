import { describe, expect, it } from 'vitest'
import { audioFileOf, commonFamily, frAudioFilesOf, commonsMp3, familyOf, firstDefinition, ipaOf, md5, turkishIn, wikiToText } from './wordInfo'

describe('Wiktionary word info', () => {
  it('turns wikitext into plain text', () => {
    expect(wikiToText("[[action|Action]] de [[décider]] ou [[résultat]] de cette action.")).toBe('Action de décider ou résultat de cette action.')
    expect(wikiToText('{{plm|determinación}}, [[resolución]], fallo<ref>x</ref>.')).toBe('Determinación, resolución, fallo.')
    expect(wikiToText("{{pronominal|fr}} Se [[prononcer]], ''pour'' {{lien|quelqu’un|fr}}.")).toBe('Se prononcer, pour quelqu’un.')
  })

  it('takes the first definition in each Wiktionary style', () => {
    expect(firstDefinition("'''décider''' {{pron|de.si.de|fr}}\n# [[résoudre|Résoudre]] après [[examen]].\n#* {{exemple|…}}", 'hash')).toBe('Résoudre après examen.')
    expect(firstDefinition(';1 {{csem|derecho}}: Zanjar una cuestión.\n;2: Otra.', 'es')).toBe('Zanjar una cuestión.')
  })

  it('reads pronunciation and audio', () => {
    expect(ipaOf("'''décider''' {{pron|de.si.de|fr}} {{t|fr}}", 'fr', 'fr')).toBe('/de.si.de/')
    expect(ipaOf('* {{IPA|en|/dɪˈsaɪd/|a=UK}}', 'en', 'en')).toBe('/dɪˈsaɪd/')
    expect(ipaOf('{{pron-graf}}', 'es', 'es')).toBeUndefined()
    expect(audioFileOf('* {{audio|fr|LL-Q150 (fra)-X-décider.wav}}\n* {{audio|fr|Fr-décider.ogg}}', 'fr')).toBe('Fr-décider.ogg')
  })

  it('builds the Commons MP3 address from the file name hash', () => {
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72')
    expect(md5('Fr-décider.ogg')).toBe('178a2792e8bb3abc28ae2f2fb0cd14fa')
    expect(commonsMp3('Fr-décider.ogg')).toBe('https://upload.wikimedia.org/wikipedia/commons/transcoded/1/17/Fr-d%C3%A9cider.ogg/Fr-d%C3%A9cider.ogg.mp3')
  })

  it('collects the family from link lists and templates, keeping real relatives', () => {
    const fr = '==== {{S|apparentés}} ====\n* [[décision]]\n* [[indécis]]\n* [[trancher]]\n==== {{S|traductions}} ====\n* [[décidément]]'
    expect(familyOf(fr, 'fr', 'décider')).toEqual(['décision', 'indécis'])
    const en = '====Derived terms====\n{{col|en|decidable|undecided|decider|make up one\'s mind}}\n====Related terms====\n* {{l|en|decision}}'
    expect(familyOf(en, 'en', 'decide').sort()).toEqual(['decidable', 'decider', 'decision', 'undecided'])
  })

  it('offers only frequent relatives, most frequent first', () => {
    const freq = new Map([['décision', 300], ['indécis', 9000], ['décidément', 4000]])
    expect(commonFamily(['décidabilité', 'indécis', 'décision', 'contre-décision', 'décidément'], freq)).toEqual(['décision', 'décidément', 'indécis'])
  })
})

describe('Turkish meanings in translation tables', () => {
  it('reads the English, French and Spanish formats in order, without duplicates', () => {
    expect(turkishIn('* Turkish: {{t+|tr|sığınak}}, {{t+|tr|iltica}}\n*: Ottoman Turkish: {{t|ota|التجا|tr=iltica}}\n* Turkish: {{t+check|tr|sığınak}}', 'en')).toEqual(['sığınak', 'iltica'])
    expect(turkishIn('* {{T|tr}} : {{trad+|tr|ev}}, {{trad-|tr|[[mesken]]}}', 'fr')).toEqual(['ev', 'mesken'])
    expect(turkishIn('{{t|tr|i1=s|t1=ev|i2=s|t2=konut}}', 'es')).toEqual(['ev', 'konut'])
    expect(turkishIn('* German: {{t+|de|Haus}}', 'en')).toEqual([])
  })
})

describe('French Wiktionary recordings', () => {
  it('reads the audio files of the écouter template, each once', () => {
    const section = "{{écouter|France (Paris)|lang=fr|audio=Fr-son.ogg}}\n{{écouter|lang=fr|France|audio=LL-Q150 (fra)-Guilhelma-son.wav}} {{écouter|France (Paris)|lang=fr|audio=Fr-son.ogg}}"
    expect(frAudioFilesOf(section)).toEqual(['Fr-son.ogg', 'LL-Q150 (fra)-Guilhelma-son.wav'])
    expect(frAudioFilesOf('{{pron|sɔ̃|fr}}')).toEqual([])
  })
})
