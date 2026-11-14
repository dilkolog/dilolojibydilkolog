"""Render the French editorial handoff from its source JSON files."""
import hashlib
import json
import re
import subprocess
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlparse

from validate import normalized, validate

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
DATE = '14 Kasım 2026'


def write(path, lines):
    path.write_text('\n'.join(lines).rstrip() + '\n')


def publisher(url):
    host = urlparse(url).netloc
    if 'larousse' in host:
        return 'Larousse'
    if 'wiktionary' in host:
        return 'Wiktionary' if host.startswith('en.') else 'Wiktionnaire'
    if 'academie' in host:
        return 'Académie française'
    if 'cnrtl' in host:
        return 'CNRTL / TLFi'
    if 'usherbrooke' in host:
        return 'Usito'
    if 'lerobert' in host:
        return 'Le Robert'
    return host


def render_batch(file, number):
    data = json.loads(file.read_text())
    rows, folder = data['items'], file.parent
    theme = data.get('themeTr', 'İlk karma paket')
    count = len(rows)
    cards = [f'# Paket {number:02} — {theme}', '', f'{count} deyim · {count * 2} özgün örnek/çeviri · {count} soru.', '',
             'Üretici: Codex. Antigravity raporu alındı; düzeltmelerin tekrar denetimi bekliyor. CEFR düzeyleri atanmadı.', '',
             'Bu öğretim kartlarında anlam baştan görünür. Cevaba bakmadan çözüm için [SORULAR.md](SORULAR.md) dosyasını kullan.', '']
    quiz = [f'# Paket {number:02} — cevap anahtarsız sorular', '',
            'Önce bu dosyayı çöz; sonra INCELEME.md veya JSON anahtarıyla karşılaştır. İkinci geçerli seçenek varsa ayrıca bildir.', '']
    refs = [f'# Paket {number:02} — kaynak kontrolü', '', f'Kontrol tarihi: {DATE}.', '',
            'Kaynaklar deyimlerin anlamını kontrol etmek için kullanıldı. Tanım, sözlük örnekleri, ses veya görseller bu pakete kopyalanmadı. Türkçe anlam, not ve örnekler özgün yazıldı. Sözlükler CEFR düzeyi onaylamaz.', '',
            '| Kimlik | İfade | Kaynak | Kontrol yöntemi |', '| --- | --- | --- | --- |']
    partial = []
    for row in rows:
        rid, e = row['id'], row['exercise']
        cards += [f"## {rid} — {row['expression']}", '', f"**Anlam:** {row['meaningTr']}", '',
                  f"**Kullanım:** {row['usageNoteTr']}", '']
        for i, example in enumerate(row['examples'], 1):
            cards += [f"{i}. {example['fr']}", f"   Türkçesi: {example['tr']}", '']
        for source in row['sources']:
            label = publisher(source['url'])
            method = {'dictionary_entry_opened': 'Sözlük maddesi açıldı',
                      'dictionary_search_excerpt': 'Sözlük arama özeti okundu; tam sayfa erişimi iddia edilmez',
                      'usage_page_opened': 'Kullanım sayfası açıldı',
                      'usage_search_excerpt': 'Bağımsız kullanım arama özetinde okundu; tam sayfa erişimi iddia edilmez'}[source['verification']]
            refs += [f"| {rid} | {row['expression']} | [{label}]({source['url']}) | {method} |"]
            cards += [f"**Kaynak:** [{label}]({source['url']}) — {source['locator']} ({source['checkedOn']}).", '']
            if source.get('verificationNoteTr'):
                partial.append(f"- {rid}: {source['verificationNoteTr']}")
                cards += [f"**Kaynak sınırı:** {source['verificationNoteTr']}", '']
        cards += ['**Soru:**', '', e['context'], '', e['promptTr'], '']
        quiz += [f'## {rid}', '', e['context'], '', e['promptTr'], '']
        opts = [f'- {chr(65+i)}) {option}' for i, option in enumerate(e['optionsTr'])]
        cards += opts + ['', '<details><summary>Cevap ve açıklama</summary>', '',
                         f"{chr(65+e['answerIndex'])}) {row['meaningTr']}", '', e['explanationTr'], '', '</details>', '',
                         '**Bağımsız inceleme:** ' + ('Antigravity raporunda temiz; ortak şema ve CEFR eksikleri sürüyor.' if row['independentReview']['status'] == 'reported_clean' else 'Antigravity bulgularına göre düzeltildi; tekrar denetim bekliyor.'), '']
        quiz += opts + ['', 'Seçilen cevap: … · İkinci geçerli seçenek: … · Not: …', '']
    if partial:
        refs += ['', '## Erişim sınırı', ''] + partial
    write(folder/'INCELEME.md', cards)
    write(folder/'SORULAR.md', quiz)
    write(folder/'KAYNAKLAR.md', refs)
    if number != 1:
        write(folder/'README.md', [f'# Paket {number:02} — {theme}', '', f'{count} kayıt · {count * 2} özgün örnek/çeviri · {count} soru.', '',
              f'- [Asıl veri]({file.name})', '- [Öğretim kartları ve cevaplar](INCELEME.md)',
              '- [Cevap anahtarsız sorular](SORULAR.md)', '- [Kaynaklar](KAYNAKLAR.md)',
              '- [Yapı kontrolü](DOGRULAMA.json)', '- [Ana dizin](../README.md)',
              '- [Claude ve denetleyici devir notları](../CLAUDE-DEVIR.md)', '',
              'Antigravity raporu alındı; düzeltmelerin yeniden denetimi ve CEFR dağılımı bekliyor. Uygulamaya bağlanmadı. Kalan kimlikler korundu; çıkarılanlar ana dizindeki RETIRED.json içinde.', '',
              'Kontrol ve yeniden üretim: ana klasördeki `validate.py` ve `render.py` bütün 10 paketi birlikte işler.'])
    return data


