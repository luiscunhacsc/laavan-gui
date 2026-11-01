from pathlib import Path
from urllib.request import urlopen
import json,re
root=Path(__file__).resolve().parents[1];base='http://127.0.0.1:8000/'
def check(path):
    with urlopen(base+path,timeout=10) as response:
        assert response.status==200,path
        return response.read() if path.endswith('/') or path.endswith('.html') else b''
page=check('app/dist/').decode()
for asset in re.findall(r'(?:src|href)="(\./assets/[^\"]+)"',page):check('app/dist/'+asset[2:])
gallery=check('docs/phase-3-gallery.html').decode()
items=json.loads((root/'docs/phase-3-diagrams/summary.json').read_text(encoding='utf-8'))
assert len(items)==11 and len(re.findall('<article',gallery))==11
for item in items:
    assert not item['diagnostics']
    for suffix in ['svg','png','lavaan']:check('docs/phase-3-diagrams/'+item['id']+'.'+suffix)
for file in (root/'app/dist/assets').glob('*.js'):
    source=file.read_text(encoding='utf-8')
    assert not any(route in source for route in ['/__qa-editing','/__qa-analysis','/__fixtures/']),'Development route leaked into production'
print('PASS: production app/assets and all eleven SVG/PNG/syntax artifacts return HTTP 200; development QA routes absent from production JS.')
