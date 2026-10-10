import { NEW_LIST, type ImportList } from './useImportList'
import { placementOptions } from './listOptions'
import { Select } from './Select'

/** "Which list?" for an import: no list, an existing one (or one of its levels), or a new one. */
export function ImportPlacement({ list, suggested, id }: { list: ImportList; suggested?: string; id: string }) {
  const options = [...placementOptions(list.lists).filter((o) => o.value !== '__none'), { value: NEW_LIST, label: '+ Yeni liste' }, { value: '__none', label: 'Listesiz' }]
  return (
    <div className="field import-list">
      <label htmlFor={id}>Hangi listeye eklensin?</label>
      <Select id={id} label="Liste" value={list.value} onChange={list.setValue} options={options} />
      {list.value === NEW_LIST && (
        <input className="input" aria-label="Yeni listenin adı" placeholder={suggested ? `Örn. ${suggested}` : 'Listenin adı'} value={list.name} onChange={(e) => list.setName(e.target.value)} />
      )}
    </div>
  )
}
