"""Render and archive the authored Spanish handoff from its JSON source."""
import csv
import hashlib
import json
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NAMES = {1:'Duygular', 2:'İş ve çalışma', 3:'Para', 4:'Sağlık ve beden', 5:'İnsan ilişkileri',
         6:'İşleri yapış biçimi', 7:'Vurgu ve pekiştirme', 8:'Karakter ve tepkiler',
         9:'Ders ve öğrenim', 10:'Konuşma tepkileri'}

def main():
    rows = json.loads((ROOT/'es-kitap-ifadeler.json').read_text())['items']
    with (ROOT/'es-kitap-ifadeler.csv').open('w', newline='') as file:
        writer = csv.writer(file, lineterminator="\n")
        writer.writerow(['id','unit','expression','meaning_tr','example_1_es','example_1_tr',
                         'example_2_es','example_2_tr','usage_note_tr','pdf_page','printed_page'])
        for r in rows:
            writer.writerow([r['id'],r['source']['unit'],r['expression'],r['meaningTr'],
                             r['examples'][0]['es'],r['examples'][0]['tr'],r['examples'][1]['es'],
                             r['examples'][1]['tr'],r['usageNoteTr'],r['source']['pdfPage'],r['source']['printedPage']])
    folder = ROOT/'uniteler'
    folder.mkdir(exist_ok=True)
    for unit in range(1,11):
        items = [r for r in rows if r['source']['unit'] == unit]
        lines = [f'# Ünite {unit:02} — {NAMES[unit]}', '',
                 f'{len(items)} ifade · {len(items)*2} özgün örnek/çeviri.', '',
                 'Kitaptan yalnız ifade seçimi alındı. Türkçe anlam ve örnekler özgün yazıldı. Bağımsız inceleme bekliyor.', '']
        for r in items:
            source = r['source']
            lines += [f"## {r['id']} — {r['expression']}", '', f"**Anlam:** {r['meaningTr']}", '',
                      f"**İfade kaynağı:** PDF {source['pdfPage']}, kitap sayfası {source['printedPage']}, {source['section']}.", '']
            if r['usageNoteTr']:
                lines += [f"**Kullanım:** {r['usageNoteTr']}", '']
            for i, ex in enumerate(r['examples'],1):
                lines += [f"{i}. {ex['es']}", f"   {ex['tr']}", '']
        (folder/f'unite-{unit:02}.md').write_text('\n'.join(lines))
    result = subprocess.check_output([sys.executable, str(ROOT/'validate.py')], text=True)
    (ROOT/'DOGRULAMA.json').write_text(result)
    target = ROOT.parent/'deyimler-es-kitap.zip'
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(ROOT.rglob('*')):
            if file.is_file() and '__pycache__' not in file.parts:
                archive.write(file, 'deyimler-es-kitap/'+file.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None:
            raise ValueError('Arşiv bütünlüğü başarısız')
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    target.with_suffix('.sha256').write_text(f'{digest}  {target.name}\n')
    print(json.dumps({'expressions':len(rows),'examples':len(rows)*2,'archive':target.name}, ensure_ascii=False))

if __name__ == '__main__':
    main()
