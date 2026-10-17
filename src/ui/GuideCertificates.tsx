import { useState } from 'react'
import { certificateCard, type LevelCert } from '../engine/guideCertificate'
import type { GuideLevel } from '../data/guide/lessonTypes'
import { renderShareCard, shareCard } from './shareCard'

const fmtDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * The guide's certificates: one line per level with its progress, and for a finished level the date and a
 * card to share (or save as a picture, where the browser cannot share files).
 */
export function GuideCertificates({
  language,
  languageName,
  certs,
  names,
  titlesOf,
}: {
  language: string
  languageName: string
  certs: LevelCert[]
  names: Record<GuideLevel, string>
  /** The titles of the lessons of a level. */
  titlesOf: (level: GuideLevel) => string[]
}) {
  const [busy, setBusy] = useState<GuideLevel | null>(null)
  const [failed, setFailed] = useState(false)
  if (!certs.some((c) => c.learned > 0)) return null

  const cardOf = (c: LevelCert) => certificateCard(languageName, c, titlesOf(c.level))
  const share = async (c: LevelCert) => {
    setBusy(c.level)
    const card = cardOf(c)
    await shareCard(card, `${card.title} Rehber sertifikası: ${card.text}`)
    setBusy(null)
  }
  const save = async (c: LevelCert) => {
    setBusy(c.level)
    setFailed(false)
    try {
      const blob = await renderShareCard(cardOf(c))
      if (!blob) throw new Error('no card')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `diloloji-${language}-${c.level.toLowerCase()}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setFailed(true)
    }
    setBusy(null)
  }

  return (
    <section className="card stack gap-2 guide-certs" aria-label="Sertifikalar">
      <h2 className="section-title">Sertifikalar</h2>
      <ul className="guide-cert-list">
        {certs.map((c) => (
          <li key={c.level} className={`guide-cert${c.done ? ' cert-done' : ''}`}>
            <span className="guide-level-badge">{c.level}</span>
            <span className="guide-cert-text">
              <strong>{names[c.level]}</strong>
              <span className="small muted">
                {c.done ? `Tamamlandı · ${fmtDay(c.date!)}` : `${c.learned} / ${c.total} ders öğrenildi`}
              </span>
              {!c.done && (
                <span className="guide-bar" aria-hidden="true">
                  <span style={{ width: `${(c.learned / c.total) * 100}%` }} />
                </span>
              )}
            </span>
            {c.done && (
              <span className="guide-cert-actions">
                {'share' in navigator && (
                  <button type="button" className="btn btn-quiet" disabled={busy === c.level} onClick={() => share(c)}>
                    Paylaş
                  </button>
                )}
                <button type="button" className="btn btn-quiet" disabled={busy === c.level} onClick={() => save(c)}>
                  Resmi indir
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {failed && <p className="small muted">Kart çizilemedi, biraz sonra yine dene.</p>}
    </section>
  )
}