def scan_existing(batches):
    names = subprocess.check_output(['git', 'ls-files', 'src/data', 'content/raw'], cwd=REPO, text=True).splitlines()
    needles = {}
    for data in batches:
        for row in data['items']:
            needles[normalized(row['expression'])] = row['id']
    pattern = re.compile('|'.join(re.escape(x) for x in sorted(needles, key=len, reverse=True)))
    hits, example_hits = [], []
    all_examples = {normalized(ex['fr']): row['id'] for d in batches for row in d['items'] for ex in row['examples']}
    example_pattern = re.compile('|'.join(re.escape(x) for x in sorted(all_examples, key=len, reverse=True)))
    for name in names:
        if not name.endswith(('.json', '.jsonl', '.ts')) or not ('/fr' in name or name.startswith('content/raw/fr/')):
            continue
        for lineno, line in enumerate((REPO/name).read_text().splitlines(), 1):
            text = normalized(line)
            matched = sorted({needles[m.group()] for m in pattern.finditer(text)})
            if matched:
                hits.append({'path': name, 'line': lineno, 'ids': matched})
            repeated = sorted({all_examples[m.group()] for m in example_pattern.finditer(text)})
            if repeated:
                example_hits.append({'path': name, 'line': lineno, 'ids': repeated})
    lines = ['# On paketin mevcut içerikle metin taraması', '',
             'Takip edilen Fransızca öğretim dosyalarında birebir kalıp ve örnek cümle taraması yapıldı. Büyük/küçük harf, boşluk ve kıvrık apostrof farkları giderildi. Farklı çekimler, dolaylı eşdizimler ve anlamdaşlar eksiksiz yakalanmaz; bu bir semantik tekrar denetimi değildir.', '',
             f'Taban: `{subprocess.check_output(["git", "rev-parse", "origin/main"], cwd=REPO, text=True).strip()[:8]}`.', '',
             f'Kalıp eşleşmesi: {len(hits)} satır, {len({h["path"] for h in hits})} dosya. Tam örnek cümle eşleşmesi: {len(example_hits)} satır.', '',
             'Bir kalıbın mevcut derste bulunması bu paketin tamamını yeni içerik saymamamız gerektiğini gösterir. Aynı kalıpla yeni bir öğretim örneği yazılması otomatik olarak tekrar içerik anlamına gelmez. Mevcut uygulama kimlikleri korunarak eşleme yapılmalı.', '',
             '| Dosya | Satır | Editoryal kimlikler |', '| --- | --- | --- |']
    lines += [f"| `{h['path']}` | {h['line']} | {', '.join(h['ids'])} |" for h in hits]
    lines += ['', '## Örnek cümle eşleşmeleri', '']
    if example_hits:
        lines += [f"- `{h['path']}:{h['line']}` — {', '.join(h['ids'])}" for h in example_hits]
    else:
        lines += ['Taramanın tanımladığı birebir ölçüte göre eşleşme bulunmadı. Yakın cümle yapıları veya ortak senaryolar için bağımsız inceleme gerekir.']
    write(ROOT/'MEVCUT-ICERIK-TARAMASI-TUMU.md', lines)
    return {'matchedLines': len(hits), 'matchedFiles': len({h['path'] for h in hits}), 'exactExampleMatchedLines': len(example_hits)}


