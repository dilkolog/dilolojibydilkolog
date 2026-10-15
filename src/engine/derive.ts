import type { PartOfSpeech, TargetLanguage } from './types'

/**
 * Word building: a root and a few productive prefixes and suffixes make a family (comfort →
 * comfortable → uncomfortable → uncomfortably). Forms are generated loosely (every spelling the
 * seam might take) and then kept only when the dictionary really has the word, with the part of
 * speech the affix makes, so "uncomfort" or "re+fine" never show up. The same affixes read backwards
 * find a word's root (uncomfortably → comfort).
 */
export interface Affix {
  /** As written, with a hyphen on its open side in the UI. */
  form: string
  kind: 'prefix' | 'suffix'
  /** Suffixes: the parts of speech the new word can be (any of these). */
  makes?: PartOfSpeech[]
  /** What it attaches to (any of these); empty = anything. Used when reading a word backwards, and for prefixes. */
  from?: PartOfSpeech[]
  /** What it does, in Turkish. */
  role: string
  /** The Turkish way of doing the same, so the affix is not new. */
  tr: string
}

const N: PartOfSpeech = 'noun'
const V: PartOfSpeech = 'verb'
const A: PartOfSpeech = 'adjective'
const D: PartOfSpeech = 'adverb'

const affix = (form: string, kind: Affix['kind'], role: string, tr: string, makes?: PartOfSpeech[], from?: PartOfSpeech[]): Affix => ({ form, kind, role, tr, makes, from })
const pre = (form: string, role: string, tr: string, from?: PartOfSpeech[]) => affix(form, 'prefix', role, tr, undefined, from)
const suf = (form: string, role: string, tr: string, makes: PartOfSpeech[], from?: PartOfSpeech[]) => affix(form, 'suffix', role, tr, makes, from)

const NOT = 'olumsuzluk'
const NOT_TR = 'değil, -sIz (mutlu → mutsuz)'
const ABLE = 'yapılabilirlik, sıfat yapar'
const ABLE_TR = '-Abilir, -lI'
const AGENT = 'yapan kişi / araç, isim yapar'
const AGENT_TR = '-CI, -Ici'
const ACT = 'eylem ya da sonucu, isim yapar'
const ACT_TR = '-mA, -Iş'
const QUALITY = 'nitelik, isim yapar'
const QUALITY_TR = '-lIk'
const FULL = 'dolu / sahip, sıfat yapar'
const FULL_TR = '-lI'
const ADVERB = 'tarz, zarf yapar'
const ADVERB_TR = '-CA, -cAsInA'

