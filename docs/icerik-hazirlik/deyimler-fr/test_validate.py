"""Guard the editorial handoff against losing records or hiding review gaps."""
import copy
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from validate import ROOT, validate


class ReviewValidationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for source in [*ROOT.rglob('fr-idioms-*.json'), ROOT / 'RETIRED.json', ROOT / 'DENETIM-DUZELTMELERI.json']:
            target = self.root / source.relative_to(ROOT)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)

    def change(self, path, edit):
        data = json.loads(path.read_text())
        edit(data)
        path.write_text(json.dumps(data, ensure_ascii=False))

    def test_revised_delivery_accounts_for_every_original_id(self):
        report = validate(self.root)
        self.assertEqual(report['totals'], {'packages': 10, 'items': 237, 'examples': 474, 'exercises': 237})
        self.assertEqual(report['retired'], 23)
        self.assertEqual(report['reviewDecisions'], 63)

    def test_silent_deletion_is_rejected(self):
        path = self.root / 'paquet-06/fr-idioms-0006.json'
        self.change(path, lambda data: data['items'].pop())
        with self.assertRaisesRegex(ValueError, 'Original IDs'):
            validate(self.root)

    def test_retired_id_cannot_be_reused(self):
        path = self.root / 'fr-idioms-0001.json'
        def reuse(data):
            row = copy.deepcopy(data['items'][0])
            row['id'] = 'fr-idiom-000001'
            data['items'].insert(0, row)
        self.change(path, reuse)
        with self.assertRaisesRegex(ValueError, 'Retired ID'):
            validate(self.root)

    def test_long_example_is_rejected(self):
        path = self.root / 'fr-idioms-0001.json'
        def lengthen(data):
            data['items'][0]['examples'][0]['fr'] += ' encore et encore et encore et encore et encore'
        self.change(path, lengthen)
        with self.assertRaisesRegex(ValueError, 'exceeds 16 words'):
            validate(self.root)

    def test_second_host_is_required_for_revised_items(self):
        path = self.root / 'fr-idioms-0001.json'
        def remove_source(data):
            row = next(row for row in data['items'] if row['id'] == 'fr-idiom-000010')
            row['sources'] = row['sources'][:1]
        self.change(path, remove_source)
        with self.assertRaisesRegex(ValueError, 'two independent source hosts'):
            validate(self.root)

    def test_removed_suspect_still_needs_second_source_evidence(self):
        path = self.root / 'DENETIM-DUZELTMELERI.json'
        def erase_evidence(data):
            row = next(row for row in data['resolutions'] if row['id'] == 'fr-idiom-000203')
            row['additionalSources'] = []
        self.change(path, erase_evidence)
        with self.assertRaisesRegex(ValueError, 'missing second-source verification'):
            validate(self.root)

    def test_question_cannot_keep_the_old_context(self):
        path = self.root / 'fr-idioms-0001.json'
        def stale_context(data):
            data['items'][0]['exercise']['context'] = 'Un ancien contexte.'
        self.change(path, stale_context)
        with self.assertRaisesRegex(ValueError, 'context must match example 2'):
            validate(self.root)


if __name__ == '__main__':
    unittest.main()