def make_archives(entries):
    folder = ROOT/'arsivler'
    folder.mkdir(exist_ok=True)
    outputs = []
    for entry in entries:
        number = entry['number']
        source = ROOT/entry['path']
        members = [source, source.parent/'INCELEME.md', source.parent/'SORULAR.md', source.parent/'KAYNAKLAR.md',
                   source.parent/('DOGRULAMA-PAKET-01.json' if number == 1 else 'DOGRULAMA.json')]
        dest = folder/f'deyimler-fr-paket-{number:02}.zip'
        with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as archive:
            for file in members:
                archive.write(file, f'paket-{number:02}/' + ('DOGRULAMA.json' if file.name.startswith('DOGRULAMA') else file.name))
            archive.write(ROOT/'CLAUDE-DEVIR.md', f'paket-{number:02}/CLAUDE-DEVIR.md')
            archive.writestr(f'paket-{number:02}/README.md', f'# Fransızca deyimler — paket {number:02}\n\n{entry["items"]} kayıt, {entry["examples"]} örnek/çeviri ve {entry["exercises"]} soru.\n\n- [Asıl veri]({source.name})\n- [Kartlar ve cevaplar](INCELEME.md)\n- [Cevapsız sorular](SORULAR.md)\n- [Kaynaklar](KAYNAKLAR.md)\n- [Kontrol](DOGRULAMA.json)\n- [Devir notları](CLAUDE-DEVIR.md)\n\nAntigravity raporu alındı; düzeltmelerin tekrar denetimi ve CEFR dağılımı bekliyor. Yeniden üretim araçları toplu 10 paket arşivindedir.\n')
        with zipfile.ZipFile(dest) as archive:
            if archive.testzip() is not None:
                raise ValueError(f'Invalid archive: {dest}')
        outputs.append(dest)
    dest = folder/'deyimler-fr-10-paket.zip'
    # Include source files and shared tools once; individual ZIPs stay separate.
    with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(ROOT.rglob('*')):
            if file.is_file() and 'arsivler' not in file.relative_to(ROOT).parts and '__pycache__' not in file.parts:
                name = 'deyimler-fr/'+file.relative_to(ROOT).as_posix()
                if file == ROOT/'README.md':
                    text = re.sub(r'\[([^\]]+)\]\(arsivler/[^)]+\)', r'\1 (depo sürümünde)', file.read_text())
                    archive.writestr(name, text)
                else:
                    archive.write(file, name)
    with zipfile.ZipFile(dest) as archive:
        if archive.testzip() is not None:
            raise ValueError(f'Invalid archive: {dest}')
    outputs.append(dest)
    write(folder/'SHA256SUMS.txt', [f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}' for p in outputs])


def main():
    validation = validate(ROOT)
    files = sorted(ROOT.rglob('fr-idioms-*.json'))
    if not (ROOT/'PAKET-01.md').exists():
        (ROOT/'PAKET-01.md').write_text((ROOT/'README.md').read_text())
    data = [render_batch(file, i) for i, file in enumerate(files, 1)]
    entries = []
    for i, (file, batch) in enumerate(zip(files, data), 1):
        check = dict(validation['batches'][i-1], structuralCheck='passed', independentLanguageReview='revisions_pending_recheck', cefrAllocation='pending')
        (file.parent/('DOGRULAMA-PAKET-01.json' if i == 1 else 'DOGRULAMA.json')).write_text(json.dumps(check, ensure_ascii=False, indent=2)+'\n')
        entries.append({'number': i, 'batch': batch['batch'], 'themeTr': batch.get('themeTr', 'İlk karma paket'),
                        'path': file.relative_to(ROOT).as_posix(), 'items': len(batch['items']), 'examples': len(batch['items']) * 2, 'exercises': len(batch['items']),
                        'idStart': batch['items'][0]['id'], 'idEnd': batch['items'][-1]['id']})
    scan = scan_existing(data)
    validation['existingContentScan'] = scan
    (ROOT/'DOGRULAMA.json').write_text(json.dumps(validation, ensure_ascii=False, indent=2)+'\n')
    (ROOT/'PAKET-DIZINI.json').write_text(json.dumps({'schemaVersion': 1, 'language': 'fr', 'packages': entries,
        'totals': validation['totals'], 'status': 'revised_for_recheck', 'cefrAllocation': 'pending', 'retired': validation['retired']}, ensure_ascii=False, indent=2)+'\n')
    # The root README and handoff are editorial documents and stay hand-edited.
    make_archives(entries)
    print(json.dumps({'totals': validation['totals'], 'sources': validation['sourceMethods'], 'scan': scan, 'archives': 11}, ensure_ascii=False))

if __name__ == '__main__':
    main()