export const AFFIXES: Record<TargetLanguage, Affix[]> = {
  en: [
    pre('un', NOT + ' ya da tersini yapma', NOT_TR, [A, V]),
    pre('dis', 'zıtlık, yokluk', 'değil, -sIz, -mA', [A, N, V]),
    pre('in', NOT, NOT_TR, [A]),
    pre('im', NOT + ' (b, m, p önünde)', NOT_TR, [A]),
    pre('il', NOT + ' (l önünde)', NOT_TR, [A]),
    pre('ir', NOT + ' (r önünde)', NOT_TR, [A]),
    pre('re', 'yeniden', 'tekrar, yeniden', [V, N]),
    pre('mis', 'yanlış, kötü', 'yanlış, kötü', [V, N]),
    pre('non', 'olmayan', '-sIz, -mAyan', [A, N]),
    suf('able', ABLE, ABLE_TR, [A]),
    suf('ible', ABLE, ABLE_TR, [A]),
    suf('ful', FULL, FULL_TR, [A], [N]),
    suf('less', 'yokluk, sıfat yapar', '-sIz', [A], [N]),
    suf('ly', ADVERB, ADVERB_TR, [D], [A]),
    suf('ness', QUALITY, QUALITY_TR, [N], [A]),
    suf('ity', QUALITY, QUALITY_TR, [N], [A]),
    suf('ment', ACT, ACT_TR, [N], [V]),
    suf('ation', ACT, ACT_TR, [N], [V]),
    suf('tion', ACT, ACT_TR, [N], [V]),
    suf('ion', ACT, ACT_TR, [N], [V]),
    suf('er', AGENT, AGENT_TR, [N], [V]),
    suf('or', AGENT, AGENT_TR, [N], [V]),
    suf('ing', 'niteleme, sıfat yapar (interesting)', '-An, -Ici', [A], [N]),
    suf('ive', 'eğilim, sıfat yapar', '-Ici, -sAl', [A], [V]),
    suf('al', 'ilgili, sıfat yapar', '-sAl, -(y)lA ilgili', [A], [N]),
    suf('ous', 'sahip olan, sıfat yapar', FULL_TR, [A], [N]),
    suf('ist', 'uğraşan kişi, isim yapar', '-CI, -ist', [N], [N]),
  ],
  fr: [
    pre('in', NOT, NOT_TR, [A]),
    pre('im', NOT + ' (b, m, p önünde)', NOT_TR, [A]),
    pre('il', NOT + ' (l önünde)', NOT_TR, [A]),
    pre('ir', NOT + ' (r önünde)', NOT_TR, [A]),
    pre('dé', 'zıtlık, geri alma', 'değil, geri (faire → défaire)', [V, A, N]),
    pre('dés', 'zıtlık (ünlü önünde)', 'değil, geri', [V, A, N]),
    pre('re', 'yeniden', 'tekrar, yeniden', [V]),
    pre('ré', 'yeniden (ünlü önünde)', 'tekrar, yeniden', [V]),
    pre('mal', 'kötü, yanlış', 'kötü, yanlış', [V, A, N]),
    suf('able', ABLE, ABLE_TR, [A], [V, N]),
    suf('ible', ABLE, ABLE_TR, [A], [V]),
    suf('ment', ADVERB, ADVERB_TR, [D], [A]),
    suf('ement', ACT, ACT_TR, [N], [V]),
    suf('ation', ACT, ACT_TR, [N], [V]),
    suf('tion', ACT, ACT_TR, [N], [V]),
    suf('ition', ACT, ACT_TR, [N], [V]),
    suf('eur', AGENT, AGENT_TR, [N], [V]),
    suf('eux', FULL, FULL_TR, [A], [N]),
    suf('ité', QUALITY, QUALITY_TR, [N], [A]),
    suf('age', ACT, ACT_TR, [N], [V]),
    suf('iste', 'uğraşan kişi, isim yapar', '-CI, -ist', [N], [N]),
    suf('if', 'eğilim, sıfat yapar', '-Ici, -sAl', [A], [V, N]),
  ],
  es: [
    pre('in', NOT, NOT_TR, [A]),
    pre('im', NOT + ' (b, p önünde)', NOT_TR, [A]),
    pre('il', NOT + ' (l önünde)', NOT_TR, [A]),
    pre('ir', NOT + ' (r önünde)', NOT_TR, [A]),
    pre('des', 'zıtlık, geri alma', 'değil, geri (hacer → deshacer)', [V, A, N]),
    pre('re', 'yeniden', 'tekrar, yeniden', [V]),
    suf('mente', ADVERB, ADVERB_TR, [D], [A]),
    suf('able', ABLE, ABLE_TR, [A], [V]),
    suf('ible', ABLE, ABLE_TR, [A], [V]),
    suf('ación', ACT, ACT_TR, [N], [V]),
    suf('ición', ACT, ACT_TR, [N], [V]),
    suf('ción', ACT, ACT_TR, [N], [V]),
    suf('idad', QUALITY, QUALITY_TR, [N], [A]),
    suf('dad', QUALITY, QUALITY_TR, [N], [A]),
    suf('oso', FULL, FULL_TR, [A], [N]),
    suf('ador', AGENT, AGENT_TR, [N], [V]),
    suf('idor', AGENT, AGENT_TR, [N], [V]),
    suf('amiento', ACT, ACT_TR, [N], [V]),
    suf('imiento', ACT, ACT_TR, [N], [V]),
    suf('ista', 'uğraşan kişi, isim yapar', '-CI, -ist', [N], [N]),
    suf('ero', 'iş / kişi, isim yapar', AGENT_TR, [N], [N]),
  ],
}

