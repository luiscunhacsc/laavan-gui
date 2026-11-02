"""Assemble the release record from completed checks, without inventing browser coverage."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
directory=root/'evidence/release'
read=lambda p:json.loads((root/p).read_text(encoding='utf-8'))
def read_log(path):
    data=path.read_bytes()
    return data.decode('utf-16' if data.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8',errors='replace')
log=read_log(directory/'tests.log')
count=int(re.search(r'tests (\d+)',log).group(1))
assert re.search(r'pass '+str(count)+r'\b',log) and re.search(r'fail 0\b',log)
for file in ('native-analysis.log','native-editing.log','native-advanced.log','reproduction.log','packaged.log'):
    assert 'PASS:' in read_log(directory/file),file
engine=read('app/public/engine/manifest.json')
for name,expected in engine['files'].items():
    data=(root/'app/public/engine'/name).read_bytes()
    assert len(data)==expected['bytes'] and hashlib.sha256(data).hexdigest()==expected['sha256'],name
tex=read('evidence/phase-4/tex-compilation.json')
assert all(x['passed'] and not x['overfull'] and not x['missingCharacters'] for x in tex)
result={'application':'Forma SEM Studio','version':read('app/package.json')['version'],
        'status':'release-candidate','recordedAt':datetime.now(timezone.utc).isoformat(),
        'build':read('app/dist/release.json'),'automatedTests':{'passed':count,'failed':0},
        'nativeChecks':['imports and core analyses','15 model round trips and editing','advanced analyses','standalone reproduction scripts'],
        'bundledEngine':{'execution':'Node WebAssembly, no package installation','webR':engine['webr'],'R':engine['R'],
                         'packages':engine['packages'],'verifiedRuntimeFiles':len(engine['files']),
                         'checks':['CSV/Excel/SPSS imports and paging','three reference fits','MLR/FIML','WLSMV','covariance input','15 model round trips and editing','reliability and modification indices','robust invariance','seeded bootstrap']},
        'numericalComparison':read('evidence/release/numerical-comparison.json'),
        'assetAndOfflineSimulation':read('evidence/release/build-check.json'),
        'layoutBefore':read('evidence/release/layout-before.json'),'layoutAfter':read('evidence/release/layout-after.json'),
        'exportInspection':read('evidence/phase-4/export-inspection.json'),
        'texCompilation':tex,
        'browserCoverage':{'earlier':['Firefox 159 (earlier phase checks)','VS Code embedded Chromium 150/Electron 43 (Phase 4: 12/12)'],
                           'pending':['final bundled loader in Chrome/Edge/Firefox/Safari','actual browser offline/cache operation','final saved-result browser workflow'],
                           'reason':'Browser access host unavailable; Safari absent on Windows. Node tests are not browser certification.'},
        'publicDeployment':False}
portable=directory/'portable-check.json'
if portable.exists():
    checked=json.loads(portable.read_text(encoding='utf-8'))
    if checked.get('build')==result['build']['build']:
        result['portablePackageCheck']={k:checked[k] for k in ['passed','httpAssets','checks','browserAutomation']}
launchers=directory/'launcher-check.json'
if launchers.exists():
    result['launcherChecks']=json.loads(launchers.read_text(encoding='utf-8'))
(directory/'validation.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'version':result['version'],'tests':count,'numbers':result['numericalComparison']['comparedNumbers'],'build':result['build']['build']}))
