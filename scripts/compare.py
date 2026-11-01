"""Check scientific equivalence and fixture semantics, independently of rendering."""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))
native = read('evidence/native/results.json')
wasm_dir = sys.argv[1] if len(sys.argv) > 1 else 'evidence/node'
wasm = read(f'{wasm_dir}/results.json')
assert native['lavaan'] == wasm['lavaan'], 'Different lavaan versions invalidate the comparison'
report = {'nativeR':native['R'], 'wasmR':wasm['R'], 'lavaan':native['lavaan'],
          'wasmEvidence':wasm_dir, 'models':{}, 'status':'pass'}
def identity(row):
    return tuple(row.get(k) for k in ('lhs','op','rhs','label','group','block'))
for name, nfit in native['fits'].items():
    wfit = wasm['fits'][name]
    assert nfit['converged'] and wfit['converged'], name
    assert len(nfit['estimates']) == len(wfit['estimates']), name
    result = {}
    for column in ('est','std.all','se'):
        errors = []
        for nr, wr in zip(nfit['estimates'], wfit['estimates']):
            assert identity(nr) == identity(wr), (name, identity(nr), identity(wr))
            a,b = nr[column],wr[column]
            assert (a is None) == (b is None), (name,column)
            if a is not None:
                assert math.isfinite(a) and math.isfinite(b)
                assert format(a,'.4f') == format(b,'.4f'), (name,column,a,b)
                errors.append(abs(a-b))
        result[column] = {'maxAbsDifference':max(errors, default=0), 'rounded4dpMatch':True}
    assert set(nfit['fitMeasures']) == set(wfit['fitMeasures'])
    for key,a in nfit['fitMeasures'].items():
        b=wfit['fitMeasures'][key]
        assert (a is None) == (b is None)
        if a is not None: assert abs(a-b)<1e-8, (name,key,a,b)
    report['models'][name] = result
nt = read('evidence/native/parameter-tables.json')
wt = read(f'{wasm_dir}/parameter-tables.json')
assert len(nt) == len(wt) == 7
for name, item in nt.items():
    assert item['table'] == wt[name]['table'], f'Parameter table mismatch: {name}'
large = nt['07-large']
assert len(large['latent']) >= 8 and len(large['observed']) >= 40
pd = nt['02-political-democracy']['table']
assert len([r for r in pd if r['op']=='~~' and r['lhs']!=r['rhs']]) == 6
hs = nt['01-holzinger-swineford']['table']
assert len([r for r in hs if r['op']=='=~' and r['free']==0 and r['ustart']==1]) == 3
assert len([r for r in hs if r['op']=='~~' and r['user']==0]) == 15
mg = nt['05-two-group']['table']
assert {r['group'] for r in mg} == {0,1,2}
assert len([r for r in mg if r['op']=='==']) == 5
assert not wasm['probes']['invalid']['ok']
for name in ('formative','single_indicator','ordered_thresholds','equality_inequality','na_modifier'):
    assert wasm['probes'][name]['ok'], name
assert '|' in wasm['probes']['ordered_thresholds']['ops']
bounds = next(r for r in wasm['probes']['equality_inequality']['table'] if r.get('label')=='a')
assert bounds['lower'] == 0 and bounds['upper'] == 2
report['parameterTablesIdentical'] = 7
report['semanticAssertions'] = 'pass'
output = ROOT / wasm_dir / 'comparison.json'
output.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