/** The part of speech and Turkish meaning of a word the dictionary knows (undefined: it does not). */
export type WordLookup = (word: string) => { pos: PartOfSpeech; gloss?: string; rank?: number } | undefined

const VOWEL = /[aeiouyáéíóúàèùâêîôûäëïöü]/
const isVowel = (c: string | undefined) => !!c && VOWEL.test(c)

/** The stems a word may be built on, for its suffix to attach to (loose: the dictionary decides). */
function stems(base: string, language: TargetLanguage, pos?: PartOfSpeech): string[] {
  const out = new Set<string>([base])
  const last = base.at(-1) ?? ''
  if (isVowel(last)) out.add(base.slice(0, -1))
  if (language === 'en' && last === 'y') out.add(`${base.slice(0, -1)}i`)
  if (language === 'en' && !isVowel(last) && isVowel(base.at(-2))) out.add(base + last)
  if (language === 'es' && last === 'z') out.add(`${base.slice(0, -1)}c`)
  // The verb's stem: parler → parl-, decidir → decid-.
  // Only for a verb: on a noun or adjective it makes coincidences (autre → auteur, entre → entité).
  const verb = language === 'en' || (pos && pos !== 'verb') ? undefined : /^(.{2,}?)(er|ir|re|ar)$/.exec(base)
  if (verb) out.add(verb[1])
  // possible → possibil-, posible → posibil- (before -ité, -idad).
  if (/b(le)$/.test(base)) out.add(`${base.slice(0, -2)}il`)
  return [...out]
}

/** The feminine of a French or Spanish adjective, which the adverb ending is added to (heureux → heureuse → heureusement). */
function feminine(adj: string, language: TargetLanguage): string[] {
  if (language === 'es') return adj.endsWith('o') ? [`${adj.slice(0, -1)}a`] : [adj]
  const out = [adj, `${adj}e`]
  if (adj.endsWith('eux')) out.push(`${adj.slice(0, -3)}euse`)
  if (adj.endsWith('er')) out.push(`${adj.slice(0, -2)}ère`)
  if (adj.endsWith('if')) out.push(`${adj.slice(0, -2)}ive`)
  if (adj.endsWith('al')) out.push(`${adj}e`)
  if (adj.endsWith('ant')) out.push(`${adj.slice(0, -3)}amm`)
  if (adj.endsWith('ent')) out.push(`${adj.slice(0, -3)}emm`)
  return out
}

/** Every spelling `base + affix` might take. */
export function joined(base: string, a: Affix, language: TargetLanguage, pos?: PartOfSpeech): string[] {
  if (a.kind === 'prefix') return [a.form + base]
  const out = new Set<string>()
  if (a.form === 'ly' && /le$/.test(base)) out.add(`${base.slice(0, -1)}y`)
  if (a.form === 'ly' && language === 'en' && /ic$/.test(base)) out.add(`${base}ally`)
  const feminised = (a.form === 'ment' && language === 'fr') || (a.form === 'mente' && language === 'es')
  if (feminised) for (const f of feminine(base, language)) out.add(f + a.form)
  for (const s of stems(base, language, pos)) out.add(s + a.form)
  out.delete(base)
  return [...out]
}

