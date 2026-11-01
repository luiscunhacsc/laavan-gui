from pathlib import Path
from urllib.request import urlopen
import json,re
root=Path(__file__).resolve().parents[1]
base='http://127.0.0.1:8000/'
def check(path):
    with urlopen(base+path,timeout=10) as r:
        assert r.status==200,path
        return r.read() if path.endswith('.html') or path.endswith('/') else b''
page=check('app/dist/').decode()
for asset in re.findall(r'(?:src|href)="(\./assets/[^\"]+)"',page):check('app/dist/'+asset[2:])
gallery=check('docs/phase-2-gallery.html').decode()
items=json.loads((root/'docs/phase-2-diagrams/summary.json').read_text(encoding='utf-8'))
assert len(items)==10
for item in items:
    assert not item['diagnostics'],item['id']
    for suffix in ['svg','png']:check('docs/phase-2-diagrams/'+item['id']+'.'+suffix)
assert len(re.findall('<article ',gallery))==10
for file in (root/'app/dist/assets').glob('*.js'):
    source=file.read_text(encoding='utf-8')
    assert '/__qa-analysis' not in source and '/__fixtures/' not in source,'Development-only route leaked into production'
print('PASS: production app/assets and all ten gallery figures return HTTP 200; development QA routes absent from production JS.')
