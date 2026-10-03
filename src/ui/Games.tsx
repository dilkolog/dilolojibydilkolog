import { useEffect, useState } from 'react'
import { BOSS_XP } from '../engine/bosses'
import { FLUENCY_MIN_WORDS, pickFluencyWords } from '../engine/practice'
import { createRng } from '../engine/rng'
import { db } from '../data/instance'
import { SentencesGame } from './Sentences'
import { NativeDictation } from './NativeDictation'
import { ArticleDrill } from './ArticleDrill'
import { dueSentences } from '../engine/sentences'
import { useOnline } from './useOnline'
import { canSpeak } from './speech'
import { type Props, FLUENCY_ROUND, fmt } from './games/shared'
import { MatchGame } from './games/MatchGame'
import { BlitzGame } from './games/BlitzGame'
import { FluencyGame } from './games/FluencyGame'
import { PairsGame } from './games/PairsGame'
import { GenderGame } from './games/GenderGame'
import { SwipeCards } from './games/SwipeCards'
import { AudioReview } from './games/AudioReview'
import { BossArena } from './games/BossArena'

type Game = 'match' | 'blitz' | 'fluency' | 'pairs' | 'gender' | 'audio' | 'boss' | 'swipe' | 'sentences' | 'dictation' | 'article' | null