/** The words an affixed word may have been built on (read backwards; loose). */
function bases(word: string, a: Affix, language: TargetLanguage): string[] {
  const out = new Set<string>()
  if (a.kind === 'prefix') {
    if (word.startsWith(a.form)) out.add(word.slice(a.form.length))
    return [...out].filter((b) => b.length >= 4)
  }
  if (!word.endsWith(a.form)) return []
  const stem = word.slice(0, -a.form.length)
  out.add(stem)
  const last = stem.at(-1) ?? ''
  for (const v of ['e', 'a', 'o', 'é']) out.add(stem + v)
  if (language === 'en' && last === 'i') out.add(`${stem.slice(0, -1)}y`)
  if (language === 'en' && last === stem.at(-2)) out.add(stem.slice(0, -1))
  if (a.form === 'ly' && language === 'en') {
    out.add(`${stem}le`)
    if (stem.endsWith('al')) out.add(stem.slice(0, -2))
  }
  if (language === 'es' && last === 'c') out.add(`${stem.slice(0, -1)}z`)
  if (/bil$/.test(stem)) out.add(`${stem.slice(0, -3)}ble`)
  if (language !== 'en') for (const v of ['er', 'ir', 're', 'ar']) out.add(stem + v)
  if (language === 'es' && a.form === 'mente') out.add(stem.endsWith('a') ? `${stem.slice(0, -1)}o` : stem)
  if (language === 'fr' && a.form === 'ment') {
    if (stem.endsWith('euse')) out.add(`${stem.slice(0, -4)}eux`)
    if (stem.endsWith('ère')) out.add(`${stem.slice(0, -3)}er`)
    if (stem.endsWith('ive')) out.add(`${stem.slice(0, -3)}if`)
    if (stem.endsWith('amm')) out.add(`${stem.slice(0, -3)}ant`)
    if (stem.endsWith('emm')) out.add(`${stem.slice(0, -3)}ent`)
    if (stem.endsWith('e')) out.add(stem.slice(0, -1))
  }
  out.delete(word)
  // A very short base is mostly a coincidence of spelling (leg + -al, err + -or, car + -ing).
  return [...out].filter((b) => b.length >= (language === 'en' ? 4 : 3))
}

export interface Morph {
  text: string
  kind: 'prefix' | 'root' | 'suffix'
}

export interface DerivedWord {
  word: string
  pos: PartOfSpeech
  gloss?: string
  /** The word it is built from (one affix less). */
  parent: string
  affix: Affix
  /** The word as pieces: un- · comfort · -able · -ly. */
  morphs: Morph[]
}

/**
 * Pairs that look built (the spelling fits) but are not: `base|word`. The dictionary cannot tell
 * heure + -eux from a real suffix, so the ones found by reading its families are listed here.
 */
const FALSE_COUSINS: Record<TargetLanguage, Set<string>> = {
  en: new Set([
    'creation|recreation', 'show|shower', 'come|comment', 'turn|return', 'miss|mission', 'take|mistake', 'busy|business', 'idea|ideal', 'due|dual', 'course|discourse',
    'cape|capable', 'should|shoulder', 'pass|passion', 'face|faction', 'state|station', 'stay|station', 'city|citation', 'party|partition', 'party|partial', 'call|callous',
    'strange|stranger', 'veal|reveal', 'ward|reward', 'porter|reporter', 'move|remove', 'search|research', 'ease|disease', 'live|liver', 'view|review',
    'intern|internal', 'count|counter', 'temp|temper', 'trail|trailer', 'turn|turner', 'comply|compliment', 'gloria|glorious', 'pressed|impressed', 'formed|informed',
    'appointed|disappointed', 'visa|visible', 'fact|faction', 'poke|poker', 'fuck|fucker', 'mark|remarkable',
    'must|muster', 'miss|dismiss', 'sort|resort', 'carry|carrion', 'county|countless', 'tina|retina', 'terry|terrible', 'victoria|victorious', 'actor|reactor', 'mission|remission',
    'traction|distraction', 'position|disposition', 'rape|rapist', 'smoke|smoking', 'face|facing', 'rule|ruling', 'mate|mating', 'link|linking', 'mount|mounting', 'bear|bearing',
    'sting|resting', 'dent|dentist', 'tire|retire', 'shin|shining', 'turning|returning',
  ]),
  fr: new Set([
    'finir|définir', 'terminer|déterminer', 'penser|dépenser', 'manger|démanger', 'pendant|dépendant', 'tente|détente', 'partir|partition', 'heure|heureux', 'léger|légiste', 'pêche|dépêche', 'astre|désastre', 'vie|vieux', 'but|début', 'garder|regarder', 'péter|répéter', 'coup|coupable', 'mine|minable',
    'star|stable', 'cap|capable', 'cap|incapable', 'couler|couleur', 'courir|courage', 'courir|courageux', 'partir|partage', 'viser|invisible', 'série|sérieux',
    'coupe|coupable', 'couper|coupable', 'viser|visible', 'stylo|styliste', 'finition|définition', 'libéré|délibéré', 'parlé|parlement', 'port|portable', 'porte|portable', 'foncer|fonction', 'part|départ', 'vérité|véritable', 'autre|auteur', 'terre|terrible', 'contre|conteur', 'pire|pieux',
    'chanter|chantage', 'marrer|démarrer', 'tester|détester', 'pêcher|dépêcher', 'verse|inverse',
  ]),
  es: new Set([
    'primo|primero', 'pene|penoso', 'cuento|descuento', 'pecho|despecho', 'pedir|despedir', 'tema|temible', 'mayo|desmayo', 'carne|carnero', 'sentir|presentación', 'estar|estación', 'traer|traición', 'caro|caridad', 'sentar|presentar', 'parar|preparar', 'parado|preparado', 'probar|probable', 'esto|estación', 'entre|entidad', 'madre|madero', 'nave|navidad', 'ace|acero', 'prima|primero', 'modo|modista', 'estar|estable', 'esperado|desesperado',
    'saludar|saludable', 'presentar|presentimiento', 'creer|creación',
  ]),
}
const cousins = (language: TargetLanguage, base: string, word: string) => FALSE_COUSINS[language].has(`${base}|${word}`)

