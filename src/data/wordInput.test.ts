import { describe, expect, it } from 'vitest'
import { addExample, ankiHeader, autoDetectColumns, createEntry, DEFAULT_FORMAT, detectSource, entryToInput, findForm, guessPartOfSpeech, importWords, isHeaderRow, parseCollocations, parseDelimited, parseRawGrid, parseWordList, removeExample, updateEntry, WordInputError, wordKeys } from './wordInput'

const NOW = new Date('2026-10-01T10:00:00Z')

describe('findForm', () => {
  it('finds exact and inflected forms', () => {
    expect(findForm('She decided to stay.', 'decide')).toBe('decided')
    expect(findForm('It was a difficult decision.', 'decision')).toBe('decision')
    expect(findForm("J'essaie de comprendre.", 'essayer')).toBe('essaie')
  })
  it('prefers a word marked with asterisks', () => {
    expect(findForm('No *sé* dónde está.', 'saber')).toBe('sé')
  })
  it('returns undefined when the word cannot be found', () => {
    expect(findForm('No sé dónde está.', 'saber')).toBeUndefined()
  })
})

describe('createEntry', () => {
  it('builds a minimal entry from word + meaning', () => {
    const e = createEntry({ word: 'abandon', meaning: 'terk etmek, bırakmak' }, 'en', NOW)
    expect(e).toMatchObject({ id: 'en:abandon', lemma: 'abandon', source: 'user', addedAt: NOW })
    expect(e.senses[0]).toMatchObject({ gloss: 'terk etmek', altGlosses: ['bırakmak'], examples: [] })
  })

  it('takes article and gender from "la décision"', () => {
    const e = createEntry({ word: 'La décision', meaning: 'karar' }, 'fr', NOW)
    expect(e).toMatchObject({ id: 'fr:décision', lemma: 'décision', article: 'la', gender: 'f', partOfSpeech: 'noun' })
  })

  it("needs the gender explicitly for l'", () => {
    const e = createEntry({ word: "l'arbre", meaning: 'ağaç', gender: 'm' }, 'fr', NOW)
    expect(e).toMatchObject({ lemma: 'arbre', article: "l'", gender: 'm' })
  })

  it('drops English articles / "to"', () => {
    expect(createEntry({ word: 'to abandon', meaning: 'terk etmek' }, 'en', NOW).lemma).toBe('abandon')
  })

  it('stores the example with the detected form, without asterisks', () => {
    const e = createEntry(
      { word: 'saber', meaning: 'bilmek', example: 'No *sé* dónde está.', exampleTranslation: 'Nerede olduğunu bilmiyorum.' },
      'es',
      NOW,
    )
    expect(e.senses[0].examples[0]).toEqual({ text: 'No sé dónde está.', translation: 'Nerede olduğunu bilmiyorum.', form: 'sé' })
  })

  it('keeps a sentence the word is not found in, with no form to blank out', () => {
    const e = createEntry({ word: 'saber', meaning: 'bilmek', example: 'No sé.' }, 'es', NOW)
    expect(e.senses[0].examples[0]).toEqual({ text: 'No sé.', translation: '', form: '' })
  })

  it('requires word and meaning', () => {
    expect(() => createEntry({ word: '', meaning: 'x' }, 'en', NOW)).toThrow('Kelime')
    expect(() => createEntry({ word: 'x', meaning: ' ' }, 'en', NOW)).toThrow('anlam')
  })

  it('links confusables by id', () => {
    const e = createEntry({ word: 'affect', meaning: 'etkilemek', confusables: 'effect' }, 'en', NOW)
    expect(e.relations).toEqual([{ type: 'confusable', targetId: 'en:effect' }])
  })
})

describe('parseCollocations', () => {
  it('parses phrase, translation and wrong variants', () => {
    expect(parseCollocations('make a decision = karar vermek (do a decision, give a decision); final decision = nihai karar')).toEqual([
      { phrase: 'make a decision', translation: 'karar vermek', wrongVariants: ['do a decision', 'give a decision'] },
      { phrase: 'final decision', translation: 'nihai karar', wrongVariants: undefined },
    ])
  })
})

