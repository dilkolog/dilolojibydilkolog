"""Validate the editorial handoff; this does not certify linguistic quality."""
import json
import unicodedata
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent

def normalized(value):
    return ' '.join(unicodedata.normalize('NFC', value).casefold().replace('’', "'").split())

def main():
    data = json.loads((ROOT / 'fr-idioms-0001.json').read_text())
    rows = data['items']
    assert data['language'] == 'fr'
    assert data['status'] == 'ready_for_independent_review'
    assert len(rows) == 26
    ids, expressions, examples = set(), set(), set()
    answers = Counter()
    for row in rows:
        assert row['id'] not in ids, row['id']
        ids.add(row['id'])
        expression = normalized(row['expression'])
        assert expression not in expressions, expression
        expressions.add(expression)
        assert row['level'] is None, 'CEFR allocation still requires the task plan'
        assert row['independentReview'] == {'status': 'pending', 'reviewer': None}
        assert row['meaningTr'].strip() and row['usageNoteTr'].strip()
        assert len(row['examples']) == 2
        for example in row['examples']:
            assert example['fr'].strip() and example['tr'].strip()
            sentence = normalized(example['fr'])
            assert sentence not in examples, sentence
            examples.add(sentence)
        assert row['sources']
        for source in row['sources']:
            url = urlparse(source['url'])
            assert url.scheme == 'https' and url.netloc
            assert source['verification'] == 'dictionary_entry_opened'
            assert source['checkedOn'] == '2026-11-10'
            assert source['locator'].strip()
        exercise = row['exercise']
        assert exercise['type'] == 'meaning_in_context'
        assert exercise['context'] == row['examples'][1]['fr']
        options = exercise['optionsTr']
        assert len(options) == len(set(map(normalized, options))) == 4
        answer = exercise['answerIndex']
        assert isinstance(answer, int) and not isinstance(answer, bool) and 0 <= answer < 4
        assert options[answer] == row['meaningTr']
        assert exercise['promptTr'].strip() and exercise['explanationTr'].strip()
        answers[answer] += 1
    assert max(answers.values()) - min(answers.values()) <= 1
    print(json.dumps({'items': len(rows), 'examples': len(examples), 'exercises': len(rows),
                      'answerPositions': dict(sorted(answers.items())), 'structuralCheck': 'passed',
                      'independentLanguageReview': 'pending', 'cefrAllocation': 'pending'},
                     ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