/** A gerund-like noun without a meaning of its own (deciding, creating) is only the verb's form, not a relative. */
const emptyGerund = (a: Affix, info: { pos: PartOfSpeech; gloss?: string }) => a.form === 'ing' && info.pos === 'noun' && !info.gloss

const MAX_DEPTH = 3
const MAX_WORDS = 14

const usable = (pos: PartOfSpeech, wanted?: PartOfSpeech[]) => !wanted || wanted.length === 0 || wanted.includes(pos)

/** The words built from `root` (and from what is built from it), nearest first; only ones the dictionary has. */
export function derivedWords(root: string, language: TargetLanguage, lookup: WordLookup, max = MAX_WORDS): DerivedWord[] {
  const base = lookup(root)
  if (!base) return []
  const out: DerivedWord[] = []
  const seen = new Set<string>([root])
  type Node = { word: string; pos: PartOfSpeech; morphs: Morph[]; prefixed: boolean }
  let level: Node[] = [{ word: root, pos: base.pos, morphs: [{ text: root, kind: 'root' }], prefixed: false }]
  for (let depth = 1; depth <= MAX_DEPTH && level.length && out.length < max; depth++) {
    const next: Node[] = []
    for (const node of level) {
      // A very short root (do, me, on, hey) mostly makes coincidences (door, mer, onion).
      if (node.word.length < 4) continue
      // Suffixes first, so a word reached both ways shows its natural path (comfort → comfortable → uncomfortable).
      const order = [...AFFIXES[language]].sort((x, y) => (x.kind === y.kind ? 0 : x.kind === 'suffix' ? -1 : 1))
      for (const a of order) {
        if (a.kind === 'prefix' && (node.prefixed || !usable(node.pos, a.from))) continue
        // "-ing" makes a describing adjective only from a noun (comfort → comforting), not the verb's own form (walking).
        if (a.form === 'ing' && !usable(node.pos, a.from)) continue
        for (const w of joined(node.word, a, language, node.pos)) {
          if (seen.has(w)) continue
          const info = lookup(w)
          if (!info || cousins(language, node.word, w) || emptyGerund(a, info)) continue
          // A suffix makes a given part of speech; a prefix keeps the word's own.
          if (a.kind === 'suffix' ? !usable(info.pos, a.makes) : info.pos !== node.pos) continue
          seen.add(w)
          const morphs: Morph[] = a.kind === 'prefix' ? [{ text: a.form, kind: 'prefix' }, ...node.morphs] : [...node.morphs, { text: a.form, kind: 'suffix' }]
          out.push({ word: w, pos: info.pos, gloss: info.gloss, parent: node.word, affix: a, morphs })
          next.push({ word: w, pos: info.pos, morphs, prefixed: node.prefixed || a.kind === 'prefix' })
          if (out.length >= max) return out
        }
      }
    }
    level = next
  }
  return out
}