export function GamesScreen(p: Props & { initialGame?: Game }) {
  const [game, setGame] = useState<Game>(p.initialGame ?? null)
  const [dueSentenceCount, setDueSentenceCount] = useState(0)
  useEffect(() => {
    void db.getSentences().then((all) => setDueSentenceCount(dueSentences(all, p.language, new Date()).length))
  }, [p.language, game])
  const [records, setRecords] = useState<Record<string, number>>({})
  useEffect(() => {
    db.getRecords().then(setRecords)
  }, [game])

  const enough = p.vocabulary.length >= 4
  const matchKey = `match:${p.language}`
  const blitzKey = `blitz:${p.language}`
  const fluencyKey = `fluency:${p.language}`
  const fluencyWords = pickFluencyWords(p.vocabulary, p.states, createRng(1)).length
  const online = useOnline()

  if (game === 'match') return <MatchGame {...p} best={records[matchKey]} recordKey={matchKey} onExit={() => setGame(null)} />
  if (game === 'gender' && p.language !== 'en')
    return <GenderGame {...p} language={p.language} best={records[`gender:${p.language}`]} recordKey={`gender:${p.language}`} onExit={() => setGame(null)} />
  if (game === 'boss') return <BossArena {...p} onExit={() => setGame(null)} />
  if (game === 'audio') return <AudioReview {...p} onExit={() => setGame(null)} />
  if (game === 'swipe') return <SwipeCards {...p} onExit={() => setGame(null)} />
  if (game === 'sentences') return <SentencesGame language={p.language} onExit={() => setGame(null)} />
  if (game === 'article' && p.language !== 'en') return <ArticleDrill language={p.language} vocabulary={p.vocabulary} states={p.states} onExit={() => setGame(null)} onChanged={p.onChanged} />
  if (game === 'dictation') return <NativeDictation language={p.language} vocabulary={p.vocabulary} states={p.states} onExit={() => setGame(null)} />
  if (game === 'pairs') return <PairsGame {...p} best={records[`pairs:${p.language}`]} recordKey={`pairs:${p.language}`} onExit={() => setGame(null)} />
  if (game === 'fluency')
    return <FluencyGame {...p} best={records[fluencyKey]} last={records[`${fluencyKey}:last`]} recordKey={fluencyKey} onExit={() => setGame(null)} />
  if (game === 'blitz') return <BlitzGame {...p} best={records[blitzKey]} recordKey={blitzKey} onExit={() => setGame(null)} />

  const learnFirst = 'Önce birkaç kelime öğren'
  const record = (key: string, show: (v: number) => string) => (records[key] ? `Rekorun: ${show(records[key])}` : 'Henüz rekor yok')
  const groups: { title: string; cards: GameCard[] }[] = [
    {
      title: 'Tekrar',
      cards: [
        { id: 'swipe', emoji: '👆', name: 'Kaydırmalı kartlar', text: 'Anlamı düşün, dokunup bak; bildiysen sağa, bilmediysen sola.', status: p.states.length ? 'Zayıf kelimelerden başlar' : learnFirst, disabled: p.states.length === 0 },
        { id: 'sentences', emoji: '💬', name: 'Cümle kartları', text: 'Okurken kaydettiğin cümleler: boşluk, dikte ve çeviri.', status: dueSentenceCount ? `${dueSentenceCount} cümle tekrar bekliyor` : 'Okumada bir kelimeye dokun → Cümleyi kaydet', scheduled: true, due: dueSentenceCount > 0 },
        { id: 'boss', emoji: '⚔️', name: 'Boss savaşları', text: 'Bir türlü oturmayan kelimeleri farklı sorularla yen.', status: `Her zafer +${BOSS_XP} XP`, className: 'game-card-boss' },
        { id: 'audio', emoji: '🎧', name: 'Sesli tekrar', text: 'Ekrana bakmadan dinle: kelime, düşünme payı, anlamı.', status: !canSpeak() ? 'Bu tarayıcıda sesli okuma yok' : p.states.length ? 'Yürürken, yemek yaparken' : learnFirst, disabled: !canSpeak() || p.states.length === 0 },
      ],
    },
    {
      title: 'Dinleme ve telaffuz',
      cards: [
        { id: 'dictation', emoji: '🎙️', name: 'Gerçek seslerle dikte', text: 'Farklı insanların sesinden gerçek cümleleri dinle ve yaz.', status: online ? 'Her cümle başka bir ses' : 'İnternet gerekir', disabled: !online },
        { id: 'pairs', emoji: '👂', name: 'Ses ayırt etme', text: 'Tek sesi farklı iki kelimeden hangisini duydun?', status: canSpeak() ? record(`pairs:${p.language}`, (v) => `%${v}`) : 'Bu tarayıcıda sesli okuma yok', disabled: !canSpeak() },
      ],
    },
    {
      title: 'Hız ve akıcılık',
      cards: [
        { id: 'match', emoji: '🧩', name: 'Eşleştirme', text: '6 kelimeyi anlamlarıyla en kısa sürede eşleştir.', status: enough ? record(matchKey, fmt) : 'En az 4 kelime gerekiyor', disabled: !enough },
        { id: 'blitz', emoji: '⚡', name: 'Zamana karşı', text: '60 saniyede bütün kelimelerinden olabildiğince çok doğru.', status: enough ? record(blitzKey, (v) => `${v} puan`) : 'En az 4 kelime gerekiyor', disabled: !enough },
        {
          id: 'fluency',
          emoji: '🏎️',
          name: 'Akıcılık turu',
          text: `Sadece iyi bildiklerinle ${FLUENCY_ROUND} soru: düşünmeden hatırla.`,
          status: fluencyWords < FLUENCY_MIN_WORDS ? `İyi bildiğin ${FLUENCY_MIN_WORDS} kelime gerekiyor (şu an ${fluencyWords})` : record(fluencyKey, (v) => `soru başına ${fmt(v)}`),
          disabled: fluencyWords < FLUENCY_MIN_WORDS,
        },
      ],
    },
  ]
  if (p.language !== 'en')
    groups.push({
      title: 'Dilbilgisi',
      cards: [
        { id: 'article', emoji: '🏷️', name: 'Artikel antrenmanı', text: `Kendi isimlerinle ${p.language === 'fr' ? 'le/la' : 'el/la'}, en çok karıştırdıkların önce.`, status: 'Hızlı, sırayla', scheduled: true },
        { id: 'gender', emoji: '⚖️', name: 'Cinsiyet kuralları', text: 'Kelimenin sonu artikelini söyler (-tion → la, -age → le).', status: record(`gender:${p.language}`, (v) => `%${v}`) },
      ],
    })

  return (
    <div className="stack">
      <h1 className="greeting">Oyunlar</h1>
      <p className="greeting-sub">
        Oyunlar pratik sayılır: XP kazandırır, tekrar takvimini değiştirmez. <span className="game-tag">takvime işler</span> etiketli olanlar takvimli
        tekrar yerine geçer.
      </p>
      {groups.map((g) => (
        <section className="stack game-group" key={g.title}>
          <h2 className="section-title">{g.title}</h2>
          <div className="game-cards">
            {g.cards.map((c) => (
              <button key={c.id} className={`game-card${c.className ? ` ${c.className}` : ''}${c.due ? ' is-due' : ''}`} disabled={c.disabled} onClick={() => setGame(c.id)}>
                <span className="game-emoji" aria-hidden>
                  {c.emoji}
                </span>
                <strong>{c.name}</strong>
                <span className="small muted">{c.text}</span>
                <span className="game-record">
                  {c.status}
                  {c.scheduled && <span className="game-tag">takvime işler</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

interface GameCard {
  id: Exclude<Game, null>
  emoji: string
  name: string
  /** What you do, in one line. */
  text: string
  /** Record, what's waiting, or why it can't start yet. */
  status: string
  disabled?: boolean
  /** Counts as a scheduled review rather than practice. */
  scheduled?: boolean
  /** Something is waiting here. */
  due?: boolean
  className?: string
}
