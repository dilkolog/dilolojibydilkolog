/** Every game by id, for the command palette (kept apart so the palette doesn't load the games). */
export type GameId = 'match' | 'blitz' | 'fluency' | 'pairs' | 'gender' | 'audio' | 'boss' | 'swipe' | 'sentences' | 'dictation' | 'article' | 'accent' | 'conjugation' | 'aspect'

export const GAME_LIST: { id: GameId; name: string; emoji: string; /** French and Spanish only. */ grammar?: boolean }[] = [
  { id: 'swipe', name: 'Kaydırmalı kartlar', emoji: '👆' },
  { id: 'sentences', name: 'Cümle kartları', emoji: '💬' },
  { id: 'boss', name: 'Boss savaşları', emoji: '⚔️' },
  { id: 'audio', name: 'Sesli tekrar', emoji: '🎧' },
  { id: 'dictation', name: 'Gerçek seslerle dikte', emoji: '🎙️' },
  { id: 'pairs', name: 'Ses ayırt etme', emoji: '👂' },
  { id: 'match', name: 'Eşleştirme', emoji: '🧩' },
  { id: 'blitz', name: 'Zamana karşı', emoji: '⚡' },
  { id: 'fluency', name: 'Akıcılık turu', emoji: '🏎️' },
  { id: 'article', name: 'Artikel antrenmanı', emoji: '🏷️', grammar: true },
  { id: 'conjugation', name: 'Fiil laboratuvarı (zamana karşı)', emoji: '🕰️', grammar: true },
  { id: 'aspect', name: 'Hangi geçmiş zaman?', emoji: '⏳', grammar: true },
  { id: 'gender', name: 'Cinsiyet kuralları', emoji: '⚖️', grammar: true },
  { id: 'accent', name: 'Aksan antrenmanı', emoji: '✍️' },
]
