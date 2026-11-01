"""Verify actual browser conversions against native lavaan compilation fixtures."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
native=json.loads((ROOT/'app/tests/fixtures/compiled.json').read_text(encoding='utf-8'))
native={f['id']:f['model'] for f in native}
reports=[]
for path in sorted((ROOT/'evidence/phase-1').glob('browser-*.json')):
    run=json.loads(path.read_text(encoding='utf-8'))
    models=[]
    for item in run['models']:
        if not item['ok']: raise AssertionError((path.name,item['id'],item.get('error')))
        expected=native[item['id']]
        assert item['model']['table']==expected['table'],f"Browser/native table mismatch: {item['id']}"
        scene=item['scene']
        represented={e['rowId'] for e in scene['edges'] if e.get('rowId') is not None}
        represented.update(a['rowId'] for a in scene['annotations'] if a.get('rowId') is not None)
        assert represented=={r['id'] for r in expected['table']},item['id']
        assert not scene['diagnostics'],(item['id'],scene['diagnostics'])
        models.append({'id':item['id'],'tableIdentical':True,'allRowsRepresented':True,
                       'edgeNodeDiagnostics':0,'seconds':item['seconds']})
    assert len(models)==7
    reports.append({'file':path.name,'userAgent':run['userAgent'],'models':models,'status':'pass'})
result={'status':'pass' if reports else 'unverified','runs':reports}
(ROOT/'evidence/phase-1/comparison.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(f"Browser conversion verification: {result['status']}; {len(reports)} runs; seven models each.")
