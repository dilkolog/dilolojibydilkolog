import { useEffect, useState } from 'react'
import { dailyMonologueSeed } from '../data/monologueSeeds'
import type { TargetLanguage } from '../engine/types'
import { CheckIcon, SparkleIcon } from './icons'
import { haptics } from './haptics'
import { sfx } from './sounds'

interface Props {
  language: TargetLanguage
}

const STORAGE_PREFIX = 'diloloji:monologue'

const todayKey = (language: TargetLanguage) => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${STORAGE_PREFIX}:${language}:${yyyy}-${mm}-${dd}`
}

export function MonologueCard({ language }: Props) {
  const seed = dailyMonologueSeed(language)
  const key = todayKey(language)
  const [done, setDone] = useState(false)
  const [showTip, setShowTip] = useState(false)

  useEffect(() => {
    try {
      setDone(localStorage.getItem(key) === '1')
    } catch {
      setDone(false)
    }
  }, [key])

  const complete = () => {
    try {
      localStorage.setItem(key, '1')
    } catch {
      // Ignore
    }
    setDone(true)
    haptics.victory()
    sfx.correct()
  }

  return (
    <section className={`card monologue-card stack${done ? ' is-done' : ''}`} aria-label="Günün Zihin Tohumu">
      <div className="row between">
        <span className="small muted monologue-kicker">
          💭 GÜNÜN ZİHİN TOHUMU
        </span>
        {done ? (
          <span className="status-pill is-on small" role="status">
            <CheckIcon size={14} /> Canlandırıldı
          </span>
        ) : (
          <span className="badge-tag small">Zihinsel Pratik</span>
        )}
      </div>

      <p className="monologue-prompt" lang={language}>
        « {seed.prompt} »
      </p>

      <div className="monologue-footer row between">
        <button
          type="button"
          className="link small"
          onClick={() => setShowTip((v) => !v)}
        >
          {showTip ? 'Türkçesini gizle' : 'Türkçesini gör'}
        </button>

        {!done ? (
          <button
            type="button"
            className="btn btn-sm btn-quiet monologue-action-btn"
            onClick={complete}
          >
            <SparkleIcon size={15} /> Zihnimde canlandırdım ✓
          </button>
        ) : (
          <span className="small muted">
            Harika! Hedef dil zihninde yaşadıkça doğal reflekse dönüşür.
          </span>
        )}
      </div>

      {showTip && (
        <div className="monologue-tip note small">
          💡 {seed.translation}
        </div>
      )}
    </section>
  )
}
