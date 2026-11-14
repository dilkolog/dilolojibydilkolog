"""Validate all editorial batches; linguistic and CEFR review remain separate."""
import argparse
import json
import unicodedata
from collections import Counter
from datetime import date
from pathlib import Path
import re
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
    retired = json.loads((root / 'RETIRED.json').read_text())
    retired_ids = {row['id'] for row in retired}
    require(len(retired_ids) == len(retired), 'Duplicate retired ID')
    resolutions = json.loads((root / 'DENETIM-DUZELTMELERI.json').read_text())
    decisions = {row['id']: row for row in resolutions['resolutions']}
    require(len(decisions) == 63, 'Every one of the 33 problems and 30 suspects needs a decision')
    require(Counter(row['category'] for row in decisions.values()) == {'problem': 33, 'suspect': 30}, 'Review coverage differs')
    require({rid for rid, row in decisions.items() if row['decision'] == 'removed'} == retired_ids, 'Retirements differ from review decisions')
    for row in decisions.values():
        if row['category'] == 'suspect':
            require(bool(row['additionalSources']), f"{row['id']}: missing second-source verification")
    batches, sources, counts = [], Counter(), Counter()
    for file in files:
        data = json.loads(file.read_text())
        rows = data['items']
        label = data['batch']
        require(data['language'] == 'fr', label)
        require(data['status'] == 'revised_for_recheck', label)
        require(bool(rows), f'{label}: empty batch')
        answers = Counter()
        for row in rows:
            rid = row['id']
            require(rid not in retired_ids, f'Retired ID is still active: {rid}')
            require(rid not in ids, f'Duplicate ID: {rid}')
            ids.add(rid)
            expression = normalized(row['expression'])
            require(expression not in expressions, f'Duplicate expression: {expression}')
            expressions.add(expression)
            require(row['level'] is None, f'{rid}: CEFR review is pending')
            review = row['independentReview']
            require(review['reviewer'] == 'Antigravity', f'{rid}: wrong independent reviewer')
            require(review['status'] == ('pending_recheck' if rid in decisions else 'reported_clean'), f'{rid}: wrong review state')
            require(review.get('report') == f"content/review/idioms/fr-{label[-4:]}.md", f'{rid}: missing original report')
            require(row['meaningTr'].strip() and row['usageNoteTr'].strip(), rid)
            require(len(row['examples']) == 2, f'{rid}: expected two examples')
            for example in row['examples']:
                require(example['fr'].strip() and example['tr'].strip(), rid)
                words = re.findall(r"[^\W_]+(?:['’][^\W_]+)*", example['fr'])
                require(len(words) <= 16, f'{rid}: example exceeds 16 words ({len(words)})')
                sentence = normalized(example['fr'])
                require(sentence not in examples, f'Duplicate French example: {sentence}')
                examples.add(sentence)
            require(bool(row['sources']), f'{rid}: missing source')
            for source in row['sources']:
                url = urlparse(source['url'])
                require(url.scheme == 'https' and bool(url.netloc), f'{rid}: invalid source URL')
                method = source['verification']
                require(method in {'dictionary_entry_opened', 'dictionary_search_excerpt', 'usage_page_opened', 'usage_search_excerpt'}, f'{rid}: unknown verification method')
                if method.endswith('_excerpt'):
                    require(bool(source.get('verificationNoteTr')), f'{rid}: excerpt limitation must be documented')
                date.fromisoformat(source['checkedOn'])
                require(bool(source['locator'].strip()), f'{rid}: missing source metadata')
                sources[method] += 1
            if rid in decisions:
                domains = {urlparse(source['url']).netloc.removeprefix('www.') for source in row['sources']}
                require(len(domains) >= 2, f'{rid}: two independent source hosts required')
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
        counts.update(answers)
        batches.append({'batch': label, 'items': len(rows), 'examples': len(rows) * 2, 'exercises': len(rows),
                        'answerPositions': dict(sorted(answers.items()))})
    require(not ids & retired_ids, 'A retired ID is still active')
    require(ids | retired_ids == {f'fr-idiom-{i:06}' for i in range(1, 261)}, 'Original IDs must remain active or explicitly retired')
    require(set(decisions) <= ids | retired_ids, 'A review decision has no original ID')
    require(len(ids) == resolutions['summary']['remaining'], 'Review total differs from active data')
    return {'batches': batches, 'totals': {'packages': len(files), 'items': len(ids), 'examples': len(examples),
            'exercises': len(questions)}, 'sourceMethods': dict(sources),
            'answerPositions': dict(sorted(counts.items())), 'structuralCheck': 'passed',
            'independentLanguageReview': 'revisions_pending_recheck', 'cefrAllocation': 'pending',
            'retired': len(retired_ids), 'reviewDecisions': len(decisions),
            'noteTr': 'Yapı denetimi dil doğruluğunu veya anlamdaş çeldiricilerin elenmesini onaylamaz.'}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=ROOT)
    args = parser.parse_args()
    print(json.dumps(validate(args.root), ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
