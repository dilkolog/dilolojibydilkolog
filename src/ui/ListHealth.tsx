import { useMemo, type ReactNode } from 'react'
import { WandIcon } from './icons'
import type { KelimeDB } from '../data/db'
import { displayForm } from '../engine/exercises'
import { keeperOf, listHealth, mergeEntries } from '../engine/listHealth'
import type { Gender, Mistake, UserWordState, VocabularyEntry } from '../engine/types'
import { changeWordsWithUndo, deleteWordsWithUndo } from './undo'

/**
 * List check-up: doubled words to merge, leeches to relearn, missing examples and genders,
 * words left untouched for months. Each group offers its fix in place.
 */
export function ListHealthCard({
  db,
  vocabulary,
  states,
  mistakes,
  onChanged,
  onOpen,
}: {
  db: KelimeDB
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes: Mistake[]
  onChanged: () => void
  onOpen: (id: string) => void
}) {
  const health = useMemo(() => listHealth(vocabulary, states, mistakes, new Date()), [vocabulary, states, mistakes])
  const total = health.duplicates.length + health.leeches.length + health.noExample.length + health.noGender.length + health.stale.length
  if (!total) return null

  const merge = async (group: VocabularyEntry[]) => {
    const keeper = keeperOf(group, states)
    const others = group.filter((g) => g.id !== keeper.id)
    await changeWordsWithUndo(
      group.map((g) => g.id),
      `“${displayForm(keeper)}” birleştirildi`,
      async () => {
        await db.vocabulary.put(mergeEntries(keeper, others))
        await db.deleteWords(others.map((o) => o.id))
      },
      onChanged,
    )
  }

  const relearn = (e: VocabularyEntry) =>
    changeWordsWithUndo(
      [e.id],
      `“${displayForm(e)}” baştan öğrenilecek`,
      async () => {
        await db.wordStates.delete(e.id)
        await db.mistakes.where('entryId').equals(e.id).delete()
      },
      onChanged,
    )

  const setGender = async (e: VocabularyEntry, gender: Gender) => {
    const vowel = /^[aeiouyhéèêàâîôû]/i.test(e.lemma)
    const article = e.language === 'fr' ? (vowel ? "l'" : gender === 'f' ? 'la' : 'le') : gender === 'f' ? 'la' : 'el'
    await db.vocabulary.update(e.id, { gender, article })
    onChanged()
  }

  const word = (e: VocabularyEntry) => (
    <button className="word-link" onClick={() => onOpen(e.id)} lang={e.language}>
      {displayForm(e)}
    </button>
  )

  return (
    <details className="card health">
      <summary>
        <WandIcon size={18} className="inline-icon" />Liste sağlığı <span className="muted small">({total} öneri)</span>
      </summary>
      <div className="stack mt-3">
        {health.duplicates.length > 0 && (
          <Group title="İki kez eklenmiş" help="Aynı kelime ya da bir harf farkıyla aynı anlam. Birleştirince en çok çalışılan kopya kalır; diğerlerinin örnekleri, anlamları ve etiketleri ona eklenir.">
            {health.duplicates.map((g) => (
              <li key={g.map((x) => x.id).join()}>
                {g.map((e, i) => (
                  <span key={e.id}>
                    {i > 0 && ' · '}
                    {word(e)} <span className="small muted">{e.senses[0].gloss}</span>
                  </span>
                ))}
                <button className="btn btn-sm btn-quiet" onClick={() => merge(g)}>
                  Birleştir
                </button>
              </li>
            ))}
          </Group>
        )}
        {health.leeches.length > 0 && (
          <Group title="Bir türlü oturmayanlar" help="Sık yanlış yaptığın kelimeler. Baştan öğrenmek (ilerlemesi sıfırlanır, yeni kelime gibi tanıtılır), bir akılda tutma ipucu yazmak ya da silmek çoğu zaman tekrar etmekten iyidir.">
            {health.leeches.map((e) => (
              <li key={e.id}>
                {word(e)} <span className="small muted">{e.senses[0].gloss}</span>
                <span className="health-actions">
                  <button className="btn btn-sm btn-quiet" onClick={() => relearn(e)}>
                    Baştan öğren
                  </button>
                  <button className="link small" onClick={() => onOpen(e.id)}>
                    İpucu yaz
                  </button>
                </span>
              </li>
            ))}
          </Group>
        )}
        {health.noGender.length > 0 && (
          <Group title="Cinsiyeti eksik isimler" help="Artikel alıştırması için gerekiyor. Doğrusunu seç; artikel kendiliğinden eklenir.">
            {health.noGender.map((e) => (
              <li key={e.id}>
                {word(e)} <span className="small muted">{e.senses[0].gloss}</span>
                <span className="health-actions">
                  <button className="btn btn-sm btn-quiet" onClick={() => setGender(e, 'm')}>
                    {e.language === 'fr' ? 'le (eril)' : 'el (eril)'}
                  </button>
                  <button className="btn btn-sm btn-quiet" onClick={() => setGender(e, 'f')}>
                    la (dişil)
                  </button>
                </span>
              </li>
            ))}
          </Group>
        )}
        {health.noExample.length > 0 && (
          <Group title="Örnek cümlesi olmayanlar" help="Bağlamlı alıştırmalar (boşluk doldurma, dikte) için cümle gerekiyor. Gerçek cümle bulunamadı; kelimeyi açıp kendi cümleni ekle.">
            {health.noExample.slice(0, 30).map((e) => (
              <li key={e.id}>
                {word(e)} <span className="small muted">{e.senses[0].gloss}</span>
              </li>
            ))}
          </Group>
        )}
        {health.stale.length > 0 && (
          <Group title="İki aydır başlanmamışlar" help="Eklenmiş ama hiç tanıtılmamış. Hâlâ istiyorsan dur; listen kalabalık geliyorsa toptan silebilirsin.">
            <li>
              <span className="small">{health.stale.map((e) => displayForm(e)).join(', ')}</span>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => deleteWordsWithUndo(health.stale.map((e) => e.id), `${health.stale.length} kelime silindi`, onChanged)}
              >
                Hepsini sil
              </button>
            </li>
          </Group>
        )}
      </div>
    </details>
  )
}

function Group({ title, help, children }: { title: string; help: string; children: ReactNode }) {
  return (
    <section className="stack health-group">
      <h3 className="subhead">{title}</h3>
      <p className="small muted">{help}</p>
      <ul className="health-list">{children}</ul>
    </section>
  )
}
