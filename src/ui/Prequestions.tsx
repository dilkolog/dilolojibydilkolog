import { useState } from 'react'
import { AiError, prequestions, type PrequestionSet } from '../ai'
import type { TargetLanguage } from '../engine/types'
import { useAi } from './aiContext'

/**
 * Before reading: three questions to read for; their answers open once the text is finished.
 * Reading with questions in mind improves memory of the whole text (Carpenter & Toftness 2017).
 */
export function PrequestionsCard({ text, language, finished }: { text: string; language: TargetLanguage; finished: boolean }) {
  const { apiKey } = useAi()
  const [set, setSet] = useState<PrequestionSet | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!apiKey) return null

  const ask = async () => {
    setBusy(true)
    setError('')
    try {
      setSet(await prequestions(apiKey, language, text))
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Sorular hazırlanamadı.')
    } finally {
      setBusy(false)
    }
  }

  if (!set) {
    return (
      <div className="row">
        <button className="btn btn-sm btn-quiet" onClick={ask} disabled={busy}>
          {busy ? 'Hazırlanıyor…' : '❓ Okumadan önce 3 soru'}
        </button>
        <span className="small muted">Cevaplarını arayarak okumak, metnin tamamını daha iyi akılda tutar.</span>
        {error && <span className="error small">{error}</span>}
      </div>
    )
  }
  return (
    <section className="card stack prequestions">
      <strong>{finished ? 'Cevapları kontrol et' : 'Bu soruların cevaplarını arayarak oku'}</strong>
      <ol>
        {set.questions.map((q) => (
          <li key={q.question}>
            {q.question}
            {finished && <p className="small notice">{q.answer}</p>}
          </li>
        ))}
      </ol>
      {!finished && <p className="small muted">Cevaplar, metni bitirince ("Okumayı bitir") burada açılır.</p>}
    </section>
  )
}