describe('parseDelimited', () => {
  it('detects tabs (pasted from a spreadsheet)', () => {
    expect(parseDelimited('a\tb\nc\td')).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('handles quotes, embedded delimiters and CRLF', () => {
    expect(parseDelimited('"x, y",z\r\n"say ""hi""",w\n')).toEqual([['x, y', 'z'], ['say "hi"', 'w']])
  })
})

describe('importWords', () => {
  it('imports rows, skips the header and duplicates, and reports bad lines', () => {
    const text = [
      'kelime\tanlam\törnek cümle\törnek çevirisi',
      'decision\tkarar\tIt was a hard decision.\tZor bir karardı.',
      'decide\tkarar vermek',
      'decision\tkarar',
      'oops\t',
      'improve\tgeliştirmek',
    ].join('\n')
    const r = importWords(text, 'en', new Set(['en:improve']), NOW)
    expect(r.entries.map((e) => e.lemma)).toEqual(['decision', 'decide'])
    expect(r.entries.every((e) => e.source === 'import')).toBe(true)
    expect(r.duplicates).toEqual(['decision', 'improve'])
    expect(r.errors).toEqual([{ line: 5, message: 'Türkçe anlamı yaz.' }])
    // File order is kept as introduction order.
    expect(r.entries[0].addedAt!.getTime()).toBeLessThan(r.entries[1].addedAt!.getTime())
  })
  it('a stray apostrophe ("l\'aïus" for "laïus") is read off the sentence; a sentence without the word is kept', () => {
    const r = importWords(
      [
        "l'aïus\tuzun, sıkıcı konuşma\tLe directeur nous a fait un long laïus sur la ponctualité.",
        "l'arbre\tağaç\tL'arbre est grand.",
        'topo\tkısa sunum\tIl a fait un exposé.',
      ].join('\n'),
      'fr',
      new Set(),
      NOW,
    )
    expect(r.entries.map((e) => [e.article, e.lemma])).toEqual([[undefined, 'laïus'], ["l'", 'arbre'], [undefined, 'topo']])
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([{ line: 3, message: expect.stringContaining('"topo" cümlede geçmiyor') }])
  })
})

describe('editing', () => {
  it('round-trips an entry through the form unchanged', async () => {
    const { SAMPLE_WORDS } = await import('./seed')
    const decision = SAMPLE_WORDS.en.find((e) => e.lemma === 'decision')!
    const roundTrip = updateEntry(decision, entryToInput(decision))
    expect(roundTrip).toEqual({ ...decision, senses: [{ ...decision.senses[0], altGlosses: [] }] })
  })

  it('marks the example form only when it cannot be detected', () => {
    const e = createEntry({ word: 'saber', meaning: 'bilmek', example: 'No *sé* nada.' }, 'es', NOW)
    expect(entryToInput(e).example).toBe('No *sé* nada.')
    const d = createEntry({ word: 'decide', meaning: 'karar vermek', example: 'She decided.' }, 'en', NOW)
    expect(entryToInput(d).example).toBe('She decided.')
  })

  it('keeps the id (and so the learning history) when the word is renamed', () => {
    const e = createEntry({ word: 'la fenetre', meaning: 'pencere' }, 'fr', NOW)
    const fixed = updateEntry(e, { ...entryToInput(e), word: 'la fenêtre' })
    expect(fixed.id).toBe(e.id)
    expect(fixed.lemma).toBe('fenêtre')
    expect(wordKeys([fixed])).toEqual(new Set(['fr:fenetre', 'fr:fenêtre']))
  })

  it('keeps data the form does not show', () => {
    const e = { ...createEntry({ word: 'decide', meaning: 'karar vermek' }, 'en', NOW), wordFamily: [{ lemma: 'decision', partOfSpeech: 'noun' as const, gloss: 'karar' }] }
    expect(updateEntry(e, { ...entryToInput(e), meaning: 'karar vermek, kararlaştırmak' }).wordFamily).toHaveLength(1)
  })
})

describe('parseWordList (bulk formats)', () => {
  it('auto-detects common word-list notations, splitting on the first separator only', () => {
    expect(parseWordList('decision - karar\nthrive - gelişmek, büyümek')).toEqual([['decision', 'karar'], ['thrive', 'gelişmek, büyümek']])
    expect(parseWordList('decision = karar\nabandon = terk etmek')).toEqual([['decision', 'karar'], ['abandon', 'terk etmek']])
    expect(parseWordList('decision: karar\nabandon: terk etmek')).toEqual([['decision', 'karar'], ['abandon', 'terk etmek']])
  })
  it('keeps hyphenated words intact with the dash notation', () => {
    expect(parseWordList('well-known - ünlü')).toEqual([['well-known', 'ünlü']])
  })
  it('supports custom separators, row separators and swapped columns', () => {
    expect(parseWordList('karar|decision;gelişmek|thrive', { term: 'custom', customTerm: '|', row: 'semicolon', swap: true })).toEqual([
      ['decision', 'karar'],
      ['thrive', 'gelişmek'],
    ])
  })
  it('reads JSON arrays (word/meaning or term/definition)', () => {
    expect(parseWordList('[{"term":"decision","definition":"karar"}]')[0].slice(0, 2)).toEqual(['decision', 'karar'])
  })
  it('reads Anki exports: skips # headers and strips HTML', () => {
    expect(parseWordList('#separator:tab\n#html:true\n<b>decision</b>\tkarar<br>seçim')).toEqual([['decision', 'karar seçim']])
  })
  it('reads an Anki plain-text export with its id, note type, deck and tags columns, and its own separator', () => {
    const text = [
      '#separator:semicolon',
      '#html:true',
      '#guid column:1',
      '#notetype column:2',
      '#deck column:3',
      '#tags column:6',
      'abc123;Basic;Fransızca;<b>la maison</b>;ev [sound:maison.mp3];dilolojı',
      'def456;Basic;Fransızca;<i>décider</i> de;karar vermek;',
    ].join('\n')
    expect(ankiHeader(text).skip).toEqual(new Set([0, 1, 2, 5]))
    expect(parseWordList(text)).toEqual([['la maison', 'ev'], ['décider de', 'karar vermek']])
  })
  it('an Anki header with a pipe or a space as its separator is followed too, unless the user chose one', () => {
    expect(parseWordList('#separator:pipe\ndecision|karar')).toEqual([['decision', 'karar']])
    expect(parseWordList('#separator:pipe\ndecision|karar - ek', { term: 'dash', row: 'newline' })).toEqual([['decision|karar', 'ek']])
  })
  it('knows a header row of a spreadsheet by its first cell, in Turkish and English', () => {
    expect(isHeaderRow(['Front', 'Back'])).toBe(true)
    expect(isHeaderRow(['Sözcük', 'Anlam'])).toBe(true)
    expect(isHeaderRow(['décider', 'karar vermek'])).toBe(false)
    const r = importWords('Front,Back\ndecision,karar', 'en', new Set(), NOW)
    expect(r.entries).toHaveLength(1)
    expect(r.errors).toEqual([])
  })
  it('applies tags to every imported word', () => {
    const r = importWords('decision - karar\nthrive - gelişmek', 'en', new Set(), NOW, { term: 'auto', row: 'newline', tags: 'dizi, s1' })
    expect(r.entries.map((e) => e.tags)).toEqual([['dizi', 's1'], ['dizi', 's1']])
  })
})

describe('Quizlet & Memrise import wizard, column mapping and detection', () => {
  it('auto-detects columns from standard headers (English, Turkish, Quizlet, Memrise)', () => {
    expect(autoDetectColumns(['Word', 'Meaning', 'Example'], true)).toEqual(['word', 'meaning', 'example'])
    expect(autoDetectColumns(['Front', 'Back'], true)).toEqual(['word', 'meaning'])
    expect(autoDetectColumns(['Term', 'Definition'], true)).toEqual(['word', 'meaning'])
    expect(autoDetectColumns(['Kelime', 'Anlam', 'Örnek Cümle', 'Çeviri'], true)).toEqual(['word', 'meaning', 'example', 'exampleTranslation'])
    expect(autoDetectColumns(['Anlam', 'Kelime'], true)).toEqual(['meaning', 'word'])
    expect(autoDetectColumns(['English', 'Turkish', 'Audio', 'Part of speech'], true)).toEqual(['word', 'meaning', 'ignore', 'notes'])
    expect(autoDetectColumns(['#', 'Lemma', 'Translation', 'Tags'], true)).toEqual(['ignore', 'word', 'meaning', 'tags'])
  })

  it('auto-detects columns from raw cell content when headers are absent', () => {
    expect(autoDetectColumns(['apple', 'elma'], false)).toEqual(['word', 'meaning'])
    // Turkish in first cell, foreign in second -> meaning, word
    expect(autoDetectColumns(['ağaç', 'arbre'], false)).toEqual(['meaning', 'word'])
    // 3 columns with a sentence -> word, meaning, example
    expect(autoDetectColumns(['thrive', 'gelişmek', 'Plants thrive in the spring.'], false)).toEqual(['word', 'meaning', 'example'])
  })

  it('detects sources accurately (Quizlet, Memrise, Anki, CSV)', () => {
    const quizletText = 'thrive\tgelişmek\nabandon\tterk etmek'
    const qDetect = detectSource(quizletText)
    expect(qDetect.preset).toBe('quizlet')
    expect(qDetect.delimiter).toBe('tab')
    expect(qDetect.columns).toEqual(['word', 'meaning'])

    const memriseText = 'Word\tMeaning\tPart of Speech\tExample\nthrive\tgelişmek\tverb\tPlants thrive in spring.'
    const mDetect = detectSource(memriseText)
    expect(mDetect.preset).toBe('memrise')
    expect(mDetect.delimiter).toBe('tab')
    expect(mDetect.hasHeader).toBe(true)

    const ankiText = '#separator:tab\n#html:true\nthrive\tgelişmek'
    const aDetect = detectSource(ankiText)
    expect(aDetect.preset).toBe('anki')

    const csvText = '"thrive","gelişmek"\n"decision","karar"'
    const cDetect = detectSource(csvText)
    expect(cDetect.preset).toBe('csv')
  })

  it('parseRawGrid returns raw cells without reordering', () => {
    const text = 'gelişmek\tthrive\tPlants thrive.'
    const raw = parseRawGrid(text, { term: 'tab', row: 'newline' })
    expect(raw).toEqual([['gelişmek', 'thrive', 'Plants thrive.']])
  })

  it('parseWordList respects custom column mapping', () => {
    const text = '1\tverb\telma\tapple\tShe ate an apple.\tBir elma yedi.'
    const fmt = {
      term: 'tab' as const,
      row: 'newline' as const,
      columns: ['ignore', 'notes', 'meaning', 'word', 'example', 'exampleTranslation'] as const,
    }
    const mapped = parseWordList(text, fmt)
    // [word, meaning, example, exampleTranslation, notes, tags]
    expect(mapped[0]).toEqual(['apple', 'elma', 'She ate an apple.', 'Bir elma yedi.', 'verb', ''])
  })

  it('importWords imports entries mapped with columns, notes, tags and skipHeader', () => {
    const text = [
      'ID\tHedef\tTürkçe\tNot\tEtiket',
      '101\tthrive\tgelişmek, büyümek\tdüzenli fiil\tA2, biyoloji',
      '102\tabandon\tterk etmek\tfiil\tB1',
    ].join('\n')

    const fmt = {
      term: 'tab' as const,
      row: 'newline' as const,
      columns: ['ignore', 'word', 'meaning', 'notes', 'tags'] as const,
      skipHeader: true,
      tags: 'genel',
    }

    const r = importWords(text, 'en', new Set(), NOW, fmt)
    expect(r.errors).toEqual([])
    expect(r.entries).toHaveLength(2)
    expect(r.entries[0].lemma).toBe('thrive')
    expect(r.entries[0].senses[0].gloss).toBe('gelişmek')
    expect(r.entries[0].senses[0].altGlosses).toEqual(['büyümek'])
    expect(r.entries[0].notes).toBe('düzenli fiil')
    expect(r.entries[0].tags).toEqual(['genel', 'A2', 'biyoloji'])
    expect(r.entries[1].lemma).toBe('abandon')
    expect(r.entries[1].notes).toBe('fiil')
  })
})


describe('guessPartOfSpeech', () => {
  it.each([
    ['en', 'decision', 'noun'],
    ['en', 'to abandon', 'verb'],
    ['en', 'the weather', 'noun'],
    ['en', 'quickly', 'adverb'],
    ['en', 'dangerous', 'adjective'],
    ['en', 'realize', 'verb'],
    ['en', 'although', 'conjunction'],
    ['en', 'make up for', 'phrase'],
    ['fr', 'la décision', 'noun'],
    ['fr', 'manger', 'verb'],
    ['fr', 'se souvenir', 'verb'],
    ["fr", "s'asseoir", 'verb'],
    ['fr', 'lentement', 'adverb'],
    ['fr', 'heureux', 'adjective'],
    ['fr', 'malgré', 'preposition'],
    ['es', 'el año', 'noun'],
    ['es', 'hablar', 'verb'],
    ['es', 'rápidamente', 'adverb'],
    ['es', 'peligroso', 'adjective'],
    ['es', 'aunque', 'conjunction'],
  ] as const)('%s %s → %s', (lang, word, pos) => {
    expect(guessPartOfSpeech(word, lang)).toBe(pos)
  })

  it('returns undefined when nothing points anywhere', () => {
    expect(guessPartOfSpeech('cat', 'en')).toBeUndefined()
    expect(guessPartOfSpeech('', 'fr')).toBeUndefined()
  })

  it('is used by createEntry when no type is given', () => {
    expect(createEntry({ word: 'hablar', meaning: 'konuşmak' }, 'es', new Date()).partOfSpeech).toBe('verb')
    expect(createEntry({ word: 'cat', meaning: 'kedi' }, 'en', new Date()).partOfSpeech).toBe('other')
  })
})

describe('addExample / removeExample', () => {
  const base = createEntry({ word: 'decide', meaning: 'karar vermek', example: 'I *decided* to stay.' }, 'en', new Date())

  it('adds a sentence with the word found automatically or marked', () => {
    const one = addExample(base, 'She decides quickly.', 'Çabuk karar verir.')
    expect(one.senses[0].examples.at(-1)).toEqual({ text: 'She decides quickly.', translation: 'Çabuk karar verir.', form: 'decides' })
    const two = addExample(one, 'They *chose* to wait.')
    expect(two.senses[0].examples.at(-1)?.form).toBe('chose')
    expect(two.senses[0].examples).toHaveLength(3)
  })

  it('rejects duplicates; keeps a sentence without the word, unless it is the learner\'s own', () => {
    expect(() => addExample(base, 'I decided to stay.')).toThrow(WordInputError)
    expect(addExample(base, 'Nothing here.').senses[0].examples.at(-1)).toMatchObject({ text: 'Nothing here.', form: '' })
    expect(() => addExample(base, 'Nothing here.', '', true)).toThrow(WordInputError)
  })

  it('removes by position', () => {
    const two = addExample(base, 'She decides quickly.')
    expect(removeExample(two, 0).senses[0].examples.map((e) => e.form)).toEqual(['decides'])
  })
})

describe('word lists with the sentence a word was met in', () => {
  it('takes a sentence-like third part as the example, and a fourth as its translation', () => {
    expect(parseWordList('la décision - karar - Elle a pris une décision difficile.')).toEqual([['la décision', 'karar', 'Elle a pris une décision difficile.']])
    expect(parseWordList('la décision = karar = Elle a pris une décision. = Zor bir karar verdi.', { ...DEFAULT_FORMAT, term: 'equals' })).toEqual([
      ['la décision', 'karar', 'Elle a pris une décision.', 'Zor bir karar verdi.'],
    ])
  })

  it('keeps a short third part as part of the meaning', () => {
    expect(parseWordList('breeze - esinti - meltem')).toEqual([['breeze', 'esinti - meltem']])
  })

  it('imports the sentence as the word’s example', () => {
    const r = importWords('la décision - karar - Elle a pris une décision difficile.', 'fr', new Set(), new Date())
    expect(r.entries[0].senses[0].examples[0]?.text).toContain('décision difficile')
  })
})

describe('where an example was met', () => {
  it('is kept on the example and survives an edit that keeps the sentence', () => {
    const e = createEntry({ word: "l'asile", meaning: 'sığınma', example: "Ils demandent l'asile.", exampleMetIn: 'Le Monde' }, 'fr', new Date())
    expect(e.senses[0].examples[0].metIn).toBe('Le Monde')
    const edited = updateEntry(e, { ...entryToInput(e), meaning: 'sığınak' })
    expect(edited.senses[0].examples[0].metIn).toBe('Le Monde')
    const changed = updateEntry(e, { ...entryToInput(e), example: "L'asile est refusé." })
    expect(changed.senses[0].examples[0].metIn).toBeUndefined()
  })
})
