"""Compare real native R and webR/WASM adapter output, retaining full precision."""
import json,sys
from pathlib import Path

root=Path(__file__).resolve().parents[1]
native=json.loads((root/'evidence/phase-2/native-analysis.json').read_text(encoding='utf-8'))
browser=None
if len(sys.argv)>1:
    browser=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    wasm=dict(core={m['id']:m['result'] for m in browser['models']},imports=browser['imports'])
    for model in browser['models']:
        assert not model['scene']['diagnostics'], (model['id'],model['scene']['diagnostics'])
        assert len(model['scene']['coveredRows'])==len(model['result']['model']['table'])
else:
    wasm=json.loads((root/'evidence/phase-2/wasm-analysis.json').read_text(encoding='utf-8'))
checks=[]
availability_differences=[]
def differences(a,b,path=''):
    if isinstance(a,dict) and isinstance(b,dict):
        return [item for key in a.keys()|b.keys() for item in differences(a.get(key),b.get(key),path+'/'+key)]
    if isinstance(a,list) and isinstance(b,list):
        return [(path,'length',len(a),len(b))] if len(a)!=len(b) else [item for i,(x,y) in enumerate(zip(a,b)) for item in differences(x,y,path+'/'+str(i))]
    return [] if a==b else [(path,a,b)]
assert native['imports']==wasm['imports'], differences(native['imports'],wasm['imports'])
for name,a,b in [(key,value,wasm['core'][key]) for key,value in native['core'].items()]+[(key,native[key],wasm[key]) for key in ['excel','spss','missing','ordinal','matrix'] if key in wasm]:
    assert a['converged']==b['converged'] and a['admissible']==b['admissible']
    assert a['nobs']==b['nobs']
    largest=0
    for field in ['parameters','standardized']:
        assert len(a[field])==len(b[field])
        for x,y in zip(a[field],b[field]):
            for key in ['lhs','op','rhs','group']:
                assert x.get(key)==y.get(key),(name,field,key)
            for key in ['est','est.std','se','std.all']:
                u,v=x.get(key),y.get(key)
                assert (u is None)==(v is None),(name,field,key)
                if isinstance(u,(int,float)):
                    largest=max(largest,abs(u-v))
                    assert abs(u-v)<0.00005,(name,field,key,u,v)
                    assert round(u,4)==round(v,4),(name,field,key,'rounded',u,v)
    for x,y in zip(a['measures'],b['measures']):
        assert x['name']==y['name']
        if (x['value'] is None)!=(y['value'] is None):
            # Saturated robust fits can return NA versus a boundary value on
            # different R/platform builds. Preserve and report that distinction.
            assert next(m['value'] for m in a['measures'] if m['name']=='df')==0
            assert next(m['value'] for m in b['measures'] if m['name']=='df')==0
            assert x['name'].endswith('.robust')
            availability_differences.append(dict(model=name,measure=x['name'],native=x['value'],comparison=y['value'],reason='zero degrees of freedom'))
        elif x['value'] is not None: assert abs(x['value']-y['value'])<0.00005,(name,x['name'])
    checks.append(dict(model=name,pass4Decimals=True,maxAbsoluteDifference=largest))
result=dict(importFidelityExact=True,environment=browser['userAgent'] if browser else 'Native R versus Node.js webR/WASM; not a browser UI check',models=checks,measureAvailabilityDifferences=availability_differences)
if browser: result['source']=Path(sys.argv[1]).name
(root/('evidence/phase-2/browser-comparison.json' if browser else 'evidence/phase-2/comparison.json')).write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
