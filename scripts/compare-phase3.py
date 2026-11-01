import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
native=json.loads((root/'evidence/phase-3/native-editing.json').read_text(encoding='utf-8'))
def without_versions(value):
    if isinstance(value,dict):return {k:without_versions(v) for k,v in value.items() if k!='versions'}
    if isinstance(value,list):return [without_versions(v) for v in value]
    return value
if len(sys.argv)>1:
    browser=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    for item in browser['models']:
        expected=native['roundtrips'][item['id']]
        assert without_versions(expected['model'])==without_versions(item['model']),item['id']
        assert expected['syntax']==item['syntax'],item['id']
        assert not item['scene']['diagnostics'],item['id']
        assert len(item['scene']['coveredRows'])==len(item['model']['table']),item['id']
    assert len(browser['models'])==15
    assert all(browser['storage'].values()) and all(browser['history'].values())
    reference=json.loads((root/'evidence/phase-2/native-analysis.json').read_text(encoding='utf-8'))['core']['03-mediation']
    key=lambda p:(p['lhs'],p['op'],p['rhs'],p.get('group') or 1)
    largest=0
    for field in ['parameters','standardized']:
        a=sorted(reference[field],key=key);b=sorted(browser['drawn']['fit'][field],key=key)
        assert len(a)==len(b)
        for x,y in zip(a,b):
            assert key(x)==key(y)
            for name in ['est','est.std','se','std.all']:
                u,v=x.get(name),y.get(name)
                assert (u is None)==(v is None)
                if isinstance(u,(int,float)):
                    largest=max(largest,abs(u-v));assert abs(u-v)<0.00005 and round(u,4)==round(v,4)
    result=dict(roundTripModels=15,browserTablesExact=True,drawnMediation4Decimals=True,maxAbsoluteDifference=largest,storage=browser['storage'],history=browser['history'],environment=browser['userAgent'],source=Path(sys.argv[1]).name)
    target=root/'evidence/phase-3/browser-comparison.json'
else:
    wasm=json.loads((root/'evidence/phase-3/wasm-editing.json').read_text(encoding='utf-8'))
    assert without_versions(native)==without_versions(wasm),'Native and WASM editing results differ'
    result=dict(roundTripModels=len(native['roundtrips']),nativeWasmExact=True,environment='Native R versus Node.js webR/WASM; not a browser UI check')
    target=root/'evidence/phase-3/comparison.json'
    (root/'app/tests/fixtures/editing.json').write_text(json.dumps(native,ensure_ascii=False,indent=2),encoding='utf-8')
target.write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
