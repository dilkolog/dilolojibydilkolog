/**
 * Which games to point at today. Each signal is something the learner's own data says (open mistakes, cards due,
 * words missed by ear…); the first few that apply become suggestions, most pressing first, at most `MAX_SUGGESTIONS`.
 */

export const MAX_SUGGESTIONS = 3

export interface GameSignals {
  /** Words with an open mistake of the given kind. */
  accent: number
  article: number
  /** All open mistakes (words). */
  openMistakes: number
  dueSentences: number
  dueGrammar: number
  earMisses: number
  /** Translated sentences not yet written back. */
  backSentences: number
  /** Words with a low pronunciation score (0 without an Azure key). */
  weakPron: number
  /** Words known well enough for the fluency round. */
  fluencyWords: number
  fluencyNeeds: number
}

export interface GameSuggestion {
  id: string
  why: string
}

/** The games to suggest, in order; `canPlay` says whether a game can be started now (its card is not disabled). */
export function suggestGames(s: GameSignals, canPlay: (id: string) => boolean): GameSuggestion[] {
  const all: (GameSuggestion | false)[] = [
    s.accent >= 2 && { id: 'accent', why: `${s.accent} kelimede aksan hatan var: aksanlarını yerleştirerek düzelt.` },
    s.article >= 2 && { id: 'article', why: `${s.article} kelimede artikel hatan var: kısa bir artikel turu iyi gelir.` },
    s.dueSentences > 0 && { id: 'sentences', why: `${s.dueSentences} cümle kartının tekrar zamanı geldi.` },
    s.dueGrammar > 0 && { id: 'grammar', why: `${s.dueGrammar} dilbilgisi sorusunun tekrar zamanı geldi.` },
    s.openMistakes >= 3 && { id: 'boss', why: 'Bir türlü oturmayan kelimelerin var: farklı sorularla yenme zamanı.' },
    s.earMisses >= 3 && { id: 'ear', why: `Dikte ederken ${s.earMisses} kelimeyi kaçırdın: kendi cümleleriyle yeniden dinle.` },
    s.weakPron >= 3 && { id: 'pron', why: `${s.weakPron} kelimenin telaffuz puanı düşük: söyle ve puanla.` },
    s.backSentences >= 3 && { id: 'back', why: `Çevirdiğin ${s.backSentences} cümleyi Türkçesinden yazmayı dene.` },
    s.fluencyWords >= s.fluencyNeeds && { id: 'fluency', why: 'İyi bildiğin kelimeler hız kazanınca konuşurken akıcı gelir.' },
    { id: 'match', why: 'Kısa ve eğlenceli bir ısınma: 6 kelimeyi anlamlarıyla eşleştir.' },
  ]
  const out: GameSuggestion[] = []
  for (const g of all) if (g && canPlay(g.id) && out.length < MAX_SUGGESTIONS) out.push(g)
  return out
}

/** Lower case, no accents, Turkish dotted/dotless i alike: what a search compares. */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
}

/** Whether a game card answers the words typed in the search box (every word must be in its name or description). */
export function cardMatches(card: { name: string; text: string }, query: string): boolean {
  const q = fold(query).split(/\s+/).filter(Boolean)
  if (!q.length) return true
  const hay = fold(`${card.name} ${card.text}`)
  return q.every((w) => hay.includes(w))
}
