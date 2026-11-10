"""Validate all editorial batches; linguistic and CEFR review remain separate."""
import argparse
import json
import unicodedata
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent

def normalized(value):
    return ' '.join(unicodedata.normalize('NFC', value).casefold().replace('’', "'").split())

def require(condition, message):
    if not condition:
        raise ValueError(message)

def validate(root=ROOT):
    files = sorted(root.rglob('fr-idioms-*.json'))
    require(len(files) == 10, 'Expected exactly 10 source batches')
    ids, expressions, examples, questions = set(), set(), set(), set()
    batches, sources, counts = [], Counter(), Counter()
    for file in files:
        data = json.loads(file.read_text())
        rows = data['items']
        label = data['batch']
        require(data['language'] == 'fr', label)
        require(data['status'] == 'ready_for_independent_review', label)
        require(len(rows) == 26, f'{label}: expected 26 items')
        answers = Counter()
        for row in rows:
            rid = row['id']
            require(rid not in ids, f'Duplicate ID: {rid}')
            ids.add(rid)
            expression = normalized(row['expression'])
            require(expression not in expressions, f'Duplicate expression: {expression}')
            expressions.add(expression)
            require(row['level'] is None, f'{rid}: CEFR review is pending')
            require(row['independentReview'] == {'status': 'pending', 'reviewer': None}, f'{rid}: first-delivery review state')
            require(row['meaningTr'].strip() and row['usageNoteTr'].strip(), rid)
            require(len(row['examples']) == 2, f'{rid}: expected two examples')
            for example in row['examples']:
                require(example['fr'].strip() and example['tr'].strip(), rid)
                sentence = normalized(example['fr'])
                require(sentence not in examples, f'Duplicate French example: {sentence}')
                examples.add(sentence)
            require(bool(row['sources']), f'{rid}: missing source')
            for source in row['sources']:
                url = urlparse(source['url'])
                require(url.scheme == 'https' and bool(url.netloc), f'{rid}: invalid source URL')
                method = source['verification']
                require(method in {'dictionary_entry_opened', 'dictionary_search_excerpt'}, f'{rid}: unknown verification method')
                if method == 'dictionary_search_excerpt':
                    require(bool(source.get('verificationNoteTr')), f'{rid}: excerpt limitation must be documented')
                require(source['checkedOn'] == '2026-11-10' and bool(source['locator'].strip()), f'{rid}: missing source metadata')
                sources[method] += 1
            exercise = row['exercise']
            require(exercise['type'] == 'meaning_in_context', rid)
            require(exercise['context'] == row['examples'][1]['fr'], f'{rid}: exercise context must match example 2')
            question = normalized(exercise['promptTr'])
            require(question not in questions, f'Duplicate question: {rid}')
            questions.add(question)
            options = exercise['optionsTr']
            require(len(options) == len(set(map(normalized, options))) == 4, f'{rid}: four distinct options required')
            answer = exercise['answerIndex']
            require(type(answer) is int and 0 <= answer < 4, f'{rid}: invalid answer index')
            require(options[answer] == row['meaningTr'], f'{rid}: answer does not match meaning')
            require(bool(exercise['explanationTr'].strip()), f'{rid}: missing explanation')
            answers[answer] += 1
        require(len(answers) == 4 and max(answers.values()) - min(answers.values()) <= 1, f'{label}: answer imbalance')
        counts.update(answers)
        batches.append({'batch': label, 'items': 26, 'examples': 52, 'exercises': 26,
                        'answerPositions': dict(sorted(answers.items()))})
    require(ids == {f'fr-idiom-{i:06}' for i in range(1, 261)}, 'ID range must remain 000001–000260')
    return {'batches': batches, 'totals': {'packages': len(files), 'items': len(ids), 'examples': len(examples),
            'exercises': len(questions)}, 'sourceMethods': dict(sources),
            'answerPositions': dict(sorted(counts.items())), 'structuralCheck': 'passed',
            'independentLanguageReview': 'pending', 'cefrAllocation': 'pending',
            'noteTr': 'Yapı denetimi dil doğruluğunu veya anlamdaş çeldiricilerin elenmesini onaylamaz.'}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=ROOT)
    args = parser.parse_args()
    print(json.dumps(validate(args.root), ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
