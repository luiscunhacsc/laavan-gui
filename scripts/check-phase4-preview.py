import json,re
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urljoin
root=Path(__file__).resolve().parents[1];base='http://127.0.0.1:8000/'
def read(path):
    with urlopen(urljoin(base,path),timeout=15) as response:
        assert response.status==200,path
        return response.read()
page=read('app/dist/').decode()
for asset in re.findall(r'(?:src|href)="(\./assets/[^\"]+)"',page):
    data=read('app/dist/'+asset[2:])
    if(asset.endswith('.css')):
        for font in re.findall(r'url\(([^)]+)\)',data.decode()):
            font=font.strip('"\'')
            if not font.startswith('data:'):read(urljoin('app/dist/'+asset[2:],font))
items=json.loads((root/'docs/phase-4-diagrams/summary.json').read_text(encoding='utf-8'))
gallery=read('docs/phase-4-gallery.html').decode()
assert len(items)==13 and gallery.count('<article>')==13
for item in items:
    assert not item['diagnostics']
    for ext in ['svg','png','pdf','tex','lavaan']:read('docs/phase-4-diagrams/'+item['id']+'.'+ext)
for source in (root/'app/dist/assets').glob('*.js'):
    text=source.read_text(encoding='utf-8')
    assert not any(s in text for s in ['/__qa-advanced','/__qa-editing','/__qa-analysis','/__fixtures/']),'Development QA code leaked into production'
print('PASS: production app, assets, fonts and all 13 diagram exports load over HTTP; development QA routes are absent.')