/** How much rarer a root may be than the word built on it before it is taken for a coincidence (morn + ing). */
const RARER = 4

/**
 * The root a word is built on, by taking its affixes off one after another while what is left is a
 * word of the dictionary that the affix could attach to and is not much rarer (uncomfortably → comfort).
 */
export function rootOf(word: string, language: TargetLanguage, lookup: WordLookup): { root: string; steps: Affix[] } {
  let current = word
  const steps: Affix[] = []
  for (let i = 0; i < MAX_DEPTH + 1; i++) {
    const info = lookup(current)
    if (!info) break
    let found: { base: string; a: Affix } | undefined
    // Longest affix first: "-ation" before "-ion", "-ably" resolves through "-ly".
    const order = [...AFFIXES[language]].sort((x, y) => y.form.length - x.form.length)
    search: for (const a of order) {
      if (a.kind === 'suffix' && !usable(info.pos, a.makes)) continue
      for (const b of bases(current, a, language)) {
        const bi = lookup(b)
        if (!bi || cousins(language, b, current) || emptyGerund(a, info)) continue
        if (a.kind === 'prefix' ? bi.pos !== info.pos : false) continue
        if (!usable(bi.pos, a.from)) continue
        // A root the frequency list does not even have, of a word it has, is a coincidence of spelling too.
        if (info.rank && (!bi.rank || bi.rank > info.rank * RARER)) continue
        // The base must give the word back (a loose reading would let "sing" + "er" stand for any "-ing").
        if (!joined(b, a, language, bi.pos).includes(current)) continue
        found = { base: b, a }
        break search
      }
    }
    if (!found) break
    steps.push(found.a)
    current = found.base
  }
  return { root: current, steps }
}

export interface FamilyNode {
  word: string
  pos: PartOfSpeech
  gloss?: string
  /** The affix that makes it from its parent. */
  affix?: Affix
  morphs: Morph[]
  children: FamilyNode[]
}

export interface Family {
  root: FamilyNode
  /** Every affix used in the tree, once each, in order of appearance. */
  affixes: Affix[]
  /** The word asked about, found in the tree (or the root itself). */
  current: string
  size: number
}

/** The family of a word as a tree from its root; undefined when the dictionary has nothing built on it. */
export function familyOf(word: string, language: TargetLanguage, lookup: WordLookup): Family | undefined {
  const w = word.toLocaleLowerCase(language)
  const info = lookup(w)
  if (!info) return undefined
  const { root } = rootOf(w, language, lookup)
  const rootInfo = lookup(root)!
  const derived = derivedWords(root, language, lookup)
  // The word asked about may be a derived form the walk from the root did not reach (a long chain): keep it in the tree.
  if (root !== w && !derived.some((d) => d.word === w)) return undefined
  if (derived.length === 0) return undefined
  const nodes = new Map<string, FamilyNode>([[root, { word: root, pos: rootInfo.pos, gloss: rootInfo.gloss, morphs: [{ text: root, kind: 'root' }], children: [] }]])
  const affixes: Affix[] = []
  for (const d of derived) {
    const node: FamilyNode = { word: d.word, pos: d.pos, gloss: d.gloss, affix: d.affix, morphs: d.morphs, children: [] }
    nodes.set(d.word, node)
    nodes.get(d.parent)?.children.push(node)
    if (!affixes.includes(d.affix)) affixes.push(d.affix)
  }
  return { root: nodes.get(root)!, affixes, current: w, size: nodes.size }
}
