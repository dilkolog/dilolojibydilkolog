import { useState } from 'react'
import type { TargetLanguage } from '../engine/types'
import { useAi } from './aiContext'
import { GrammarCheck } from './GrammarCheck'
import { MonkiFace } from './monki/MonkiMascot'
import { askMonki } from './monki/monkiBus'
import { saveSentence } from './saveSentence'

/**
 * "Kendi cümleni yaz": the lesson's rule used in a sentence of the learner's own. LanguageTool checks it (no key
 * needed) and, with a YZ key, Monki tells whether the rule was used well and corrects it (the correction can then
 * be kept as a card from the chat). A sentence that is right can be kept as a card here.
 */
export function LessonWrite({ title, language }: { title: string; language: TargetLanguage }) {
  const { apiKey } = useAi()
  const [text, setText] = useState('')
  const [kept, setKept] = useState<'new' | 'had' | null>(null)
  const sentence = text.replace(/\s+/g, ' ').trim()
  const keep = async () => setKept((await saveSentence({ language, text: sentence, source: `Rehber: ${title}` })) ? 'new' : 'had')
  return (
    <details className="card stack gap-2 guide-write">
      <summary>
        <strong>Kendi cümleni yaz</strong> <span className="muted small">· kuralı kendi cümlende dene</span>
      </summary>
      <div className="stack gap-2">
        <textarea
          className="input"
          rows={2}
          value={text}
          lang={language}
          onChange={(e) => {
            setText(e.target.value)
            setKept(null)
          }}
          placeholder="Bu konuyu kullanan bir cümle yaz"
          aria-label="Kendi cümlen"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <GrammarCheck text={text} language={language} onChange={setText} />
        <div className="row gap-2">
          {apiKey && (
            <button
              type="button"
              className="btn btn-sm btn-quiet"
              disabled={sentence.split(' ').length < 2}
              onClick={() => askMonki({ text: `“${title}” konusunu çalışıyorum. Bu cümleyi yazdım: “${sentence}” Konuyu doğru kullandım mı? Hata varsa düzelt ve nedenini söyle.`, send: true })}
            >
              <MonkiFace face="happy" size={20} /> Monki’ye sor
            </button>
          )}
          <button type="button" className="btn btn-sm btn-quiet" disabled={sentence.split(' ').length < 2 || kept !== null} onClick={() => void keep()}>
            {kept === 'new' ? 'Kart yapıldı ✓' : kept === 'had' ? 'Bu kart zaten var' : 'Cümle kartı yap'}
          </button>
        </div>
      </div>
    </details>
  )
}
