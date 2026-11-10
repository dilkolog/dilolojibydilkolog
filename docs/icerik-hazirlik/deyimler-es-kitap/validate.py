"""Validate the PDF-derived term handoff without certifying language quality."""
import csv
import json
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def norm(value):
    return ' '.join(unicodedata.normalize('NFC', value).casefold().replace('’', "'").split())

def require(condition, message):
    if not condition:
        raise ValueError(message)

def main():
    data = json.loads((ROOT/'es-kitap-ifadeler.json').read_text())
    inventory = json.loads((ROOT/'PDF-TERIM-DIZINI.json').read_text())
    rows = data['items']
    require(len(rows) == 151, '151 included expressions required')
    require(data['language'] == 'es', 'Wrong language')
    ids, terms, sentences = set(), set(), set()
    units = Counter()
    for row in rows:
        rid = row['id']
        require(rid not in ids, f'Duplicate ID: {rid}')
        ids.add(rid)
        term = norm(row['expression'])
        require(term not in terms and len(term.split()) >= 2, f'Duplicate or single-word term: {rid}')
        terms.add(term)
        require(row['meaningTr'].strip(), f'Missing meaning: {rid}')
        require(row['meaningOrigin'] == row['examplesOrigin'] == 'original', rid)
        require(row['level'] is None and row['reviewStatus'] == 'pending', f'Review state: {rid}')
        require(len(row['examples']) == 2, f'Two examples required: {rid}')
        for ex in row['examples']:
            require(ex['es'].strip() and ex['tr'].strip(), f'Empty example/translation: {rid}')
            require(len(ex['es'].split()) <= 16, f'Example longer than 16 words: {rid}')
            sentence = norm(ex['es'])
            require(sentence not in sentences, f'Duplicate example: {rid}')
            sentences.add(sentence)
        source = row['source']
        require(type(source['unit']) is int and 1 <= source['unit'] <= 10, rid)
        require(1 <= source['pdfPage'] <= 55 and 6 <= source['printedPage'] <= 103, rid)
        require(source['side'] in {'native', 'left', 'right'}, rid)
        require(source['section'] in {'target_list', 'opening_dialogue'}, rid)
        require(source['sourceGroup'] > 0, rid)
        units[source['unit']] += 1
    require(ids == {f'es-libro-{i:04}' for i in range(1, 152)}, 'Unexpected ID range')
    require(len(inventory['terms']) == inventory['candidates'] == 155, 'Inventory mismatch')
    included = [r for r in inventory['terms'] if r['status'] == 'included']
    excluded = [r for r in inventory['terms'] if r['status'] == 'excluded_single_word']
    require(len(included) == 151 and len(excluded) == 4, 'Extraction count mismatch')
    require({r['id'] for r in included} == ids, 'Extraction and authored data do not match')
    with (ROOT/'es-kitap-ifadeler.csv').open(newline='') as file:
        csvrows = list(csv.DictReader(file))
    require(len(csvrows) == 151, 'CSV count mismatch')
    byid = {r['id']: r for r in rows}
    for row in csvrows:
        source = byid[row['id']]
        require(row['expression'] == source['expression'] and row['meaning_tr'] == source['meaningTr'], 'CSV content mismatch')
        for i, ex in enumerate(source['examples'], 1):
            require(row[f'example_{i}_es'] == ex['es'] and row[f'example_{i}_tr'] == ex['tr'], 'CSV example mismatch')
    output = dict(expressions=151, examples=302, units=dict(sorted(units.items())),
                  extractedCandidates=155, excludedSingleWords=4, structuralCheck='passed',
                  independentLanguageReview='pending', publicationStatus='not_integrated',
                  noteTr='Bu denetim anlamların dilsel doğruluğunu veya iki bağımsız kaynak koşulunu onaylamaz.')
    print(json.dumps(output, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
