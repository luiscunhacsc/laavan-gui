import json, math, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
native=json.loads((root/'evidence/phase-4/native.json').read_text(encoding='utf-8'))
wasm=json.loads((root/'evidence/phase-4/wasm.json').read_text(encoding='utf-8'))
differences=[]
def compare(a,b,path):
    if isinstance(a,bool) or a is None or isinstance(a,str):
        assert a==b,(path,a,b)
    elif isinstance(a,(float,int)):
        assert isinstance(b,(float,int)) and math.isfinite(b),(path,b)
        differences.append(abs(a-b))
        assert round(a,4)==round(b,4),(path,a,b)
    elif isinstance(a,list):
        assert len(a)==len(b),(path,len(a),len(b))
        for i,(x,y) in enumerate(zip(a,b)): compare(x,y,f'{path}[{i}]')
    elif isinstance(a,dict):
        for k,v in a.items():
            if k not in ('versions','script','warnings','model'):
                compare(v,b[k],f'{path}.{k}')
for case in ('single','invariance','bootstrap'):
    for field in ('parameters','standardized','measures','reliability','modifications','invariance','bootstrap'):
        compare(native[case].get(field),wasm[case].get(field),case+'.'+field)
for case in ('edited','editedGroup'):
    for model in (native[case]['model'],wasm[case]['model']):
        rows=[r for r in model['table'] if r['lhs']=='x1' and r['op']=='~~' and r['rhs']=='x2']
        assert len(rows)==(2 if case=='editedGroup' else 1)
        assert all((r['free']>0)==(r['group']==2 if case=='editedGroup' else True) for r in rows)
result={'passed':True,'comparedNumbers':len(differences),'maxAbsoluteDifference':max(differences),'precision':4,'nativeLavaan':native['single']['versions']['lavaan'],'nativeSemTools':native['single']['versions']['semTools'],'wasmSemTools':wasm['single']['versions']['semTools']}
(root/'evidence/phase-4/comparison.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
(root/'app/tests/fixtures/advanced.json').write_text(json.dumps(native,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result))
if len(sys.argv)>1:
    browser=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    assert len(browser['checks'])==12
    reference=json.loads((root/'app/tests/fixtures/analysis.json').read_text(encoding='utf-8'))['core']
    differences.clear()
    for actual in browser['models']:
        expected=reference[actual['id']]
        for field in ('parameters','standardized','measures','rsquared'):compare(expected[field],actual['result'][field],f"browser.{actual['id']}.{field}")
    for key in ('invariance','bootstrap'):
        for field in ('parameters','standardized','measures','reliability','invariance','bootstrap'):compare(native[key].get(field),browser[key].get(field),'browser.'+key+'.'+field)
    for field in ('reliability','modifications'):compare(native['single'][field],browser['models'][0]['result'][field],'browser.single.'+field)
    summary={'passed':True,'userAgent':browser['userAgent'],'checks':browser['checks'],'comparedNumbers':len(differences),'maxAbsoluteDifference':max(differences),'precision':4,'source':str(Path(sys.argv[1]).relative_to(root)) if Path(sys.argv[1]).is_absolute() else sys.argv[1]}
    (root/'evidence/phase-4/browser-comparison.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(summary))
