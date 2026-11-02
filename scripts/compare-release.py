import json
import math
from pathlib import Path

root=Path(__file__).resolve().parents[1]
load=lambda path:json.loads((root/path).read_text(encoding='utf-8'))
differences=[]
availability=[]
def compare(a,b,path):
    if isinstance(a,bool) or a is None or isinstance(a,str):
        assert a==b,(path,a,b)
    elif isinstance(a,(float,int)):
        assert isinstance(b,(float,int)) and math.isfinite(b),(path,b)
        differences.append(abs(a-b))
        assert round(a,4)==round(b,4),(path,a,b)
    elif isinstance(a,list):
        assert len(a)==len(b),(path,len(a),len(b))
        for i,(x,y) in enumerate(zip(a,b)):
            compare(x,y,f'{path}[{i}]')
    elif isinstance(a,dict):
        for k,v in a.items():
            if k not in ('versions','script','warnings','model'):
                compare(v,b[k],path+'.'+k)

native=load('evidence/phase-2/native-analysis.json')
packaged=load('evidence/release/packaged-analysis.json')
fields=('parameters','standardized','measures','rsquared','nobs','inputCases','excluded','converged','admissible')
for name,reference in native['core'].items():
    for field in fields:
        compare(reference[field],packaged['core'][name][field],name+'.'+field)
for name in ('excel','spss','missing','ordinal','matrix'):
    for field in fields:
        if name=='missing' and field=='measures':
            # The saturated MLR/FIML fixture has platform-dependent robust-index
            # availability. Keep those differences explicit, rather than treating
            # an unavailable statistic as a numerical equality or a zero.
            assert next(x['value'] for x in native[name][field] if x['name']=='df')==0
            assert len(native[name][field])==len(packaged[name][field])
            for a,b in zip(native[name][field],packaged[name][field]):
                assert a['name']==b['name']
                if (a['value'] is None)!=(b['value'] is None):
                    assert a['name'] in ('cfi.robust','tli.robust','rmsea.ci.lower.robust','rmsea.ci.upper.robust')
                    availability.append({'case':name,'measure':a['name'],'native':a['value'],'packaged':b['value']})
                else:
                    compare(a,b,name+'.'+field+'.'+a['name'])
        else:
            compare(native[name][field],packaged[name][field],name+'.'+field)
core_count=len(differences)
native=load('evidence/phase-4/native.json')
packaged=load('evidence/release/packaged.json')
for name in ('single','invariance','bootstrap'):
    for field in ('parameters','standardized','measures','reliability','modifications','invariance','bootstrap'):
        compare(native[name].get(field),packaged[name].get(field),name+'.'+field)
result={'passed':True,'comparedNumbers':len(differences),'basicAnalysisNumbers':core_count,
        'advancedAnalysisNumbers':len(differences)-core_count,'maxAbsoluteDifference':max(differences),
        'precision':4,'nativeLavaan':native['single']['versions']['lavaan'],
        'engine':'self-contained webR distribution, executed under Node without package installation',
        'saturatedModelAvailabilityDifferences':availability}
(root/'evidence/release/numerical-comparison.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result))
