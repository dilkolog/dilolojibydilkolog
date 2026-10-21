import { WandIcon } from './icons'

/** "DeepL ile çevir" (when the server can translate) and "YZ ile anlamını bul" (with an AI key): the dictionary's two ways to a meaning. */
export function MeaningLookupButtons({ deeplOn, aiOn, busy, onDeepl, onAi }: { deeplOn: boolean; aiOn: boolean; busy: boolean; onDeepl: () => void; onAi: () => void }) {
  return (
    <>
      {deeplOn && (
        <button type="button" className="btn btn-sm btn-quiet" onClick={onDeepl} disabled={busy}>
          <WandIcon size={15} /> {busy ? 'Soruluyor…' : 'DeepL ile çevir'}
        </button>
      )}
      {aiOn && (
        <button type="button" className="btn btn-sm btn-quiet" onClick={onAi} disabled={busy}>
          <WandIcon size={15} /> {busy ? 'Soruluyor…' : 'YZ ile anlamını bul'}
        </button>
      )}
    </>
  )
}
